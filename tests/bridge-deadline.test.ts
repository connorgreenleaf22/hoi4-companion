import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {superviseOwnedTest,peerHealth} from '../server/bridge/deadline';
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
  const source=`import fs from 'node:fs';import {superviseOwnedTest,peerHealth} from ${JSON.stringify(pathToFileURL(path.resolve('server/bridge/deadline.ts')).href)};import {terminateOwnedProcess} from ${JSON.stringify(pathToFileURL(path.resolve('server/bridge/process-identity.ts')).href)};await superviseOwnedTest(JSON.parse(process.env.OWNED_TEST_IDENTITY),Date.now()+500,{now:Date.now,monotonic:()=>performance.now(),sleep:ms=>new Promise(r=>setTimeout(r,ms)),stopped:()=>false,terminate:terminateOwnedProcess,finish:r=>fs.writeFileSync(process.env.OWNED_TEST_RECEIPT,JSON.stringify(r))});`;
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

test('paired supervisors detect missing, frozen, corrupt or foreign heartbeats on monotonic time',()=>{
 let now=0,peer:any=null;const health=peerHealth(()=>peer,'session',()=>now,100,50);assert.equal(health(),true);now=100;assert.equal(health(),false);
 peer={sessionId:'session',sequence:0};assert.equal(health(),true);now=149;assert.equal(health(),true);now=150;assert.equal(health(),false);
 peer.sequence=1;assert.equal(health(),true);peer.sessionId='foreign';assert.equal(health(),false);
});
test('a failed supervisor forces bounded termination rather than waiting for the original deadline',async()=>{
 let now=0,receipt:any,killed=0;await superviseOwnedTest(identity,100000,{now:()=>now,monotonic:()=>now,sleep:async ms=>{now+=ms;},stopped:()=>false,healthy:()=>now<250,terminate:()=>{killed++;},finish:r=>receipt=r});assert.equal(killed,1);assert.equal(receipt.reason,'supervisor-failure');assert.equal(now,250);
});

test('independent Windows supervisor reacts to stop and peer disappearance while protecting unrelated child', {skip:process.platform!=='win32',timeout:30000},async()=>{
 for(const scenario of ['stop','failed-peer']){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-guard-failure-')),receipt=path.join(root,'receipt.json'),trigger=path.join(root,'stop');
  const spawnIdle=()=>spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true});const target=spawnIdle(),unrelated=spawnIdle(),peer=spawnIdle();let guard:ReturnType<typeof spawn>|undefined;
  await Promise.all([target,unrelated,peer].map(c=>new Promise<void>((resolve,reject)=>{c.once('spawn',resolve);c.once('error',reject);})));
  try{const expected=readProcessIdentity(target.pid!),other=readProcessIdentity(unrelated.pid!),peerId=readProcessIdentity(peer.pid!);
   const source=`import fs from 'node:fs';import {superviseOwnedTest} from ${JSON.stringify(pathToFileURL(path.resolve('server/bridge/deadline.ts')).href)};import {terminateOwnedProcess,readProcessIdentity} from ${JSON.stringify(pathToFileURL(path.resolve('server/bridge/process-identity.ts')).href)};fs.writeFileSync(process.env.READY,'ready');await superviseOwnedTest(JSON.parse(process.env.ID),Date.now()+10000,{now:Date.now,monotonic:()=>performance.now(),sleep:ms=>new Promise(r=>setTimeout(r,ms)),stopped:()=>process.env.SCENARIO==='stop'&&fs.existsSync(process.env.TRIGGER),healthy:()=>process.env.SCENARIO!=='failed-peer'||readProcessIdentity(JSON.parse(process.env.PEER).pid).creation_time===JSON.parse(process.env.PEER).creation_time,terminate:terminateOwnedProcess,finish:r=>fs.writeFileSync(process.env.RECEIPT,JSON.stringify(r))});`;
   guard=spawn(process.execPath,['--import','tsx','--input-type=module','-e',source],{env:{...process.env,ID:JSON.stringify(expected),PEER:JSON.stringify(peerId),SCENARIO:scenario,TRIGGER:trigger,RECEIPT:receipt,READY:path.join(root,'ready')},cwd:process.cwd(),stdio:'ignore',windowsHide:true});
   const deadline=Date.now()+5000;while(!fs.existsSync(path.join(root,'ready'))&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));assert.ok(fs.existsSync(path.join(root,'ready')));if(scenario==='failed-peer')terminateOwnedProcess(peerId);else fs.writeFileSync(trigger,'stop');
   const code=await new Promise<number|null>((resolve,reject)=>{guard!.once('exit',resolve);guard!.once('error',reject);});assert.equal(code,0);const r=JSON.parse(fs.readFileSync(receipt,'utf8'));assert.equal(r.outcome,'terminated');assert.equal(r.reason,scenario==='stop'?'emergency-stop':'supervisor-failure');assert.throws(()=>readProcessIdentity(target.pid!));assert.equal(readProcessIdentity(unrelated.pid!).creation_time,other.creation_time);
  }finally{for(const c of [target,unrelated,peer,guard])if(c&&c.exitCode===null)c.kill();fs.rmSync(root,{recursive:true,force:true});}
 }
});
