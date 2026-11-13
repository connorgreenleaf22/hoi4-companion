import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {startServer} from '../server/api';
import {parseTelemetry} from '../server/bridge/telemetry';
const snap=(session='one',pp=2)=>parseTelemetry(`[1936.01.01.24]: HC_BRIDGE|v1|state|producer=test|tag=GER|pp=${pp}|stability=0.81|END`,{sessionId:session,observedAt:'2020-01-01T00:00:00Z',gameVersion:'test',path:'C:/Users/private/game.log',offset:0})!;
test('history persists independently, deduplicates, retains sessions and never updates live state',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-history-'));let app=await startServer({dataDir:root,port:0,autoIndex:false});
 const post=async(route:string,data:unknown)=>{const response=await fetch(app.url+'/api/v1/'+route,{method:'POST',body:JSON.stringify(data)});return {status:response.status,body:await response.json()};};
 try{
  const a=snap(),b=snap('two');const input={name:'Recorded campaign',origin:'recording',text:[a,b,a].map(s=>JSON.stringify(s)).join('\n')};
  const first=await post('history/import',input);assert.equal(first.status,200);assert.equal(first.body.recording.snapshots.length,2);assert.equal(first.body.recording.snapshots[0].source.path,'game.log');assert.equal(JSON.stringify(first.body).includes('Users/private'),false);
  const duplicate=await post('history/import',{...input,name:'renamed',text:[b,a].map(s=>JSON.stringify(s)).join('\n')});assert.equal(duplicate.body.duplicate,true);assert.equal(duplicate.body.recording.id,first.body.recording.id);
  const fixture=await post('history/import',{...input,origin:'fixture'});assert.notEqual(fixture.body.recording.id,first.body.recording.id);
  await app.close();app=await startServer({dataDir:root,port:0,autoIndex:false});
  const records=await fetch(app.url+'/api/v1/history/recordings').then(r=>r.json());assert.equal(records.length,2);
  const state=await fetch(app.url+'/api/v1/bridge/intelligence').then(r=>r.json());assert.equal(state.snapshots.length,0);assert.equal(state.liveSnapshotId,null);
  assert.equal((await post('history/remove',{id:first.body.recording.id,confirmation:'wrong'})).status,400);
  assert.equal((await post('history/remove',{id:first.body.recording.id,confirmation:input.name})).status,200);
  assert.equal((await post('history/import',{...input,text:JSON.stringify({...a,schemaVersion:99})})).status,400);
 }finally{await app.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('reviewed baseline uses observed country/date, retains unavailable values and never overwrites a workspace',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-baseline-'));const app=await startServer({dataDir:root,port:0,autoIndex:false});
 const post=async(route:string,data:unknown)=>{const response=await fetch(app.url+'/api/v1/'+route,{method:'POST',body:JSON.stringify(data)});return {status:response.status,body:await response.json()};};
 try{
  const s=snap();const r=(await post('history/import',{name:'History',origin:'recording',text:JSON.stringify(s)})).body.recording;
  const input={recordingId:r.id,snapshotId:s.id,profileId:'history-'+randomUUID(),name:'Historical plan',tree:'',indexRevision:'legacy'};
  const preview=await post('history/preview',input);assert.equal(preview.status,200);assert.equal(preview.body.profile.startDate,'1936-01-01');assert.equal(preview.body.profile.country,'GER');assert.deepEqual(preview.body.profile.completed,[]);assert.deepEqual(preview.body.profile.queue,[]);assert.match(preview.body.warnings.join(' '),/research.*unavailable/);
  assert.equal(app.store.listProfiles().length,0);
  assert.equal((await post('history/apply',{input,fingerprint:'wrong'})).status,400);assert.equal(app.store.listProfiles().length,0);assert.equal(app.store.getSetting('history-baseline:'+input.profileId,null),null);
  assert.equal((await post('history/apply',{input:{...input,name:'Changed'},fingerprint:preview.body.preview.fingerprint})).status,400);
  assert.equal((await post('history/apply',{input,fingerprint:preview.body.preview.fingerprint})).status,200);
  assert.equal((await post('history/apply',{input,fingerprint:preview.body.preview.fingerprint})).status,400);assert.equal(app.store.listProfiles().length,1);
  await post('history/remove',{id:r.id,confirmation:'History'});const baseline=await fetch(app.url+'/api/v1/history/baseline?profile='+input.profileId).then(r=>r.json());assert.equal(baseline.snapshot.values.politicalPower.value,2);assert.equal(baseline.snapshot.focusObservation,undefined);
  const missing={...s,values:{...s.values,country:{status:'unavailable',value:null,reason:'not exported'}}};const m=(await post('history/import',{name:'Incomplete',origin:'fixture',text:JSON.stringify(missing)})).body.recording;
  assert.equal((await post('history/preview',{...input,profileId:'history-'+randomUUID(),recordingId:m.id})).status,400);
  assert.equal((await fetch(app.url+'/api/v1/history/recordings',{headers:{Origin:'https://foreign.example'}})).status,403);
 }finally{await app.close();fs.rmSync(root,{recursive:true,force:true});}
});
