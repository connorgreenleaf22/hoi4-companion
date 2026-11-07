import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {parseScript} from '../server/parser';import {entryMechanics,explanationPreview} from '../src/mechanics';
import {defaultContext,explainEffects,type ScriptDefinition} from '../src/mechanics-interpreter';
import {openStore} from '../server/store';import {indexGame} from '../server/importer';
const flat=(xs:any[]):any[]=>xs.flatMap(x=>[x,...flat(x.children||[])]);
const definition=(script:string):ScriptDefinition=>({nodes:parseScript(script),source:'synthetic/helper.txt',line:1,hash:'synthetic',version:'fixture'});
test('scripted rewards preserve caller scope, guards, provenance and understood siblings beside unsupported effects',()=>{
 const context={...defaultContext(),scripts:{helper:definition('if={limit={has_war=yes} add_stability=0.05} unsupported_command=yes 9={add_core_of=ROOT}')}};
 const value=explainEffects(parseScript('ITA={helper=yes}'),x=>({ITA:'Italy',STATE_9:'Bohemia'}[x]||x),0,context);
 const all=flat(value);assert.ok(all.some(x=>x.evidence?.[0]?.source==='synthetic/helper.txt'));assert.ok(all.some(x=>x.code==='unsupported_command'&&x.unknown));const preview=explanationPreview(value,20);assert.match(preview[0].text,/Italy.*Must be at war.*5 percentage points/);assert.match(preview[1].text,/Bohemia becomes a core of the acting country/);
});
test('recursive, parameterized, ambiguous, recovered and oversized helper definitions fail explicitly',()=>{
 for(const script of [{...definition('helper=yes')},{...definition('add_political_power=$AMOUNT$')},{...definition('add_political_power=999'),ambiguous:true},{...definition('add_political_power=999'),recovered:true},{...definition('add_political_power=999'),limited:true}]){const result=explainEffects(parseScript('helper=yes add_stability=0.01'),x=>x,0,{...defaultContext(),scripts:{helper:script}});assert.ok(flat(result).some(x=>x.unknown));assert.ok(!JSON.stringify(result).includes('Gain 999'));assert.ok(explanationPreview(result,10).some(x=>x.text.includes('1 percentage points')));}
 const result=explainEffects(parseScript('helper={AMOUNT=99}'),x=>x,0,{...defaultContext(),scripts:{helper:definition('add_political_power=99')}});assert.equal(result[0].status,'unsupported');
 const budget=explainEffects(parseScript('add_stability=0.01 add_stability=0.02'),x=>x,0,{...defaultContext(),budget:{remaining:1}});assert.equal(budget[1].status,'parser-limitation');
});
test('literal modifier-variable changes require unique source bindings and never claim final totals',()=>{
 const context={...defaultContext(),dynamicModifiers:{economy:definition('industrial_capacity_factory=output_var consumer_goods_factor=cg_var')}};
 const result=explainEffects(parseScript('add_to_variable={output_var=0.05} set_variable={cg_var=0} add_to_variable={output_var=other_var}'),x=>x,0,context);
 assert.match(result[0].text,/factory output contribution.*\+5 percentage points/);assert.match(result[0].text,/final campaign totals are unknown/);assert.equal(result[0].status,'conditional');assert.equal(result[0].evidence![0].hash,'synthetic');assert.match(result[1].text,/consumer goods factor contribution.*to 0%/);assert.equal(result[2].status,'unsupported');
 const ambiguous=explainEffects(parseScript('add_to_variable={output_var=0.05}'),x=>x,0,{...defaultContext(),dynamicModifiers:{economy:definition('industrial_capacity_factory=output_var research_speed_factor=output_var')}});assert.equal(ambiguous[0].status,'unsupported');
});
test('existing index links helpers, dynamic bindings and renamed idea definitions; dependency edits invalidate cache',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-scripted-rewards-')),game=path.join(dir,'game'),store=openStore(path.join(dir,'data'));
 const put=(file:string,value:string)=>{const p=path.join(game,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,value);};
 try{
  put('common/national_focus/test.txt','focus_tree={id=test focus={id=GER_autarky_achieved cost=10 completion_reward={helper=yes if={limit={has_idea=old} swap_ideas={remove_idea=old add_idea=new}}}}}');
  put('common/scripted_effects/test.txt','helper={if={limit={has_dynamic_modifier={modifier=previous}} remove_dynamic_modifier={modifier=previous} add_dynamic_modifier={modifier=economy}} add_to_variable={output_var=0.05} unsupported_command=yes}');
  put('common/dynamic_modifiers/test.txt','economy={enable={always=yes} industrial_capacity_factory=output_var}');
  put('common/ideas/test.txt','ideas={country={old={modifier={research_speed_factor=0.05}} new={name=old modifier={research_speed_factor=0.05 industrial_capacity_factory=0.05}}}}');
  put('localisation/english/test.yml','l_english:\n old:0 "Trade Law"\n economy:0 "New Economy"\n previous:0 "Previous Economy"');
  const before=indexGame(store,game);let e=store.entry('GER_autarky_achieved')!;const summary=entryMechanics(e).summary;
  assert.equal(e.data.mechanicScripts.helper.source,'common/scripted_effects/test.txt');assert.equal(e.data.mechanicNames.new,'Trade Law');assert.ok(flat(summary).some(x=>x.text.includes('factory output contribution')&&x.text.includes('+5')));assert.ok(flat(summary).some(x=>x.text.includes('Replacement idea values (not net changes)')));assert.ok(flat(summary).some(x=>x.code==='unsupported_command'&&x.unknown));
  put('common/scripted_effects/test.txt','helper={add_stability=0.02}');const after=indexGame(store,game);assert.notEqual(after.indexRevision,before.indexRevision);e=store.entry('GER_autarky_achieved')!;assert.match(explanationPreview(entryMechanics(e).summary,20).map(x=>x.text).join(' '),/2 percentage points/);
 }finally{store.db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
