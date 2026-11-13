import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {BridgeDatabase,TelemetryReader,parseTelemetry,replaySnapshots,freshness} from '../server/bridge/telemetry';
import {ActionGateway,type ActionAdapter} from '../server/bridge/actions';
import {inspectEnvironment,queryReference} from '../server/bridge/environment';
import {openStore} from '../server/store';
import {parseScript} from '../server/parser';
import {startServer} from '../server/api';
import type {BridgeAction} from '../src/bridge-types';

const wire=(date='1936.01.02.12',pp='12.5')=>`[12:00:00][${date}][effect.cpp:1] HC_BRIDGE|v1|state|producer=fixture|tag=GER|pp=${pp}|stability=0.75|END\n`;
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-bridge-'));
const snapshot=()=>parseTelemetry(wire().trim(),{sessionId:'session',observedAt:new Date().toISOString(),gameVersion:'fixture',path:'fixture.log',offset:0})!;
const action=(id='request'):BridgeAction=>({schemaVersion:1,requestId:id,sessionId:'session',controllerId:'tester',command:'game.pause',parameters:{},requiredCapability:'game.pause',mode:'control',authorization:'local-grant',expected:{snapshotId:snapshot().id,country:'GER',gameVersion:'fixture'},verification:{policy:'independent-readback',timeoutMs:1000}});

test('wire parser preserves unknowns, rejects partial/duplicate/unknown versions, and replay stays deterministic',()=>{
  const s=snapshot();assert.equal(s.values.politicalPower.value,12.5);assert.equal(s.values.gameDate.value,'1936.01.02.12');
  assert.equal(parseTelemetry(wire().replace('|END','').trim(),{sessionId:'s',observedAt:s.observedAt,gameVersion:null,path:'x',offset:0}),null);
  for(const line of [wire().replace('v1','v2'),wire().replace('|pp=','|tag=USA|pp=')])assert.equal(parseTelemetry(line.trim(),{sessionId:'s',observedAt:s.observedAt,gameVersion:null,path:'x',offset:0}),null);
  const missing=parseTelemetry(wire(undefined,'[?missing]').trim(),{sessionId:'s',observedAt:s.observedAt,gameVersion:null,path:'x',offset:0})!;assert.equal(missing.values.politicalPower.status,'unavailable');
  const text=JSON.stringify(s)+'\n'+JSON.stringify(s);assert.deepEqual(replaySnapshots(text),[s]);assert.equal(freshness(s,Date.parse(s.observedAt)+31000).status,'stale');
  assert.throws(()=>replaySnapshots(JSON.stringify({...s,values:{}})),/Invalid snapshot value/);
  assert.throws(()=>replaySnapshots(text+'\n'+JSON.stringify({...s,producerId:'conflict'})),/Conflicting/);
});

