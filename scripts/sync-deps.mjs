// Tự động `npm install` khi package-lock.json thay đổi (vd. sau khi pull code mới).
// Dùng: node ../scripts/sync-deps.mjs  (chạy trong thư mục backend/ hoặc frontend/)
// Trạng thái lưu tại node_modules/.cache — mỗi máy tự quản lý, không commit.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const lockPath = join(cwd, 'package-lock.json');
const stateDir = join(cwd, 'node_modules', '.cache');
const statePath = join(stateDir, 'classroom-hub-deps.json');

if (!existsSync(lockPath)) process.exit(0);

const hashLock = () =>
  createHash('sha256').update(readFileSync(lockPath, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
const lockHash = hashLock();

let saved = null;
try {
  saved = JSON.parse(readFileSync(statePath, 'utf8')).lockHash;
} catch {
  // chưa có trạng thái → coi như cần cài
}

if (saved === lockHash && existsSync(join(cwd, 'node_modules'))) process.exit(0);

console.log('📦 package-lock.json đã thay đổi → đang chạy npm install...');
const result = spawnSync('npm', ['install'], { cwd, stdio: 'inherit', shell: true });
if (result.status !== 0) {
  console.error('❌ npm install thất bại');
  process.exit(result.status ?? 1);
}

mkdirSync(stateDir, { recursive: true });
// npm install có thể ghi lại package-lock.json → lưu hash sau khi cài
writeFileSync(statePath, JSON.stringify({ lockHash: hashLock() }, null, 2));
console.log('✅ Đã đồng bộ dependencies');
