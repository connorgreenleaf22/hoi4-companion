import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {startServer,validateProfile} from '../server/api';
import {campaignGuides,inspectGuide,listDiscovery,getDiscovery,previewDiscovery} from '../server/discovery';
import {ensurePlanner,mirrorPlanner} from '../server/planner/plans';
import type {CampaignGuide} from '../src/discovery-types';
import type {Entry,Meta,Profile} from '../src/types';
import {capturedGuideCorrections} from '../src/guide-corrections';

// Developer source/API evidence using synthetic records with the real guide identifiers.
// These fixtures validate app contracts, not the truth of a game's unlock conditions.
type Service=Awaited<ReturnType<typeof startServer>>;
const chosen=()=>campaignGuides.find(g=>g.id==='usa-fascist')!;
const hidden=()=>campaignGuides.find(g=>g.id==='british-elizabeth')!;
const request=async(s:Service,route:string,body?:unknown)=>{
  const response=await fetch(`${s.url}/api/v1/${route}`,body===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  return {status:response.status,body:await response.json()};
};
const meta=(guide:CampaignGuide):Meta=>({root:'synthetic-only',version:guide.supportedVersion,gameVersion:guide.supportedVersion,indexRevision:'discovery-index-a',indexedAt:'2026-11-03T00:00:00Z',counts:{},files:0,warnings:[],dlcs:[],mods:[],defines:{FOCUS_POINT_DAYS:7}});
function seed(s:Service,guide=chosen()){
  assert.ok(guide.starter,'Fixture guide has a focus starter');
  const sourceHashes=Object.fromEntries(guide.sources.filter(source=>source.kind==='installed-script').map(source=>[source.path,source.hash]));
  s.store.setSetting('meta',meta(guide));s.store.setSetting('guideSourceHashes',sourceHashes);
  let sequence=0;
  const entry=(id:string,kind:string,source:string,data:Entry['data']={}):Entry=>{
    const old=s.store.resolve(id,kind).candidates.find(e=>e.source===source);if(old)return old;
    const e:Entry={id,kind,source,uid:`${kind}:${source}:${id}`,title:`Synthetic ${id}`,description:'Synthetic contract fixture',hash:sourceHashes[source]||'a'.repeat(64),version:guide.supportedVersion,line:++sequence,data};s.store.insert(e);return e;
  };
  const tree=entry(guide.starter.treeId,'focus_tree',guide.starter.treeSource,{countries:guide.countries,sharedIds:[]});
  for(const [index,id] of guide.starter.focusIds.entries())entry(id,'focus',guide.starter.treeSource,{treeId:tree.id,days:7,prerequisites:index?[[guide.starter.focusIds[index-1]]]:[],exclusive:[],conditions:{available:[{key:'always',value:'yes',line:1}]}});
  for(const ref of guide.references)entry(ref.id,ref.kind,ref.source,ref.kind==='focus'?{treeId:tree.id,days:7,prerequisites:[],exclusive:[],conditions:{}}:{});
  const profile=validateProfile({id:'discovery-campaign',name:'Discovery preservation fixture',country:guide.countries[0],tree:'definition:'+tree.uid,startDate:'1936-01-01',goals:'Keep original campaign goal',queue:['original-focus'],completed:['explicitly-completed'],notes:{'old:reference':'Keep Unicode \u03a9\nnotes'},bookmarks:['missing-old-reference'],templates:[{name:'Existing template',rows:[{id:'infantry',count:9}]}],dlcStates:{test:{owned:{value:'unknown',source:'Manual fixture'},enabled:{value:'no',source:'Manual fixture'}}}});
  const normalized=mirrorPlanner({...profile,planner:ensurePlanner(profile)});
  normalized.planner!.plans.push({...structuredClone(normalized.planner!.plans[0]),id:'existing-alternative',name:'Keep alternate plan',items:[]});
  const saved=s.store.saveProfile(normalized).saved!;s.store.setSetting('selectedProfileId',saved.id);return {guide,tree,profile:saved,sourceHashes};
}
async function fixture(fn:(s:Service)=>Promise<void>|void){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-discovery-test-'));
  const service=await startServer({dataDir:directory,port:0,autoIndex:false});
  try{await fn(service);assert.equal(service.store.db.prepare('PRAGMA integrity_check').get()?.integrity_check,'ok');}
  finally{await service.close();fs.rmSync(directory,{recursive:true,force:true});}
}
const previewInput=(profile:Profile,guide:CampaignGuide=chosen())=>({guideId:guide.id,profileId:profile.id,expectedProfileRevision:profile.revision,expectedIndexRevision:'discovery-index-a',spoilers:'show'});
const applyInput=(result:any)=>({profile:result.profile,plan:result.plan,...result.preview});

test('curated guide claims retain explicit categories, evidence and original-summary rights',()=>{
  assert.ok(campaignGuides.length>=7);assert.equal(new Set(campaignGuides.map(g=>g.id)).size,campaignGuides.length);
  for(const guide of campaignGuides){
    assert.ok(guide.author&&guide.rights&&guide.reviewedAt&&guide.supportedVersion&&guide.limits.length);
    assert.ok(guide.difficulty.label&&guide.difficulty.rationale&&guide.dlcContext);
    const sources=new Map(guide.sources.map(source=>[source.id,source]));assert.equal(sources.size,guide.sources.length);
    assert.equal(new Set(guide.claims.map(claim=>claim.id)).size,guide.claims.length);
    for(const source of guide.sources){assert.ok(source.path&&source.label);if(source.kind==='installed-script'){assert.ok(source.line>0&&source.endLine>=source.line);assert.match(source.hash,/^[a-f0-9]{64}$/);}else{assert.ok(source.author&&source.reviewStatus&&source.rights);}}
    for(const claim of guide.claims){
      assert.ok(['scripted','mechanics','strategy','lead'].includes(claim.type));assert.ok(claim.text.trim());
      for(const id of claim.sourceIds)assert.ok(sources.has(id),`${guide.id}/${claim.id}: missing ${id}`);
      if(claim.verification==='script-extracted'){assert.equal(claim.type,'scripted');assert.ok(claim.sourceIds.length);assert.ok(claim.sourceIds.every(id=>sources.get(id)?.kind==='installed-script'));}
      if(claim.type==='lead')assert.equal(claim.verification,'unverified');
      if(claim.type==='strategy')assert.equal(claim.verification,'editorial');
    }
  }
});

test('independently unverified claims retain editorial/unverified labels and USA delay semantics are not asserted',()=>{
  const unverified:Record<string,string[]>={'usa-fascist':['war-dispatch','prepare','wiki-boundary'],'british-elizabeth':['campaign','wiki-boundary'],'japan-secret-leaders':['not-full','separate','wiki-boundary'],'austrian-restoration':['preparation'],'hungary':['diplomatic-preparation'],'liechtenstein':['military-preparation'],'scandinavia':['route-choice']};
  let checked=0;for(const [guideId,ids] of Object.entries(unverified))for(const id of ids){const claim=campaignGuides.find(g=>g.id===guideId)!.claims.find(c=>c.id===id)!;assert.ok(claim);assert.equal(claim.verification,claim.type==='strategy'?'editorial':'unverified',`${guideId}/${id} was promoted without verification`);checked++;}assert.equal(checked,12);
  const usa=chosen(),claim=usa.claims.find(c=>c.id==='war-dispatch')!;assert.equal(usa.revision,2);assert.match(claim.text,/compound NOT interpretation is unresolved/);assert.match(claim.text,/do not infer which completion combinations/);assert.doesNotMatch(claim.text,/if neither|otherwise after/);assert.deepEqual(claim.sourceIds,['usa-warning','usa-war']);assert.ok(usa.starter!.assumptions.some(text=>/Manual check:.*compound NOT.*unresolved/.test(text)));
});

test('initial research import cannot overwrite reviewed guide qualifications',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-guide-reimport-'));const file=path.join(directory,'server/discovery-content.json');fs.mkdirSync(path.dirname(file));const before=JSON.stringify([{id:'reviewed-guide',revision:2}]);fs.writeFileSync(file,before);
  try{const result=spawnSync(process.execPath,[path.resolve('scripts/prepare-v04.mjs')],{cwd:directory,encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/Refuse to overwrite the reviewed guide catalog/);assert.equal(fs.readFileSync(file,'utf8'),before);}finally{assert.equal(path.dirname(directory),path.resolve(os.tmpdir()));fs.rmSync(directory,{recursive:true,force:true});}
});

test('USA qualification reaches catalog, starter and committed checklist with its source provenance',async()=>fixture(async s=>{
  const {profile,guide}=seed(s),claim=guide.claims.find(c=>c.id==='war-dispatch')!;
  const catalog=await request(s,'guides');const shown=catalog.body.guides.find((g:any)=>g.id===guide.id);assert.equal(shown.claims.find((c:any)=>c.id===claim.id).verification,'unverified');
  const response=await request(s,'discovery/preview',previewInput(profile));assert.equal(response.status,200);const value=response.body;
  assert.ok(value.plan.assumptions.some((text:string)=>text.includes('each claim retains its own verification status')));assert.ok(!value.plan.assumptions.some((text:string)=>text.includes('; script-extracted, not game-verified.')));
  const captured=value.profile.planner.checklists.at(-1),item=captured.items.find((i:any)=>i.id==='guide-'+guide.claims.indexOf(claim));assert.ok(item.text.startsWith('SCRIPTED · unverified: '));assert.ok(item.text.endsWith(claim.text));assert.equal(item.sources.length,2);assert.ok(item.sources.every((source:any)=>source.rule===`Guide usa-fascist r2, war-dispatch`));assert.ok(captured.assumptions.some((text:string)=>text.includes('compound NOT interpretation is unresolved')));
  const applied=await request(s,'plan/apply',applyInput(value));assert.equal(applied.status,200);assert.deepEqual(applied.body.profile.planner.checklists.at(-1),captured);assert.deepEqual(capturedGuideCorrections(captured),[]);
}));

test('historical USA r1 captures are flagged without rewriting wording, source metadata or ticks',async()=>fixture(async s=>{
  const {profile}=seed(s);const response=await request(s,'discovery/preview',previewInput(profile));const old=structuredClone(response.body.profile.planner.checklists.at(-1));old.id='historical-usa';old.name='Historical USA guide r1';old.assumptions=old.assumptions.map((text:string)=>text.replace('Original guide usa-fascist r2;','Original guide usa-fascist r1;').replace('Guide usa-fascist, revision 2,','Guide usa-fascist, revision 1,'));for(const item of old.items){item.checked=true;for(const source of item.sources)source.rule=source.rule.replace('Guide usa-fascist r2,','Guide usa-fascist r1,');}
  const oldClaim=old.items.find((item:any)=>item.sources.some((source:any)=>source.rule==='Guide usa-fascist r1, war-dispatch'));oldClaim.text='SCRIPTED · script-extracted: Historical 280-day if-neither interpretation; retained exactly for review.';
  const before=structuredClone(old);assert.equal(capturedGuideCorrections(old).length,1);assert.match(capturedGuideCorrections(old)[0],/interpretation is unverified/);assert.deepEqual(old,before);
  const saved=s.store.saveProfile({...profile,planner:{...profile.planner!,checklists:[old]}}).saved!;const next=await request(s,'discovery/preview',previewInput(saved));assert.equal(next.status,200);const applied=await request(s,'plan/apply',applyInput(next.body));assert.equal(applied.status,200);assert.deepEqual(applied.body.profile.planner.checklists[0],before);assert.equal(capturedGuideCorrections(applied.body.profile.planner.checklists[0]).length,1);assert.deepEqual(capturedGuideCorrections(applied.body.profile.planner.checklists[1]),[]);
}));

test('hidden guides are excluded before matching and never serialize as title/snippet/source results',async()=>fixture(async s=>{
  const secret=hidden();assert.ok(secret.spoiler);
  const direct=listDiscovery(s.store,{q:secret.title});assert.deepEqual(direct,[]);
  assert.equal(getDiscovery(s.store,secret.id),undefined);
  const normal=await request(s,'guides');assert.equal(normal.status,200);
  for(const guide of campaignGuides.filter(g=>g.spoiler)){assert.ok(!normal.body.guides.some((g:any)=>g.id===guide.id));assert.ok(!JSON.stringify(normal.body.guides).includes(guide.title));}
  const search=await request(s,'guides?q='+encodeURIComponent(secret.title));assert.deepEqual(search.body.guides,[]);
  const shown=await request(s,'guides?spoilers=show&q='+encodeURIComponent(secret.title));assert.equal(shown.body.guides.length,1);assert.equal(shown.body.guides[0].id,secret.id);
  const denied=await request(s,'discovery/preview',{guideId:secret.id,spoilers:'hide'});assert.equal(denied.status,404);assert.ok(!JSON.stringify(denied.body).includes(secret.title));
}));

test('source hash, patch, missing coverage and missing index independently block starter previews',async()=>fixture(s=>{
  const {guide,profile,sourceHashes}=seed(s);assert.equal(inspectGuide(s.store,guide).canPreview,true);
  const first=guide.sources.find(source=>source.kind==='installed-script')!;
  s.store.setSetting('guideSourceHashes',{...sourceHashes,[first.path]:'0'.repeat(64)});
  let view=inspectGuide(s.store,guide);assert.equal(view.freshness,'review-required');assert.match(view.reviewReasons.join(' '),/Source changed/);assert.equal(view.canPreview,false);
  assert.throws(()=>previewDiscovery(s.store,view,profile,'discovery-index-a'),/source\/reference review/);
  s.store.setSetting('guideSourceHashes',{});view=inspectGuide(s.store,guide);assert.equal(view.canPreview,false);assert.match(view.reviewReasons.join(' '),/not represented/);
  s.store.setSetting('guideSourceHashes',sourceHashes);s.store.setSetting('meta',{...meta(guide),version:'different-patch'});view=inspectGuide(s.store,guide);assert.equal(view.canPreview,false);assert.match(view.reviewReasons.join(' '),/Authored for/);
  s.store.setSetting('meta',null);view=inspectGuide(s.store,guide);assert.equal(view.freshness,'unavailable');assert.equal(view.canPreview,false);
}));

test('missing or same-source ambiguous exact references cannot silently choose a starter',async()=>fixture(s=>{
  const {guide}=seed(s),ref=guide.references[0];
  const found=s.store.resolve(ref.id,ref.kind).candidates.find(e=>e.source===ref.source)!;
  s.store.insert({...structuredClone(found),uid:found.uid+':duplicate',title:'Second exact-source definition'});
  let view=inspectGuide(s.store,guide);assert.equal(view.canPreview,false);assert.ok(view.referenceProblems.some(problem=>problem.includes(ref.id)));
  assert.ok(!view.resolvedReferences.some(reference=>reference.id===ref.id));
  s.store.db.prepare('DELETE FROM entries WHERE uid IN (?,?)').run(found.uid,found.uid+':duplicate');
  view=inspectGuide(s.store,guide);assert.equal(view.canPreview,false);assert.ok(view.referenceProblems.some(problem=>problem.includes(ref.id)));
}));

test('discovery preview and cancellation are write-free, including selection and raw saved profile bytes',async()=>fixture(async s=>{
  const {profile,guide}=seed(s);const before=s.store.db.prepare('SELECT payload FROM profiles WHERE id=?').get(profile.id)!.payload;
  const selection=s.store.selectedProfileId();const response=await request(s,'discovery/preview',previewInput(profile));assert.equal(response.status,200,JSON.stringify(response.body));
  assert.equal(response.body.guideId,guide.id);assert.equal(response.body.profile.planner.plans.length,profile.planner!.plans.length+1);
  assert.equal(response.body.profile.planner.checklists.length,1);assert.ok(response.body.profile.planner.checklists[0].items.some((item:any)=>item.text.includes('SCRIPTED')));
  assert.ok(response.body.profile.planner.checklists[0].items.some((item:any)=>item.sources.length));
  assert.equal(s.store.db.prepare('SELECT payload FROM profiles WHERE id=?').get(profile.id)!.payload,before);assert.equal(s.store.selectedProfileId(),selection);
  // Cancel has no endpoint: dropping this transient payload must leave the saved bytes intact.
  const next=await request(s,'discovery/preview',previewInput(profile));assert.equal(next.status,200);assert.notEqual(next.body.plan.id,response.body.plan.id);
  assert.equal(s.store.db.prepare('SELECT payload FROM profiles WHERE id=?').get(profile.id)!.payload,before);
}));

test('explicit reviewed apply adds one alternative/checklist and preserves campaign data and existing plans',async()=>fixture(async s=>{
  const {profile}=seed(s);const response=await request(s,'discovery/preview',previewInput(profile));assert.equal(response.status,200,JSON.stringify(response.body));
  const applied=await request(s,'plan/apply',applyInput(response.body));assert.equal(applied.status,200,JSON.stringify(applied.body));
  const saved=applied.body.profile;assert.equal(saved.revision,profile.revision!+1);assert.equal(saved.planner.activePlanId,response.body.plan.id);assert.equal(saved.planner.checklists.length,1);
  for(const key of ['notes','bookmarks','completed','templates','dlcStates','goals','country','historical'])assert.deepEqual(saved[key],(profile as any)[key],key);
  assert.deepEqual(saved.planner.plans.filter((plan:any)=>plan.id!==response.body.plan.id),profile.planner!.plans);
  assert.ok(saved.planner.checklists[0].items.every((item:any)=>item.checked===false));assert.deepEqual(saved.planner.checklists[0].actualCompleted,profile.completed);
  assert.equal(s.store.selectedProfileId(),profile.id);
  const repeated=await request(s,'plan/apply',applyInput(response.body));assert.equal(repeated.status,409);assert.equal(s.store.profile(profile.id)!.revision,saved.revision);
}));

test('preview refuses wrong country, stale campaign revision and changed reference revision without writes',async()=>fixture(async s=>{
  const {profile,guide}=seed(s);const baseline=JSON.stringify(s.store.profile(profile.id));
  const wrong={...profile,country:'GER'};assert.throws(()=>previewDiscovery(s.store,inspectGuide(s.store,guide),wrong,'discovery-index-a'),/guide country/);
  const old=await request(s,'discovery/preview',{...previewInput(profile),expectedProfileRevision:0});assert.equal(old.status,409);assert.equal(old.body.code,'profile-conflict');
  const stale=await request(s,'discovery/preview',{...previewInput(profile),expectedIndexRevision:'old-index'});assert.equal(stale.status,409);assert.equal(stale.body.code,'reference-conflict');
  assert.equal(JSON.stringify(s.store.profile(profile.id)),baseline);
}));

test('review fingerprint rejects tampering, concurrent edits and source refresh after discovery preview',async()=>fixture(async s=>{
  const {profile,guide}=seed(s);const response=await request(s,'discovery/preview',previewInput(profile));assert.equal(response.status,200,JSON.stringify(response.body));
  const input=applyInput(response.body);
  let result=await request(s,'plan/apply',{...input,plan:{...input.plan,name:'Unreviewed rename'}});assert.equal(result.status,409);assert.equal(result.body.code,'preview-changed');assert.equal(s.store.profile(profile.id)!.revision,profile.revision);
  s.store.setSetting('meta',{...meta(guide),indexRevision:'discovery-index-b'});result=await request(s,'plan/apply',input);assert.equal(result.status,409);assert.equal(result.body.code,'reference-conflict');assert.equal(s.store.profile(profile.id)!.revision,profile.revision);
  s.store.setSetting('meta',meta(guide));const newer=s.store.saveProfile({...profile,notes:{...profile.notes,newer:'External edit preserved'}}).saved!;
  result=await request(s,'plan/apply',input);assert.equal(result.status,409);assert.equal(result.body.code,'profile-conflict');assert.deepEqual(s.store.profile(profile.id),newer);
}));
