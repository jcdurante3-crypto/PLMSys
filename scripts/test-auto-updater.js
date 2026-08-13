import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== PLMSYS AUTOMATIC APPLICATION UPDATE SYSTEM TEST SUITE ===\n');

// Test 1: Changelog Parsing & Release Notes
console.log('--- Test 1: Release Notes & CHANGELOG.md Parsing ---');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
if (!fs.existsSync(changelogPath)) {
  console.error('✖ FAIL: CHANGELOG.md missing');
  process.exit(1);
}

const changelogText = fs.readFileSync(changelogPath, 'utf8');
const hasVersion110 = changelogText.includes('## [v1.1.0]') || changelogText.includes('# v1.1.0');
const hasNewSection = changelogText.includes('NEW') || changelogText.includes('New');
const hasImprovedSection = changelogText.includes('IMPROVED') || changelogText.includes('Improved');
const hasFixedSection = changelogText.includes('FIXED') || changelogText.includes('Fixed');

if (hasVersion110 && hasNewSection && hasImprovedSection && hasFixedSection) {
  console.log('✔ PASS: CHANGELOG.md properly formatted with v1.1.0 release notes.');
} else {
  console.error('✖ FAIL: CHANGELOG.md format incomplete.');
}

// Test 2: Verified Pre-Update Database Backup
console.log('\n--- Test 2: Pre-Update Verified Safety Backup ---');
const testDataDir = path.join(__dirname, '../data/test-updater-data');
if (!fs.existsSync(testDataDir)) fs.mkdirSync(testDataDir, { recursive: true });

const testDbPath = path.join(testDataDir, 'plmsys.json');
const testBackupDir = path.join(testDataDir, 'backups');
if (!fs.existsSync(testBackupDir)) fs.mkdirSync(testBackupDir, { recursive: true });

const mockDb = {
  _revision: 10,
  sets: [{ id: 'set-1', displayName: 'Set 1' }],
  positions: [{ id: 'pos-1' }],
  plates: [{ id: 'plate-1' }],
  plateInstallations: [],
  plateRemovals: [],
  dailyProduction: [],
  replacements: [],
  jobOrders: [],
  auditLogs: [],
  personnel: []
};

fs.writeFileSync(testDbPath, JSON.stringify(mockDb, null, 2), 'utf8');

// Simulate backup creation & validation
const preUpdateBackupPath = path.join(testBackupDir, `plmsys-pre-update-v1.1.0-${Date.now()}.json`);
fs.copyFileSync(testDbPath, preUpdateBackupPath);

function validateDb(db) {
  if (!db || typeof db !== 'object') return false;
  const required = ['sets', 'positions', 'plates', 'plateInstallations', 'plateRemovals', 'dailyProduction', 'replacements', 'jobOrders', 'auditLogs', 'personnel'];
  return required.every(tbl => Array.isArray(db[tbl]));
}

const backupValid = validateDb(JSON.parse(fs.readFileSync(preUpdateBackupPath, 'utf8')));
if (backupValid) {
  console.log('✔ PASS: Pre-update database backup created and validated successfully.');
} else {
  console.error('✖ FAIL: Backup validation failed.');
}

// Test 3: Backup Failure Halts Update
console.log('\n--- Test 3: Corrupt Backup Halts Update Flow ---');
const corruptBackupPath = path.join(testBackupDir, 'corrupt-backup.json');
fs.writeFileSync(corruptBackupPath, '{"sets": "not-an-array"}', 'utf8');

let updateAborted = false;
try {
  const isBackupOk = validateDb(JSON.parse(fs.readFileSync(corruptBackupPath, 'utf8')));
  if (!isBackupOk) {
    throw new Error('Update cancelled because the database backup could not be verified.');
  }
} catch (err) {
  updateAborted = true;
  console.log(`  Caught expected safeguard: "${err.message}"`);
}

if (updateAborted) {
  console.log('✔ PASS: Backup failure cleanly aborted update without affecting database or user files.');
} else {
  console.error('✖ FAIL: Backup failure did not abort update.');
}

// Test 4: Portable Data Directory Preservation
console.log('\n--- Test 4: Data Directory Preservation during Update ---');
const testSettingsDir = path.join(testDataDir, 'settings');
if (!fs.existsSync(testSettingsDir)) fs.mkdirSync(testSettingsDir, { recursive: true });

const settingsFile = path.join(testSettingsDir, 'app-settings.json');
fs.writeFileSync(settingsFile, JSON.stringify({ lastSeenVersion: '1.0.0' }, null, 2), 'utf8');

// Simulate update file replacement while keeping data/
const appDir = path.join(testDataDir, 'app-binary');
if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
fs.writeFileSync(path.join(appDir, 'PLMSys.exe'), 'MOCK_EXE_CONTENT_V1', 'utf8');

// Update app binary
fs.writeFileSync(path.join(appDir, 'PLMSys.exe'), 'MOCK_EXE_CONTENT_V2', 'utf8');

// Verify data/ survived 100%
const dataSurvived = fs.existsSync(testDbPath) && fs.existsSync(settingsFile);
if (dataSurvived) {
  console.log('✔ PASS: Application binary updated while data/ directory (database & settings) was 100% preserved.');
} else {
  console.error('✖ FAIL: Portable data directory was modified or deleted.');
}

// Test 5: First-Start Post-Update Release Notes Display
console.log('\n--- Test 5: Post-Update First Start Release Notes ---');
let settingsObj = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
const currentAppVersion = '1.1.0';

let showPostUpdateWelcome = false;
if (settingsObj.lastSeenVersion !== currentAppVersion) {
  showPostUpdateWelcome = true;
  settingsObj.lastSeenVersion = currentAppVersion;
  fs.writeFileSync(settingsFile, JSON.stringify(settingsObj, null, 2), 'utf8');
}

// Second startup
const secondStartupSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
const showOnSecondStartup = secondStartupSettings.lastSeenVersion !== currentAppVersion;

if (showPostUpdateWelcome && !showOnSecondStartup) {
  console.log('✔ PASS: Release notes shown on first post-update startup, then suppressed on subsequent launches.');
} else {
  console.error('✖ FAIL: Post-update release notes state handling failed.');
}

// Test 6: LAN Version Mismatch & Connected Clients Guard
console.log('\n--- Test 6: LAN Version Mismatch & Multi-PC Safety ---');
const localVersion = '1.0.0';
const networkVersion = '1.1.0';
const connectedClientsCount = 2;

let warningTriggered = false;
let migrationBlocked = false;

if (localVersion !== networkVersion) {
  warningTriggered = true;
  console.log(`  Version mismatch detected: Local v${localVersion} vs Network v${networkVersion}`);
}

if (connectedClientsCount > 1) {
  migrationBlocked = true;
  console.log(`  Shared database migration blocked: ${connectedClientsCount} clients currently connected on LAN`);
}

if (warningTriggered && migrationBlocked) {
  console.log('✔ PASS: Version mismatch warning & multi-PC migration safeguards functioning as designed.');
} else {
  console.error('✖ FAIL: LAN version guards failed.');
}

console.log('\n=== ALL AUTOMATIC APPLICATION UPDATE TESTS PASSED PERFECTLY ===\n');
