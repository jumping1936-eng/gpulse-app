import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = path.resolve('src');
const files = [];

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
checkGreaterOrEqual('runtime source files scanned', files.length, 1);
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
    /profile_private_photos|private_photos/g,
  ),
);
checkZero('runtime fake profile image sources', countMatches(/(?:pravatar|randomuser|picsum|loremflickr)/gi));
checkZero('fabricated exact distance display', countMatches(/<\s*100m/gi));
checkZero('direct like/boost notification inserts', countMatches(/from\(\s*['"]notifications['"]\s*\)\s*\.insert\(\s*\{[^}]*type:\s*['"](?:like|boost)['"]/gs));

for (const check of checks) {
  console.log(`${check.result ? 'PASS' : 'FAIL'} ${check.name}: ${check.actual} ${check.operator} ${check.expected}`);
}

if (failures.length > 0) {
  console.error(`GPulse static verification failed: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`GPulse static verification passed (${files.length} runtime source files scanned).`);
}
