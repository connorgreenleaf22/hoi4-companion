import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {BridgeDatabase,TelemetryReader,parseTelemetry,replaySnapshots,freshness} from '../server/bridge/telemetry';
import {CampaignHistory} from '../server/bridge/history';
import {observationCapabilities} from '../server/bridge/observation-capabilities';
const line=(tail='n=2.324,0.81,0.5,4,31,28,10|f=0,0|t=1,0,0|r=0,1,0',date='1936.01.02.24')=>`[00:00:00][${date}] HC_BRIDGE|v2|state|producer=test|manifest=ger-m65-1|tag=GER|${tail}|END`;
const context={sessionId:'session',observedAt:'2026-11-06T00:00:00Z',gameVersion:'1.19.4.2',path:'game.log',offset:70};
test('manifest snapshot exposes bounded positive/negative checks and numeric units; replay stays historical',()=>{
 const s=parseTelemetry(line(),context)!;assert.equal(s.schemaVersion,2);assert.deepEqual(s.values.researchSlots,{status:'observed',value:4});assert.equal(s.values.warSupport!.value,0.5);assert.equal(s.campaign!.technologyCompleted.infantry_weapons.value,true);assert.equal(s.campaign!.technologyResearching.basic_machine_tools.value,true);assert.equal(s.campaign!.focusCompleted.GER_prioritize_economic_growth.value,false);assert.ok(s.unavailable.includes('currentFocus'));assert.deepEqual(replaySnapshots(JSON.stringify(s)),[s]);assert.equal(freshness(s,Date.parse(context.observedAt)+31000).status,'stale');
});
test('missing vectors are unavailable, wrong lengths or manifests rejected; invalid booleans/numbers never become false/zero',()=>{
 const s=parseTelemetry(line('n=2,0.8,[?ws],-1,1.5,28,10|f=2,0'),context)!;
 assert.equal(s.values.warSupport!.status,'unavailable');assert.equal(s.values.researchSlots!.status,'unavailable');assert.equal(s.values.civilianFactories!.status,'unavailable');assert.equal(s.campaign!.focusCompleted.GER_prioritize_economic_growth.status,'unavailable');assert.equal(s.campaign!.technologyCompleted.infantry_weapons.status,'unavailable');
 assert.equal(parseTelemetry(line('n=2,0.8'),context),null);assert.equal(parseTelemetry(line().replace('ger-m65-1','unknown'),context),null);assert.equal(parseTelemetry(line(),{...context,gameVersion:'1.19.4.1'}),null);assert.equal(parseTelemetry(line().replace('|tag=GER','|tag=ITA'),context),null);assert.equal(parseTelemetry(line().replace('|END',''),context),null);assert.equal(parseTelemetry(line().replace('|END','|f=0,0|END'),context),null);
});
test('reader preserves atomic records across partial writes, deduplicates changed checks correctly and separates restarts/rotation',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-m65-')),db=new BridgeDatabase(root),log=path.join(root,'game.log');
 try{fs.writeFileSync(log,'HC_BRIDGE|v2|begin|producer=test|END\n'+line().slice(0,-5));const reader=new TelemetryReader(db,log,context.gameVersion);assert.equal(reader.poll().length,0);fs.appendFileSync(log,line().slice(-5)+'\n');const first=reader.poll()[0];assert.equal(first.campaign!.technologyResearching.basic_machine_tools.value,true);fs.appendFileSync(log,line()+'\n');assert.equal(reader.poll().length,0);fs.appendFileSync(log,line().replace('f=0,0','f=1,0')+'\n');assert.equal(reader.poll()[0].campaign!.focusCompleted.GER_prioritize_economic_growth.value,true);fs.appendFileSync(log,'HC_BRIDGE|v2|begin|producer=test|END\n'+line()+'\n');assert.notEqual(reader.poll()[0].sessionId,first.sessionId);fs.writeFileSync(log,line()+'\n');assert.notEqual(reader.poll()[0].sessionId,first.sessionId);assert.equal(db.snapshots().length,4);}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('v1 and v2 recording storage coexist, duplicates persist across reopen, foreign fields and corrupt coverage rejected',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-m65-history-'));let db=new BridgeDatabase(root);
 try{let history=new CampaignHistory(db);const old=parseTelemetry('[1936.01.01.24] HC_BRIDGE|v1|state|producer=old|tag=GER|pp=1|stability=0.8|END',context)!,s=parseTelemetry(line(),context)!;
 const text=[old,s].map(v=>JSON.stringify(v)).join('\n'),saved=history.import({text,name:'test',origin:'fixture'});assert.deepEqual(saved.recording.snapshots.find(v=>v.schemaVersion===2)!.campaign,s.campaign);db.close();db=new BridgeDatabase(root);history=new CampaignHistory(db);assert.equal(history.import({text,name:'test',origin:'fixture'}).duplicate,true);assert.equal(history.list().length,1);assert.equal(history.list()[0].snapshots.find(v=>v.schemaVersion===1)!.observedAt,old.observedAt);
 const bad=structuredClone(s);delete bad.campaign!.technologyCompleted.infantry_weapons;assert.throws(()=>replaySnapshots(JSON.stringify(bad)),/coverage/);assert.throws(()=>replaySnapshots(JSON.stringify({...s,schemaVersion:1})),/schema 2/);assert.throws(()=>replaySnapshots(JSON.stringify({...s,values:{...s.values,warSupport:{status:'observed',value:10}}})),/warSupport/);
 }finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('observation capabilities never turn historical data into live state or imply current-focus support',()=>{
 const s=parseTelemetry(line(),context)!;const historical=observationCapabilities(s,false,'1.19.4.2');assert.equal(historical.find(v=>v.id==='researchSlots')!.availability,'historical-only');assert.equal(historical.find(v=>v.id==='currentFocus')!.availability,'unsupported');assert.equal(observationCapabilities(s,true,'1.20').find(v=>v.id==='researchSlots')!.availability,'version-incompatible');assert.equal(observationCapabilities(null,false,'1.19.4.2').find(v=>v.id==='researchSlots')!.availability,'not-recently-observed');
});
