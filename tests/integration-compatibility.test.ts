import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {startServer,validateProfile} from '../server/api';

// Synthetic pre-integration schema-3 storage, including the older AiSource shape
// before PR #6's optional fields. Never open a user's database for this test.
test('copied pre-integration campaigns and AI records survive offline reopen without rewriting payloads',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-integration-compat-'));
  const original=path.join(root,'original'),copy=path.join(root,'copy');
  let app:Awaited<ReturnType<typeof startServer>>|undefined;
  const hash=(file:string)=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  try{
    app=await startServer({dataDir:original,port:0,autoIndex:false});
    const profile=app.store.saveProfile(validateProfile({id:'legacy',name:'Synthetic old campaign',country:'POR',tree:'old-tree',startDate:'1936-01-01',historical:true,goals:'Keep',queue:['missing-old-focus'],completed:[],notes:{old:'Keep this note'},bookmarks:['old-reference'],templates:[{name:'Old infantry',rows:[{id:'infantry',count:9}]}],dlcs:[],dlcConfirmed:false})).saved!;
    app.store.setSetting('selectedProfileId',profile.id);
    const context={schemaVersion:1,fingerprint:'old-context',country:'POR',startDate:'1936-01-01',sources:{},references:[{reference:'definition:old-focus',id:'old-focus',kind:'focus',title:'Synthetic focus',source:'fixture.txt',line:1,hash:'fixture',version:'fixture',prerequisites:[],exclusions:[],summary:['Old summary'],requirements:[]}],omitted:0,disclosure:'Synthetic local fixture',manualContext:'',dlcAssertions:{},objective:'Old objective',revisionInstruction:''};
    const strategy={schemaVersion:1,id:'old-strategy',profileId:profile.id,revision:2,objective:'Old objective',content:{name:'Old provisional draft',focusIds:[],recommendations:[],secondaryObjectives:[],assumptions:[],risks:[],milestones:[],alternatives:[],unknowns:[]},classification:'provisional'};
    const attempt={schemaVersion:2,requestId:'old-attempt',profileId:profile.id,sessionId:app.store.getSetting('ai-budget-session',''),objective:'Old objective',context,startedAt:'2026-11-09T00:00:00Z',status:'failed',provider:'synthetic-offline',model:'fixture',reservedUsd:0.12,requestFingerprint:'old-request'};
    const rawStrategy=JSON.stringify(strategy),rawAttempt=JSON.stringify(attempt);
    app.store.db.prepare('INSERT INTO ai_strategies VALUES(?,?,?,?)').run(strategy.id,profile.id,2,rawStrategy);
    app.store.db.prepare('INSERT INTO ai_evaluations VALUES(?,?)').run(attempt.requestId,rawAttempt);
    await app.close();app=undefined;
    const source=path.join(original,'companion.sqlite'),before=hash(source);
    fs.mkdirSync(copy);fs.copyFileSync(source,path.join(copy,'companion.sqlite'));
    for(let reopen=0;reopen<2;reopen++){
      app=await startServer({dataDir:copy,port:0,autoIndex:false});
      assert.deepEqual(app.store.profile(profile.id),profile);
      assert.equal(app.store.selectedProfileId(),profile.id);
      const get=async(route:string)=>{const r=await fetch(app!.url+'/api/v1/'+route);assert.equal(r.status,200);return r.json();};
      assert.deepEqual(await get('ai/strategies?profile=legacy'),[strategy]);
      assert.deepEqual(await get('ai/evaluations?profile=legacy'),[attempt]);
      const status=await get('ai/config');assert.equal(status.configured,false);
      assert.equal(status.budget.heldUsd,0.12);assert.equal(status.budget.unknownRequests,1);
      assert.equal(app.store.db.prepare('SELECT payload FROM ai_strategies').get()!.payload,rawStrategy);
      assert.equal(app.store.db.prepare('SELECT payload FROM ai_evaluations').get()!.payload,rawAttempt);
      await app.close();app=undefined;
    }
    assert.equal(hash(source),before,'original fixture database must remain byte-identical');
  }finally{
    await app?.close();
    const absolute=path.resolve(root);assert.ok(absolute.startsWith(path.resolve(os.tmpdir())+path.sep));
    fs.rmSync(absolute,{recursive:true,force:true});
  }
});
