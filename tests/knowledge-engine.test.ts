import test from 'node:test';
import assert from 'node:assert/strict';
import type {KnowledgeScenario,DivisionDesign,TankDesign} from '../src/knowledge-engine-types';
import {knowledgeCatalog,chassisBlueprint} from '../server/knowledge-engine/source';
import {evaluateKnowledgeDesign,compareKnowledgeDesigns,knowledgeResultIsCurrent} from '../server/knowledge-engine';
import {parseScript} from '../server/parser';
import {fixtures,entry} from './fixtures/knowledge-engine';
import {draftSchema} from '../server/knowledge-engine/schema';
import {designAdviceStudy} from '../server/knowledge-engine/advice';
import {searchKnowledgeDesigns} from '../server/knowledge-engine/search';

test('division estimate uses archetype defaults, not research-parent stats, and exposes its assumptions',()=>{
 const {source,scenario,division}=fixtures(),r=evaluateKnowledgeDesign(source,{scenario,design:division});
 assert.equal(r.status,'estimated');assert.equal(r.metrics.soft_attack.value,54);assert.equal(r.metrics.build_cost_ic.value,450);assert.equal(r.metrics.combat_width.value,18);assert.equal(r.metrics.max_organisation.value,60);assert.equal(r.qualification,'experimental-estimate');assert.equal(r.campaignEligibility,'manual-unverified');assert.match(r.assumptions.join(' '),/not independently validated/);
});
test('unit technology, doctrine and national spirit modifiers apply once at their distinct layers',()=>{
 const {source,scenario,division}=fixtures();scenario.researched.push('infantry_bonus');scenario.modifiers=[{reference:'army_spirit'},{reference:'infantry_doctrine'}];
 const r=evaluateKnowledgeDesign(source,{scenario,design:division});assert.equal(r.status,'estimated');assert.ok(Math.abs(r.metrics.soft_attack.value!-71.28)<1e-9);assert.equal(r.metrics.max_organisation.value,82.5);assert.equal(r.metrics.defense.value,99);assert.ok(r.metrics.soft_attack.contributions.some(c=>c.operation==='factor'&&c.value===0.2));
});
test('tank modules, chassis addition multiplier and upgrade factors follow the disclosed estimate equation',()=>{
 const {source,scenario,tank}=fixtures();scenario.researched.push('better_armor');tank.upgrades=[{reference:'armor_upgrade',level:2}];
 const r=evaluateKnowledgeDesign(source,{scenario,design:tank});assert.equal(r.status,'estimated');assert.equal(r.metrics.soft_attack.value,22);assert.equal(r.metrics.armor_value.value,14);assert.equal(r.metrics.build_cost_ic.value,6);assert.equal(r.metrics.maximum_speed.value,3.6);assert.ok(Math.abs(r.metrics.reliability.value!-0.768)<1e-9);
});
test('MIO traits apply only to matching equipment; country attack factors do not alter a tank equipment stat',()=>{
 const {source,scenario,tank}=fixtures();scenario.modifiers=[{reference:'tank_mio',path:[1]},{reference:'army_spirit'}];
 const r=evaluateKnowledgeDesign(source,{scenario,design:tank});assert.equal(r.status,'estimated');assert.ok(Math.abs(r.metrics.soft_attack.value!-24.2)<1e-9);
});
test('designed tank can equip a division without reapplying equipment modifiers',()=>{
 const {source,scenario,tank}=fixtures();scenario.modifiers=[{reference:'tank_mio',path:[1]}];
 const d:DivisionDesign={kind:'division',name:'Tanks',rows:[{unit:'tank_unit',count:2}],equipment:[{archetype:'light_tank_chassis',variant:tank}]};
 const r=evaluateKnowledgeDesign(source,{scenario,design:d});assert.equal(r.status,'estimated');assert.ok(Math.abs(r.metrics.soft_attack.value!-48.4)<1e-9);assert.equal(r.metrics.build_cost_ic.value,500);
});
test('missing research, required slots, incompatible categories, count limits and upgrade thresholds block ranking',()=>{
 for(const mode of ['research','slot','category','count','upgrade']){
  const {source,scenario,tank}=fixtures();if(mode==='research')scenario.researched=[];if(mode==='slot')tank.modules.pop();if(mode==='category')tank.modules[1].module='radio';if(mode==='count')tank.modules.push({slot:'extra',module:'radio'},{slot:'extra2',module:'radio'});if(mode==='upgrade')tank.upgrades=[{reference:'armor_upgrade',level:2}];
  const r=evaluateKnowledgeDesign(source,{scenario,design:tank});assert.equal(r.status,'partial',mode);assert.ok(r.issues.some(i=>i.blocking),mode);
 }
});
test('unknown scoped effects remain partial rather than becoming fabricated totals or winners',()=>{
 const {source,entries,scenario,division}=fixtures();entries.push(entry('idea','dynamic','modifier = { army_attack_factor = dynamic_variable }'));scenario.modifiers=[{reference:'dynamic'}];
 const r=evaluateKnowledgeDesign(source,{scenario,design:division});assert.equal(r.status,'partial');assert.match(r.issues.map(i=>i.message).join(' '),/not applied/);
 const comparison=compareKnowledgeDesigns(source,{scenario,candidates:[division,{...division,name:'Other'}],objective:{metric:'defense',direction:'maximize',perIndustrialCost:true},constraints:[]});assert.equal(comparison.status,'unavailable');assert.equal(comparison.best,null);
});
test('candidate comparison enforces budgets, objective direction and explicit finite candidate scope',()=>{
 const {source,scenario,division}=fixtures();const result=compareKnowledgeDesigns(source,{scenario,candidates:[division,{...division,name:'6 infantry',rows:[{unit:'infantry',count:6}]}],objective:{metric:'defense',direction:'maximize',perIndustrialCost:false},constraints:[{metric:'build_cost_ic',max:350}]});
 assert.equal(result.best?.design.name,'6 infantry');assert.equal(result.feasible,1);assert.equal(result.candidatesEvaluated,2);assert.match(result.claim,/not a global optimum/);assert.equal(result.excluded[0].name,'9 infantry');
});
test('unsupported objective and constraints cannot turn into zeros or bypass filters',()=>{
 const {source,scenario,division}=fixtures();const request={scenario,candidates:[division,{...division,name:'Other'}],objective:{metric:'battle_win_probability',direction:'maximize',perIndustrialCost:false},constraints:[]};assert.equal(compareKnowledgeDesigns(source,request).status,'unavailable');request.objective.metric='defense';assert.equal(compareKnowledgeDesigns(source,{...request,constraints:[{metric:'unmodeled',max:100}]}).status,'unavailable');
});
test('version/mod mismatch, ambiguity, duplicate selections, malformed dates and arbitrary numeric overrides refuse',()=>{
 const {source,entries,metadata,scenario,division}=fixtures();
 assert.equal(evaluateKnowledgeDesign(source,{scenario:{...scenario,gameVersion:'other'},design:division}).status,'rejected');
 metadata.mods=['mod'];assert.equal(evaluateKnowledgeDesign(source,{scenario,design:division}).status,'rejected');metadata.mods=[];
 entries.push({...entries[0],uid:'other-rifles'});assert.equal(evaluateKnowledgeDesign(source,{scenario,design:division}).status,'rejected');entries.pop();
 assert.equal(evaluateKnowledgeDesign(source,{scenario:{...scenario,researched:['basic','basic']},design:division}).status,'rejected');
 assert.throws(()=>evaluateKnowledgeDesign(source,{scenario:{...scenario,date:'1938-02-30'},design:division}));assert.throws(()=>evaluateKnowledgeDesign(source,{scenario,design:{...division,soft_attack:999}}));
});
test('changed source hash and tampered saved totals invalidate prior results without discarding designs',()=>{
 const {source,entries,scenario,division}=fixtures();const r=evaluateKnowledgeDesign(source,{scenario,design:division});assert.equal(knowledgeResultIsCurrent(source,r),true);const altered=structuredClone(r);altered.metrics.soft_attack.value=999;assert.equal(knowledgeResultIsCurrent(source,altered),false);entries[0].hash='changed';assert.equal(knowledgeResultIsCurrent(source,r),false);assert.deepEqual(r.design,division);
});
test('catalog pagination retains exact trait paths and blueprint inherits declared slots',()=>{
 const {source}=fixtures();const mio=knowledgeCatalog(source,'organization','',0,20);assert.equal(mio.choices.length,3);assert.deepEqual(mio.choices[1].path,[1]);assert.equal(chassisBlueprint(source,'tank_1').slots.length,4);assert.equal(knowledgeCatalog(source,'module','',0,1).choices.length,1);assert.throws(()=>knowledgeCatalog(source,'unknown'));
});
test('unsupported MIO inheritance and arbitrary nested modifier paths cannot be treated as active bonuses',()=>{
 const {source,scenario,tank}=fixtures();scenario.modifiers=[{reference:'tank_mio'}];assert.equal(evaluateKnowledgeDesign(source,{scenario,design:tank}).status,'partial');scenario.modifiers=[{reference:'tank_mio',path:[1,0]}];assert.equal(evaluateKnowledgeDesign(source,{scenario,design:tank}).status,'rejected');
});
test('turret-enabled categories expand the blueprint and the evaluated gun slot before compatibility checks',()=>{
 const {source,entries,scenario,tank}=fixtures();entries.push(entry('module','medium_gun','category = medium_gun add_stats = { soft_attack = 30 }'),entry('module','medium_turret','category = turret allowed_module_categories = { gun = { medium_gun } }'));
 entries.find(e=>e.id==='basic')!.data.nodes.push(...parseScript('enable_equipment_modules = { medium_gun medium_turret }'));
 tank.modules=[{slot:'turret',module:'medium_turret'},{slot:'gun',module:'medium_gun'}];
 assert.ok(chassisBlueprint(source,'tank_1',['medium_turret']).slots.find(s=>s.id==='gun')!.categories.includes('medium_gun'));
 assert.equal(evaluateKnowledgeDesign(source,{scenario,design:tank}).status,'estimated');
 tank.modules[0].module='turret';assert.ok(evaluateKnowledgeDesign(source,{scenario,design:tank}).issues.some(i=>i.code==='module-category'));
});
test('accepted speed, piercing and hardness modifiers reach the aggregation paths',()=>{
 const {source,entries,scenario,division}=fixtures();entries.push(entry('idea','speed','modifier = { army_speed_factor = 0.5 }'),entry('technology','unit_bonus','infantry = { ap_attack = 1.0 maximum_speed = 1.0 hardness = 0.5 }'));scenario.modifiers=[{reference:'speed'}];scenario.researched.push('unit_bonus');
 const r=evaluateKnowledgeDesign(source,{scenario,design:division});assert.equal(r.status,'estimated');assert.equal(r.metrics.maximum_speed.value,12);assert.equal(r.metrics.ap_attack.value,4);
});
test('manual active-idea assumptions evaluate known conditional production gates without becoming live facts',()=>{
 const {source,entries,scenario,tank}=fixtures();entries.find(e=>e.id==='light_tank_chassis')!.data.nodes.push(...parseScript('can_be_produced = { if = { limit = { has_dlc = A } NOT = { has_idea = banned } } else = { always = no } }'));
 assert.equal(evaluateKnowledgeDesign(source,{scenario,design:tank}).status,'estimated');entries.push(entry('idea','banned','modifier = { army_org_factor = 0.1 }'));scenario.modifiers=[{reference:'banned'}];assert.ok(evaluateKnowledgeDesign(source,{scenario,design:tank}).issues.some(i=>i.code==='condition-failed'));
});
test('partial-effect comparison requires explicit opt-in and cannot waive a failed unlock',()=>{
 const {source,entries,scenario,division}=fixtures();entries.push(entry('idea','unmodeled','modifier = { planning_speed = 0.1 }'));scenario.modifiers=[{reference:'unmodeled'}];
 const request={scenario,candidates:[division,{...division,name:'Other'}],objective:{metric:'defense',direction:'maximize',perIndustrialCost:false},constraints:[]};
 assert.equal(compareKnowledgeDesigns(source,request).best,null);assert.equal(compareKnowledgeDesigns(source,{...request,includePartialEstimates:true}).best?.status,'partial');
 scenario.researched=[];assert.equal(compareKnowledgeDesigns(source,{...request,includePartialEstimates:true}).best,null);
});
test('draft validation permits incomplete edits while refusing malformed nested structures',()=>{
 const {scenario}=fixtures();const d={scenario,candidates:[{kind:'division',name:'',rows:[],equipment:[]}],objective:{metric:'defense',direction:'maximize',perIndustrialCost:true},constraints:[]};
 assert.equal(draftSchema.safeParse(d).success,true);assert.equal(draftSchema.safeParse({...d,candidates:[{kind:'tank',name:'x',chassis:'',modules:null,upgrades:[]}]}).success,false);assert.equal(draftSchema.safeParse({...d,scenario:{...scenario,modifiers:null}}).success,false);
 assert.equal(draftSchema.safeParse({...d,candidates:[{kind:'tank',name:'x',chassis:'tank_1',modules:[],upgrades:[]}]}).success,true);
});
test('advice summaries require explicit sharing, remain bounded and reject stale/cross-country context',()=>{
 const {source,scenario,division,metadata}=fixtures();const request={scenario,candidates:[division,{...division,name:'Other'}],objective:{metric:'defense',direction:'maximize',perIndustrialCost:true},constraints:[]};
 assert.equal(designAdviceStudy(source,request,'SIA'),undefined);
 const study=designAdviceStudy(source,{...request,shareWithAdvisor:true},'SIA')!;assert.equal(study.status,'available');assert.equal(study.classification,'experimental-estimates');assert.equal(study.comparisons.length,2);assert.ok(JSON.stringify(study).length<6000);
 assert.equal(designAdviceStudy(source,{...request,shareWithAdvisor:true},'GER')?.status,'unavailable');metadata.indexRevision='changed';assert.equal(designAdviceStudy(source,{...request,shareWithAdvisor:true},'SIA')?.comparisons.length,0);
 assert.equal(designAdviceStudy(source,{...request,candidates:[division,division],shareWithAdvisor:true},'SIA')?.status,'unavailable');
});
test('finite division search enumerates every declared count combination and respects industrial budget',()=>{
 const {source,scenario,division}=fixtures();const r=searchKnowledgeDesigns(source,{kind:'division-counts',scenario,base:division,dimensions:[{unit:'infantry',min:6,max:12}],objective:{metric:'defense',direction:'maximize',perIndustrialCost:false},constraints:[{metric:'build_cost_ic',max:450}]});
 assert.equal(r.searchSpace.enumerated,7);assert.equal(r.candidatesEvaluated,7);assert.equal(r.feasible,4);assert.equal(r.best?.design.kind,'division');assert.equal((r.best!.design as DivisionDesign).rows[0].count,9);
 assert.throws(()=>searchKnowledgeDesigns(source,{kind:'division-counts',scenario,base:division,dimensions:[{unit:'infantry',min:0,max:2}],objective:{metric:'defense',direction:'maximize',perIndustrialCost:false},constraints:[]}),/Keep at least one/);
});
test('finite module search excludes illegal alternatives and refuses oversized search instead of truncating',()=>{
 const {source,scenario,tank}=fixtures();const input={kind:'tank-modules',scenario,base:tank,dimensions:[{slot:'gun',modules:['gun','radio']}],objective:{metric:'soft_attack',direction:'maximize',perIndustrialCost:false},constraints:[]};
 const r=searchKnowledgeDesigns(source,input);assert.equal(r.candidatesEvaluated,2);assert.equal(r.feasible,1);
 assert.throws(()=>searchKnowledgeDesigns(source,{...input,dimensions:[{slot:'a',modules:Array.from({length:16},(_,i)=>'a'+i)},{slot:'b',modules:Array.from({length:16},(_,i)=>'b'+i)}]}),/No search was truncated/);
});
