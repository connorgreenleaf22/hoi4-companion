import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {openStore} from '../server/store';
import {migrateStore,restoreStore,MigrationRequired} from '../server/migrations';
import {startServer,validateProfile} from '../server/api';
import type {Entry,Relationship} from '../src/types';
import {dlcFacts,evaluate,treeFocuses,type TreeReferenceIssue} from '../server/domain';

const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-knowledge-'));
const cleanup=(p:string)=>{assert.ok(path.resolve(p).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(p,{recursive:true,force:true});};
const entry=(id:string,source='a.txt',scope=''):Entry=>({uid:`module:${source}:${id}`,id,kind:'module',title:id.replaceAll('_',' '),description:'',source,line:1,hash:'hash',version:'test',data:{semanticScope:scope}});
const campaign={id:'old',name:'Preserve',country:'GER',startDate:'1936-01-01',historical:true,goals:'',tree:'',dlcs:['Old DLC'],dlcConfirmed:true,queue:['A'],completed:[],bookmarks:['module:a.txt:cannon'],notes:{'module:a.txt:cannon':'keep note'},templates:[{name:'saved',rows:[{id:'infantry',count:9}]}]};

test('tree assembly exposes missing and duplicate shared definitions without silently choosing a variant',()=>{
  const tree={...entry('tree'),kind:'focus_tree',data:{sharedIds:['missing','duplicate'],countries:[]}};
  const first={...entry('duplicate','one.txt'),kind:'shared_focus',data:{prerequisites:[]}};const second={...first,uid:'shared_focus:two.txt:duplicate',source:'two.txt'};
  const issues:TreeReferenceIssue[]=[];assert.deepEqual(treeFocuses(tree,[first,second],issues),[]);assert.deepEqual(issues.map(i=>[i.id,i.status]),[['missing','unresolved'],['duplicate','ambiguous']]);assert.equal(issues[1].candidates.length,2);
});

test('independent DLC facts preserve unknown ownership and cannot override absent or disabled content',()=>{
  const fact=(value:'yes'|'no'|'unknown')=>({value,source:'fixture'});
  const p=validateProfile({...campaign,dlcStates:{test:{owned:fact('yes'),enabled:fact('yes')}}});
  const dlc={id:'test',name:'Test DLC',disabled:false,installed:fact('unknown'),owned:fact('unknown'),enabled:fact('unknown')};
  assert.equal(dlcFacts(p,[dlc])!['Test DLC'],'unknown');assert.equal(dlcFacts(p,[{...dlc,installed:fact('no')}])!['Test DLC'],'no');assert.equal(dlcFacts(p,[{...dlc,installed:fact('yes'),enabled:fact('no')}])!['Test DLC'],'no');assert.equal(dlcFacts(p,[{...dlc,installed:fact('yes')}])!['Test DLC'],'yes');
  const unconfirmed=validateProfile({...campaign,dlcStates:{}});assert.equal(dlcFacts(unconfirmed,[{...dlc,installed:fact('yes'),enabled:fact('yes')}])!['Test DLC'],'unknown');assert.equal(evaluate([{key:'has_dlc',value:'Unknown DLC',line:1}],p,'AND',[],dlcFacts(p,[dlc])),'unknown');
});

test('closed legacy migration backs up, rolls back failure, restores, and preserves raw user state',()=>{
  const directory=temp(),file=path.join(directory,'companion.sqlite');
  const legacy=new DatabaseSync(file);legacy.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE profiles(id TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE entries(uid TEXT PRIMARY KEY,id TEXT,kind TEXT,title TEXT,description TEXT,source TEXT,payload TEXT NOT NULL); CREATE TABLE profile_tombstones(id TEXT PRIMARY KEY);');
  legacy.prepare('INSERT INTO profiles VALUES(?,?)').run('old',JSON.stringify(campaign));legacy.prepare('INSERT INTO settings VALUES(?,?)').run('selectedProfileId',JSON.stringify('old'));legacy.prepare('INSERT INTO profile_tombstones VALUES(?)').run('deleted');const e=entry('cannon');legacy.prepare('INSERT INTO entries VALUES(?,?,?,?,?,?,?)').run(e.uid,e.id,e.kind,e.title,e.description,e.source,JSON.stringify(e));legacy.close();
  try{
    assert.throws(()=>openStore(directory),MigrationRequired);assert.throws(()=>migrateStore(directory,{closedApps:false}),/Close all/);
    assert.throws(()=>migrateStore(directory,{closedApps:true,beforeCommit(){throw new Error('injected migration failure');}}),/injected/);
    const check=new DatabaseSync(file);assert.equal(check.prepare('PRAGMA user_version').get()?.user_version,0);assert.equal(check.prepare('SELECT payload FROM profiles').get()?.payload,JSON.stringify(campaign));assert.equal(check.prepare("SELECT name FROM sqlite_master WHERE name='aliases'").get(),undefined);check.close();
    const result=migrateStore(directory,{closedApps:true});assert.equal(result.migrated,true);assert.ok(result.backup);
    const manifest=JSON.parse(fs.readFileSync(result.backup!+'.json','utf8'));assert.equal(manifest.integrity,'ok');assert.equal(manifest.sha256,createHash('sha256').update(fs.readFileSync(result.backup!)).digest('hex'));
    const upgraded=openStore(directory);assert.equal(upgraded.db.prepare('SELECT payload FROM profiles').get()?.payload,JSON.stringify(campaign));assert.equal(upgraded.selectedProfileId(),'old');assert.deepEqual(upgraded.profile('old')!.legacyDlcAssertions,['Old DLC']);assert.equal(upgraded.resolve(e.uid).entry?.entityKey,'vanilla:module::cannon');assert.equal(upgraded.saveProfile({...campaign,id:'deleted',revision:0}).conflict,true);upgraded.db.close();
    assert.equal(restoreStore(directory,result.backup!,{closedApps:true}).schema,0);assert.throws(()=>openStore(directory),MigrationRequired);migrateStore(directory,{closedApps:true});const reopened=openStore(directory);assert.deepEqual(reopened.profile('old')?.templates,campaign.templates);reopened.db.close();
  }finally{cleanup(directory);}
});

test('logical identities follow moves, preserve missing references and never retarget ambiguous reused aliases',()=>{
  const directory=temp();const s=openStore(directory);
  try{
    const original=entry('cannon');s.insert(original);s.removeSource('a.txt');const moved=entry('cannon','b.txt');s.insert(moved);
    assert.equal(s.resolve(original.uid).entry?.uid,moved.uid);assert.ok(s.resolve(moved.entityKey!).entry?.data.legacyAliases.includes(original.uid));
    s.insert(entry('cannon','c.txt'));assert.equal(s.resolve(original.entityKey!).status,'ambiguous');assert.equal(s.resolve(original.uid).status,'ambiguous');
    s.removeSource('b.txt');s.removeSource('c.txt');assert.equal(s.resolve(original.uid).status,'stale');assert.equal(s.resolve(original.uid).entry,undefined);
    s.insert(entry('cannon','a.txt','another-tree'));assert.equal(s.resolve(original.uid).status,'ambiguous');assert.equal(s.resolve(original.uid).reason,'legacy-alias-reused');
    const inspected=s.resolve('definition:'+original.uid).entry!;assert.equal(inspected.data.semanticScope,'another-tree');assert.ok(!inspected.data.legacyAliases.includes(original.uid));assert.ok(inspected.data.ambiguousAliases.includes(original.uid));
    const positional=entry('milestone.1','positional.txt','parent');positional.data.anonymousIdentity=true;s.insert(positional);const firstKey=positional.entityKey!;s.removeSource('positional.txt');s.insert({...positional,entityKey:undefined,hash:'changed'});assert.equal(s.resolve(firstKey).status,'stale');assert.equal(s.resolve(positional.uid).status,'ambiguous');
    assert.equal(s.resolve('absent').status,'unresolved');
    s.db.exec('PRAGMA user_version=99');s.db.close();assert.throws(()=>openStore(directory),/newer than supported/);
  }finally{if(s.db.isOpen)s.db.close();cleanup(directory);}
});

test('API exact graph has no fuzzy target cap, question search filters and new profile fields round trip',async()=>{
  const directory=temp();const service=await startServer({dataDir:directory,port:0,autoIndex:false});const b=await startServer({dataDir:directory,port:0,autoIndex:false});
  const s=service.store;
  try{
    const cannon=entry('tank_medium_cannon');cannon.data.aliases=['medium cannon'];cannon.data.countries=['GER'];cannon.data.year=1936;s.insert(cannon);
    const edges:Relationship[]=[];for(let i=0;i<45;i++){const e={...entry('unlock_'+i),kind:'technology',uid:'technology:test:'+i};s.insert(e);edges.push({id:String(i),from:e.uid,fromKey:e.entityKey!,type:'enables-module',targetRef:{id:cannon.id,kind:'module'},resolution:'unresolved',candidates:[],condition:[],scope:[],evidence:e.evidence![0]});}s.replaceRelationships(edges);s.setSetting('meta',{indexRevision:'one',dlcs:[],defines:{}});
    const graph=await fetch(service.url+'/api/v1/relationships?direction=in&ref='+encodeURIComponent(cannon.entityKey!)).then(r=>r.json());assert.equal(graph.relationships.length,45);assert.ok(graph.relationships.every((r:any)=>r.to===cannon.uid));
    const result=await fetch(service.url+'/api/v1/entries?q=what%20unlocks%20medium%20cannon&country=GER&year=1936').then(r=>r.json());assert.equal(result.total,1);assert.equal(result.entries[0].id,cannon.id);assert.equal(result.question.intent,'unlock');
    const states={dlc1:{owned:{value:'yes',source:'user-confirmed'},enabled:{value:'no',source:'user-confirmed'}}};const p=validateProfile({...campaign,dlcStates:states,legacyDlcAssertions:['Old DLC'],referenceIndexRevision:'one',exportSchemaVersion:2});assert.deepEqual(p.dlcStates,states);assert.equal(p.exportSchemaVersion,2);assert.throws(()=>validateProfile({...p,exportSchemaVersion:99}),/Unsupported/);
    const saved=await fetch(service.url+'/api/v1/profile',{method:'POST',body:JSON.stringify(p)}).then(r=>r.json());assert.deepEqual(saved.dlcStates,states);
    b.store.setSetting('meta',{indexRevision:'two',dlcs:[],defines:{}});const status=await fetch(service.url+'/api/v1/status');assert.equal(status.headers.get('X-HOI4-Index-Revision'),'two');assert.equal((await status.json()).meta.indexRevision,'two');
    const stale=await fetch(service.url+'/api/v1/plan',{method:'POST',body:JSON.stringify(p)});assert.equal(stale.status,409);assert.equal((await stale.json()).currentIndexRevision,'two');
  }finally{await b.close();await service.close();cleanup(directory);}
});

test('cached startup with unavailable game source keeps exact links, provenance and saved state',async()=>{
  const directory=temp();const seed=openStore(directory);const e=entry('cached_cannon');seed.insert(e);seed.setSetting('gameRoot',path.join(directory,'unavailable-game'));seed.setSetting('meta',{root:path.join(directory,'unavailable-game'),indexRevision:'cached',version:'test',dlcs:[],defines:{}});seed.saveProfile({...campaign,bookmarks:[e.entityKey!],notes:{[e.entityKey!]:'cached note'}});seed.setSetting('selectedProfileId',campaign.id);
  seed.replaceRelationships([{id:'cached-link',from:e.uid,fromKey:e.entityKey!,type:'uses-upgrade',targetRef:{id:'not-yet-indexed',kind:'upgrade'},resolution:'unresolved',candidates:[],condition:[],scope:[],evidence:e.evidence![0]}]);seed.db.close();
  const service=await startServer({dataDir:directory,port:0});
  try{
    const status=await fetch(service.url+'/api/v1/status').then(r=>r.json());assert.match(status.indexingError,/installation/);assert.equal(status.meta.indexRevision,'cached');assert.equal(status.selectedProfileId,campaign.id);assert.equal(status.profiles[0].notes[e.entityKey!],'cached note');
    const full=await fetch(service.url+'/api/v1/entry?uid='+encodeURIComponent(e.entityKey!)).then(r=>r.json());assert.equal(full.evidence[0].hash,e.hash);assert.equal(full.data.legacyAliases[0],e.uid);
    const graph=await fetch(service.url+'/api/v1/relationships?ref='+encodeURIComponent(e.entityKey!)).then(r=>r.json());assert.equal(graph.relationships[0].resolution,'unresolved');assert.equal(graph.relationships[0].targetRef.id,'not-yet-indexed');assert.equal(service.store.db.prepare('PRAGMA integrity_check').get()?.integrity_check,'ok');
  }finally{await service.close();cleanup(directory);}
});
