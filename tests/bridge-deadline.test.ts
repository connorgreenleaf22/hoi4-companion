import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {superviseOwnedTest} from '../server/bridge/deadline';
import {readProcessIdentity,terminateOwnedProcess} from '../server/bridge/process-identity';
const identity={pid:1,creation_time:'fixture',executable_path:'hoi4.exe'};
test('watchdog deadlines survive wall-clock rollback and stop/corrupt-state requests terminate only once',async()=>{
 for(const scenario of ['deadline','rollback','stop','corrupt','changed']){
  let wall=1000,mono=0,kills=0,result:any;
  await superviseOwnedTest(identity,2000,{now:()=>wall,monotonic:()=>mono,sleep:async ms=>{mono+=ms;wall+=scenario==='rollback'?-ms:ms;},stopped:()=>{if(scenario==='corrupt')throw Error('Bad JSON');return scenario==='stop';},terminate:expected=>{assert.deepEqual(expected,identity);if(scenario==='changed')throw Error('Ownership changed');kills++;},finish:value=>result=value});
  assert.ok(mono<=1000);assert.equal(kills,scenario==='changed'?0:1);assert.equal(result.outcome,scenario==='changed'?'refused':'terminated');assert.equal(result.reason,scenario==='stop'?'emergency-stop':scenario==='corrupt'?'invalid-budget':'deadline');
 }
});
test('separate watchdog process enforces a deadline without further parent input', {skip:process.platform!=='win32',timeout:20000},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-watchdog-')),receipt=path.join(root,'receipt.json');
 const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true});let guard:ReturnType<typeof spawn>|undefined;
 await new Promise<void>((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
 try{
  const expected=readProcessIdentity(child.pid!);
  const source=`import fs from 'node:fs';import {superviseOwnedTest} from ${JSON.stringify(pathToFileURL(path.resolve('server/bridge/deadline.ts')).href)};import {terminateOwnedProcess} from ${JSON.stringify(pathToFileURL(path.resolve('server/bridge/process-identity.ts')).href)};await superviseOwnedTest(JSON.parse(process.env.OWNED_TEST_IDENTITY),Date.now()+500,{now:Date.now,monotonic:()=>performance.now(),sleep:ms=>new Promise(r=>setTimeout(r,ms)),stopped:()=>false,terminate:terminateOwnedProcess,finish:r=>fs.writeFileSync(process.env.OWNED_TEST_RECEIPT,JSON.stringify(r))});`;
  guard=spawn(process.execPath,['--import','tsx','--input-type=module','-e',source],{cwd:process.cwd(),env:{...process.env,OWNED_TEST_IDENTITY:JSON.stringify(expected),OWNED_TEST_RECEIPT:receipt},stdio:'ignore',windowsHide:true});
  const code=await new Promise<number|null>((resolve,reject)=>{guard!.once('exit',resolve);guard!.once('error',reject);});assert.equal(code,0);assert.equal(JSON.parse(fs.readFileSync(receipt,'utf8')).outcome,'terminated');
  assert.throws(()=>readProcessIdentity(child.pid!));
 }finally{if(child.exitCode===null)child.kill();if(guard&&guard.exitCode===null)guard.kill();fs.rmSync(root,{recursive:true,force:true});}
});
test('Windows OS identity refuses a foreign lifetime then terminates only its owned synthetic child', {skip:process.platform!=='win32',timeout:20000},async()=>{
 const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true});
 await new Promise<void>((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
 try{
  const expected=readProcessIdentity(child.pid!);
  assert.throws(()=>terminateOwnedProcess({...expected,creation_time:'0'}));assert.equal(readProcessIdentity(child.pid!).creation_time,expected.creation_time);
  terminateOwnedProcess(expected);
  await new Promise<void>(resolve=>child.exitCode!==null?resolve():child.once('exit',()=>resolve()));
  assert.throws(()=>readProcessIdentity(child.pid!));
 }finally{if(child.exitCode===null)child.kill();}
});
