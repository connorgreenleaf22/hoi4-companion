import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {startServer} from '../server/api';
import {openStore} from '../server/store';
import {productionSupport} from '../server/domain';
import type {Entry} from '../src/types';

const profile=(id='campaign')=>({id,name:'Campaign',country:'GER',startDate:'1936-01-01',queue:[],notes:{}});
const fixture=()=>fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-011-test-'));
const removeFixture=(directory:string)=>{assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(directory,{recursive:true,force:true});};
const request=(service:{url:string},route:string,value?:unknown,method='POST')=>fetch(service.url+'/api/v1/'+route,{method,body:value===undefined?undefined:JSON.stringify(value)});
const status=(s:{url:string})=>fetch(s.url+'/api/v1/status').then(r=>r.json());
const equipment=(id:string,data:any):Entry=>({id,uid:'equipment:test:'+id,kind:'equipment',title:id,description:'',source:'test',line:1,version:'test',hash:'test',data});

test('stale and simultaneous profile writes conflict across two services without erasing work',async()=>{
 const directory=fixture();const a=await startServer({dataDir:directory,port:0,autoIndex:false});const b=await startServer({dataDir:directory,port:0,autoIndex:false});
 try{
  const first=await (await request(a,'profile',profile())).json();assert.equal(first.revision,1);
  const [ra,rb]=await Promise.all([request(a,'profile',{...first,queue:['A']}),request(b,'profile',{...first,notes:{B:'other window'}})]);
  assert.deepEqual([ra.status,rb.status].sort(),[200,409]);
  const winner=await (ra.status===200?ra:rb).json();const conflict=await (ra.status===409?ra:rb).json();assert.deepEqual(conflict.current,winner);assert.equal(winner.revision,2);
  assert.deepEqual((await status(b)).profiles[0],winner);
  const oldClient=await request(a,'profile',{...profile(),notes:{old:'unversioned'}});assert.equal(oldClient.status,409);
  let current=winner;
  for(let i=0;i<25;i++){const r=await request(i%2?a:b,'profile',{...current,goals:'rapid '+i});assert.equal(r.status,200);current=await r.json();}
  assert.equal(current.revision,27);assert.equal((await status(a)).profiles[0].goals,'rapid 24');
  const malformed=await request(a,'profile',{...current,revision:1.5});assert.equal(malformed.status,400);
  const beforeInvalid=await status(a);const invalid=await request(a,'profile',{...current,startDate:'1936-02-31'});assert.equal(invalid.status,400);assert.deepEqual((await status(a)).profiles,beforeInvalid.profiles);
 }finally{await b.close();await a.close();removeFixture(directory);}
});

test('legacy profiles upgrade on save and selected campaign survives origin changes and deletion',async()=>{
 const directory=fixture();const seed=openStore(directory);seed.db.prepare('INSERT INTO profiles VALUES(?,?)').run('legacy',JSON.stringify({...profile('legacy'),notes:{legacy:'preserved'}}));seed.db.close();
 let s=await startServer({dataDir:directory,port:0,autoIndex:false});
 try{
  const legacy=(await status(s)).profiles[0];assert.equal(legacy.revision,0);assert.equal(legacy.notes.legacy,'preserved');
  const upgraded=await (await request(s,'profile',{...legacy,revision:undefined})).json();assert.equal(upgraded.revision,1);
  const second=await (await request(s,'profile',profile('second'))).json();const third=await (await request(s,'profile',profile('third'))).json();
  assert.equal((await request(s,'selection',{id:second.id})).status,200);assert.equal((await status(s)).selectedProfileId,second.id);
  const origin=s.url;await s.close();s=await startServer({dataDir:directory,port:0,autoIndex:false});assert.notEqual(s.url,origin);assert.equal((await status(s)).selectedProfileId,second.id);
  assert.equal((await request(s,'profile?id=second&revision=0',undefined,'DELETE')).status,409);
  const deleted=await request(s,'profile?id=second&revision='+second.revision,undefined,'DELETE');assert.equal(deleted.status,200);assert.equal((await deleted.json()).selectedProfileId,'legacy');
  assert.equal((await request(s,'profile',second)).status,409);assert.equal((await request(s,'profile',{...second,revision:0})).status,409);
  assert.equal((await request(s,'selection',{id:'missing'})).status,404);assert.equal((await status(s)).selectedProfileId,'legacy');
  s.store.setSetting('selectedProfileId','deleted-id');assert.equal((await status(s)).selectedProfileId,'legacy');
  assert.equal((await request(s,'profile?id=legacy&revision='+upgraded.revision,undefined,'DELETE')).status,200);
  assert.equal((await request(s,'profile?id=third&revision='+third.revision,undefined,'DELETE')).status,200);assert.equal((await status(s)).selectedProfileId,'');
 }finally{await s.close();removeFixture(directory);}
});

