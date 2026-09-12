import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = path.resolve('src');
const files = [];
const storiesMigrationPath = path.resolve(
  'supabase',
  'migrations',
  '20260909020000_add_secure_stories_contract.sql',
);
const storyFrontendFiles = [
  path.join(sourceRoot, 'components', 'explore', 'ExploreTab.tsx'),
  path.join(sourceRoot, 'components', 'explore', 'StoriesBar.tsx'),
  path.join(sourceRoot, 'components', 'explore', 'StoryViewer.tsx'),
  path.join(sourceRoot, 'components', 'explore', 'storyTypes.ts'),
];

function collectFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(entryPath);
    if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) files.push(entryPath);
  }
}

function countMatches(pattern) {
  return files.reduce((count, file) => {
    const content = fs.readFileSync(file, 'utf8');
    return count + [...content.matchAll(pattern)].length;
  }, 0);
}

function countMatchesInFiles(filePredicate, pattern) {
  return files.filter(filePredicate).reduce((count, file) => {
    const content = fs.readFileSync(file, 'utf8');
    return count + [...content.matchAll(pattern)].length;
  }, 0);
}

function countMatchesInPaths(paths, pattern) {
  return paths.reduce((count, file) => {
    const content = fs.readFileSync(file, 'utf8');
    return count + [...content.matchAll(pattern)].length;
  }, 0);
}

function getMigrationFunctionSource(source, functionName) {
  const match = source.match(new RegExp(
    `CREATE FUNCTION public\\.${functionName}\\([\\s\\S]*?\\n\\$function\\$;`,
  ));
  return match?.[0] ?? '';
}

const failures = [];
const checks = [];

function checkEqual(name, actual, expected) {
  const result = actual === expected;
  checks.push({ name, result, actual, expected, operator: '===' });
  if (!result) failures.push(name);
}

function checkGreaterOrEqual(name, actual, required) {
  const result = actual >= required;
  checks.push({ name, result, actual, expected: required, operator: '>=' });
  if (!result) failures.push(name);
}

function checkTrue(name, value) {
  checkEqual(name, value, true);
}

function checkFalse(name, value) {
  checkEqual(name, value, false);
}

function checkZero(name, actual) {
  checkEqual(name, actual, 0);
}

checkTrue('self-test: 1 >= 1', 1 >= 1);
checkFalse('self-test: 1 >= 2', 1 >= 2);
checkTrue('self-test: 2 >= 1', 2 >= 1);
checkTrue('self-test: 0 === 0', 0 === 0);
checkFalse('self-test: 1 === 0', 1 === 0);

collectFiles(sourceRoot);
const storiesMigrationExists = fs.existsSync(storiesMigrationPath);
const storiesMigrationSource = storiesMigrationExists
  ? fs.readFileSync(storiesMigrationPath, 'utf8')
  : '';
const profileViewPath = path.join(sourceRoot, 'components', 'profile', 'ProfileView.tsx');
const profileViewSource = fs.readFileSync(profileViewPath, 'utf8');
const profileUtilitySource = fs.readFileSync(path.join(sourceRoot, 'utils', 'profile.ts'), 'utf8');
const homeFeedSource = fs.readFileSync(path.join(sourceRoot, 'components', 'home', 'HomeFeed.tsx'), 'utf8');
const exploreTabSource = fs.readFileSync(path.join(sourceRoot, 'components', 'explore', 'ExploreTab.tsx'), 'utf8');
const chatRoomSource = fs.readFileSync(path.join(sourceRoot, 'components', 'chat', 'ChatRoom.tsx'), 'utf8');
const languageContextSource = fs.readFileSync(path.join(sourceRoot, 'context', 'LanguageContext.tsx'), 'utf8');
const appTranslationsSource = fs.readFileSync(path.join(sourceRoot, 'i18n', 'appTranslations.ts'), 'utf8');
const englishTranslationSource = appTranslationsSource.match(/const en: TranslationMap = \{([\s\S]*?)\n\};\n\nconst translations/);
const englishTranslationKeys = new Set(
  [...(englishTranslationSource?.[1] ?? '').matchAll(/'([^']+)':/g)].map((match) => match[1]),
);
const loginScreenSource = fs.readFileSync(path.join(sourceRoot, 'components', 'LoginScreen.tsx'), 'utf8');
const paywallModalSource = fs.readFileSync(path.join(sourceRoot, 'components', 'PaywallModal.tsx'), 'utf8');
const appSource = fs.readFileSync(path.join(sourceRoot, 'App.tsx'), 'utf8');
const brandLogoPath = path.join(sourceRoot, 'components', 'brand', 'GPulseLogo.tsx');
const brandLogoSource = fs.existsSync(brandLogoPath) ? fs.readFileSync(brandLogoPath, 'utf8') : '';
const legalTermsPath = path.join(sourceRoot, 'components', 'LegalTerms.tsx');
const legalTermsSource = fs.existsSync(legalTermsPath) ? fs.readFileSync(legalTermsPath, 'utf8') : '';
const legalDocumentsPath = path.join(sourceRoot, 'legal', 'legalDocuments.ts');
const legalDocumentsSource = fs.existsSync(legalDocumentsPath) ? fs.readFileSync(legalDocumentsPath, 'utf8') : '';
const legalConfigPath = path.join(sourceRoot, 'legal', 'legalConfig.ts');
const legalConfigSource = fs.existsSync(legalConfigPath) ? fs.readFileSync(legalConfigPath, 'utf8') : '';
const legal02bMigrationPath = path.resolve('supabase', 'migrations', '20260910000000_legal_02b_deleted_user_chat_contract.sql');
const legal02bMigrationSource = fs.existsSync(legal02bMigrationPath) ? fs.readFileSync(legal02bMigrationPath, 'utf8') : '';
const messageContractMigrationPath = path.resolve('supabase', 'migrations', '20260907101000_harden_message_contract.sql');
const messageContractMigrationSource = fs.existsSync(messageContractMigrationPath) ? fs.readFileSync(messageContractMigrationPath, 'utf8') : '';
const legal02cMigrationPath = path.resolve('supabase', 'migrations', '20260912000000_legal_02c_fix_02_conversation_participant_immutability.sql');
const legal02cMigrationSource = fs.existsSync(legal02cMigrationPath) ? fs.readFileSync(legal02cMigrationPath, 'utf8') : '';
const legal02cFix03MigrationPath = path.resolve('supabase', 'migrations', '20260912010000_legal_02c_fix_03_retained_room_read_only.sql');
const legal02cFix03MigrationSource = fs.existsSync(legal02cFix03MigrationPath) ? fs.readFileSync(legal02cFix03MigrationPath, 'utf8') : '';
const deletionBackendPath = path.resolve('supabase', 'functions', 'account-deletion', 'index.ts');
const deletionBackendSource = fs.existsSync(deletionBackendPath) ? fs.readFileSync(deletionBackendPath, 'utf8') : '';
const deletionBackendResponseLines = deletionBackendSource
  .split('\n')
  .filter((line) => line.includes('json('))
  .join('\n');
