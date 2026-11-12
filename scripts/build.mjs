import {rmSync} from 'node:fs';
rmSync('build/development.json',{force:true});
import { build } from 'esbuild';
await build({ entryPoints: ['server/cli.ts','electron/main.ts','server/index-worker.ts','server/bridge-mcp.ts'], outdir: 'build', entryNames: '[name]', outExtension: {'.js': '.cjs'}, bundle: true, platform: 'node', format: 'cjs', external: ['electron'], target: 'node22' });
// Developer API/demo for future strategy-workspace consumers; no renderer or bridge wiring.
await build({entryPoints:{'design-evaluation':'server/design-evaluation/index.ts','design-evaluation-demo':'scripts/design-evaluation-demo.ts'},outdir:'build',outExtension:{'.js':'.cjs'},bundle:true,platform:'node',format:'cjs',target:'node22'});
// Electron's package entry is deliberately separate from the browser service.
import { rename } from 'node:fs/promises';
await rename('build/main.cjs', 'build/electron.cjs');
