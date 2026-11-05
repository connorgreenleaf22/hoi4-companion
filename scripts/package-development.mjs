import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {build,Platform} from 'electron-builder';
const milestone=process.argv[2]||'M5';
if(!/^M\d+$/.test(milestone))throw Error('Use a milestone such as M5.');
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Commit the validated source before packaging a development build.');
const commit=execFileSync('git',['rev-parse','--short=12','HEAD'],{encoding:'utf8'}).trim();
const label=`${milestone}-${commit}`;
const output=path.resolve(process.env.HOI4_DEV_BUILD_ROOT||path.join(os.homedir(),'Documents','HOI4 Companion Development Builds'),label);
if(fs.existsSync(output))throw Error('Build destination already exists; retain it and select a different HOI4_DEV_BUILD_ROOT.');
// The npm script builds first; this stamp is intentionally created only for this package.
fs.writeFileSync('build/development.json',JSON.stringify({label,commit,milestone},null,2));
try{
 await build({targets:Platform.WINDOWS.createTarget('dir'),config:{directories:{output},appId:'local.hoi4.companion.development',productName:`HOI4 Companion ${label}`,win:{target:'dir',signAndEditExecutable:false},forceCodeSigning:false,publish:null}});
 fs.writeFileSync(path.join(output,'BUILD.json'),JSON.stringify({label,commit,source:process.cwd(),executable:path.join(output,'win-unpacked',`HOI4 Companion ${label}.exe`),packaging:'Unsigned isolated development build; no update or release'},null,2));
 console.log(output);
}finally{fs.rmSync('build/development.json',{force:true});}
