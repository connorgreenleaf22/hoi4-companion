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
 for(const s of ['add_timed_idea={idea=spirit days=variable}','country_event={id=event.1 random_days=5}','add_resource={type=steel amount=5 state=9 new_parameter=yes}','add_stability=variable'])assert.equal(explainEffects(parseScript(s),lookup)[0].unknown,true);
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
