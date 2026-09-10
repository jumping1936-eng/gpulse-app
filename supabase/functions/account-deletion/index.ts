import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

const markOperation = async (
  adminClient: ReturnType<typeof createClient>,
  operationKey: string,
  userId: string,
  status: string,
  phase: string,
  failureCode?: string,
) => {
  const { error } = await adminClient
    .schema('private')
    .from('account_deletion_operations')
    .update({
      status,
      phase,
      failure_code: failureCode ?? null,
      updated_at: new Date().toISOString(),
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('operation_key', operationKey)
    .eq('subject_user_id', userId);
  return error;
};

const removeOwnedPrefix = async (
  adminClient: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
) => {
  const prefix = `${userId}/`;
  const paths: string[] = [];
  const visit = async (currentPrefix: string): Promise<void> => {
    let offset = 0;
    while (true) {
      const { data: objects, error: listError } = await adminClient.storage
        .from(bucket)
        .list(currentPrefix, { limit: 1000, offset });
      if (listError) throw listError;
      if (!objects || objects.length === 0) return;

      for (const object of objects) {
        if (!object.name) continue;
        const objectPath = `${currentPrefix}${object.name}`;
        if (object.id === null) {
          await visit(`${objectPath}/`);
        } else {
          paths.push(objectPath);
        }
      }

      if (objects.length < 1000) return;
      offset += objects.length;
    }
  };

  await visit(prefix);
  if (paths.length === 0) return;

  for (let index = 0; index < paths.length; index += 100) {
    const { error: removeError } = await adminClient.storage
      .from(bucket)
      .remove(paths.slice(index, index + 100));
    if (removeError) throw removeError;
  }
};

Deno.serve(async (req) => {
  const authorization = req.headers.get('authorization');
  const projectUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const adminKey = Deno.env.get('SUPABASE_ADMIN_KEY');
  const operationKey = req.headers.get('idempotency-key');

  if (!authorization || !projectUrl || !anonKey || !adminKey || !operationKey) {
    return json({ ok: false, error: 'Authenticated deletion and idempotency inputs are required.' }, 401);
  }

  const callerClient = createClient(projectUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) return json({ ok: false, error: 'Authenticated user could not be verified.' }, 401);

  const adminClient = createClient(projectUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: existingError } = await adminClient
    .schema('private')
    .from('account_deletion_operations')
    .select('operation_key, status, failure_code')
    .eq('operation_key', operationKey)
    .eq('subject_user_id', userId)
    .maybeSingle();
  if (existingError) return json({ ok: false, error: 'Deletion ledger could not be read.' }, 500);
  if (existing?.status === 'completed') return json({ ok: true, status: 'completed', idempotent: true });
  if (existing?.status === 'running') return json({ ok: false, status: 'running', retryable: true }, 409);

  const { error: operationError } = await adminClient
    .schema('private')
    .from('account_deletion_operations')
    .insert({
      operation_key: operationKey,
      subject_user_id: userId,
      status: 'running',
      phase: 'storage_cleanup',
      failure_code: null,
      updated_at: new Date().toISOString(),
    });
  if (operationError) {
    if (operationError.code !== '23505') return json({ ok: false, error: 'Deletion operation could not be started.' }, 500);
    const { data: duplicate } = await adminClient
      .schema('private')
      .from('account_deletion_operations')
      .select('status')
      .eq('operation_key', operationKey)
      .eq('subject_user_id', userId)
      .maybeSingle();
    if (duplicate?.status === 'completed') return json({ ok: true, status: 'completed', idempotent: true });
    return json({ ok: false, status: duplicate?.status ?? 'running', retryable: true }, 409);
  }

  try {
    await removeOwnedPrefix(adminClient, 'avatars', userId);
    await removeOwnedPrefix(adminClient, 'private-album', userId);

    const databasePhaseError = await markOperation(adminClient, operationKey, userId, 'running', 'database_cleanup');
    if (databasePhaseError) throw databasePhaseError;
    const { error: firstParticipantError } = await adminClient
      .from('conversations')
      .update({ user1_id: null })
      .eq('user1_id', userId);
    if (firstParticipantError) throw firstParticipantError;

    const { error: secondParticipantError } = await adminClient
      .from('conversations')
      .update({ user2_id: null })
      .eq('user2_id', userId);
    if (secondParticipantError) throw secondParticipantError;

    const { error: senderError } = await adminClient
      .from('messages')
      .update({ sender_id: null })
      .eq('sender_id', userId);
    if (senderError) throw senderError;

    const authPhaseError = await markOperation(adminClient, operationKey, userId, 'running', 'auth_deletion');
    if (authPhaseError) throw authPhaseError;
    const authUrl = `${projectUrl.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(userId)}`;
    const authResponse = await fetch(authUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminKey}`,
        apikey: adminKey,
        'content-type': 'application/json',
      },
    });
    if (!authResponse.ok) throw new Error(`auth_delete_failed:${authResponse.status}`);

    const verificationPhaseError = await markOperation(adminClient, operationKey, userId, 'running', 'verification');
    if (verificationPhaseError) throw verificationPhaseError;
    const verificationResponse = await fetch(authUrl, {
      headers: { Authorization: `Bearer ${adminKey}`, apikey: adminKey },
    });
    if (verificationResponse.status !== 404) throw new Error(`auth_verification_failed:${verificationResponse.status}`);

    const ledgerError = await markOperation(adminClient, operationKey, userId, 'completed', 'complete');
    if (ledgerError) return json({ ok: false, status: 'partial', error: 'Account deleted but operation finalization failed.' }, 502);
    return json({ ok: true, status: 'completed' });
  } catch (error) {
    const failureCode = error instanceof Error ? error.message.slice(0, 160) : 'deletion_failed';
    await markOperation(adminClient, operationKey, userId, 'failed', 'failed', failureCode);
    return json({ ok: false, status: 'failed', retryable: true, error: 'Account deletion did not complete.', failureCode }, 502);
  }
});
