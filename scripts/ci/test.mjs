import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const files = JSON.parse(fs.readFileSync(new URL('./test-files.json', import.meta.url), 'utf8'));
if (!files.length || files.some(f => !/^tests\/[a-z0-9-]+\.test\.ts$/.test(f) || !fs.existsSync(f))) throw new Error('Invalid CI allowlist');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], {stdio: 'inherit', timeout: 120000, windowsHide: true});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
