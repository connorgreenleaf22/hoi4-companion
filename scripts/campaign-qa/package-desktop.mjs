import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const output = path.resolve(process.argv[2] || '');
const clientZip = path.resolve(process.argv[3] || '');
if (!process.argv[2] || !process.argv[3]) throw Error('Supply a new output directory and the official v0.0.20 Windows AMD64 ZIP.');
if (fs.existsSync(output)) throw Error('Output exists; use a new directory.');
if (execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()) throw Error('Commit reviewed source before packaging.');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const digest = '99474aaa62ece303d7b661f2f46f932dcd560b489b540f817355da25be71bcf3';
if (sha(clientZip) !== digest) throw Error('Official tunnel-client archive hash mismatch.');
const commit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
fs.mkdirSync(path.join(output,'build'),{recursive:true});
const result = await build({entryPoints:{'start-qa':'scripts/campaign-qa/start.ts','prepare-qa':'scripts/campaign-qa/prepare.ts','smoke-qa':'scripts/campaign-qa/smoke.ts','campaign-qa-mcp':'server/campaign-qa-mcp.ts'},outdir:path.join(output,'build'),outExtension:{'.js':'.cjs'},bundle:true,platform:'node',format:'cjs',target:'node24',metafile:true});
fs.cpSync('scripts/campaign-qa/desktop',path.join(output,'desktop'),{recursive:true});
fs.copyFileSync('docs/campaign-qa/DESKTOP-SETUP.md',path.join(output,'READ-ME.md'));
fs.copyFileSync('docs/campaign-qa/EVALUATION.md',path.join(output,'EVALUATION.md'));
fs.mkdirSync(path.join(output,'tunnel-client'));
// Windows tar accepts ZIP archives and an argument array; no shell or PowerShell module path involved.
execFileSync('tar.exe',['-xf',clientZip,'-C',path.join(output,'tunnel-client')]);
const cmd = (name,commands) => fs.writeFileSync(path.join(output,name),'@echo off\r\ncd /d "%~dp0"\r\n'+commands.join('\r\n')+'\r\npause\r\n');
const nodeCheck = 'node -e "if(process.versions.node.split(\'.\')[0] !== \'24\') { console.error(\'Install Node.js 24 LTS first.\'); process.exit(1); }"';
cmd('Prepare Pilot Mod.cmd',[nodeCheck,'if errorlevel 1 exit /b 1','node build\\prepare-qa.cjs']);
cmd('Start Observation Service.cmd',[nodeCheck,'if errorlevel 1 exit /b 1','node build\\start-qa.cjs --index']);
cmd('Connect Secure Tunnel.cmd',['powershell.exe -NoProfile -File "%~dp0desktop\\Connect-Tunnel.ps1"']);
// Carry the license files of bundled JS packages without copying dependencies or local data.
const packages = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
 const match = input.replaceAll('\\','/').match(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)/);
 if (match) packages.add(match[1]);
}
const notices=[];
for (const name of [...packages].sort()) {
 const dir=path.join('node_modules',name);
 const files=fs.readdirSync(dir).filter(f=>/^(licen[cs]e|notice|copying)(\.|$)/i.test(f));
 if (!files.length) throw Error('Missing license notice for '+name);
 notices.push(...files.map(file=>name+'/'+file+'\n'+fs.readFileSync(path.join(dir,file),'utf8')));
}
fs.writeFileSync(path.join(output,'JS-LICENSES.txt'),notices.join('\n\n'));
const inventory=[];
const walk=(dir)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else inventory.push({path:path.relative(output,file).replaceAll('\\','/'),bytes:fs.statSync(file).size,sha256:sha(file)});}};
walk(output);
fs.writeFileSync(path.join(output,'BUILD.json'),JSON.stringify({kind:'read-only-qa-desktop-pilot',commit,nodeRequired:'24.x',nodeBuild:process.version,tunnelClient:'0.0.20',tunnelArchiveSHA256:digest,gameRequired:'1.19.4.2',credentialsIncluded:false,gameDataIncluded:false,inventory},null,2));
console.log(output);
