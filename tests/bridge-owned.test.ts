import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {BridgeDatabase,TelemetryReader,digest,replaySnapshots} from '../server/bridge/telemetry';
import {reserveEmptyProfile} from '../server/bridge/native-profile';
import {OwnedSession,type OwnedManifest} from '../server/bridge/owned-session';
import {FocusSelectionAdapter} from '../server/bridge/focus-adapter';
import {ActionGateway} from '../server/bridge/actions';
import type {BridgeAction,BridgeMode} from '../src/bridge-types';

function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-owned-')),run=path.join(root,'run');fs.mkdirSync(run);
  const lease=reserveEmptyProfile(path.join(root,'profile'),run),exe=path.join(root,'hoi4.exe');fs.writeFileSync(exe,'fixture');
  const log=path.join(lease.profileRoot,'logs/game.log');fs.mkdirSync(path.dirname(log));
  fs.writeFileSync(log,`[00:00:00][1936.01.01.12]: HC_BRIDGE|v1|begin|producer=${lease.token}|END\n[00:00:00][1936.01.01.12]: HC_BRIDGE|v1|state|producer=${lease.token}|tag=GER|pp=0|stability=0.81|END\n`);
  fs.writeFileSync(path.join(run,'native-budget.json'),JSON.stringify({inputs:0}));
  const db=new BridgeDatabase(run);let now=Date.now();
  const m:OwnedManifest={schemaVersion:1,sessionId:'owned',producerId:lease.token,identity:{pid:123,creation_time:'123456789012345678',executable_path:exe},executableHash:digest('fixture'),gameVersion:'1.19.4.1',launchedAt:new Date(now-1000).toISOString(),logPath:log,lease,controllerId:'tester',python:'unused'};
  let identity={...m.identity};const session=new OwnedSession(m,db,()=>identity,()=>now);
  const reader=new TelemetryReader(db,log,m.gameVersion),base=session.bind(reader.poll()[0]);
  const capture=(focusId:string|null,known=true)=>({known,focusId,text:focusId||'Select a National Focus',panelText:'German Reich',imagePath:'fixture.png',imageHash:'hash',observedAt:now/1000});
  const before=session.recordFocus(capture(null));
  return {db,session,base,before,capture,reader,log,m,setIdentity:(v:typeof identity)=>identity=v,setNow:(v:number)=>now=v,cleanup:()=>{db.close();fs.rmSync(root,{recursive:true,force:true});}};
}
test('owned session binds nonce and process creation time; duplicates stay duplicates',()=>{
  const f=fixture();try{
    assert.equal(f.session.check(),null);assert.equal(f.before.sessionId,'owned');assert.equal(f.before.ownership!.sequence,2);
    assert.equal(f.reader.poll().length,0);
    assert.throws(()=>f.session.bind({...f.base,producerId:'old'}),/owned campaign/);
    f.setIdentity({...f.m.identity,creation_time:'replacement'});assert.equal(f.session.latest(),null);
    f.setIdentity(f.m.identity);assert.match(f.session.check()!,/quarantined/);
  }finally{f.cleanup();}
});
test('old or contradictory log generation is refused and cannot be revived',()=>{
  const f=fixture();try{
    fs.appendFileSync(f.log,'HC_BRIDGE|v1|begin|producer=previous-session|END\n');assert.match(f.session.check()!,/contradictory/);
    assert.equal(f.session.latest(),null);
  }finally{f.cleanup();}
});

