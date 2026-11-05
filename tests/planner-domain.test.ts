import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type {CampaignPlan,DLCState,Entry,Profile,RequirementResult,Truth} from '../src/types';
import {parseScript} from '../server/parser';
import {evaluateRequirements,plannerDlcFacts} from '../server/planner/requirements';
import {evaluatePlanner} from '../server/planner/evaluate';
import {nominalTiming} from '../server/planner/timing';

const base:Profile={id:'synthetic',revision:7,name:'Synthetic only',country:'GER',startDate:'1936-01-01',historical:true,goals:'Preserve goal',tree:'synthetic-tree',queue:[],completed:[],dlcs:[],dlcConfirmed:false,bookmarks:['missing-old-ref'],notes:{'missing-old-ref':'Preserve unresolved note'},templates:[{name:'Existing',rows:[{id:'infantry',count:9}]}]};
const entry=(id:string,data:Record<string,unknown>={}):Entry=>({uid:`focus:synthetic:${id}`,entityKey:`vanilla:focus:synthetic:${id}`,id,kind:'focus',title:id,description:'Synthetic test definition',source:'fixtures/synthetic.txt',line:5,version:'fixture',hash:'synthetic',data:{days:70,prerequisites:[],exclusive:[],conditions:{},...data}});
const catalog=[entry('A'),entry('B',{days:35}),entry('C',{days:0}),entry('GATE_A',{conditions:{available:parseScript('has_completed_focus = A')}}),entry('NOT_A',{conditions:{available:parseScript('NOT = { has_completed_focus = A }')}}),entry('ROWS',{prerequisites:[['A','B'],['C']]}),entry('BLOCKED',{conditions:{available:parseScript('always = no')}}),entry('AFTER_BLOCKED',{prerequisites:[['BLOCKED']]}),entry('MANUAL',{conditions:{available:parseScript('has_war = yes')}}),entry('AFTER_MANUAL',{prerequisites:[['MANUAL']]}),entry('LEFT',{exclusive:['RIGHT']}),entry('RIGHT'),entry('UNKNOWN_DAYS',{days:null})];
const plan=(ids:string[],patch:Partial<CampaignPlan>={}):CampaignPlan=>({id:'plan-1',name:'Main plan',tree:base.tree,startDate:base.startDate,items:ids.map(reference=>({reference})),assumptions:[],...patch});
const run=(ids:string[],patch:Partial<Profile>={},focuses=catalog)=>evaluatePlanner({...base,...patch},plan(ids),focuses,{indexRevision:'synthetic-index'});
const leaves=(result:RequirementResult):RequirementResult[]=>[result,...result.children.flatMap(leaves)];

