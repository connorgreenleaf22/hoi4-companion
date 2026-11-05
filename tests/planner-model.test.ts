import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ensurePlanner,mirrorPlanner,copyPlan,renamePlan,deletePlan,activatePlan,comparePlans,setChecklistItem} from '../server/planner/plans';
import {captureChecklist,checklistStatus} from '../server/planner/checklists';
import {validatePlanner} from '../server/planner/validation';
import {parseScript} from '../server/parser';
import {evaluatePlanner} from '../server/planner/evaluate';
import type {CampaignPlan,Entry,Evidence,PlannerReport,Profile,RequirementResult} from '../src/types';

const profile=():Profile=>({id:'fixture',revision:7,name:'Synthetic preservation campaign',country:'GER',startDate:'1936-02-29',historical:true,goals:'Preserve this',tree:'old-tree',queue:['A','A','missing'],completed:['DONE'],bookmarks:['old-definition'],notes:{'old-definition':'Unicode: Αθήνα 日本語\nC:\\Games\\HOI4'},templates:[{name:'Line',rows:[{id:'infantry',count:9}]}],dlcs:['legacy-assertion'],dlcConfirmed:true,legacyDlcAssertions:['legacy-assertion'],dlcStates:{content:{owned:{value:'unknown',source:'Unknown'},enabled:{value:'no',source:'User'}}},referenceIndexRevision:'index-A',exportSchemaVersion:2});
const source:Evidence={class:'installed-script',source:'fixture/focus.txt',line:8,hash:'hash-A',gameVersion:'fixture',rule:'fixture-extraction'};
const requirement:RequirementResult={truth:'unknown',key:'OR',role:'availability',reason:'one unresolved child',children:[{truth:'no',key:'always',value:'no',role:'availability',reason:'declared false',children:[],assumptions:[],source},{truth:'unknown',key:'has_country_flag',value:'fixture_flag',role:'availability',reason:'unsupported runtime state',children:[],assumptions:['Check in game'],source}],assumptions:['No live state'],source};
const plan=():CampaignPlan=>({id:'main',name:'Main',tree:'old-tree',items:[{reference:'vanilla:focus:tree:A',legacyId:'A'}],startDate:'1936-02-29',assumptions:['Sequential hypothetical focus completion'],referenceIndexRevision:'index-A'});
const report=():PlannerReport=>({steps:[{position:0,reference:'vanilla:focus:tree:A',id:'A',title:'Synthetic focus',resolution:'resolved',eligibility:'unknown',reachability:'unknown',projectedCompletion:'unknown',requirements:[structuredClone(requirement)],issues:[{position:0,id:'A',type:'manual',message:'Confirm fixture flag'}],assumptions:['Complete A only if its manual conditions hold'],sources:[structuredClone(source)],days:70,cumulativeKnownDays:70,cumulativeDays:70,finishDate:'1936-05-09'}],issues:[],knownDays:70,totalDays:70,finishDate:'1936-05-09',unresolvedDays:false,assumptions:['Nominal timing only'],indexRevision:'index-A',treeReference:'old-tree',verification:'extracted',days:70,assumption:'Nominal timing only'});
const context={id:'capture-A',name:'Captured main',createdAt:'2026-11-03T00:00:00.000Z',indexRevision:'index-A',gameVersion:'fixture',appVersion:'0.3.0',actualCompleted:['DONE']};
const currentEntry=(changes:Partial<Entry>={}):Entry=>({uid:'focus:fixture:A',id:'A',entityKey:'vanilla:focus:tree:A',kind:'focus',title:'Synthetic focus',description:'Fixture only',source:'fixture/focus.txt',line:8,hash:'hash-A',version:'fixture',data:{},...changes});

