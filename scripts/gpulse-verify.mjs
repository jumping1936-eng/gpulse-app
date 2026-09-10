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

for (const check of checks) {
  console.log(`${check.result ? 'PASS' : 'FAIL'} ${check.name}: ${check.actual} ${check.operator} ${check.expected}`);
}

if (failures.length > 0) {
  console.error(`GPulse static verification failed: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`GPulse static verification passed (${files.length} runtime source files scanned).`);
}