// Oracles were prepared by independent QA before implementation; only DTO translation occurs here.
const vectors=JSON.parse(fs.readFileSync(new URL('./fixtures/planner-domain-vectors.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
for(const fixture of vectors.fixtures){
  test(`prepared vector ${fixture.id} (developer source execution)`,()=>{
    let result:any;
    if(fixture.operation==='evaluate')result=evaluateRequirements(parseScript(fixture.input.script),fixture.input.profile);
    if(fixture.operation==='timing'){
      try{result=nominalTiming(fixture.input.startDate,fixture.input.days);}catch{result={error:'invalid-input'};}
    }
    if(fixture.operation==='dlc'){
      const input=fixture.input;const fact=(value:Truth)=>({value,source:'synthetic independent fact'});
      const dlc:DLCState={id:input.id,name:input.name,disabled:input.enabled==='no',integrated:input.integrated,installed:fact(input.installed),owned:fact(input.owned),enabled:fact(input.enabled)};
      result={truth:plannerDlcFacts(base,[dlc])[input.name]};
    }
    if(fixture.operation==='queue'){
      const input=fixture.input;const profile:Profile=input.profile;
      const fixtureCatalog:Entry[]=input.catalog.map((item:any)=>entry(item.id,{days:item.days,prerequisites:item.prerequisites,exclusive:item.exclusive,conditions:{available:parseScript(item.available)}}));
      const savedInputs=JSON.stringify(input);
      const report=evaluatePlanner(profile,plan(profile.queue,{tree:profile.tree,startDate:profile.startDate}),fixtureCatalog);
      result={actualCompleted:profile.completed,steps:report.steps.map((step,index)=>{
        const definition=fixtureCatalog.find(e=>e.id===step.id)!;
        const availability=step.requirements.find(r=>r.role==='availability');
        const priorConditional=report.steps.slice(0,index).some(s=>s.reachability==='unknown');
        return {conditionActual:evaluateRequirements(definition.data.conditions.available,profile).truth,conditionProjected:availability?.truth||'yes',conditionalOn:availability?leaves(availability).filter(n=>n.key==='has_completed_focus'&&n.assumptions.length>0).map(n=>n.value):[],reachability:step.reachability==='yes'?'ready':step.reachability==='no'?'blocked':priorConditional?'conditional':'manual',prerequisiteRowsSatisfied:step.requirements.filter(r=>r.role==='prerequisite').map(r=>r.truth==='yes'),conflicts:step.requirements.filter(r=>r.role==='exclusion').flatMap(leaves).filter(r=>r.key==='mutually_exclusive'&&r.truth==='no').map(r=>r.value)};
      })};
      assert.equal(JSON.stringify(input),savedInputs,'queue evaluation must preserve every prepared input field');
    }
    for(const [pointer,expected] of Object.entries(fixture.expect)){
      const actual=pointer.slice(1).split('/').reduce((value:any,key:string)=>value?.[key],result);assert.deepEqual(actual,expected,`${fixture.id} ${pointer}`);
    }
  });
}

test('COND roles, source, unsupported scopes and positive-only manual facts remain explicit',()=>{
  const source={class:'installed-script' as const,source:'fixture',hash:'synthetic',gameVersion:'fixture',rule:'test'};
  const result=evaluateRequirements(parseScript('AND = { always = no FRA = { has_completed_focus = A } }'),{...base,completed:['A']},{role:'availability',source});
  assert.equal(result.truth,'no');const scope=leaves(result).find(n=>n.key==='FRA')!;assert.equal(scope.truth,'unknown');assert.equal(scope.children[0].truth,'unknown');assert.deepEqual(scope.children[0].scope,['FRA']);assert.equal(scope.children[0].source?.line,1);
  for(const key of ['tag','original_tag'])assert.equal(evaluateRequirements(parseScript(`${key} = GER`),base).truth,'unknown');
  assert.equal(evaluateRequirements(parseScript('has_completed_focus = A'),{...base,completed:['A']},{role:'outcome'}).truth,'unknown');
  assert.equal(evaluateRequirements(parseScript('NOT = { always = yes always = no }'),base).truth,'no');
});

test('QUEUE earlier projection and negative gates update causally without changing inputs',()=>{
  const before=JSON.stringify({base,catalog});
  const report=run(['A','GATE_A','NOT_A']);
  assert.deepEqual(report.steps.map(s=>s.eligibility),['yes','yes','no']);
  assert.match(JSON.stringify(report.steps[1].requirements),/Earlier queued focus is projected/);
  assert.match(JSON.stringify(report.steps[1].assumptions),/A/);
  const reverse=run(['GATE_A','A']);assert.equal(reverse.steps[0].eligibility,'unknown');assert.equal(reverse.steps[1].eligibility,'yes');assert.equal(reverse.steps[1].reachability,'unknown');
  assert.equal(run(['GATE_A'],{completed:['A']}).steps[0].eligibility,'yes');
  assert.equal(JSON.stringify({base,catalog}),before);
});

test('QUEUE blocked predecessors grant no completion and conditional ones propagate uncertainty',()=>{
  const blocked=run(['BLOCKED','AFTER_BLOCKED','B']);
  assert.deepEqual(blocked.steps.map(s=>s.projectedCompletion),['no','no','no']);
  assert.equal(blocked.steps[2].eligibility,'yes');assert.equal(blocked.steps[2].reachability,'no');assert.equal(blocked.finishDate,null);assert.equal(blocked.knownDays,175);
  const conditional=run(['MANUAL','AFTER_MANUAL','GATE_A']);assert.equal(conditional.steps[1].eligibility,'unknown');assert.equal(conditional.steps[1].reachability,'unknown');assert.ok(conditional.steps[1].assumptions.length>0);
});

test('QUEUE prerequisite rows are OR within AND rows and reevaluate on edit',()=>{
  assert.equal(run(['B','C','ROWS']).steps[2].eligibility,'yes');
  assert.equal(run(['B','ROWS']).steps[1].eligibility,'no');
  const dependent=entry('DEP',{prerequisites:[['A']]});
  assert.equal(run(['A','DEP'],{},[...catalog,dependent]).steps[1].eligibility,'yes');
  assert.equal(run(['DEP','A'],{},[...catalog,dependent]).steps[0].eligibility,'no');
  assert.equal(run(['DEP'],{},[...catalog,dependent]).steps[0].eligibility,'no');
});

test('QUEUE symmetric exclusions distinguish actual, projected and conditional conflict',()=>{
  assert.equal(run(['LEFT','RIGHT']).steps[1].eligibility,'no');
  assert.match(JSON.stringify(run(['RIGHT'],{completed:['LEFT']}).steps[0].requirements),/actual manual completion/);
  const manualLeft=entry('LEFT',{exclusive:['RIGHT'],conditions:{available:parseScript('has_war = yes')}});
  assert.equal(run(['LEFT','RIGHT'],{},catalog.map(e=>e.id==='LEFT'?manualLeft:e)).steps[1].eligibility,'unknown');
});

test('QUEUE exact variants retain their own exclusion edges without proving ambiguous prerequisites',()=>{
  const first={...entry('A',{exclusive:['RIGHT']}),uid:'focus:synthetic:A:first',source:'fixtures/first.txt'};
  const second={...entry('A'),uid:'focus:synthetic:A:second',source:'fixtures/second.txt'};
  const right=entry('RIGHT');const dependent=entry('DEP',{prerequisites:[['A']]});const variants=[first,second,right,dependent];
  const selected=run([`definition:${first.uid}`,'RIGHT'],{},variants);
  assert.equal(selected.steps[1].eligibility,'no');assert.equal(selected.steps[1].reachability,'no');
  assert.ok(selected.steps[1].sources.some(s=>s.source===first.source));
  assert.equal(run([`definition:${second.uid}`,'RIGHT'],{},variants).steps[1].eligibility,'yes','a reverse edge belongs only to its declaring variant');
  assert.equal(run(['RIGHT'],{completed:[`definition:${first.uid}`]},variants).steps[0].eligibility,'no');
  assert.equal(run(['RIGHT'],{completed:[`definition:${second.uid}`]},variants).steps[0].eligibility,'yes');
  assert.equal(run(['RIGHT'],{completed:['A']},variants).steps[0].eligibility,'unknown','ambiguous actual positive does not establish which variant completed');
  assert.equal(run([`definition:${first.uid}`,'DEP'],{},variants).steps[1].eligibility,'unknown','an exact selected definition must not silently resolve a scripted ambiguous prerequisite ID');
});

test('QUEUE duplicates retain positions and do not double-charge; actual completion is preserved context',()=>{
  const duplicate=run(['A','A','B']);assert.equal(duplicate.steps.length,3);assert.equal(duplicate.steps[1].issues[0].type,'duplicate');assert.equal(duplicate.knownDays,105);assert.equal(duplicate.finishDate,null);
  const actual=run(['A','GATE_A'],{completed:['A']});assert.equal(actual.steps[0].days,0);assert.equal(actual.steps[0].issues[0].type,'completed');assert.equal(actual.steps[1].reachability,'yes');assert.equal(actual.totalDays,70);
});

test('QUEUE exact references preserve missing, ambiguity and legacy aliases without fuzzy replacement',()=>{
  const missing=run(['A typo','B']);assert.equal(missing.steps[0].reference,'A typo');assert.equal(missing.steps[0].resolution,'unresolved');assert.equal(missing.steps[1].eligibility,'yes');assert.equal(missing.steps[1].reachability,'no');assert.equal(missing.totalDays,null);
  const second={...entry('A'),uid:'focus:synthetic:A:variant:2'};
  const ambiguous=run(['A'],{},[...catalog,second]);assert.equal(ambiguous.steps[0].resolution,'ambiguous');assert.equal(ambiguous.steps[0].days,null);
  const explicit=run(['definition:focus:synthetic:A'],{},[...catalog,second]).steps[0];assert.equal(explicit.resolution,'resolved');assert.equal(explicit.resolvedReference,'definition:focus:synthetic:A');
  const moved=entry('MOVED',{legacyAliases:['focus:old:MOVED']});const alias=run(['focus:old:MOVED'],{},[moved]).steps[0];assert.equal(alias.id,'MOVED');assert.equal(alias.resolvedReference,moved.entityKey);
  const recycled=entry('MOVED',{legacyAliases:['focus:old:MOVED'],ambiguousAliases:['focus:old:MOVED']});assert.equal(run(['focus:old:MOVED'],{},[recycled]).steps[0].resolution,'ambiguous');
});

test('QUEUE cycles terminate and unmarked completions lose support without rewriting alternatives',()=>{
  const cyc=[entry('A',{prerequisites:[['B']]}),entry('B',{prerequisites:[['A']]})];
  assert.deepEqual(run(['A','B'],{},cyc).steps.map(s=>s.reachability),['no','no']);
  const dependent=entry('DEP',{prerequisites:[['A']]});const p=plan(['DEP']);const before=JSON.stringify(p);
  assert.equal(evaluatePlanner({...base,completed:['A']},p,[...catalog,dependent]).steps[0].eligibility,'yes');
  assert.equal(evaluatePlanner(base,p,[...catalog,dependent]).steps[0].eligibility,'no');assert.equal(JSON.stringify(p),before);
});

test('TIME unknown duration removes downstream dates; zero remains known; malformed durations are explicit',()=>{
  const report=run(['A','UNKNOWN_DAYS','B']);assert.equal(report.knownDays,105);assert.equal(report.totalDays,null);assert.equal(report.finishDate,null);assert.deepEqual(report.steps.map(s=>s.finishDate),['1936-03-11',null,null]);
  assert.equal(run(['C','B']).finishDate,'1936-02-05');
  const bad=run(['BAD'],{},[entry('BAD',{days:'70'})]);assert.equal(bad.totalDays,null);assert.equal(bad.issues[0].type,'duration');
  assert.throws(()=>evaluatePlanner(base,plan(['A'],{startDate:'1936-02-30'}),catalog),/valid date/);
});

test('DLC old combined assertions never manufacture independently verified ownership or enabled state',()=>{
  const profile={...base,dlcs:['Unknown DLC'],dlcConfirmed:true,legacyDlcAssertions:['Unknown DLC']};
  const result=evaluateRequirements(parseScript('has_dlc = "Unknown DLC"'),profile,{dlcAvailability:plannerDlcFacts(profile,[])});assert.equal(result.truth,'unknown');
});

test('Tree applicability, bypass, cancellation and effects retain separate roles without effect simulation',()=>{
  const special=entry('SPECIAL',{nodes:parseScript('bypass = { has_tech = motorised_infantry } cancel_if_invalid = yes completion_reward = { set_country_flag = QA_FAKE_FLAG }'),effects:'set_country_flag = QA_FAKE_FLAG',durationEvidence:{definesHashes:[{source:'common/defines/fixture.lua',hash:'define-hash'}]}});
  const later=entry('LATER',{conditions:{available:parseScript('has_country_flag = QA_FAKE_FLAG')}});
  const report=evaluatePlanner(base,plan(['SPECIAL','LATER']),[special,later],{tree:{...entry('TREE'),kind:'focus_tree',data:{countryScript:'factor = 0 modifier = { add = 10 tag = GER }'}}});
  assert.equal(report.applicability?.truth,'unknown');assert.equal(report.steps[0].eligibility,'yes');assert.equal(report.steps[0].reachability,'unknown');assert.equal(report.steps[1].eligibility,'unknown');assert.equal(report.finishDate,null);
  assert.ok(report.steps[0].requirements.some(r=>r.role==='bypass'));assert.ok(report.steps[0].requirements.some(r=>r.role==='cancel'));assert.ok(report.steps[0].requirements.some(r=>r.role==='outcome'&&r.truth==='unknown'));assert.ok(report.steps[0].sources.some(s=>s.hash==='define-hash'));assert.deepEqual(base.completed,[]);
});

test('Parsed malformed scalar gates stay unknown and explicit empty bypass/cancel roots stay visible',()=>{
  for(const [key,role] of [['available','availability'],['allow_branch','branch']] as const){
    const invalid=entry('INVALID',{nodes:parseScript(`${key} = unsupported_scalar`)});
    const step=run(['INVALID'],{},[invalid]).steps[0];
    assert.equal(step.eligibility,'unknown');assert.equal(step.reachability,'unknown');
    const requirement=step.requirements.find(r=>r.role===role)!;
    assert.equal(requirement.truth,'unknown');assert.equal(requirement.children[0].key,key);assert.equal(requirement.children[0].value,'unsupported_scalar');
  }
  const mixed=entry('MIXED',{nodes:parseScript('available = { always = yes } available = malformed')});
  assert.equal(run(['MIXED'],{},[mixed]).steps[0].eligibility,'unknown','a repeated malformed declaration must not disappear behind a supported block');
  const empty=entry('EMPTY',{nodes:parseScript('available = { }\nbypass = { }\ncancel = { }')});
  const step=run(['EMPTY'],{},[empty]).steps[0];
  assert.equal(step.eligibility,'yes');assert.equal(step.days,70,'an empty bypass is not simulated as completion or zero effort');
  for(const [key,role,line] of [['available','availability',1],['bypass','bypass',2],['cancel','cancel',3]] as const){
    const requirement=step.requirements.find(r=>r.role===role)!;
    assert.equal(requirement.key,key);assert.deepEqual(requirement.children,[]);assert.equal(requirement.source?.line,line);assert.match(requirement.reason,/empty/i);
  }
});