test('tail reader persists partial-line offsets, deduplicates, survives restart, truncation and same-size replacement',()=>{
  const root=temp(),log=path.join(root,'game.log');let db=new BridgeDatabase(root);
  try{
    fs.writeFileSync(log,wire().slice(0,-6));let reader=new TelemetryReader(db,log,'fixture');assert.equal(reader.poll().length,0);
    fs.appendFileSync(log,wire().slice(-6));assert.equal(reader.poll().length,1);
    fs.appendFileSync(log,wire());assert.equal(reader.poll().length,0);
    db.close();db=new BridgeDatabase(root);reader=new TelemetryReader(db,log,'fixture');assert.equal(reader.poll().length,0);
    fs.appendFileSync(log,wire('1936.01.03.12'));assert.equal(reader.poll().length,1);assert.equal(db.snapshots().length,2);
    const first=db.latest()!.sessionId;
    fs.writeFileSync(log,wire('1936.01.04.12'));reader.poll();assert.notEqual(db.latest()!.sessionId,first);
    const second=db.latest()!.sessionId;fs.writeFileSync(log,wire('1936.01.05.12'));reader.poll();assert.notEqual(db.latest()!.sessionId,second);
    fs.appendFileSync(log,'[12:00:01] HC_BRIDGE|v1|begin|producer=fixture|END\n'+wire('1936.01.02.12'));reader.poll();assert.equal(db.snapshots().length,5);
    assert.deepEqual(replaySnapshots(db.snapshots().map(s=>JSON.stringify(s)).join('\n')),db.snapshots());
  }finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('gateway rejects Observer Mode, unsupported actions, unauthorized controllers and stale preconditions',async()=>{
  const root=temp(),db=new BridgeDatabase(root);const s=snapshot();
  try{
    let gateway=new ActionGateway(db,()=>({mode:'observer',snapshot:s}));assert.match((await gateway.submit(action('observer'))).reason,/forbidden/);
    gateway=new ActionGateway(db,()=>({mode:'control',snapshot:s}));assert.match((await gateway.submit(action('unauthorized'))).reason,/authorization/);
    gateway=new ActionGateway(db,()=>({mode:'control',snapshot:s}),[],new Set(['tester']));assert.match((await gateway.submit(action('unsupported'))).reason,/Unsupported/);
    gateway.stop();assert.match((await gateway.submit(action('stopped'))).reason,/stop/);
    assert.equal(db.db.prepare('SELECT COUNT(*) n FROM receipts').get()!.n,4);
  }finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('adapter contract: durable retries, conflicting controllers, independent readback and timeout uncertainty',async()=>{
  const root=temp(),db=new BridgeDatabase(root),other=new BridgeDatabase(root);let calls=0;let release:()=>void=()=>{};
  const adapter:ActionAdapter={capability:'game.pause',commands:['game.pause'],verifiedVersions:['fixture'],validate:a=>Object.keys(a.parameters).length?'Unexpected parameters':null,execute:async()=>{calls++;await new Promise<void>(r=>release=r);},verify:async()=>({outcome:'success',snapshotId:'readback-2',reason:'Simulated test readback; not native evidence'})};
  const context=()=>({mode:'control' as const,snapshot:snapshot()});
  const gateway=new ActionGateway(db,context,[adapter],new Set(['tester']));
  const contender=new ActionGateway(other,context,[adapter],new Set(['tester']));
  try{
    assert.match((await gateway.submit({...action('stale'),expected:{...action().expected,snapshotId:'old'}})).reason,/expected/);
    const pending=gateway.submit(action());assert.equal(calls,1);
    assert.equal((await contender.submit(action())).status,'uncertain');
    assert.match((await contender.submit(action('conflict'))).reason,/in flight/);
    release();assert.equal((await pending).status,'confirmed-success');
    assert.equal((await gateway.submit(action())).status,'confirmed-success');assert.equal(calls,1);
    assert.equal((await gateway.submit({...action(),command:'game.resume'})).status,'rejected');
    const timed=gateway.submit({...action('timeout'),verification:{policy:'independent-readback',timeoutMs:5}});assert.equal((await timed).status,'timeout');
    assert.match((await contender.submit(action('after-timeout'))).reason,/in flight/);release();await new Promise(r=>setImmediate(r));
    assert.equal(gateway.receipt('timeout')!.status,'timeout');
    const again=gateway.submit(action('stop-during-flight'));gateway.stop();assert.match((await contender.submit(action('queued'))).reason,/stop/);release();await again;
  }finally{other.close();db.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('reference queries retain provenance and disclose mod ID collisions and replace_path',()=>{
  const root=temp(),store=openStore(path.join(root,'db')),game=path.join(root,'game'),user=path.join(root,'user'),mod=path.join(user,'mod','sample');
  try{
    fs.mkdirSync(path.join(mod,'common','national_focus'),{recursive:true});fs.mkdirSync(game);fs.writeFileSync(path.join(game,'hoi4.exe'),'fixture');fs.writeFileSync(path.join(game,'launcher-settings.json'),'{"rawVersion":"fixture"}');
    fs.writeFileSync(path.join(user,'mod','sample.mod'),'name="Sample" path="mod/sample" replace_path="common/national_focus"');fs.writeFileSync(path.join(user,'dlc_load.json'),'{"enabled_mods":["mod/sample.mod"],"disabled_dlcs":[]}');
    fs.writeFileSync(path.join(mod,'common/national_focus/different.txt'),'focus_tree={ focus={ id=GER_test } }');
    store.insert({uid:'focus:test',id:'GER_test',kind:'focus',source:'common/national_focus/germany.txt',hash:'fixture-hash',line:5,version:'fixture',title:'Test',description:'',data:{}});
    const result=queryReference(store,inspectEnvironment(game,user),'GER_test');assert.equal(result.reference.entry!.line,5);assert.equal(result.overrides.status,'potential-overrides');assert.equal(result.overrides.candidates.length,2);
  }finally{store.db.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('local API enforces bridge mode and origin protection; prototype script parses',async()=>{
  const root=temp();const service=await startServer({dataDir:root,port:0,autoIndex:false,bridge:{gameRoot:path.join(root,'missing'),userRoot:root}});
  try{
    const status=await fetch(service.url+'/api/v1/bridge/status').then(r=>r.json());assert.equal(status.mode,'observer');
    assert.equal((await fetch(service.url+'/api/v1/bridge/poll',{method:'POST'})).status,400);
    const receipt=await fetch(service.url+'/api/v1/bridge/actions',{method:'POST',body:JSON.stringify(action())}).then(r=>r.json());assert.equal(receipt.status,'rejected');
    assert.equal((await fetch(service.url+'/api/v1/bridge/stop',{method:'POST',headers:{Origin:'https://example.com'}})).status,403);
    assert.ok(parseScript(fs.readFileSync('mods/hoi4-companion-telemetry/common/on_actions/hoi4_companion_telemetry.txt','utf8')).length);
  }finally{await service.close();fs.rmSync(root,{recursive:true,force:true});}
});