test('legacy projection is deterministic and write-free; first canonical mirror preserves every campaign field and duplicate position',()=>{
  const original=profile();const before=JSON.stringify(original);const first=ensurePlanner(original);const second=ensurePlanner(original);
  assert.deepEqual(first,second);assert.equal(first.activePlanId,'main');assert.equal(first.plans[0].name,'Main');assert.deepEqual(first.plans[0].items.map(i=>i.reference),original.queue);assert.equal(JSON.stringify(original),before);assert.equal(original.planner,undefined);assert.equal(original.exportSchemaVersion,2);
  first.plans[0].name='Changed local draft';assert.equal(ensurePlanner(original).plans[0].name,'Main');
  const saved=mirrorPlanner(original);assert.equal(saved.exportSchemaVersion,3);assert.deepEqual(saved.queue,['A','A','missing']);assert.equal(saved.revision,7);
  const {planner,exportSchemaVersion,...preserved}=saved;const {exportSchemaVersion:oldVersion,...oldFields}=original;assert.deepEqual(preserved,oldFields);
  assert.equal(JSON.stringify(original),before);
});

test('namespace mirrors exactly the selected alternative without promoting hypothetical completion',()=>{
  const original=profile();let planner=copyPlan(ensurePlanner(original),'main','other','Other');
  planner.plans[1]={...planner.plans[1],tree:'other-tree',startDate:'1940-02-28',items:[{reference:'vanilla:focus:other:B',legacyId:'B'},{reference:'definition:unresolved-uid'}]};
  planner=activatePlan(planner,'other');const mirrored=mirrorPlanner({...original,tree:'stale-mirror',queue:['wrong'],planner});
  assert.deepEqual(mirrored.queue,['B','definition:unresolved-uid']);assert.equal(mirrored.tree,'other-tree');assert.equal(mirrored.startDate,'1940-02-28');assert.deepEqual(mirrored.completed,['DONE']);assert.deepEqual(mirrored.notes,original.notes);
});

test('alternative edits and comparisons are isolated drafts; duplicate-aware differences retain sequence positions',()=>{
  const original=ensurePlanner(profile());const before=JSON.stringify(original);const copied=copyPlan(original,'main','other','Alternative');
  const renamed=renamePlan(copied,'other','New name');assert.equal(copied.plans[1].name,'Alternative');assert.equal(renamed.plans[1].name,'New name');assert.equal(original.plans.length,1);
  const left={...plan(),items:[{reference:'A'},{reference:'A'},{reference:'B'}]};const right={...plan(),id:'other',items:[{reference:'A'},{reference:'B'},{reference:'C'}]};
  const compared=comparePlans(left,right);assert.equal(compared.commonPrefix,1);assert.equal(compared.firstDifference,1);assert.deepEqual(compared.leftOnly,[{reference:'A'}]);assert.deepEqual(compared.rightOnly,[{reference:'C'}]);
  compared.left.items[0].reference='LOCAL';assert.equal(left.items[0].reference,'A');assert.equal(JSON.stringify(original),before);
});

test('deleting the active plan requires an explicit surviving replacement; captured checklist may outlive its plan',()=>{
  const original=ensurePlanner(profile());assert.throws(()=>deletePlan(original,'main'),/at least one/);
  const two=copyPlan(original,'main','other','Alternative');two.checklists=[captureChecklist(plan(),report(),context)];
  assert.throws(()=>deletePlan(two,'main'),/replacement/);assert.throws(()=>deletePlan(two,'main','main'),/replacement/);assert.throws(()=>deletePlan(two,'main','missing'),/no longer/);
  const changed=deletePlan(two,'main','other');assert.equal(changed.activePlanId,'other');assert.deepEqual(changed.plans.map(p=>p.id),['other']);assert.equal(changed.checklists[0].planId,'main');assert.equal(two.activePlanId,'main');assert.equal(two.plans.length,2);
});

