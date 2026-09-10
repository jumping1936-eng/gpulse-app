import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Operation = {
  operation_key: string;
  subject_user_id: string;
  status: 'pending' | 'running' | 'auth_deleted_unverified' | 'failed' | 'completed';
  phase: 'pending' | 'storage_cleanup' | 'database_cleanup' | 'auth_deletion' | 'verification' | 'complete';
  retryable: boolean;
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

const publicStatus = (operation: Operation) => {
  if (operation.status === 'completed') return 'complete';
  if (operation.status === 'auth_deleted_unverified') return 'verification_pending';
  if (operation.status === 'failed') return 'failed';
  return 'processing';
};

const operationResponse = (operation: Operation, idempotent = false) => json({
  ok: operation.status === 'completed',
  status: publicStatus(operation),
  idempotent,
}, operation.status === 'completed' ? 200 : 409);

const markOperation = async (
  adminClient: ReturnType<typeof createClient>,
  operationKey: string,
  userId: string,
  status: Operation['status'],
  phase: Operation['phase'],
  retryable: boolean,
  failureCode: string | null,
) => {
  const { error } = await adminClient
    .schema('private')
    .from('account_deletion_operations')
    .update({
      status,
      phase,
      retryable,
      failure_code: failureCode,
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
  for (let index = 0; index < paths.length; index += 100) {
    const { error: removeError } = await adminClient.storage
      .from(bucket)
      .remove(paths.slice(index, index + 100));
    if (removeError) throw removeError;
  }
};

const removeAllOwnedStorage = async (adminClient: ReturnType<typeof createClient>, userId: string) => {
  await removeOwnedPrefix(adminClient, 'avatars', userId);
  await removeOwnedPrefix(adminClient, 'private-album', userId);
};

const readOperation = async (
  adminClient: ReturnType<typeof createClient>,
  operationKey: string,
  userId?: string,
) => {
  let query = adminClient
    .schema('private')
    .from('account_deletion_operations')
    .select('operation_key, subject_user_id, status, phase, retryable')
    .eq('operation_key', operationKey);
  if (userId) query = query.eq('subject_user_id', userId);
  return query.maybeSingle();
};

const reconcilePostAuthDeletion = async (
  adminClient: ReturnType<typeof createClient>,
  operation: Operation,
  projectUrl: string,
  adminKey: string,
) => {
  const authUrl = `${projectUrl.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(operation.subject_user_id)}`;
  const verificationResponse = await fetch(authUrl, {
    headers: { Authorization: `Bearer ${adminKey}`, apikey: adminKey },
  });
  if (verificationResponse.status !== 404) {
    return operationResponse({ ...operation, status: 'auth_deleted_unverified', phase: 'verification' }, true);
  }

  try {
    await removeAllOwnedStorage(adminClient, operation.subject_user_id);
  } catch {
    return operationResponse({ ...operation, status: 'auth_deleted_unverified', phase: 'verification' }, true);
  }

  const ledgerError = await markOperation(
    adminClient,
    operation.operation_key,
    operation.subject_user_id,
    'completed',
    'complete',
    false,
    null,
  );
  if (ledgerError) {
    return operationResponse({ ...operation, status: 'auth_deleted_unverified', phase: 'verification' }, true);
  }

  return json({ ok: true, status: 'complete', idempotent: true });
};

Deno.serve(async (req) => {
  const authorization = req.headers.get('authorization');
  const operationKey = req.headers.get('idempotency-key');
  const reconciliationKey = req.headers.get('x-deletion-reconciliation-key');
  const projectUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const adminKey = Deno.env.get('SUPABASE_ADMIN_KEY');
  const trustedReconciliationKey = Deno.env.get('SUPABASE_DELETION_RECONCILIATION_KEY');

  if (!operationKey || operationKey.length > 200 || !projectUrl || !anonKey || !adminKey) {
    return json({ ok: false, status: 'failed' }, 401);
  }

  const adminClient = createClient(projectUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const isReconciliation = Boolean(trustedReconciliationKey && reconciliationKey === trustedReconciliationKey);

  if (isReconciliation) {
    const { data: operation, error } = await readOperation(adminClient, operationKey);
    if (error || !operation || operation.status !== 'auth_deleted_unverified') {
      return json({ ok: false, status: 'failed' }, 404);
    }
    return reconcilePostAuthDeletion(adminClient, operation as Operation, projectUrl, adminKey);
  }

  if (!authorization) return json({ ok: false, status: 'failed' }, 401);

  const callerClient = createClient(projectUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) return json({ ok: false, status: 'failed' }, 401);

  const { data: existing, error: existingError } = await readOperation(adminClient, operationKey, userId);
  if (existingError) return json({ ok: false, status: 'failed' }, 500);
  if (existing) {
    const operation = existing as Operation;
    if (operation.status === 'completed') return operationResponse(operation, true);
    if (operation.status === 'auth_deleted_unverified') {
      return operationResponse(operation, true);
    }
    if (operation.status === 'pending' || operation.status === 'running') {
      return operationResponse(operation, true);
    }
    if (operation.status === 'failed' && operation.retryable) {
      const { data: claimed, error: claimError } = await adminClient
        .schema('private')
        .from('account_deletion_operations')
        .update({ status: 'running', retryable: true, failure_code: null, updated_at: new Date().toISOString() })
        .eq('operation_key', operationKey)
        .eq('subject_user_id', userId)
        .eq('status', 'failed')
        .eq('retryable', true)
        .select('operation_key, subject_user_id, status, phase, retryable')
        .maybeSingle();
      if (claimError) return json({ ok: false, status: 'failed' }, 500);
      if (!claimed) {
        const { data: current } = await readOperation(adminClient, operationKey, userId);
        return current ? operationResponse(current as Operation, true) : json({ ok: false, status: 'failed' }, 500);
      }
    } else {
      return operationResponse(operation, true);
    }
  } else {
    const { data: active, error: activeError } = await adminClient
      .schema('private')
      .from('account_deletion_operations')
      .select('operation_key, subject_user_id, status, phase, retryable')
      .eq('subject_user_id', userId)
      .in('status', ['pending', 'running', 'auth_deleted_unverified'])
      .limit(1)
      .maybeSingle();
    if (activeError) return json({ ok: false, status: 'failed' }, 500);
    if (active) return operationResponse(active as Operation, true);

    const { error: insertError } = await adminClient
      .schema('private')
      .from('account_deletion_operations')
      .insert({
        operation_key: operationKey,
        subject_user_id: userId,
        status: 'running',
        phase: 'storage_cleanup',
        retryable: true,
        failure_code: null,
        updated_at: new Date().toISOString(),
      });
    if (insertError) {
      const { data: current } = await readOperation(adminClient, operationKey, userId);
      return current ? operationResponse(current as Operation, true) : json({ ok: false, status: 'processing' }, 409);
    }
  }

  const { data: operation, error: operationReadError } = await readOperation(adminClient, operationKey, userId);
  if (operationReadError || !operation) return json({ ok: false, status: 'failed' }, 500);
  const currentOperation = operation as Operation;
  let authDeleted = currentOperation.status === 'auth_deleted_unverified';
  let phase = currentOperation.phase;

  try {
    if (phase === 'storage_cleanup' || phase === 'pending') {
      await removeAllOwnedStorage(adminClient, userId);
      phase = 'database_cleanup';
    }

    if (phase === 'database_cleanup') {
      const phaseError = await markOperation(adminClient, operationKey, userId, 'running', phase, true, null);
      if (phaseError) throw new Error('ledger_update_failed');
      const { error: firstParticipantError } = await adminClient.from('conversations').update({ user1_id: null }).eq('user1_id', userId);
      if (firstParticipantError) throw new Error('database_cleanup_failed');
      const { error: secondParticipantError } = await adminClient.from('conversations').update({ user2_id: null }).eq('user2_id', userId);
      if (secondParticipantError) throw new Error('database_cleanup_failed');
      const { error: senderError } = await adminClient.from('messages').update({ sender_id: null }).eq('sender_id', userId);
      if (senderError) throw new Error('database_cleanup_failed');
      phase = 'auth_deletion';
    }

    if (phase === 'auth_deletion') {
      const phaseError = await markOperation(adminClient, operationKey, userId, 'running', phase, true, null);
      if (phaseError) throw new Error('ledger_update_failed');
      const authUrl = `${projectUrl.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(userId)}`;
      const authResponse = await fetch(authUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminKey}`, apikey: adminKey, 'content-type': 'application/json' },
      });
      if (!authResponse.ok && authResponse.status !== 404) throw new Error('auth_deletion_failed');
      authDeleted = true;
      const stateError = await markOperation(adminClient, operationKey, userId, 'auth_deleted_unverified', 'verification', true, null);
      if (stateError) return json({ ok: false, status: 'verification_pending' }, 502);
    }

    if (authDeleted) {
      const { data: verificationOperation } = await readOperation(adminClient, operationKey, userId);
      if (!verificationOperation) return json({ ok: false, status: 'verification_pending' }, 502);
      return reconcilePostAuthDeletion(adminClient, verificationOperation as Operation, projectUrl, adminKey);
    }
  } catch {
    if (authDeleted) {
      await markOperation(adminClient, operationKey, userId, 'auth_deleted_unverified', 'verification', true, 'verification_pending');
      return json({ ok: false, status: 'verification_pending' }, 502);
    }
    await markOperation(adminClient, operationKey, userId, 'failed', phase, true, phase === 'storage_cleanup' ? 'storage_cleanup_failed' : `${phase}_failed`);
    return json({ ok: false, status: 'failed' }, 502);
  }

  return json({ ok: false, status: 'processing' }, 409);
});
