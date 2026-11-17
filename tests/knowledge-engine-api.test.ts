import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {startServer} from '../server/api';
import {fixtures} from './fixtures/knowledge-engine';
import {entry} from './fixtures/knowledge-engine';
import {providerWire} from '../server/planner/ai-provider';

test('knowledge HTTP boundary validates input, isolates campaigns, saves with CAS and survives restart',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-knowledge-api-'));let service=await startServer({dataDir:directory,port:0,autoIndex:false});
 const {entries,metadata,scenario,division}=fixtures();
 const request={scenario,candidates:[division,{...division,name:'Other'}],objective:{metric:'defense',direction:'maximize',perIndustrialCost:true},constraints:[]};
 const post=(route:string,input:unknown)=>fetch(service.url+'/api/v1/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 try{
  entries.forEach(e=>service.store.insert(e));service.store.setSetting('meta',metadata);
  await post('profile',{id:'siam',name:'Siam',country:'SIA',startDate:'1938-01-01'});await post('profile',{id:'germany',name:'Germany',country:'GER',startDate:'1938-01-01'});
  const evaluated=await post('knowledge/evaluate',{scenario,design:division});assert.equal(evaluated.status,200);assert.equal((await evaluated.json()).metrics.soft_attack.value,54);
  assert.equal((await post('knowledge/evaluate',{scenario,design:{...division,soft_attack:999}})).status,400);
  assert.equal((await fetch(service.url+'/api/v1/knowledge/catalog?limit=251')).status,400);
  assert.equal((await fetch(service.url+'/api/v1/knowledge/catalog?kind=unit&limit=1')).status,200);
  const save={profileId:'siam',expectedRevision:0,request};assert.equal((await post('knowledge/workspace',save)).status,200);assert.equal((await post('knowledge/workspace',save)).status,409);
  assert.equal((await post('knowledge/workspace',{...save,profileId:'missing'})).status,404);assert.equal((await post('knowledge/workspace',{...save,profileId:'germany'})).status,400);
  const other=await fetch(service.url+'/api/v1/knowledge/workspace?profile=germany').then(r=>r.json());assert.equal(other.request,null);
  const origin=await fetch(service.url+'/api/v1/knowledge/compare',{method:'POST',headers:{Origin:'https://foreign.invalid'},body:JSON.stringify(request)});assert.equal(origin.status,403);
  await service.close();service=await startServer({dataDir:directory,port:0,autoIndex:false});
  const restored=await fetch(service.url+'/api/v1/knowledge/workspace?profile=siam').then(r=>r.json());assert.equal(restored.revision,1);assert.deepEqual(restored.request,request);assert.equal((await post('knowledge/compare',restored.request)).status,200);
 }finally{await service.close();fs.rmSync(directory,{recursive:true,force:true});}
});
test('slow request bodies never hold the shared SQLite transaction across awaits',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-knowledge-slow-')),service=await startServer({dataDir:directory,port:0,autoIndex:false});
 const pending=http.request(service.url+'/api/v1/knowledge/evaluate',{method:'POST',headers:{'Content-Type':'application/json','Transfer-Encoding':'chunked'}});
 try{
  pending.on('error',()=>{});pending.write('{');
  const r=await fetch(service.url+'/api/v1/knowledge/catalog?kind=unit');assert.equal(r.status,200);assert.equal(service.store.db.isTransaction,false);
  const response=new Promise<number>(resolve=>pending.once('response',res=>{res.resume();resolve(res.statusCode!);}));pending.end('}');assert.equal(await response,400);
 }finally{pending.destroy();await service.close();fs.rmSync(directory,{recursive:true,force:true});}
});
test('paired remote clients cannot access knowledge scenarios or saved comparison inputs',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-knowledge-remote-')),service=await startServer({dataDir:directory,port:0,autoIndex:false,testRemoteHost:'127.0.0.1'});
 try{
  const network=await fetch(service.url+'/api/v1/network',{method:'POST',body:'{"enabled":true}'}).then(r=>r.json()),remote=`http://127.0.0.1:${network.port}`;
  const pair=await fetch(remote+'/api/v1/pair',{method:'POST',body:JSON.stringify({code:network.code})});const cookie=pair.headers.get('set-cookie')!.split(';')[0];
  for(const route of ['knowledge/catalog','knowledge/workspace?profile=siam'])assert.equal((await fetch(remote+'/api/v1/'+route,{headers:{Cookie:cookie}})).status,403);
 }finally{await service.close();fs.rmSync(directory,{recursive:true,force:true});}
});
test('saved opt-in design study reaches the exact AI preview/wire budget without making a provider call',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-knowledge-advice-')),service=await startServer({dataDir:directory,port:0,autoIndex:false});
 const {entries,metadata,scenario,division}=fixtures();
 const post=(route:string,input:unknown)=>fetch(service.url+'/api/v1/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 try{
  entries.forEach(e=>service.store.insert(e));service.store.insert(entry('focus_tree','sia_tree',''));service.store.setSetting('meta',metadata);
  const saved=await post('profile',{id:'siam',name:'Siam',country:'SIA',tree:'sia_tree',startDate:'1938-01-01'});const profile=(await saved.json()).profile;
  // Existing profile endpoint returns either its saved profile directly or the profile envelope.
  const actualProfile=profile||service.store.profile('siam');
  const input={profile:actualProfile,indexRevision:scenario.indexRevision,objective:'Prepare infantry defense',manualContext:'Manual campaign'};
  const before=await post('ai/context',input);assert.equal(before.status,200);const initial=await before.json();assert.equal(initial.designStudy,undefined);
  const request={scenario,candidates:[division,{...division,name:'Other'}],objective:{metric:'defense',direction:'maximize',perIndustrialCost:true},constraints:[],shareWithAdvisor:true};
  assert.equal((await post('knowledge/workspace',{profileId:'siam',expectedRevision:0,request})).status,200);
  const after=await post('ai/context',input);assert.equal(after.status,200);const context=await after.json();assert.equal(context.designStudy.status,'available');assert.notEqual(context.fingerprint,initial.fingerprint);assert.match(context.disclosure,/saved design comparison/);
  const wire=providerWire(context,context.settings);assert.equal(JSON.parse(wire.input[0].content).designStudy.classification,'experimental-estimates');assert.equal(context.contextBudget.wireBytes,Buffer.byteLength(JSON.stringify(wire)));
 }finally{await service.close();fs.rmSync(directory,{recursive:true,force:true});}
});