test('planner validation rejects semantic loss, identity collisions, malformed dates and unsafe nested objects',()=>{
  const original=ensurePlanner(profile());
  const mutated=(fn:(v:any)=>void)=>{const value=structuredClone(original);fn(value);return value;};
  assert.throws(()=>validatePlanner(mutated(v=>v.schemaVersion=4)),/Unsupported planner schema/);
  assert.throws(()=>validatePlanner(mutated(v=>v.activePlanId='absent')),/active plan/);
  assert.throws(()=>validatePlanner(mutated(v=>v.plans.push(v.plans[0]))),/Duplicate plan/);
  assert.throws(()=>validatePlanner(mutated(v=>v.plans[0].startDate='1937-02-29')),/start date/);
  assert.throws(()=>validatePlanner(mutated(v=>v.plans[0].name='n'.repeat(101))),/plan name/);
  assert.throws(()=>validatePlanner(mutated(v=>v.plans[0].items.push({reference:3}))),/focus reference/);
  assert.throws(()=>validatePlanner(mutated(v=>v.plans[0].items[0].hidden='drop me')),/Unsupported focus reference field/);
  assert.throws(()=>validatePlanner(JSON.parse(JSON.stringify(original).replace('"id":"main"','"__proto__":{},"id":"main"'))),/Unsafe/);
  assert.throws(()=>validatePlanner(mutated(v=>v.plans=Array.from({length:21},(_,i)=>({...v.plans[0],id:String(i)})))),/Invalid plans/);
  assert.throws(()=>validatePlanner(mutated(v=>v.plans[0].items=Array.from({length:2001},()=>({reference:'A'})))),/Invalid plan items/);
});

test('invalid display state falls back safely without removing saved missing references',()=>{
  const original=ensurePlanner(profile());const value=validatePlanner({...original,view:{mode:'broken',zoom:Infinity,scrollLeft:-10,scrollTop:'bad',filter:{bad:true},selectedReference:'A'}});
  assert.deepEqual(value.view,{mode:'list',filter:'',zoom:1,scrollLeft:0,scrollTop:0,selectedReference:'A'});assert.deepEqual(value.plans,original.plans);
});

test('checklist capture retains grouping, manual checks, source hashes, versions and actual-versus-projected context without mutating inputs',()=>{
  const p=plan(),r=report();const before=JSON.stringify({p,r});const checklist=captureChecklist(p,r,context);
  assert.equal(JSON.stringify({p,r}),before);assert.deepEqual(checklist.actualCompleted,['DONE']);assert.deepEqual(checklist.items[0].completionContext,{eligibility:'unknown',reachability:'unknown',projectedCompletion:'unknown'});
  assert.deepEqual(checklist.items[0].requirements,[requirement]);assert.equal(checklist.items[0].sources[0].hash,'hash-A');assert.match(checklist.items[0].text,/Confirm fixture flag/);assert.match(checklist.items[0].text,/in the game/);assert.equal(checklist.indexRevision,'index-A');assert.equal(checklist.appVersion,'0.3.0');
  checklist.items[0].requirements[0].children[0].truth='yes';assert.equal(r.steps[0].requirements[0].children[0].truth,'no');
  assert.throws(()=>captureChecklist(p,r,{...context,indexRevision:'index-B'}),/context differs/);assert.throws(()=>captureChecklist({...p,items:[]},r,context),/sequence differs/);
});

test('ticks change only captured progress; actual campaign completion and original answer remain untouched',()=>{
  const original=profile();const planner=ensurePlanner(original);planner.checklists.push(captureChecklist(plan(),report(),context));const before=JSON.stringify(planner);
  const changed=setChecklistItem(planner,'capture-A','step-1',true);assert.equal(changed.checklists[0].items[0].checked,true);assert.equal(JSON.stringify(planner),before);assert.deepEqual(original.completed,['DONE']);assert.deepEqual(changed.checklists[0].actualCompleted,['DONE']);assert.equal(changed.checklists[0].items[0].text,planner.checklists[0].items[0].text);
  assert.throws(()=>setChecklistItem(planner,'capture-A','missing',true),/no longer exists/);
});

