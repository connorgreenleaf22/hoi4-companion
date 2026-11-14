import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import {spawn} from 'node:child_process';
import {readHeartbeat,writeHeartbeat,writeNativeJson} from '../server/bridge/native-files';
test('heartbeat reader ignores an incomplete trailing record and retains monotonic sequence evidence',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-heartbeats-')),file=path.join(root,'beat.jsonl');try{
  assert.equal(readHeartbeat(file),null);writeHeartbeat(file,'session',1);writeHeartbeat(file,'session',2);fs.appendFileSync(file,'{"session');assert.deepEqual(readHeartbeat(file),{sessionId:'session',sequence:2});
  fs.writeFileSync(file,'not json\n');assert.throws(()=>readHeartbeat(file));fs.writeFileSync(file,Buffer.alloc(4*1024*1024+1));assert.throws(()=>readHeartbeat(file),/bounded/);
  writeNativeJson(path.join(root,'budget'),{stopped:false});writeNativeJson(path.join(root,'budget'),{stopped:true});assert.equal(JSON.parse(fs.readFileSync(path.join(root,'budget'),'utf8')).stopped,true);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('two real processes can concurrently append/read bounded heartbeat records without Windows rename contention',{timeout:20000},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-peer-io-'));try{
  const source=`import {writeHeartbeat,readHeartbeat} from ${JSON.stringify(pathToFileURL(path.resolve('server/bridge/native-files.ts')).href)};for(let i=0;i<1000;i++){writeHeartbeat(process.env.OWN,'session',i);const peer=readHeartbeat(process.env.PEER);if(peer&&peer.sessionId!=='session')throw Error('Wrong peer');await new Promise(r=>setTimeout(r,1));}`;
  await Promise.all([0,1].map(i=>new Promise<void>((resolve,reject)=>{const child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',source],{cwd:process.cwd(),env:{...process.env,OWN:path.join(root,i+'.jsonl'),PEER:path.join(root,(1-i)+'.jsonl')},windowsHide:true,stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(stderr)));})));
  assert.equal(readHeartbeat(path.join(root,'0.jsonl'))!.sequence,999);assert.equal(readHeartbeat(path.join(root,'1.jsonl'))!.sequence,999);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
