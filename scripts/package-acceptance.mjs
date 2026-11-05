// Archive an existing commit-identified unpacked development build; never overwrite an artifact.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(process.argv[2]||'');
const stamp=JSON.parse(fs.readFileSync(path.join(root,'BUILD.json'),'utf8'));
if(!/^M\d+(?:\.\d+)?-[a-f0-9]{12}$/.test(stamp.label))throw Error('Expected a development build directory containing BUILD.json.');
const source=path.join(root,'win-unpacked'),zip=path.join(root,stamp.label+'-windows-x64.zip'),extracted=path.join(root,'acceptance-extracted');
if(!fs.existsSync(source)||fs.existsSync(zip)||fs.existsSync(extracted))throw Error('Missing source or existing archive/extraction; refuse to overwrite.');
fs.copyFileSync(`docs/application/MILESTONE-${stamp.label.split('-')[0].slice(1)}-ACCEPTANCE.md`,path.join(source,'START-HERE.md'),fs.constants.COPYFILE_EXCL);
execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','Compress-Archive -LiteralPath $env:HOI4_ARCHIVE_SOURCE -DestinationPath $env:HOI4_ARCHIVE_DEST; if (-not $?) { exit 1 }; Expand-Archive -LiteralPath $env:HOI4_ARCHIVE_DEST -DestinationPath $env:HOI4_ARCHIVE_EXTRACT; if (-not $?) { exit 1 }'],{env:{...process.env,HOI4_ARCHIVE_SOURCE:source,HOI4_ARCHIVE_DEST:zip,HOI4_ARCHIVE_EXTRACT:extracted},windowsHide:true,stdio:'inherit'});
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files=(directory)=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(directory,d.name)):[path.join(directory,d.name)]);
const extractedRoot=path.join(extracted,'win-unpacked');
const manifest=files(source).map(file=>{const relative=path.relative(source,file),sha256=hash(file);if(hash(path.join(extractedRoot,relative))!==sha256)throw Error('Extraction mismatch: '+relative);return {file:relative,sha256};});
if(files(extractedRoot).length!==manifest.length)throw Error('Unexpected extracted files.');
const receipt={label:stamp.label,commit:stamp.commit,zip,zipSHA256:hash(zip),extracted:extractedRoot,files:manifest.length,executable:path.join(extractedRoot,path.basename(stamp.executable)),note:'Byte equality verified. Native launch acceptance is a separate smoke test.'};
fs.writeFileSync(path.join(root,'ACCEPTANCE-BUILD.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
