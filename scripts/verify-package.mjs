import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import * as asar from '@electron/asar';

const sha=data=>createHash('sha256').update(data).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const identity=metadata=>Object.fromEntries(['name','version','main','dependencies'].map(key=>[key,canonical(metadata[key]??null)]));
const isRuntime=file=>file==='package.json'||['build/','dist/','assets/','node_modules/'].some(prefix=>file.startsWith(prefix));
const validName=file=>typeof file==='string'&&file!==''&&!file.startsWith('/')&&!file.includes('\\')&&!file.includes(':')&&file.split('/').every(part=>part!==''&&part!=='.'&&part!=='..');
const arg=name=>{const index=process.argv.indexOf(name);if(index<0)return undefined;const value=process.argv[index+1];if(!value||value.startsWith('--'))throw Error('Supply a value for '+name);return value;};
const required=name=>{const value=arg(name);if(!value)throw Error('Required argument: '+name);return path.resolve(value);};
const writeNew=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2),{flag:'wx'});};
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(item=>{const file=path.join(directory,item.name);if(item.isSymbolicLink())throw Error('Runtime snapshot must not contain links: '+file);return item.isDirectory()?walk(file):item.isFile()?[file]:[];});}
export function captureRuntime(root){
  const members=walk(root).map(file=>{const name=path.relative(root,file).replaceAll('\\','/');if(!validName(name)||!isRuntime(name))throw Error('Unexpected file in retained runtime snapshot: '+name);const bytes=fs.readFileSync(file);return {file:name,sha256:sha(bytes),bytes:bytes.length};}).sort((a,b)=>a.file.localeCompare(b.file));
  const metadata=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  if(!members.some(member=>member.file===metadata.main)||!members.some(member=>member.file==='dist/index.html'))throw Error('Runtime snapshot lacks its main entry or dist/index.html.');
  return {formatVersion:1,capturedAt:new Date().toISOString(),runtimeRoot:path.resolve(root),members,runtimeIdentity:identity(metadata),sourceLinkage:'Link this frozen runtime manifest to the build/source manifest separately; capturing bytes alone is not source equivalence or native execution.'};
}
function archiveFiles(archive){
  const result=[];
  const visit=(files,prefix='')=>{for(const [name,node] of Object.entries(files||{})){const file=prefix+name;if(node.files)visit(node.files,file+'/');else {if(node.link||node.unpacked)throw Error('Linked/unpacked runtime member requires a separate explicit manifest: '+file);result.push(file);}}};
  visit(asar.getRawHeader(archive).header.files);return result.sort();
}
export function captureRuntimeArchive(archive){
  asar.uncache(archive);
  const members=archiveFiles(archive).map(file=>{if(!validName(file)||!isRuntime(file))throw Error('Unexpected runtime archive file: '+file);const bytes=asar.extractFile(archive,path.normalize(file));return {file,sha256:sha(bytes),bytes:bytes.length};});
  const metadata=JSON.parse(asar.extractFile(archive,'package.json'));
  if(!members.some(member=>member.file===metadata.main)||!members.some(member=>member.file==='dist/index.html'))throw Error('Runtime archive lacks its main entry or dist/index.html.');
  return {formatVersion:1,capturedAt:new Date().toISOString(),runtimeArchive:path.resolve(archive),runtimeArchiveSHA256:sha(fs.readFileSync(archive)),members,runtimeIdentity:identity(metadata),sourceLinkage:'Frozen full runtime archive including production dependencies. Build/source linkage must be established separately; this capture is not native execution.'};
}
export function verifyRuntime(archive,manifest){
  // ASAR's process-wide header cache must not certify bytes from an earlier file at this path.
  asar.uncache(archive);
  if(manifest.formatVersion!==1||!Array.isArray(manifest.members)||!manifest.members.length)throw Error('Unsupported or empty frozen runtime manifest.');
  const names=new Set();for(const member of manifest.members){if(!validName(member.file)||!isRuntime(member.file)||names.has(member.file)||!/^[a-f0-9]{64}$/i.test(member.sha256)||!Number.isSafeInteger(member.bytes)||member.bytes<0)throw Error('Invalid frozen runtime member.');names.add(member.file);}
  const actual=archiveFiles(archive),expected=[...names].sort();
  const missing=expected.filter(file=>!actual.includes(file)),unexpected=actual.filter(file=>!names.has(file));
  const checks=manifest.members.map(member=>{
    if(missing.includes(member.file))return {file:member.file,match:false,reason:'missing-from-archive'};
    const bytes=asar.extractFile(archive,path.normalize(member.file)),digest=sha(bytes);
    if(member.file==='package.json'){
      const matches=JSON.stringify(canonical(identity(JSON.parse(bytes))))===JSON.stringify(canonical(manifest.runtimeIdentity));
      return {file:member.file,expectedSha256:member.sha256,packedSha256:digest,byteIdentical:member.sha256===digest,match:matches,verification:'Runtime name/version/main/dependencies match. Production normalization may remove development/build metadata.'};
    }
    return {file:member.file,expectedSha256:member.sha256,packedSha256:digest,expectedBytes:member.bytes,packedBytes:bytes.length,match:member.sha256===digest&&member.bytes===bytes.length};
  });
  return {passed:missing.length===0&&unexpected.length===0&&checks.every(check=>check.match),missing,unexpected,checks};
}
async function main(){
  const capture=arg('--capture-manifest');
  if(capture){const archived=arg('--runtime-archive');if(archived&&arg('--runtime-root'))throw Error('Choose one frozen runtime archive or directory.');const root=archived?undefined:required('--runtime-root');if(root===path.resolve(process.cwd()))throw Error('Use a retained runtime-only snapshot, not the mutable repository root.');const manifest=archived?captureRuntimeArchive(path.resolve(archived)):captureRuntime(root);writeNew(path.resolve(capture),manifest);console.log(JSON.stringify({captured:true,manifest:path.resolve(capture),members:manifest.members.length}));return;}
  const archive=required('--archive'),manifestFile=required('--manifest'),executable=required('--executable');
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));const result=verifyRuntime(archive,manifest);
  const outputBase=path.resolve(arg('--output')||process.env.HOI4_QA_OUTPUT||path.join(os.tmpdir(),'hoi4-qa-package-evidence'));
  const output=path.join(outputBase,'package-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8));
  const report={at:new Date().toISOString(),level:'package-identity',independentAcceptance:false,nativePortableUI:false,...result,archive,asarSHA256:sha(fs.readFileSync(archive)),manifest:manifestFile,manifestSHA256:sha(fs.readFileSync(manifestFile)),executable,sha256:sha(fs.readFileSync(executable)),bytes:fs.statSync(executable).size};
  writeNew(path.join(output,'contents-check.json'),report);console.log(JSON.stringify({passed:report.passed,files:report.checks.length,sha256:report.sha256,output,nativePortableUI:false}));if(!report.passed)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url)))main().catch(error=>{console.error(error);process.exitCode=1;});
