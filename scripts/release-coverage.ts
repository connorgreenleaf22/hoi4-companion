import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assessCoverage,coverageRoots,fileDigest,listCoverageFiles,sourceObligations,type CoverageLedger} from '../server/release-coverage';

// Explicit inputs; never installs a mod, indexes into an app database, or modifies game files.
const [gameInput,outputInput,mode='--inventory',ledgerInput]=process.argv.slice(2);
if(!gameInput||!outputInput||!['--inventory','--check'].includes(mode))throw Error('Usage: tsx scripts/release-coverage.ts GAME_ROOT NEW_OUTPUT_DIR [--inventory|--check] [LEDGER]');
const game=path.resolve(gameInput),output=path.resolve(outputInput);
if(fs.existsSync(output))throw Error('Output already exists; preserve prior inventory');
if(path.relative(game,output)===''||!path.relative(game,output).startsWith('..'+path.sep))throw Error('Output must be outside the game installation');
const settings=JSON.parse(fs.readFileSync(path.join(game,'launcher-settings.json'),'utf8'));
const files=listCoverageFiles(game).map(file=>({file,sha256:fileDigest(path.join(game,file)),bytes:fs.statSync(path.join(game,file)).size}));
const profile={schemaVersion:1,gameVersion:settings.rawVersion,executableSHA256:fileDigest(path.join(game,'hoi4.exe')),roots:coverageRoots,
 configurations:'Candidate installed content only. No mods; English explanations. Runtime DLC entitlement/playset combinations and denominator require independent approval.',files};
const profileDigest=createHash('sha256').update(JSON.stringify(profile)).digest('hex');
// Hash tracked implementation inputs, not Git HEAD: documentation commits do not invalidate semantics.
const implementationFiles=(directory:string):string[]=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?implementationFiles(path.join(directory,entry.name)):/\.(ts|tsx)$/.test(entry.name)?[path.join(directory,entry.name).replaceAll('\\','/')]:[]);
const engineFiles=[...implementationFiles('server'),...implementationFiles('src'),...implementationFiles('tests'),'scripts/release-coverage.ts','scripts/release-gate.ts','package.json','package-lock.json'].sort();
const engineRevision=createHash('sha256').update(JSON.stringify(engineFiles.map(file=>({file,hash:fileDigest(file)})))).digest('hex');
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'profile.json'),JSON.stringify({...profile,profileDigest,engineRevision,engineFiles},null,2));
const fd=fs.openSync(path.join(output,'obligations.jsonl'),'wx');
function* inventory(){
 try{for(const file of files){
  const absolute=path.join(game,file.file),readable=/\.(txt|yml|yaml|lua|csv|json|gui|gfx|dlc|mod)$/i.test(file.file)&&file.bytes<=8*1024*1024;
  const text=readable?fs.readFileSync(absolute,'utf8'):null;
  if(fileDigest(absolute)!==file.sha256)throw Error('Content changed during inventory: '+file.file);
  for(const obligation of sourceObligations(file.file,file.sha256,text)){fs.writeSync(fd,JSON.stringify(obligation)+'\n');yield obligation;}
 }}finally{fs.closeSync(fd);}
}
const ledger:CoverageLedger=JSON.parse(fs.readFileSync(ledgerInput||'docs/application/explanation-coverage-reviews.json','utf8'));
const result=assessCoverage(inventory(),profileDigest,engineRevision,ledger);
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,unresolvedConstructs:result.unresolvedConstructs.slice(0,15),output},null,2));
if(mode==='--check'&&!result.passed)process.exitCode=1;