test('interrupted SQLite write rolls back, committed save survives termination, stale retry conflicts',async()=>{
 const directory=fixture();const seed=openStore(directory);const first=seed.saveProfile({...profile(),historical:true,goals:'original',tree:'',dlcs:[],dlcConfirmed:false,queue:[],completed:[],bookmarks:[],notes:{}}).saved!;seed.db.close();
 const storeUrl=pathToFileURL(path.resolve('server/store.ts')).href;const loader=pathToFileURL(path.resolve('node_modules/tsx/dist/loader.mjs')).href;
 async function interrupt(commit:boolean){
  const child=spawn(process.execPath,['--import',loader,'--input-type=module','-e',`import {openStore} from ${JSON.stringify(storeUrl)};const s=openStore(${JSON.stringify(directory)});s.db.exec('BEGIN IMMEDIATE');const p={...s.profile('campaign'),goals:'interrupted',revision:2};s.db.prepare('UPDATE profiles SET payload=? WHERE id=?').run(JSON.stringify(p),'campaign');${commit?"s.db.exec('COMMIT');":''}process.stdout.write('ready\\n');setInterval(()=>{},1000);`],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',c=>stderr+=c);
  try{
   await Promise.race([new Promise<void>((resolve,reject)=>{child.stdout.on('data',c=>{if(String(c).includes('ready'))resolve();});child.once('exit',code=>reject(new Error('Worker exited '+code+': '+stderr)));}),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Fixture writer timed out: '+stderr)),10000).unref())]);
  }finally{const exited=once(child,'exit');child.kill();await exited;}
 }
 try{
  await interrupt(false);let db=openStore(directory);assert.deepEqual(db.profile('campaign'),first);db.db.close();
  await interrupt(true);const s=await startServer({dataDir:directory,port:0,autoIndex:false});
  try{assert.equal((await status(s)).profiles[0].goals,'interrupted');const retry=await request(s,'profile',first);assert.equal(retry.status,409);assert.equal((await retry.json()).current.revision,2);}finally{await s.close();}
 }finally{removeFixture(directory);}
});

test('production uses indexed equipment cost and rejects naval, unresolved, missing, or invalid inputs',async()=>{
 const directory=fixture();const seed=openStore(directory);
 const items=[equipment('infantry',{type:'infantry',stats:{build_cost_ic:.5}}),equipment('infantry_1',{archetype:'infantry',stats:{}}),equipment('ship_hull_carrier',{type:'carrier',stats:{build_cost_ic:2094}}),equipment('carrier_1',{archetype:'ship_hull_carrier',stats:{}}),equipment('convoy',{type:'convoy',stats:{build_cost_ic:70}}),equipment('railway',{type:'railway_gun',stats:{}})];
 items.forEach(e=>seed.insert(e));seed.setSetting('meta',{defines:{BASE_FACTORY_SPEED_MIL:3.5},dlcs:[]});seed.db.close();
 const s=await startServer({dataDir:directory,port:0,autoIndex:false});
 const input={equipmentId:'infantry_1',quantity:1000,stockpile:100,factories:10,efficiency:.5,output:1.2,resourceFactor:.5};
 try{
  const r=await request(s,'production',{...input,cost:999999});assert.equal(r.status,200);assert.deepEqual(await r.json(),{shortage:900,dailyIC:10.5,unitsPerDay:21,days:43});
  const list=await fetch(s.url+'/api/v1/equipment').then(r=>r.json());assert.equal(list.find((e:Entry)=>e.id==='infantry_1').data.productionSupport.supported,true);
  for(const id of ['ship_hull_carrier','carrier_1','convoy']){assert.match(list.find((e:Entry)=>e.id===id).data.productionSupport.reason,/dockyards/);const response=await request(s,'production',{...input,equipmentId:id});assert.equal(response.status,400);assert.match((await response.json()).error,/Naval production is unsupported/);}
  const missing=await request(s,'production',{...input,equipmentId:'railway'});assert.equal(missing.status,400);assert.match((await missing.json()).error,/cost is unresolved/);
  assert.equal((await request(s,'production',{...input,equipmentId:'unknown'})).status,400);assert.equal((await request(s,'production',{...input,equipmentId:undefined,cost:.5})).status,400);
  assert.equal((await request(s,'production',{...input,factories:-1})).status,400);assert.equal((await request(s,'production',{...input,quantity:'1000'})).status,400);
  const stopped=await (await request(s,'production',{...input,factories:0})).json();assert.equal(stopped.days,null);assert.equal(stopped.unitsPerDay,0);
  assert.equal((await (await request(s,'production',{...input,stockpile:1000})).json()).days,0);
  const cycleA=equipment('cycle_a',{archetype:'cycle_b',stats:{}});const cycleB=equipment('cycle_b',{archetype:'cycle_a',stats:{}});assert.equal(productionSupport(cycleA,[cycleA,cycleB]).supported,false);
 }finally{await s.close();removeFixture(directory);}
});

test('curated formation guide retains exact missing definitions rather than guessing from other sources',async()=>{
 const directory=fixture();const s=await startServer({dataDir:directory,port:0,autoIndex:false});
 try{
  s.store.insert({...equipment('form_nordic_league',{}),kind:'formable'});
  const data=await fetch(s.url+'/api/v1/guides').then(r=>r.json());const scandinavia=data.guides.find((g:any)=>g.id==='scandinavia');assert.ok(scandinavia);assert.deepEqual(scandinavia.resolvedReferences,[]);assert.ok(scandinavia.referenceProblems.length);assert.equal(scandinavia.canPreview,false);assert.equal(scandinavia.freshness,'unavailable');
 }finally{await s.close();removeFixture(directory);}
});
