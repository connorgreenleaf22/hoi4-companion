import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {spawn,type ChildProcess} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readProcessIdentity} from '../server/bridge/process-identity';
import {readHeartbeat,writeNativeJson} from '../server/bridge/native-files';

const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check:()=>boolean,ms=15000){const end=Date.now()+ms;while(!check()&&Date.now()<end)await pause(50);assert.ok(check(),'Bounded supervisor lifecycle wait expired');}
// Retain the full synthetic receipts, including refusals/errors; never invoke a game executable.
for(const scenario of ['deadline','stop','peer-loss','wrong-identity','corrupt-budget'])test(`production paired supervisor lifecycle: ${scenario}`,{skip:process.platform!=='win32',timeout:25000},async()=>{
 fs.mkdirSync('.bridge-local',{recursive:true});const run=fs.mkdtempSync(path.resolve('.bridge-local','supervisor-e2e-')),budgetFile=path.join(run,'budget.json'),sessionId=randomUUID();
 const children:ChildProcess[]=[];
 const create=(args:string[],env:NodeJS.ProcessEnv=process.env)=>{const child=spawn(process.execPath,args,{cwd:process.cwd(),env,windowsHide:true,stdio:['ignore','ignore','pipe']});children.push(child);let errors='';child.stderr?.on('data',data=>errors+=data);child.on('exit',()=>fs.writeFileSync(path.join(run,child.pid+'-stderr.txt'),errors));return child;};
 try{
  const target=create(['-e','setInterval(()=>{},1000)']),unrelated=create(['-e','setInterval(()=>{},1000)']);
  await Promise.all([target,unrelated].map(child=>new Promise<void>((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);})));
  const identity=readProcessIdentity(target.pid!),other=readProcessIdentity(unrelated.pid!);
  const startedAt=new Date().toISOString(),deadline=Date.now()+(scenario==='deadline'||scenario==='wrong-identity'?4000:15000);
  const options={run,budgetFile,sessionId,identity:scenario==='wrong-identity'?{...other,creation_time:identity.creation_time+'0'}:identity,startedAt,deadline,paired:true};
  writeNativeJson(budgetFile,{startedAt,stopped:false,revision:0});
  fs.writeFileSync(path.join(run,'test-plan.json'),JSON.stringify({scenario,...options,unrelated:other},null,2));
  const source=`import {runNativeSupervisor} from ${JSON.stringify(pathToFileURL(path.resolve('server/bridge/native-supervisor.ts')).href)};await runNativeSupervisor(JSON.parse(process.env.SUPERVISOR_TEST_OPTIONS));`;
  const guards=[false,true].map(backup=>create(['--import','tsx','--input-type=module','-e',source],{...process.env,SUPERVISOR_TEST_OPTIONS:JSON.stringify({...options,backup})}));
  await until(()=>['watchdog','backup'].every(name=>fs.existsSync(path.join(run,name+'-ready.json'))),6000);
  for(const [index,name] of ['watchdog','backup'].entries()){const ready=JSON.parse(fs.readFileSync(path.join(run,name+'-ready.json'),'utf8'));assert.equal(ready.pid,guards[index].pid);assert.equal(ready.sessionId,sessionId);assert.equal(ready.deadline,deadline);}
  // Exercise actual shared atomic budget replacement while both append/read heartbeat files.
  for(let revision=1;revision<=80;revision++){writeNativeJson(budgetFile,{startedAt,stopped:false,revision});await pause(5);}
  await until(()=>['watchdog','backup'].every(name=>(readHeartbeat(path.join(run,name+'-heartbeat.jsonl'))?.sequence??-1)>=2),2500);
  if(scenario==='stop')writeNativeJson(budgetFile,{startedAt,stopped:true});
  if(scenario==='peer-loss')guards[1].kill();
  if(scenario==='corrupt-budget')fs.writeFileSync(budgetFile,'{broken');
  await until(()=>fs.existsSync(path.join(run,'deadline-receipt.json'))&&(scenario==='peer-loss'||fs.existsSync(path.join(run,'backup-deadline-receipt.json'))));
  const receipts=['deadline-receipt.json','backup-deadline-receipt.json'].filter(file=>fs.existsSync(path.join(run,file))).map(file=>JSON.parse(fs.readFileSync(path.join(run,file),'utf8')));
  const expectedReason=scenario==='stop'?'emergency-stop':scenario==='peer-loss'?'supervisor-failure':scenario==='corrupt-budget'?'invalid-budget':'deadline';
  if(scenario==='wrong-identity'){
   assert.ok(receipts.every(r=>r.outcome==='refused'));assert.ok(receipts.some(r=>/identity mismatch/.test(r.detail)));assert.equal(readProcessIdentity(target.pid!).creation_time,identity.creation_time);
  }else{assert.ok(receipts.some(r=>r.reason===expectedReason&&r.outcome==='terminated'),JSON.stringify(receipts));assert.throws(()=>readProcessIdentity(target.pid!));}
  if(scenario==='corrupt-budget')assert.ok(receipts.some(r=>/SyntaxError|JSON/.test(r.triggerDetail)));
  assert.equal(readProcessIdentity(unrelated.pid!).creation_time,other.creation_time);
  await until(()=>guards.every(child=>child.exitCode!==null||child.signalCode!==null));
  console.log('Retained lifecycle evidence: '+run);
 }finally{
  for(const child of children)if(child.exitCode===null&&child.signalCode===null)child.kill();
  await until(()=>children.every(child=>child.exitCode!==null||child.signalCode!==null),5000);
 }
});
