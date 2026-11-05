import {rmSync} from 'node:fs';
rmSync('build/development.json',{force:true});
import { build } from 'esbuild';
await build({ entryPoints: ['server/cli.ts','electron/main.ts'], outdir: 'build', entryNames: '[name]', outExtension: {'.js': '.cjs'}, bundle: true, platform: 'node', format: 'cjs', external: ['electron'], target: 'node22' });
// Electron's package entry is deliberately separate from the browser service.
import { rename } from 'node:fs/promises';
await rename('build/main.cjs', 'build/electron.cjs');
