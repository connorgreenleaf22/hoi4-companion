import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {startServer} from '../server/api';
import {parseTelemetry,BridgeDatabase} from '../server/bridge/telemetry';
import {ageLabel,observationLabel,compareSnapshots,valueText} from '../src/intelligence';
import type {CampaignIntelligence} from '../src/bridge-types';
const now=Date.parse('2026-11-05T00:00:00Z');
const snapshot=()=>parseTelemetry('[1936.01.01.24]: HC_BRIDGE|v1|state|producer=test|tag=GER|pp=2|stability=0.81|END',{sessionId:'fixture',observedAt:new Date(now).toISOString(),gameVersion:'test',path:'fixture.log',offset:0})!;
test('fresh log writes and imported/fixture snapshots cannot masquerade as live ownership',()=>{
 const s=snapshot(),data={session:{state:'disconnected',id:null},liveSnapshotId:s.id} as CampaignIntelligence;
 assert.equal(observationLabel(s,data,null,now),'Historical log observation');
 data.session={state:'owned-connected',id:s.sessionId,reason:'test'};
 assert.equal(observationLabel(s,data,null,now),'Live owned observation');
 assert.equal(observationLabel(s,data,null,now+31000),'Historical log observation');
 assert.match(observationLabel(s,data,'recording',now),/origin unverified/);
 assert.equal(observationLabel({...s,dataOrigin:'fixture'},data,null,now),'Offline test fixture');
 assert.match(ageLabel(s.observedAt,now+31000),/Stale/);assert.match(ageLabel(s.observedAt,now-1),/unavailable/);
 assert.equal(valueText(undefined),'Unavailable');
});
test('comparisons preserve unavailable fields and refuse cross-session baselines',()=>{
 const a=snapshot(),b=snapshot();b.values={...b.values,politicalPower:{status:'observed',value:4},stability:{status:'unavailable',value:null,reason:'missing'}};
 assert.deepEqual(compareSnapshots(a,b),[{key:'politicalPower',delta:2},{key:'stability',delta:null}]);
 assert.equal(compareSnapshots(a,{...b,sessionId:'other'}),null);
 assert.equal(compareSnapshots(a,{...b,gameVersion:null}),null);
 assert.equal(compareSnapshots(a,{...b,values:{...b.values,country:{status:'unavailable',value:null,reason:'missing'}}}),null);
});
test('dashboard API and replay remain local, historical and do not mutate live storage',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-intelligence-'));
 const service=await startServer({dataDir:root,port:0,autoIndex:false,bridge:{gameRoot:path.join(root,'missing'),userRoot:root}});
 try{
   const db=new BridgeDatabase(root),s={...snapshot(),dataOrigin:'fixture' as const};db.db.prepare('INSERT INTO snapshots VALUES(?,?,?)').run(s.id,s.sessionId,JSON.stringify(s));db.close();
   const get=()=>fetch(service.url+'/api/v1/bridge/intelligence').then(r=>r.json());
   const before=await get();assert.equal(before.session.state,'disconnected');assert.equal(before.liveSnapshotId,null);assert.equal(before.snapshots.length,1);
   const replay=await fetch(service.url+'/api/v1/bridge/replay',{method:'POST',body:JSON.stringify({origin:'fixture',text:JSON.stringify(s)})}).then(r=>r.json());assert.deepEqual(replay.snapshots,[s]);
   assert.deepEqual((await get()).snapshots,before.snapshots);
   assert.equal((await fetch(service.url+'/api/v1/bridge/replay',{method:'POST',body:JSON.stringify({origin:'recording',text:'{}'})})).status,400);
   assert.equal((await fetch(service.url+'/api/v1/bridge/intelligence',{headers:{Origin:'https://foreign.example'}})).status,403);
 }finally{await service.close();fs.rmSync(root,{recursive:true,force:true});}
});