test('resolved captures keep stable target identity and legacy fallback across source moves and reused aliases',()=>{
  const p={...plan(),items:[{reference:'old-definition-uid'}]};const r=report();r.steps[0].reference='old-definition-uid';r.steps[0].resolvedReference='vanilla:focus:tree:A';
  const captured=captureChecklist(p,r,context);assert.deepEqual(captured.items[0].target,{reference:'vanilla:focus:tree:A',legacyId:'old-definition-uid'});assert.equal(p.items[0].reference,'old-definition-uid');
  const moved=currentEntry({uid:'focus:moved:A',source:'fixture/moved.txt'});assert.equal(checklistStatus(captured,'index-A',[moved]).items[0].status,'resolved');
  const raw=captureChecklist({...plan(),items:[{reference:'old-definition-uid'}]},{...r,steps:[{...r.steps[0],resolvedReference:undefined}]},context);
  moved.data.legacyAliases=['old-definition-uid'];assert.equal(checklistStatus(raw,'index-A',[moved]).items[0].status,'resolved');
  moved.data.ambiguousAliases=['old-definition-uid'];assert.equal(checklistStatus(raw,'index-A',[moved]).items[0].status,'ambiguous');
});

test('changed, missing and ambiguous evidence is flagged while the original captured answer is preserved',()=>{
  const captured=captureChecklist(plan(),report(),context);const before=JSON.stringify(captured);
  assert.equal(checklistStatus(captured,'index-A',[currentEntry()]).stale,false);
  const changed=checklistStatus(captured,'index-B',[currentEntry({hash:'hash-B'})]);assert.equal(changed.stale,true);assert.equal(changed.items[0].status,'stale');assert.ok(changed.reasons.length);
  assert.equal(checklistStatus(captured,'index-A',[]).items[0].status,'unresolved');
  assert.equal(checklistStatus(captured,'index-A',[currentEntry(),currentEntry({uid:'another-definition'})]).items[0].status,'ambiguous');
  assert.equal(checklistStatus(captured,'index-A').items[0].status,'unsupported');assert.equal(JSON.stringify(captured),before);
});

test('checklist validation bounds nested captured requirements and rejects malformed progress or completion context',()=>{
  const planner=ensurePlanner(profile());planner.checklists=[captureChecklist(plan(),report(),context)];
  const mutate=(fn:(v:any)=>void)=>{const copy=structuredClone(planner);fn(copy);return copy;};
  assert.throws(()=>validatePlanner(mutate(v=>v.checklists[0].items[0].checked='yes')),/checklist tick/);
  assert.throws(()=>validatePlanner(mutate(v=>v.checklists[0].items[0].completionContext.eligibility='true')),/completion context/);
  assert.throws(()=>validatePlanner(mutate(v=>v.checklists.push(v.checklists[0]))),/Duplicate checklist/);
  const deep:any=structuredClone(requirement);let node=deep;for(let i=0;i<18;i++){node.children=[structuredClone(requirement)];node=node.children[0];}
  assert.throws(()=>validatePlanner(mutate(v=>v.checklists[0].items[0].requirements=[deep])),/tree exceeds/);
});

test('parsed anonymous reward members survive sourced checklist capture and validation without effect simulation',()=>{
  const parsed=parseScript('completion_reward = { add_ideas = { idea_A idea_B } }');
  const focus=currentEntry({data:{nodes:parsed,days:7,prerequisites:[],exclusive:[],conditions:{}}});
  const evaluated=evaluatePlanner(profile(),plan(),[focus],{indexRevision:context.indexRevision});
  const outcome=evaluated.steps[0].requirements.find(r=>r.role==='outcome')!;
  const members=outcome.children[0].children;
  assert.deepEqual(members.map(n=>({key:n.key,value:n.value,truth:n.truth})),[{key:'',value:'idea_A',truth:'unknown'},{key:'',value:'idea_B',truth:'unknown'}]);
  const captured=captureChecklist(plan(),evaluated,context);const planner=ensurePlanner(profile());planner.checklists=[captured];
  const roundtrip=validatePlanner(JSON.parse(JSON.stringify(planner)));
  assert.deepEqual(roundtrip.checklists[0],captured);assert.deepEqual(roundtrip.checklists[0].items[0].requirements.find(r=>r.role==='outcome'),JSON.parse(JSON.stringify(outcome)));
  assert.deepEqual(profile().completed,['DONE']);
});