const faviconPath = path.resolve('public', 'gpulse-mark.svg');
const automaticGeolocationEffectCount = [...profileViewSource.matchAll(
  /useEffect\(\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[[^\]]*\]\);/g,
)].filter((match) => match[1].includes('navigator.geolocation.getCurrentPosition')).length;
const missingEnglishTranslationKeys = [...new Set(
  files.flatMap((file) => [...fs.readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([^']+)'/g)].map((match) => match[1])),
)].filter((key) => !englishTranslationKeys.has(key));

checkGreaterOrEqual('runtime source files scanned', files.length, 1);
checkTrue('public profile field contract exists', profileUtilitySource.includes('PUBLIC_PROFILE_FIELDS'));
checkTrue('own profile field contract exists', profileUtilitySource.includes('OWN_PROFILE_FIELDS'));
checkTrue('Home uses verified public profile contract', homeFeedSource.includes('.select(PUBLIC_PROFILE_FIELDS)'));
checkTrue('Explore uses verified public profile contract', exploreTabSource.includes('.select(PUBLIC_PROFILE_FIELDS)'));
checkTrue('Profile uses verified own profile contract', profileViewSource.includes('.select(OWN_PROFILE_FIELDS)'));
checkTrue('Chat profile lookup uses verified public profile contract', chatRoomSource.includes('.select(PUBLIC_PROFILE_FIELDS)'));
checkFalse('profile field contracts exclude unavailable columns', /['"](?:status|telegram|twitter|facebook|instagram)['"]/.test(profileUtilitySource));
checkTrue('own profile distinguishes loading, missing, and error', /OwnProfileLoadStatus = 'loading' \| 'ready' \| 'missing' \| 'error'/.test(profileViewSource));
checkTrue('language provider has one persisted preference key', languageContextSource.includes('LANGUAGE_PREFERENCE_KEY'));
checkTrue('language provider exposes selection and translation APIs', languageContextSource.includes('setLocale') && languageContextSource.includes('t:'));
checkTrue('language resources define the supported global locales', appTranslationsSource.includes("SUPPORTED_LOCALES = ['zh-TW', 'en']"));
checkZero('application translation keys missing English entries', missingEnglishTranslationKeys.length);
checkTrue('login reads the shared language context', loginScreenSource.includes('useLanguage()'));
checkZero('login retains inactive local language state', [...loginScreenSource.matchAll(/useState\(LANGUAGES\[0\]\)/g)].length);
checkTrue('profile settings presents a language selector', profileViewSource.includes("<select") && profileViewSource.includes('setLocale'));
checkTrue('VIP dialog has Escape and backdrop dismissal', paywallModalSource.includes("event.key === 'Escape'") && paywallModalSource.includes('event.target === event.currentTarget'));
checkTrue('canonical GPulse brand component exists', brandLogoSource.includes('GPulseLogo'));
checkTrue('canonical GPulse capitalization is preserved', brandLogoSource.includes('GPulse'));
checkTrue(
  'canonical brand supports full, wordmark, and mark variants',
  brandLogoSource.includes("'full' | 'wordmark' | 'mark'"),
);
checkTrue(
  'canonical brand supports bounded glow variants',
  brandLogoSource.includes("'none' | 'soft' | 'strong'"),
);
checkTrue('Splash uses canonical GPulse brand component', appSource.includes('<GPulseLogo'));
checkTrue('Login uses canonical GPulse brand component', loginScreenSource.includes('<GPulseLogo'));
checkTrue('Splash no longer uses generic Activity as brand identity', !appSource.includes('Activity'));
checkTrue('brand favicon is local', fs.existsSync(faviconPath));
checkZero('external logo URL dependencies', countMatches(/(?:bolt\.new\/static\/og_default|vite\.svg)/gi));
checkTrue('Legal Center component exists', legalTermsSource.includes('Legal Center') && legalTermsSource.includes('legal-document-title'));
checkEqual('Legal Center document definitions', [...legalDocumentsSource.matchAll(/id: '(?:terms|privacy|community|deletion)'/g)].length, 8);
checkTrue('Legal publication placeholders are centralized', ['LEGAL_OPERATOR_NAME', 'LEGAL_OPERATOR_ADDRESS', 'LEGAL_SUPPORT_EMAIL', 'LEGAL_PRIVACY_EMAIL', 'LEGAL_EFFECTIVE_DATE', 'LEGAL_ACCOUNT_DELETION_URL'].every((name) => legalConfigSource.includes(name)));
checkTrue('deleted-user chat contract migration exists', legal02bMigrationSource.length > 0);
checkTrue('conversation participant immutability migration exists', legal02cMigrationSource.length > 0);
checkTrue('retained conversation read-only migration exists', legal02cFix03MigrationSource.length > 0);
checkTrue(
  'retained conversation UPDATE uses a restrictive live-room policy',
  /CREATE POLICY conversations_live_update_only[\s\S]*ON public\.conversations[\s\S]*AS RESTRICTIVE[\s\S]*FOR UPDATE[\s\S]*TO authenticated/.test(legal02cFix03MigrationSource),
);
checkTrue(
  'retained conversation UPDATE is denied when either participant is NULL',
  /conversations_live_update_only[\s\S]*USING \([\s\S]*user1_id IS NOT NULL[\s\S]*user2_id IS NOT NULL[\s\S]*auth\.uid\(\) = user1_id OR auth\.uid\(\) = user2_id[\s\S]*\)[\s\S]*WITH CHECK \([\s\S]*user1_id IS NOT NULL[\s\S]*user2_id IS NOT NULL/.test(legal02cFix03MigrationSource),
);
checkTrue(
  'live conversation preview UPDATE remains granted',
  /GRANT UPDATE \(last_message, last_message_time\)[\s\S]*TO authenticated;/.test(legal02cMigrationSource)
    && [...chatRoomSource.matchAll(/from\(\s*['"]conversations['"]\s*\)\.update\(\s*\{([\s\S]*?)\}\)/g)].length === 2,
);
checkTrue(
  'participant IDs remain immutable to authenticated clients',
  /REVOKE UPDATE ON TABLE public\.conversations FROM PUBLIC, anon, authenticated;/.test(legal02cMigrationSource)
    && !/GRANT UPDATE \([^)]*\buser[12]_id\b/.test(legal02cMigrationSource),
);
checkTrue(
  'conversation table UPDATE privilege is revoked before column grants',
  /REVOKE UPDATE ON TABLE public\.conversations FROM PUBLIC, anon, authenticated;/.test(legal02cMigrationSource),
);
checkTrue(
  'authenticated conversation UPDATE is limited to preview columns',
  /GRANT UPDATE \(last_message, last_message_time\)[\s\S]*ON TABLE public\.conversations[\s\S]*TO authenticated;/.test(legal02cMigrationSource),
);
checkFalse('authenticated participant UPDATE is not granted', /GRANT UPDATE \([^)]*\buser[12]_id\b/.test(legal02cMigrationSource));
checkFalse('anon participant UPDATE is not granted', /GRANT UPDATE[\s\S]*TO anon/.test(legal02cMigrationSource));
checkEqual('frontend direct conversation preview update paths', countMatches(/from\(\s*['"]conversations['"]\s*\)\.update\(/g), 2);
checkTrue('frontend conversation preview updates use only approved columns', [...chatRoomSource.matchAll(/from\(\s*['"]conversations['"]\s*\)\.update\(\s*\{([\s\S]*?)\}\)/g)].every((match) => {
  const updatedColumns = [...match[1].matchAll(/\b([a-z_]+)\s*:/g)].map((column) => column[1]);
  return updatedColumns.length > 0 && updatedColumns.every((column) => ['last_message', 'last_message_time'].includes(column));
}));
checkTrue('trusted account deletion path still clears participants', /adminClient\.from\('conversations'\)\.update\(\{ user1_id: null \}\)/.test(deletionBackendSource) && /adminClient\.from\('conversations'\)\.update\(\{ user2_id: null \}\)/.test(deletionBackendSource));
checkTrue('deleted-user chat migration uses exact FK drops', legal02bMigrationSource.includes('DROP CONSTRAINT conversations_user1_id_fkey') && legal02bMigrationSource.includes('DROP CONSTRAINT conversations_user2_id_fkey') && legal02bMigrationSource.includes('DROP CONSTRAINT messages_sender_id_fkey'));
checkZero('deleted-user chat migration dynamic FK drops', [...legal02bMigrationSource.matchAll(/pg_catalog\.pg_constraint|FOR constraint_name|EXECUTE format\('ALTER TABLE public\.(?:conversations|messages) DROP CONSTRAINT/g)].length);
checkTrue('deleted-user chat migration marks conversation participants nullable', /ALTER TABLE public\.conversations[\s\S]*ALTER COLUMN user1_id DROP NOT NULL[\s\S]*ALTER COLUMN user2_id DROP NOT NULL/.test(legal02bMigrationSource));
checkTrue('deleted-user chat migration marks message sender nullable', /ALTER TABLE public\.messages[\s\S]*ALTER COLUMN sender_id DROP NOT NULL/.test(legal02bMigrationSource));
checkEqual('deleted-user chat SET NULL foreign keys', [...legal02bMigrationSource.matchAll(/FOREIGN KEY \((?:user1_id|user2_id|sender_id)\)[\s\S]*?ON DELETE SET NULL/g)].length, 3);
checkFalse('deleted-user chat migration does not drop conversation message FK', legal02bMigrationSource.includes('DROP CONSTRAINT messages_conversation_id_fkey'));
checkFalse('deleted-user chat migration does not recreate conversation message FK', legal02bMigrationSource.includes('ADD CONSTRAINT messages_conversation_id_fkey'));
checkTrue('message sender FK targets profiles with SET NULL', /ADD CONSTRAINT messages_sender_id_fkey[\s\S]*FOREIGN KEY \(sender_id\) REFERENCES public\.profiles\(id\) ON DELETE SET NULL/.test(legal02bMigrationSource));
checkTrue('conversation deletion FK remains untouched', !legal02bMigrationSource.includes('DROP CONSTRAINT messages_conversation_id_fkey') && !legal02bMigrationSource.includes('ADD CONSTRAINT messages_conversation_id_fkey'));
checkTrue('retained conversation remains readable by survivor', /CREATE POLICY conversations_survivor_select[\s\S]*auth\.uid\(\) = user1_id OR auth\.uid\(\) = user2_id/.test(legal02bMigrationSource));
checkTrue('retained conversation message inserts require two participants', /messages_insert_live_participants_only[\s\S]*c\.user1_id IS NOT NULL[\s\S]*c\.user2_id IS NOT NULL/.test(legal02bMigrationSource));
checkTrue('message sender must equal auth.uid', /sender_id = auth\.uid\(\)[\s\S]*NEW\.sender_id IS DISTINCT FROM caller_id/.test(legal02bMigrationSource));
checkTrue('message protection trigger is INSERT-only', /CREATE TRIGGER prevent_deleted_user_message_writes[\s\S]*BEFORE INSERT\s+ON public\.messages/.test(legal02bMigrationSource));
checkFalse('message protection trigger has no sender UPDATE event', /BEFORE INSERT OR UPDATE OF sender_id|UPDATE OF sender_id/.test(legal02bMigrationSource));
checkFalse('message protection trigger has no fragile service-role bypass', /current_user\s*=\s*['"]service_role['"]/.test(legal02bMigrationSource));
checkTrue('sender de-identification remains FK-compatible', /ALTER COLUMN sender_id DROP NOT NULL/.test(legal02bMigrationSource) && /ON DELETE SET NULL/.test(legal02bMigrationSource) && !/BEFORE INSERT OR UPDATE/.test(legal02bMigrationSource));
checkTrue('mark_messages_read remains NULL-safe', /m\.sender_id IS DISTINCT FROM caller_id/.test(legal02bMigrationSource));
checkZero('frontend direct message UPDATE calls', countMatches(/from\(\s*['"]messages['"]\s*\)\.update\(/g));
checkZero('normal-client message UPDATE grants in local migrations', countMatchesInPaths([messageContractMigrationPath, legal02bMigrationPath], /GRANT UPDATE[\s\S]*messages/g));
checkTrue('mark_messages_read updates only read state', /UPDATE public\.messages m[\s\S]*SET is_read = true/.test(messageContractMigrationSource) && !/mark_messages_read[\s\S]*SET (?:sender_id|conversation_id)/.test(messageContractMigrationSource));
checkTrue('hide_own_vanish_message updates only hidden state', /UPDATE public\.messages m[\s\S]*SET is_hidden = true/.test(messageContractMigrationSource) && !/hide_own_vanish_message[\s\S]*SET (?:sender_id|conversation_id)/.test(messageContractMigrationSource));
checkFalse('known message RPCs rewrite sender or conversation identity', /(?:mark_messages_read|hide_own_vanish_message)[\s\S]*SET (?:sender_id|conversation_id)/.test(messageContractMigrationSource));
checkTrue('symmetric block guard remains enforced', /private\.is_interaction_blocked\([\s\S]*CASE WHEN c\.user1_id = auth\.uid\(\)/.test(legal02bMigrationSource));
checkTrue('safety cases foundation exists', /CREATE TABLE IF NOT EXISTS private\.safety_cases/.test(legal02bMigrationSource));
checkTrue('safety evidence foundation exists', /CREATE TABLE IF NOT EXISTS private\.safety_evidence/.test(legal02bMigrationSource));
checkTrue('legal holds foundation exists', /CREATE TABLE IF NOT EXISTS private\.legal_holds/.test(legal02bMigrationSource));
checkTrue('account deletion operation ledger exists', /CREATE TABLE IF NOT EXISTS private\.account_deletion_operations/.test(legal02bMigrationSource));
checkTrue('one active deletion per user is database-enforced', /CREATE UNIQUE INDEX account_deletion_operations_one_active_per_user[\s\S]*WHERE status IN \('pending', 'running', 'auth_deleted_unverified'\)/.test(legal02bMigrationSource));
checkTrue('deletion ledger status values are constrained', /account_deletion_operations_status_check[\s\S]*status IN \('pending', 'running', 'auth_deleted_unverified', 'failed', 'completed'\)/.test(legal02bMigrationSource));
checkTrue('deletion ledger phase values are constrained', /account_deletion_operations_phase_check[\s\S]*phase IN \('pending', 'storage_cleanup', 'database_cleanup', 'auth_deletion', 'verification', 'complete'\)/.test(legal02bMigrationSource));
checkTrue('deletion ledger retryability is explicit', /retryable boolean NOT NULL DEFAULT true/.test(legal02bMigrationSource));
checkTrue('safety evidence has no destructive chat foreign key', !/private\.safety_evidence[\s\S]*REFERENCES public\.(?:messages|conversations)|ON DELETE RESTRICT/i.test(legal02bMigrationSource));
checkTrue('safety tables deny direct browser access', /ALTER TABLE private\.(?:safety_cases|safety_evidence|legal_holds|account_deletion_operations) ENABLE ROW LEVEL SECURITY/.test(legal02bMigrationSource) && /REVOKE ALL ON TABLE[\s\S]*FROM anon, authenticated/.test(legal02bMigrationSource));
checkTrue('safety tables revoke PUBLIC access', /REVOKE ALL PRIVILEGES ON TABLE[\s\S]*FROM PUBLIC/.test(legal02bMigrationSource));
checkTrue('retention duration remains human-approved', !/(?:retention_days|retention_period|retention_duration)\s+(?:integer|interval|text)/i.test(legal02bMigrationSource));
checkTrue('local deletion backend source exists', deletionBackendSource.length > 0);
checkTrue('local deletion backend requires authenticated caller', /authorization/.test(deletionBackendSource) && /auth\.getUser\(\)/.test(deletionBackendSource));
checkTrue('local deletion backend derives own identity', /const userId = userData\.user\?\.id/.test(deletionBackendSource));
checkTrue('local deletion backend rejects arbitrary target identity', !/(?:targetUserId|target_user_id)/.test(deletionBackendSource));
checkTrue('local deletion backend uses server-only environment secret', /Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/.test(deletionBackendSource));
checkTrue('local deletion backend uses own storage prefixes', /const prefix = `\$\{userId\}\//.test(deletionBackendSource) && /removeOwnedPrefix\(adminClient, 'avatars', userId\)/.test(deletionBackendSource) && /removeOwnedPrefix\(adminClient, 'private-album', userId\)/.test(deletionBackendSource));
checkTrue('local deletion backend uses operation ledger', /account_deletion_operations[\s\S]*insert/.test(deletionBackendSource) && /account_deletion_operations[\s\S]*maybeSingle/.test(deletionBackendSource));
checkTrue('local deletion backend handles duplicate requests', /status === 'completed'[\s\S]*idempotent: true/.test(deletionBackendSource) && /status === 'running'[\s\S]*retryable: true/.test(deletionBackendSource));
checkTrue('local deletion backend resumes same-key failed operations', /status === 'failed' && operation\.retryable[\s\S]*\.eq\('status', 'failed'\)[\s\S]*\.eq\('retryable', true\)/.test(deletionBackendSource));
checkTrue('local deletion backend blocks different-key active operations', /\.in\('status', \['pending', 'running', 'auth_deleted_unverified'\]\)/.test(deletionBackendSource));
checkTrue('local deletion backend reports partial failure', /status: 'verification_pending'/.test(deletionBackendSource));
checkTrue('local deletion backend verifies Auth deletion', /auth_deleted_unverified/.test(deletionBackendSource) && /status !== 404/.test(deletionBackendSource));
checkTrue('local deletion backend supports trusted post-auth reconciliation', /GPULSE_DELETION_RECONCILIATION_KEY/.test(deletionBackendSource) && /x-deletion-reconciliation-key/.test(deletionBackendSource) && /verification_pending/.test(deletionBackendSource));
checkTrue('local deletion backend enforces POST-only destructive execution', /Deno\.serve\(async \(req\) => \{[\s\S]*?req\.method === 'OPTIONS'[\s\S]*?status: 204[\s\S]*?req\.method !== 'POST'[\s\S]*?return json\(\{ ok: false, status: 'method_not_allowed' \}, 405, \{ Allow: 'POST' \}\);[\s\S]*?const authorization = req\.headers\.get\('authorization'\);/.test(deletionBackendSource));
checkTrue('local deletion backend exposes browser CORS contract', deletionBackendSource.includes("const corsHeaders = {") && deletionBackendSource.includes("'Access-Control-Allow-Origin': '*'") && deletionBackendSource.includes("'Access-Control-Allow-Methods': 'POST, OPTIONS'") && deletionBackendSource.includes("'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, idempotency-key'") && /headers: \{ \.\.\.corsHeaders, 'content-type': 'application\/json', \.\.\.responseHeaders \}/.test(deletionBackendSource));
checkTrue('local deletion backend keeps CORS preflight side-effect free', /if \(req\.method === 'OPTIONS'\)[\s\S]*?status: 204[\s\S]*?headers: \{ \.\.\.corsHeaders, Allow: 'POST, OPTIONS' \}[\s\S]*?if \(req\.method !== 'POST'\)/.test(deletionBackendSource));
checkTrue('local deletion backend does not expose internal failure details', !/failureCode|failure_code/.test(deletionBackendResponseLines));
checkTrue('local deletion backend uses privileged Auth deletion', /auth\/v1\/admin\/users/.test(deletionBackendSource) && /Authorization: `Bearer \$\{adminKey\}`/.test(deletionBackendSource));
checkZero('LEGAL-02B migration notification schema changes', [...legal02bMigrationSource.matchAll(/notifications/gi)].length);
checkZero('LEGAL-02B migration conversation member deletion flags', [...legal02bMigrationSource.matchAll(/conversation_member_state|deleted_flag|is_deleted/gi)].length);
checkZero('LEGAL-02C-FIX-03 notification schema changes', [...legal02cFix03MigrationSource.matchAll(/notifications/gi)].length);
checkZero('LEGAL-02C-FIX-03 conversation member deletion flags', [...legal02cFix03MigrationSource.matchAll(/conversation_member_state|deleted_flag|is_deleted/gi)].length);
checkTrue('deleted-user chat strings are localized', appTranslationsSource.includes("'chat.deletedUser'") && appTranslationsSource.includes("'chat.deletedUserHint'"));
checkTrue('deleted-user frontend does not fabricate profile identity', !/deleted:\$\{conversationId\}/.test(chatRoomSource) && !/deleted:\$\{conversationId\}/.test(fs.readFileSync(path.join(sourceRoot, 'components', 'chat', 'ChatList.tsx'), 'utf8')));
checkTrue('deleted-user frontend disables composer', /disabled=\{isDeletedConversation\}/.test(chatRoomSource) && /isDeletedConversation \|\| !input\.trim\(\)/.test(chatRoomSource));
checkTrue('deleted-user frontend hides profile navigation', /!isDeletedConversation[\s\S]*handleViewProfile/.test(chatRoomSource));
checkTrue('production account deletion remains gated off', legalTermsSource.includes('Permanent account deletion is not available yet') && appTranslationsSource.includes("'accountDeletion.unavailableTitle'"));
checkTrue('auth flow can open Terms and Privacy', loginScreenSource.includes("onOpenLegalDocument?.('terms')") && loginScreenSource.includes("onOpenLegalDocument?.('privacy')"));
checkTrue('authenticated Help exposes Legal Center', profileViewSource.includes('setIsLegalCenterOpen(true)') && profileViewSource.includes('<LegalTerms'));
checkZero('Grindr branding or URL references', countMatches(/grindr/gi));
checkTrue('secure Stories migration exists', storiesMigrationExists);
checkGreaterOrEqual('Stories table definition', [...storiesMigrationSource.matchAll(/CREATE TABLE private\.stories/g)].length, 1);
checkGreaterOrEqual('Story view table definition', [...storiesMigrationSource.matchAll(/CREATE TABLE private\.story_views/g)].length, 1);
checkEqual('approved Story RPC definitions', [...storiesMigrationSource.matchAll(/^CREATE FUNCTION public\.(?:create_own_story|delete_own_story|get_own_active_story|list_visible_stories|get_visible_story|mark_story_viewed)/gm)].length, 6);
checkZero('Story migration CREATE OR REPLACE definitions', [...storiesMigrationSource.matchAll(/CREATE OR REPLACE/g)].length);
checkZero('Story migration CREATE POLICY definitions', [...storiesMigrationSource.matchAll(/CREATE POLICY/g)].length);
checkEqual('Story migration RLS enables', [...storiesMigrationSource.matchAll(/ENABLE ROW LEVEL SECURITY/g)].length, 2);
checkEqual('Story migration authenticated execute grants', [...storiesMigrationSource.matchAll(/GRANT EXECUTE ON FUNCTION/g)].length, 6);
checkZero('Story migration Storage mutations', [...storiesMigrationSource.matchAll(/storage\.|story-media/gi)].length);
checkZero('Story migration Realtime mutations', [...storiesMigrationSource.matchAll(/supabase_realtime|CREATE PUBLICATION|ALTER PUBLICATION/gi)].length);
checkGreaterOrEqual('Story list block helper usage', [...getMigrationFunctionSource(storiesMigrationSource, 'list_visible_stories').matchAll(/private\.is_interaction_blocked/g)].length, 1);
checkGreaterOrEqual('Story media fetch block helper usage', [...getMigrationFunctionSource(storiesMigrationSource, 'get_visible_story').matchAll(/private\.is_interaction_blocked/g)].length, 1);
checkGreaterOrEqual('Story viewed block helper usage', [...getMigrationFunctionSource(storiesMigrationSource, 'mark_story_viewed').matchAll(/private\.is_interaction_blocked/g)].length, 1);
checkGreaterOrEqual('Story list LIMIT 100', [...getMigrationFunctionSource(storiesMigrationSource, 'list_visible_stories').matchAll(/LIMIT 100/g)].length, 1);
const storyListReturn = getMigrationFunctionSource(storiesMigrationSource, 'list_visible_stories').match(/RETURNS TABLE \(([\s\S]*?)\)\nLANGUAGE/);
checkFalse('Story list return excludes media_data', (storyListReturn?.[1] ?? '').includes('media_data'));
checkFalse('Story list return excludes media_type', (storyListReturn?.[1] ?? '').includes('media_type'));
checkGreaterOrEqual('Story create profile row lock', [...getMigrationFunctionSource(storiesMigrationSource, 'create_own_story').matchAll(/FOR UPDATE/g)].length, 1);
checkGreaterOrEqual('Story create clock timestamp', [...getMigrationFunctionSource(storiesMigrationSource, 'create_own_story').matchAll(/pg_catalog\.clock_timestamp\(\)/g)].length, 1);
checkGreaterOrEqual('Story UUID default is pg_catalog-qualified', [...storiesMigrationSource.matchAll(/DEFAULT pg_catalog\.gen_random_uuid\(\)/g)].length, 1);
checkGreaterOrEqual('Story list RPC frontend usage', countMatches(/rpc\(\s*['"]list_visible_stories['"]/g), 1);
checkGreaterOrEqual('Story media RPC frontend usage', countMatches(/rpc\(\s*['"]get_visible_story['"]/g), 1);
checkGreaterOrEqual('Story viewed RPC frontend usage', countMatches(/rpc\(\s*['"]mark_story_viewed['"]/g), 1);
checkGreaterOrEqual('Own Story RPC frontend usage', countMatches(/rpc\(\s*['"]get_own_active_story['"]/g), 1);
checkGreaterOrEqual('Story create RPC frontend usage', countMatches(/rpc\(\s*['"]create_own_story['"]/g), 1);
checkGreaterOrEqual('Story delete RPC frontend usage', countMatches(/rpc\(\s*['"]delete_own_story['"]/g), 1);
checkZero('direct frontend Stories table queries', countMatches(/from\(\s*['"]stories['"]\s*\)/g));
checkZero('direct frontend Story view table queries', countMatches(/from\(\s*['"]story_views['"]\s*\)/g));
checkZero('direct frontend private Story-table access', countMatchesInPaths(storyFrontendFiles, /private\.(?:stories|story_views)/g));
checkZero('Story Supabase Storage usage', countMatchesInPaths(storyFrontendFiles, /supabase\.storage/g));
checkZero('Story Realtime usage', countMatchesInPaths(storyFrontendFiles, /(?:supabase\.channel|postgres_changes)/g));
checkZero('local Story persistence', countMatchesInPaths(storyFrontendFiles, /(?:localStorage|sessionStorage|indexedDB)/gi));
checkZero('fake hasStory runtime path', countMatchesInPaths(storyFrontendFiles, /\bhasStory\b/g));
checkZero('fake storyViewed runtime path', countMatchesInPaths(storyFrontendFiles, /\bstoryViewed\b/g));
checkZero('local viewedStories Set truth', countMatchesInPaths(storyFrontendFiles, /viewedStories/g));
checkZero('private-photo Story copy path', countMatchesInPaths(storyFrontendFiles, /(?:profile_private_photos|private_photos|authorized_private)/g));
checkZero('Story viewer identity/count exposure', countMatchesInPaths(storyFrontendFiles, /(?:viewer_id|viewerIds|viewer_count|viewerCount)/g));
checkZero('legacy profiles.private_photos runtime references', countMatches(/profiles\.private_photos/g));
checkZero('direct frontend conversation inserts', countMatches(/from\(\s*['"]conversations['"]\s*\)\s*\.insert\s*\(/gs));
checkGreaterOrEqual('conversation creation RPC references', countMatches(/rpc\(\s*['"]get_or_create_conversation['"]/g), 1);
checkGreaterOrEqual('like RPC references', countMatches(/rpc\(\s*['"]send_like_with_cooldown['"]/g), 1);
checkGreaterOrEqual('boost RPC references', countMatches(/rpc\(\s*['"]boost_user_profile['"]/g), 1);
checkGreaterOrEqual('message read RPC references', countMatches(/rpc\(\s*['"]mark_messages_read['"]/g), 1);
checkGreaterOrEqual('vanish RPC references', countMatches(/rpc\(\s*['"]hide_own_vanish_message['"]/g), 1);
checkGreaterOrEqual('per-user clear RPC references', countMatches(/rpc\(\s*['"]clear_own_conversation['"]/g), 1);
checkGreaterOrEqual('canonical protected-photo table references', countMatches(/from\(\s*['"]profile_private_photos['"]/g), 1);
checkZero('direct profiles.is_vip updates', countMatches(/from\(\s*['"]profiles['"]\s*\)\s*\.update\(\s*\{[^}]*\bis_vip\b/gs));
checkZero('frontend auth.admin references', countMatches(/auth\.admin\b/g));
checkZero('frontend service_role references', countMatches(/service_role/g));
checkZero('gpulse_password persistence writes', countMatches(/(?:setItem|set\()\s*\(\s*['"]gpulse_password['"]/g));
checkZero(
  'public discovery protected-photo table references',
  countMatchesInFiles(
    (file) => /src[\\/]components[\\/](?:home|explore)[\\/]/.test(file),
    /from\(\s*['"]profile_private_photos['"]\s*\)|profiles\.private_photos/g,
  ),
);
checkZero('runtime fake profile image sources', countMatches(/(?:pravatar|randomuser|picsum|loremflickr)/gi));
checkZero('fabricated exact distance display', countMatches(/<\s*100m/gi));
checkZero('direct frontend protected-location table access', countMatches(/from\(\s*['"]profile_locations['"]\s*\)/g));
checkZero('direct frontend protected-location table mutation', countMatches(/from\(\s*['"]profile_locations['"]\s*\)\s*\.(?:insert|update|upsert|delete)\s*\(/gs));
checkZero('raw GPS local persistence', countMatches(/(?:localStorage|sessionStorage)\.(?:setItem|set)\s*\([^)]*(?:latitude|longitude|coords)/gis));
checkZero('raw GPS writes to public profiles', countMatches(/from\(\s*['"]profiles['"]\s*\)\s*\.update\s*\(\s*\{[^}]*\b(?:latitude|longitude|lat|lng)\b/gs));
checkZero('numeric derived distance fallbacks', countMatches(/\b(?:distance|distanceBucket)\s*(?:\?\?|\|\|)\s*['"]\d/gi));
checkEqual('browser getCurrentPosition usage', countMatches(/navigator\.geolocation\.getCurrentPosition/g), 1);
checkZero('browser watchPosition usage', countMatches(/navigator\.geolocation\.watchPosition/g));
checkEqual('automatic geolocation effect paths', automaticGeolocationEffectCount, 0);
checkGreaterOrEqual('explicit location update click controls', countMatches(/onClick=\{handleLocationUpdate\}/g), 1);
checkGreaterOrEqual('set own location RPC references', countMatches(/rpc\(\s*['"]set_own_location['"]/g), 1);
checkGreaterOrEqual('clear own location RPC references', countMatches(/rpc\(\s*['"]clear_own_location['"]/g), 1);
checkGreaterOrEqual('own location status RPC references', countMatches(/rpc\(\s*['"]get_own_location_status['"]/g), 1);
checkGreaterOrEqual('distance bucket RPC references', countMatches(/rpc\(\s*['"]get_profile_distance_buckets['"]/g), 1);
checkZero('direct like/boost notification inserts', countMatches(/from\(\s*['"]notifications['"]\s*\)\s*\.insert\(\s*\{[^}]*type:\s*['"](?:like|boost)['"]/gs));
checkZero('direct frontend notification updates', countMatches(/from\(\s*['"]notifications['"]\s*\)\s*\.update\s*\(/gs));
checkGreaterOrEqual('notification read RPC references', countMatches(/rpc\(\s*['"]mark_own_notifications_read['"]/g), 1);
checkZero('direct frontend notification inserts', countMatches(/from\(\s*['"]notifications['"]\s*\)\s*\.insert\s*\(/gs));
checkZero('direct private album table access', countMatches(/from\(\s*['"]private_album_access['"]\s*\)/g));
checkGreaterOrEqual('private album request RPC references', countMatches(/rpc\(\s*['"]request_private_album['"]/g), 1);
checkGreaterOrEqual('authorized private photo RPC references', countMatches(/rpc\(\s*['"]get_authorized_private_photos['"]/g), 1);
checkGreaterOrEqual('private album status RPC references', countMatches(/rpc\(\s*['"]get_private_album_request_status['"]/g), 1);
checkGreaterOrEqual('private album response RPC references', countMatches(/rpc\(\s*['"]respond_private_album_request['"]/g), 1);
checkGreaterOrEqual('private album revoke RPC references', countMatches(/rpc\(\s*['"]revoke_private_album_access['"]/g), 1);
checkGreaterOrEqual('private album owner list RPC references', countMatches(/rpc\(\s*['"]list_own_private_album_relationships['"]/g), 1);

// ========== FIX-08B REGRESSION CHECKS ==========
checkFalse('openLegal contains no legal_consent write', /const openLegal = [\s\S]{0,200}?setAppState\('legal'\)[\s\S]{0,100}legal_consent/.test(appSource));
checkTrue('explicit acceptConsent writes legal_consent=true', /acceptConsent[\s\S]{0,300}legal_consent:\s*true/.test(appSource));
checkTrue('LegalTerms onAccept gated to missing-consent flow', appSource.includes('onAccept={user && userNeedsConsent ? acceptConsent : undefined}'));
checkTrue('stale user check cannot authorize different user', appSource.includes('checkedUserId') && appSource.includes('checkedUserId !== user.id'));
checkTrue('verification failure routes to login (fail closed)', appSource.includes("checkedUserId !== user.id") && appSource.includes("setAppState('login')"));
checkTrue('incomplete profile routes to profile-setup', appSource.includes("setAppState('profile-setup')"));
checkTrue('onComplete runs only after successful persistence', /setIsEditModalOpen\(false\)[\s\S]{0,80}onComplete\?\.\(\)/.test(profileViewSource));
checkTrue('OTP remains exactly 6 digits', loginScreenSource.includes('otpCode.length !== 6') && loginScreenSource.includes('maxLength={6}'));
checkTrue('profile name validator remains 1-14 Han/English mixed', profileUtilitySource.includes('Script=Han') && profileUtilitySource.includes('1,14'));

// ========== LOGIN BLOCKER REGRESSION CHECKS ==========
checkTrue('Email login disabled only by local loading', loginScreenSource.includes('disabled={loading}') && !/disabled=\{[^}]*isAuthLoading[^}]*\}/.test(loginScreenSource));
checkTrue('Google handler has finally clearing loading', /provider === 'google'[\s\S]{0,2000}finally[\s\S]{0,100}setLoading\(false\)/.test(loginScreenSource));
checkTrue('Email handler has finally clearing loading', /provider === 'email'[\s\S]{0,2000}finally[\s\S]{0,100}setLoading\(false\)/.test(loginScreenSource));
checkTrue('Google button has type=button', /<button\s+type="button"\s+onClick=\{[\s\S]*?handleLogin\('google'\)/.test(loginScreenSource));
checkTrue('Email button disabled only by local loading', /disabled=\{loading\}/.test(loginScreenSource));
checkTrue('Early return clears loading for empty credentials', /credentialsRequired[\s\S]{0,120}setLoading\(false\)/.test(loginScreenSource));
checkTrue('no isAuthLoading shared in login button disabled', !/disabled=\{[^}]*isAuthLoading[^}]*\}/.test(loginScreenSource));

for (const check of checks) {
  console.log(`${check.result ? 'PASS' : 'FAIL'} ${check.name}: ${check.actual} ${check.operator} ${check.expected}`);
}

if (failures.length > 0) {
  console.error(`GPulse static verification failed: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`GPulse static verification passed (${files.length} runtime source files scanned).`);
}
