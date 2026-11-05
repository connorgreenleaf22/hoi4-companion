import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import http from 'node:http';
import {startServer,validateProfile} from '../server/api';
import {openStore} from '../server/store';
import {migrateStore,restoreStore} from '../server/migrations';
import {ensurePlanner} from '../server/planner/plans';
import type {Entry} from '../src/types';

const base=()=>validateProfile({id:'campaign',name:'Planner Ω',country:'GER',startDate:'1936-02-28',tree:'vanilla:focus_tree::fixture',queue:['A','B'],completed:[],notes:{'missing':'Unicode Ω\nC:\\fixture'},bookmarks:['missing'],templates:[{name:'Infantry',rows:[{id:'infantry',count:9}]}],dlcStates:{demo:{owned:{value:'unknown',source:'No entitlement evidence'},enabled:{value:'no',source:'Manual assertion'}}}});
const request=async(s:{url:string},route:string,body?:any,method='POST')=>{const response=await fetch(s.url+'/api/v1/'+route,{method:body===undefined&&method==='POST'?'GET':method,body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
async function fixture(fn:(a:Awaited<ReturnType<typeof startServer>>,b:Awaited<ReturnType<typeof startServer>>)=>Promise<void>){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-planner-service-'));
  const a=await startServer({dataDir:directory,port:0,autoIndex:false});const b=await startServer({dataDir:directory,port:0,autoIndex:false});
  try{
    const tree:Entry={uid:'tree:fixture',id:'fixture',kind:'focus_tree',title:'Fixture tree',description:'',source:'fixture.txt',line:1,hash:'a'.repeat(64),version:'fixture',data:{countries:['GER'],sharedIds:[]}};a.store.insert(tree);
    for(const id of ['A','B'])a.store.insert({uid:'focus:'+id,id,kind:'focus',title:id,description:'',source:tree.source,line:2,hash:tree.hash,version:'fixture',data:{treeId:'fixture',days:7,prerequisites:id==='B'?[['A']]:[],exclusive:[],conditions:{}}});
    a.store.setSetting('meta',{indexRevision:'index-a',dlcs:[],defines:{}});await fn(a,b);
    assert.equal(a.store.db.prepare('PRAGMA integrity_check').get()?.integrity_check,'ok');
  }finally{await b.close();await a.close();fs.rmSync(directory,{recursive:true,force:true});}
}
const previewInput=(profile:any,plan=ensurePlanner(profile).plans[0])=>({profile,plan,expectedProfileRevision:profile.revision??0,expectedIndexRevision:'index-a'});

test('preview and cancellation are write-free; apply is one revision and preserves all campaign fields',async()=>fixture(async(a)=>{
  const saved=(await request(a,'profile',base())).body;const planner=ensurePlanner(saved);planner.plans.push({...structuredClone(planner.plans[0]),id:'alternative',name:'Alternative',items:[{reference:'B',legacyId:'B'}]});
  const input=previewInput({...saved,planner},planner.plans[1]);const before=a.store.profile(saved.id);
  const preview=await request(a,'plan/preview',input);assert.equal(preview.status,200);assert.equal(preview.body.report.steps[0].eligibility,'no');assert.deepEqual(a.store.profile(saved.id),before);
  const applied=await request(a,'plan/apply',{...input,fingerprint:preview.body.fingerprint});assert.equal(applied.status,200);assert.equal(applied.body.profile.revision,2);assert.equal(applied.body.profile.planner.activePlanId,'alternative');assert.deepEqual(applied.body.profile.queue,['B']);
  for(const key of ['completed','notes','bookmarks','templates','dlcStates'])assert.deepEqual(applied.body.profile[key],saved[key]);
  const replay=await request(a,'plan/apply',{...input,fingerprint:preview.body.fingerprint});assert.equal(replay.status,409);assert.equal(replay.body.code,'profile-conflict');assert.equal(a.store.profile(saved.id)!.revision,2);
}));
test('dual-revision apply rejects profile, reference and changed-draft races without writes',async()=>fixture(async(a,b)=>{
  let p=(await request(a,'profile',base())).body;let input=previewInput(p);let preview=(await request(a,'plan/preview',input)).body;
  b.store.setSetting('meta',{indexRevision:'index-b',dlcs:[],defines:{}});let result=await request(a,'plan/apply',{...input,fingerprint:preview.fingerprint});assert.equal(result.status,409);assert.equal(result.body.code,'reference-conflict');assert.equal(a.store.profile(p.id)!.revision,1);
  b.store.setSetting('meta',{indexRevision:'index-a',dlcs:[],defines:{}});result=await request(a,'plan/apply',{...input,plan:{...input.plan,name:'Changed after review'},fingerprint:preview.fingerprint});assert.equal(result.status,409);assert.equal(result.body.code,'preview-changed');assert.equal(a.store.profile(p.id)!.revision,1);
  p=(await request(b,'profile',{...p,notes:{other:'Committed in other window'}})).body;result=await request(a,'plan/apply',{...input,fingerprint:preview.fingerprint});assert.equal(result.status,409);assert.equal(result.body.code,'profile-conflict');assert.deepEqual(a.store.profile(p.id)!.notes,p.notes);
  input=previewInput(p);preview=(await request(a,'plan/preview',input)).body;await request(b,'profile?id='+p.id+'&revision='+p.revision,undefined,'DELETE');result=await request(a,'plan/apply',{...input,fingerprint:preview.fingerprint});assert.equal(result.status,409);assert.equal(a.store.profile(p.id),null);
}));
test('API retains ambiguous candidates and accepts an explicitly selected definition without fuzzy reassignment',async()=>fixture(async(a)=>{
  const template=a.store.entry('focus:A')!;a.store.insert({...template,uid:'focus:A:variant:2',title:'Variant A'});
  const p=(await request(a,'profile',base())).body;const input=previewInput(p);let result=await request(a,'plan/preview',input);assert.equal(result.status,200);assert.equal(result.body.report.steps[0].resolution,'ambiguous');assert.match(result.body.report.steps[0].issues[0].message,/2 definitions/);
  const exact={...input,plan:{...input.plan,items:[{reference:'definition:focus:A:variant:2',legacyId:'A'}]}};result=await request(a,'plan/preview',exact);assert.equal(result.status,200);assert.equal(result.body.report.steps[0].resolution,'resolved');assert.equal(result.body.report.steps[0].title,'Variant A');assert.equal(a.store.profile(p.id)!.revision,1);
}));
test('planner namespace cannot be stripped or semantically replaced by older/simple profile writes',async()=>fixture(async(a)=>{
  const original=(await request(a,'profile',base())).body;
  const unreviewed=await request(a,'profile',{...original,exportSchemaVersion:3,planner:ensurePlanner(original)});assert.equal(unreviewed.status,409);assert.equal(unreviewed.body.code,'preview-required');assert.equal(a.store.profile(original.id)!.planner,undefined);
  const input=previewInput(original);const preview=(await request(a,'plan/preview',input)).body;const p=(await request(a,'plan/apply',{...input,fingerprint:preview.fingerprint})).body.profile;
  const {planner,...old}=p;let result=await request(a,'profile',{...old,exportSchemaVersion:2});assert.equal(result.status,409);assert.equal(result.body.code,'writer-incompatible');
  const changed=structuredClone(p);changed.planner.plans[0].items.reverse();result=await request(a,'profile',changed);assert.equal(result.status,409);assert.equal(result.body.code,'preview-required');
  const done=await request(a,'profile',{...p,completed:['A']});assert.equal(done.status,200);assert.deepEqual(done.body.planner,planner);assert.deepEqual(done.body.queue,['A','B']);
  assert.equal((await request(a,'profile',{...done.body,exportSchemaVersion:4})).status,400);
  const imported=await request(a,'profile',{...done.body,id:'imported',revision:0});assert.equal(imported.status,200);assert.deepEqual(imported.body.planner,planner);assert.deepEqual(imported.body.notes,p.notes);
}));
test('schema2 upgrade backs up and preserves exact payloads, revision, selection, tombstones with rollback and restore',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-planner-migration-'));const store=openStore(directory);const p=store.saveProfile(base()).saved!;store.setSetting('selectedProfileId',p.id);store.db.prepare('INSERT INTO profile_tombstones VALUES(?)').run('deleted');store.db.exec('PRAGMA user_version=2');const payload=store.db.prepare('SELECT payload FROM profiles').get()!.payload;store.db.close();
  try{
    assert.throws(()=>migrateStore(directory,{closedApps:true,beforeCommit(){throw new Error('injected rollback');}}),/injected rollback/);let db=new DatabaseSync(path.join(directory,'companion.sqlite'));assert.equal(db.prepare('PRAGMA user_version').get()!.user_version,2);assert.equal(db.prepare('SELECT payload FROM profiles').get()!.payload,payload);db.close();
    const migrated=migrateStore(directory,{closedApps:true});const reopened=openStore(directory);assert.equal(reopened.db.prepare('PRAGMA user_version').get()!.user_version,3);assert.equal(reopened.db.prepare('SELECT payload FROM profiles').get()!.payload,payload);assert.equal(reopened.profile(p.id)!.revision,1);assert.equal(reopened.selectedProfileId(),p.id);assert.equal(reopened.saveProfile({...p,id:'deleted',revision:0}).conflict,true);reopened.db.close();
    assert.equal(restoreStore(directory,migrated.backup!,{closedApps:true}).schema,2);assert.throws(()=>openStore(directory),/migrate/i);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('UTF-8 notes split across real HTTP body chunks preserve exact Unicode bytes',async()=>fixture(async(a)=>{
  const input={...base(),notes:{unicode:'Before 🦊 Ω after'}};const bytes=Buffer.from(JSON.stringify(input));const split=bytes.indexOf(Buffer.from('🦊'))+2;
  const result=await new Promise<{status:number;body:any}>((resolve,reject)=>{
    const req=http.request(a.url+'/api/v1/profile',{method:'POST',headers:{'Content-Type':'application/json'}},res=>{const chunks:Buffer[]=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode!,body:JSON.parse(Buffer.concat(chunks).toString('utf8'))}));});req.on('error',reject);req.write(bytes.subarray(0,split));setTimeout(()=>req.end(bytes.subarray(split)),20);
  });assert.equal(result.status,200);assert.equal(result.body.notes.unicode,input.notes.unicode);assert.equal(a.store.profile(input.id)!.notes.unicode,input.notes.unicode);
}));
