import {test} from 'node:test';import assert from 'node:assert/strict';import {parseScript} from '../server/parser';import {entryMechanics,explainEffects,explainConditions,explanationPreview,referenceTitle} from '../src/mechanics';import type {Entry} from '../src/types';
const entry=(script:string,data:any={}):Entry=>({uid:'fixture',id:'test',kind:'decision',title:'Fixture',description:'',source:'synthetic',line:1,hash:'fixture',version:'fixture',data:{nodes:parseScript(script),...data}});
const names:Record<string,string>={GER:'Germany',ITA:'Italy',BEL:'Belgium',STATE_9:'Bohemia',spirit:'Emergency Measures',A:'Known focus',tech:'Known technology','event.1':'Help arrives'};const lookup=(id:string)=>names[id]||id;
const flat=(xs:any[]):any[]=>xs.flatMap(e=>[e,...flat(e.children||[])]);
test('timed spirit preserves recipient duration and every linked modifier in compact preview',()=>{
 const e=entry('cost=100 complete_effect={ ITA={add_timed_idea={idea=spirit days=180}}}',{mechanicIdeas:{spirit:{modifiers:parseScript('industrial_capacity_factory=0.25 production_speed_arms_factory_factor=-0.15 production_speed_industrial_complex_factor=-0.15')}}});
 const m=entryMechanics(e,lookup),preview=explanationPreview(m.summary);assert.equal(preview.length,1);assert.match(preview[0].text,/Italy/);assert.match(preview[0].text,/180 days/);assert.match(preview[0].text,/Factory output: \+25%/);assert.match(preview[0].text,/Military factory construction speed: -15%/);assert.match(preview[0].text,/Civilian factory construction speed: -15%/);assert.equal(m.summary[0].text,'100 political power (base cost).');
});
test('known conditions are state-unknown, not unknown semantics; unsupported helpers stay unsupported',()=>{
 const conditions=explainConditions(parseScript('OR={has_completed_focus=A has_tech=tech} GER={has_war=yes} unknown_helper=yes'),lookup);
 assert.equal(conditions[0].status,'state-unknown');assert.equal(conditions[1].children![0].text,'Must be at war.');assert.equal(conditions[2].status,'unsupported');assert.ok(conditions[2].unknown);assert.equal(explainConditions(parseScript('is_core_of=GER'),lookup)[0].status,'ambiguous-scope');
});
test('conditional preview preserves guards and uppercase branch structure; no unsupported block flattening',()=>{
 const effects=explainEffects(parseScript('IF={limit={has_completed_focus=A unknown_helper=yes} add_stability=0.05} ELSE={add_war_support=-0.1}'),lookup);
 const p=explanationPreview(effects);assert.match(p[0].text,/Complete Known focus/);assert.match(p[0].text,/condition is not interpreted/);assert.match(p[0].text,/5 percentage points/);assert.equal(p[0].status,'conditional');assert.match(p[1].text,/Otherwise/);
 assert.equal(explainEffects(parseScript('random_list={50={add_political_power=999}}'),lookup)[0].status,'unsupported');assert.equal(explainEffects(parseScript('ELSE={add_political_power=999}'),lookup)[0].status,'parser-limitation');assert.equal(explanationPreview(explainEffects(parseScript('unsupported_scope={add_political_power=999}'))).length,0);
});
test('nested ROOT PREV resolves annex target; core and resource changes keep state scope',()=>{
 const effects=explainEffects(parseScript('every_subject_country={limit={any_controlled_state={state=9}} ROOT={annex_country={target=PREV transfer_troops=yes}}} 9={add_core_of=ROOT add_resource={type=steel amount=5 days=60} add_building_construction={type=arms_factory level=1 instant_build=yes}}'),lookup);
 const text=flat(effects).map(x=>x.text).join(' ');assert.match(text,/acting country annexes each matching subject/);assert.match(text,/Bohemia becomes a core of the acting country/);assert.match(text,/steel production in Bohemia by \+5 for 60 days/);assert.match(text,/Instantly add 1 level/);assert.equal(explainEffects(parseScript('PREV={add_political_power=10}'),lookup)[0].status,'ambiguous-scope');assert.equal(explainEffects(parseScript('9={add_political_power=10}'),lookup)[0].children![0].status,'ambiguous-scope');
});
test('decision phases, custom requirements and target roles do not fabricate availability or spending',()=>{
 const e=entry('state_target=any_owned_state cost=25 days_remove=30 complete_effect={set_country_flag=x} remove_effect={FROM={add_dynamic_modifier={modifier=garrison}}} custom_cost_trigger={command_power>25} timeout_effect={add_stability=-0.05} cancel_effect={clr_country_flag=x}');
 const m=entryMechanics(e,lookup),text=flat(m.summary).map(x=>x.text).join(' ');assert.match(text,/selected state/);assert.match(text,/normally after 30 days/);assert.match(text,/mission times out/);assert.ok(!text.includes('Lose 25 command power'));assert.match(flat(m.requirements).map(x=>x.text).join(' '),/more than 25 command power/);assert.ok(explanationPreview(m.summary).every(x=>!x.text.includes('bookkeeping')));
});
test('event delay is separate from event outcomes; invalid parameters and dynamic values reject',()=>{
 const e=explainEffects(parseScript('ITA={country_event={id=event.1 days=1 hours=12}}'),lookup);assert.match(e[0].children![0].text,/Help arrives.*Italy after 12 hours \+ 1 days/);assert.match(e[0].children![0].text,/later outcomes are separate/);
 for(const s of ['add_timed_idea={idea=spirit days=variable}','country_event={id=event.1 random_days=variable}','add_resource={type=steel amount=5 state=9 new_parameter=yes}','add_stability=variable'])assert.equal(explainEffects(parseScript(s),lookup)[0].unknown,true);
});
test('missing localization, source recovery and explicit targets remain distinguishable',()=>{
 const m=entryMechanics(entry('complete_effect={add_timed_idea={idea=untranslated days=90}}',{importWarnings:['recovered'],localizationEvidence:[{status:'unresolved'}]}));assert.ok(flat(m.summary).some(x=>x.status==='missing-localization'));assert.ok(flat(m.summary).some(x=>x.status==='parser-limitation'));
 const e=entry('state_target=any_owned_state',{mechanicNames:{COG_ADJ:'Congolese'}});e.title='[COG.GetAdjective] support in [FROM.GetName]';assert.equal(referenceTitle(e),'Congolese support in the selected state');assert.equal(e.title,'[COG.GetAdjective] support in [FROM.GetName]');
});
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {openStore} from '../server/store';import {indexGame} from '../server/importer';
test('indexed explanations resolve same-snapshot names and unique idea modifiers without retargeting ambiguous definitions',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-explanations-')),game=path.join(root,'game'),store=openStore(path.join(root,'data'));
 const put=(name:string,text:string)=>{const file=path.join(game,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
 try{
  put('common/national_focus/test.txt','focus_tree={id=test focus={id=A cost=1}}');put('common/decisions/test.txt','category={test_decision={cost=10 complete_effect={add_timed_idea={idea=spirit days=90} ITA={country_event={id=event.1 hours=12}}}}}');put('common/ideas/test.txt','ideas={country={spirit={modifier={industrial_capacity_factory=0.25}}}}');put('events/test.txt','country_event={id=event.1 title=event_title}');put('localisation/english/test.yml','l_english:\n test_decision:0 "Decision name"\n spirit:0 "Named Spirit"\n event_title:0 "Named Event"\n ITA:0 "Italy"');
  indexGame(store,game);const e=store.entry('test_decision')!;assert.equal(e.title,'Decision name');assert.equal(e.data.mechanicIdeas.spirit.source,'common/ideas/test.txt');assert.equal(e.data.mechanicNames['event.1'],'Named Event');assert.equal(e.data.mechanicNameEvidence.ITA[0].source,'localisation/english/test.yml');assert.match(explanationPreview(entryMechanics(e).summary)[0].text,/Factory output: \+25%/);
  put('common/ideas/duplicate.txt','ideas={country={spirit={modifier={industrial_capacity_factory=0.99}}}}');indexGame(store,game);const duplicate=entryMechanics(store.entry('test_decision')!);assert.ok(flat(duplicate.summary).some(x=>x.status==='ambiguous-scope'));assert.ok(!JSON.stringify(duplicate).includes('+99%'));
 }finally{store.db.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('technology completion conditions remain attached to rewards and unsupported dependency syntax is retained',()=>{
 const e=entry('on_research_complete_limit={has_completed_focus=A} on_research_complete={add_political_power=50} dependencies={tech=1}');e.kind='technology';const value=entryMechanics(e,lookup),preview=explanationPreview(value.summary);assert.match(preview[0].text,/Complete Known focus/);assert.match(preview[0].text,/Gain 50 political power/);assert.ok(flat(value.summary).some(x=>x.code==='dependencies'&&x.status==='unsupported'));
});

import {defaultContext,type EventDefinition} from '../src/mechanics-interpreter';
const eventFixture=JSON.parse(fs.readFileSync('tests/fixtures/mechanics-events-m741.json','utf8'));
const eventDefinition=(id:string):EventDefinition|undefined=>eventFixture.events[id]?{nodes:parseScript(eventFixture.events[id]),source:'synthetic/events.txt',line:1,hash:'synthetic-events',version:eventFixture.version,eventType:id==='news.1'?'news_event':'country_event'}:undefined;
const eventContext=()=>({...defaultContext(),version:eventFixture.version,resolveEvent:eventDefinition});
const eventLookup=(id:string)=>({POR:'Portugal',BRA:'Brazil',accept:'Accept union',refuse:'Refuse union',noted:'Noted'}[id]||lookup(id));

test('bounded event closure binds recipient ROOT and keeps accept/refuse paths, triggers, stages and evidence separate',()=>{
 const result=explainEffects(parseScript('BRA={country_event={id=union.10 hours=6}}'),eventLookup,0,eventContext());
 const all=flat(result),preview=explanationPreview(result,30).map(x=>x.text).join('\n');
 assert.match(preview,/Accept union.*is_core_of|Accept union.*core of Brazil/);
 assert.match(preview,/Accept union.*Portugal annexes Brazil and receives its troops/);
 assert.match(preview,/Refuse union.*Portugal gains an annexation war goal against Brazil/);
 assert.ok(!/Refuse union[^\n]*annexes/.test(preview));
 assert.match(preview,/On event delivery.*2 political power/);assert.match(preview,/After the selected option.*1 percentage points/);
 assert.ok(all.some(x=>x.code==='has_government'&&x.status==='state-unknown'));
 assert.ok(all.some(x=>x.code==='ai_chance'&&x.unknown));assert.ok(all.some(x=>x.code==='unhandled_character'&&x.unknown));
 assert.ok(all.some(x=>x.evidence?.[0]?.source==='synthetic/events.txt'&&x.evidence[0].hash==='synthetic-events'));
 assert.equal(all.filter(x=>x.code==='create_wargoal'&&!x.unknown).length,1);
 assert.ok(!JSON.stringify(result).includes('tooltip.99'));
 assert.ok(all.some(x=>x.text.includes('union.11')&&x.text.includes('Portugal')));
 assert.ok(all.some(x=>x.text.includes('union.12')&&x.text.includes('Portugal')));
});

test('event dispatch literal and random timing follows installed documented hour bounds; no probabilities inferred',()=>{
 const result=explainEffects(parseScript('news_event={id=news.1 hours=2 days=3 months=1 random_hours=7 random_days=2}'),lookup,0,eventContext());
 assert.match(result[0].text,/2 hours \+ 3 days \+ 1 months \(30 days each\)/);
 assert.match(result[0].text,/0 up to 55 hours \(upper bound excluded/);assert.match(result[0].text,/not a uniform probability/);
 assert.equal(result[0].unknown,undefined);
 assert.match(explainEffects(parseScript('country_event={id=union.11 random=5 random_days=2}'),lookup,0,eventContext())[0].text,/0 up to 53 hours/);
 assert.ok(explainEffects(parseScript('country_event={id=union.11 random=5 random_hours=7}'),lookup,0,eventContext())[0].unknown);
 assert.match(explainEffects(parseScript('country_event=union.11'),lookup,0,eventContext())[0].text,/immediately/);
 for(const script of ['country_event={id=union.10 id=union.11}','country_event={id=union.10 random={chance=50 add_stability=1}}','country_event={id=union.10 days=-1}','country_event={id=union.10 days=1.5}','country_event={id=$EVENT$}','country_event={id=union.10 new_parameter=yes}'])assert.ok(explainEffects(parseScript(script),lookup,0,eventContext())[0].unknown,script);
});

test('event cycles, parser recovery, ambiguity, patch/type mismatch and work limits retain unknowns without fabricated outcomes',()=>{
 for(const change of [undefined,{ambiguous:true},{recovered:true},{limited:true},{version:'new-patch'},{eventType:'state_event'}]){
  const context={...eventContext(),resolveEvent:()=>change===undefined?undefined:{...eventDefinition('union.10')!,...change}};
  const result=explainEffects(parseScript('country_event=union.10 add_political_power=3'),lookup,0,context),all=flat(result);
  assert.ok(all.some(x=>x.unknown));assert.ok(!JSON.stringify(result).includes('annexes'));assert.ok(all.some(x=>x.text==='Gain 3 political power.'));
 }
 assert.ok(flat(explainEffects(parseScript('country_event=cycle.1'),lookup,0,eventContext())).some(x=>x.status==='parser-limitation'));
 assert.ok(flat(explainEffects(parseScript('country_event=union.10'),lookup,0,{...eventContext(),budget:{remaining:3}})).some(x=>x.status==='parser-limitation'));
 const opaque=flat(explainEffects(parseScript('country_event=opaque.1'),lookup,0,eventContext()));assert.ok(opaque.some(x=>x.code==='new_delivery_rule'&&x.unknown));assert.ok(opaque.some(x=>x.code==='trigger'&&x.unknown));
});

test('war goals require literal supported types and country targets; unresolved event scopes stay explicit',()=>{
 for(const script of ['create_wargoal={target=FROM type=annex_everything}','create_wargoal={target=9 type=annex_everything}','create_wargoal={target=BRA type=puppet}','create_wargoal={target=BRA type=annex_everything days=10}'])assert.ok(explainEffects(parseScript(script),lookup)[0].unknown,script);
 const result=explainEffects(parseScript('create_wargoal={target=BRA type=annex_everything}'),eventLookup);assert.match(result[0].text,/does not declare war or annex territory/);
 const context={...eventContext(),from:{kind:'country' as const,label:'caller FROM must not leak'},previous:{kind:'country' as const,label:'caller PREV must not leak'},resolveEvent:()=>({...eventDefinition('union.11')!,nodes:parseScript('option={FROM={add_political_power=99} PREV={add_political_power=99} ROOT={add_stability=0.01}}')})};
 const result2=explainEffects(parseScript('BRA={country_event=union.11}'),eventLookup,0,context);assert.ok(!JSON.stringify(result2).includes('Gain 99'));assert.ok(flat(result2).filter(x=>x.status==='ambiguous-scope').length>=2);assert.match(explanationPreview(result2,10).map(x=>x.text).join(' '),/Brazil.*1 percentage points/);
});


test('wide AI weights and condition/control blocks share the event work budget',()=>{
 for(const script of [
  'option={ai_chance={'+('factor=1 '.repeat(5000))+'}}',
  'option={'+('trigger={always=yes} '.repeat(5000))+'}',
  'option={ai_chance={modifier={factor=1 '+('has_war=yes '.repeat(5000))+'}}}',
  'option={'+('default=yes '.repeat(5000))+'}'
 ]){
  const ctx={...eventContext(),budget:{remaining:8},resolveEvent:()=>({...eventDefinition('union.11')!,nodes:parseScript(script)})};
  const all=flat(explainEffects(parseScript('country_event=union.11'),lookup,0,ctx));
  assert.ok(all.some(x=>x.status==='parser-limitation'));assert.ok(all.length<40,`Expected bounded output, got ${all.length}`);
 }
});

test('top-level event trigger applicability remains uncertain and cannot imply refusal of an immediate dispatch',()=>{
 const ctx={...eventContext(),resolveEvent:()=>({...eventDefinition('union.11')!,nodes:parseScript('trigger={always=no} option={add_political_power=7}')})};
 const result=explainEffects(parseScript('country_event=union.11'),lookup,0,ctx),all=flat(result);
 assert.ok(all.some(x=>x.code==='trigger'&&x.unknown&&x.text.includes('applicability')));
 const preview=explanationPreview(result,20).map(x=>x.text).join(' ');assert.match(preview,/Gain 7 political power/);assert.ok(!preview.includes('prevents availability'));
});