test('owned batches use two identity checks and never partially publish after a lifetime change',()=>{
 for(const change of [false,true]){
  const f=fixture();try{
   for(let day=2;day<=10;day++)fs.appendFileSync(f.log,`[1936.01.${String(day).padStart(2,'0')}.24] HC_BRIDGE|v1|state|producer=${f.m.producerId}|tag=GER|pp=${day}|stability=0.81|END\n`);
   const snapshots=f.reader.poll(),before=f.db.snapshots('owned').length;let probes=0;
   const session=new OwnedSession(f.m,f.db,()=>{probes++;return {...f.m.identity,...(change&&probes===2?{creation_time:'changed'}:{})};});
   if(change){assert.throws(()=>session.bindBatch(snapshots),/identity changed/);assert.equal(f.db.snapshots('owned').length,before);}
   else {assert.equal(session.bindBatch(snapshots).length,9);assert.equal(f.db.snapshots('owned').length,before+9);}
   assert.equal(probes,2);
  }finally{f.cleanup();}
 }
});
test('focus gateway rejects Observer, unknown ID, stale/foreign session and missing observation',async()=>{
  const f=fixture();try{
    const adapter=new FocusSelectionAdapter(f.session,()=>true);let mode:BridgeMode='observer';
    const gateway=new ActionGateway(f.db,()=>({mode,snapshot:f.session.latest()}),[adapter],new Set(['tester']));
    const request=(id:string):BridgeAction=>({schemaVersion:1,requestId:id,sessionId:'owned',controllerId:'tester',command:'focus.select',parameters:{focusId:'GER_prioritize_economic_growth'},requiredCapability:'focus.select',mode:'control',authorization:'local-grant',expected:{snapshotId:f.session.latest()!.id,country:'GER',gameVersion:'1.19.4.1'},verification:{policy:'independent-readback',timeoutMs:1000}});
    assert.equal((await gateway.submit(request('observer'))).status,'rejected');mode='control';
    assert.equal((await gateway.submit({...request('id'),parameters:{focusId:'invented'}})).status,'rejected');
    assert.equal((await gateway.submit({...request('foreign'),sessionId:'other'})).status,'rejected');
    f.session.recordFocus(f.capture(null,false));assert.equal((await gateway.submit(request('missing'))).status,'rejected');
    f.session.recordFocus(f.capture(null));f.setNow(Date.now()+31000);assert.equal((await gateway.submit(request('stale'))).status,'rejected');
  }finally{f.cleanup();}
});
test('simulated focus readback is independent; retry dispatches once and stop prevents later input',async()=>{
  const f=fixture();try{
    const adapter=new FocusSelectionAdapter(f.session,()=>true);let inputs=0;
    adapter.execute=async()=>{inputs++;};adapter.verify=async()=>{const s=f.session.recordFocus(f.capture('GER_prioritize_economic_growth'));return {outcome:'success',snapshotId:s.id,reason:'fixture only'};};
    const gateway=new ActionGateway(f.db,()=>({mode:'control',snapshot:f.session.latest()}),[adapter],new Set(['tester']));
    const a:BridgeAction={schemaVersion:1,requestId:'one',sessionId:'owned',controllerId:'tester',command:'focus.select',parameters:{focusId:'GER_prioritize_economic_growth'},requiredCapability:'focus.select',mode:'control',authorization:'local-grant',expected:{snapshotId:f.before.id,country:'GER',gameVersion:'1.19.4.1'},verification:{policy:'independent-readback',timeoutMs:1000}};
    const receipt=await gateway.submit(a);assert.equal(receipt.status,'confirmed-success');assert.notEqual(receipt.afterSnapshotId,f.before.id);
    assert.deepEqual(await gateway.submit(a),receipt);assert.equal(inputs,1);
    gateway.stop();f.session.stop();assert.equal((await gateway.submit({...a,requestId:'two'})).status,'rejected');assert.equal(inputs,1);assert.equal(f.session.latest(),null);
  }finally{f.cleanup();}
});

test('missing post-action observation remains uncertain and is never redispatched',async()=>{
  const f=fixture();try{
    const adapter=new FocusSelectionAdapter(f.session,()=>true);let inputs=0;
    adapter.execute=async()=>{inputs++;};f.session.tool=async()=>f.capture(null,false);
    const gateway=new ActionGateway(f.db,()=>({mode:'control',snapshot:f.session.latest()}),[adapter],new Set(['tester']));
    const a:BridgeAction={schemaVersion:1,requestId:'unknown',sessionId:'owned',controllerId:'tester',command:'focus.select',parameters:{focusId:'GER_prioritize_economic_growth'},requiredCapability:'focus.select',mode:'control',authorization:'local-grant',expected:{snapshotId:f.before.id,country:'GER',gameVersion:'1.19.4.1'},verification:{policy:'independent-readback',timeoutMs:2000}};
    const result=await gateway.submit(a);assert.equal(result.status,'uncertain');assert.equal((await gateway.submit(a)).status,'uncertain');assert.equal(inputs,1);
  }finally{f.cleanup();}
});
test('truncated owned log disconnects even when the previous snapshot is persisted',()=>{
  const f=fixture();try{fs.writeFileSync(f.log,'');assert.equal(f.session.latest(),null);assert.match(f.session.check()!,/quarantined/);}finally{f.cleanup();}
});

test('owned observations replay unchanged without reviving a stopped live session',()=>{
 const f=fixture();try{
   const serialized=JSON.stringify(f.before);f.session.stop();
   assert.deepEqual(replaySnapshots(serialized),[f.before]);assert.equal(f.session.latest(),null);
   assert.throws(()=>replaySnapshots(JSON.stringify({...f.before,ownership:{...f.before.ownership,sessionId:'foreign'}})),/ownership/);
   assert.throws(()=>replaySnapshots(JSON.stringify({...f.before,focusObservation:{...f.before.focusObservation,sessionId:'foreign'}})),/focus/);
 }finally{f.cleanup();}
});

test('read-only telemetry session refuses the legacy adapter and never reserves gameplay input',async()=>{
 const f=fixture();try{f.m.purpose='telemetry';await assert.rejects(()=>f.session.tool('observe'),/Read-only telemetry/);assert.throws(()=>f.session.reserveInput(),/Read-only telemetry/);assert.equal(f.session.check(),null);}finally{f.cleanup();}
});
