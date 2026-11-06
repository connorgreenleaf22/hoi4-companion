import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from '../server/store';
import {indexGame} from '../server/importer';
import {universalSearch} from '../server/universal-search';
import {parseScript} from '../server/parser';
import {explainEffects,explainConditions,entryMechanics} from '../src/mechanics';
import type {Entry} from '../src/types';
import {matchName} from '../src/search-model';

test('localized country and assigned cosmetic aliases refresh with provenance; search stays categorized and ambiguous',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-usability-')),game=path.join(root,'game'),store=openStore(path.join(root,'data'));
 const put=(name:string,contents:string)=>{const file=path.join(game,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,contents);};
 const search=(q:string,more='')=>universalSearch(store,new URLSearchParams('q='+encodeURIComponent(q)+more));
 try{
  put('common/national_focus/test.txt','focus_tree={id=test focus={id=INS_focus cost=5}}');put('common/country_tags/test.txt','INS="countries/Indonesia.txt" HOL="countries/Holland.txt"');put('history/countries/INS - Indonesia.txt','set_cosmetic_tag=INS_HOL GER={set_cosmetic_tag=GER_wrong}');put('history/countries/HOL - Holland.txt','capital=7');put('common/defines/test.lua','FOCUS_POINT_DAYS = 7');
  put('localisation/english/names.yml','l_english:\n INS:0 "Indonesia"\n INS_HOL:0 "Dutch East Indies"\n HOL:0 "Netherlands"\n HOL_democratic:0 "Shared Country Name"\n INS_democratic:0 "Shared Country Name"\n GER_wrong:0 "Wrong country alias"\n INS_focus:0 "Dutch East Indies"');
  indexGame(store,game);assert.equal(search('Wrong country alias').total,0);
  for(const q of ['Indonesia','INS','dUtCh EaSt','Dutch East Indes'])assert.ok(search(q).entries.some(e=>e.kind==='country'&&e.id==='INS'),q);
  const alias=search('Dutch East Indies').entries;assert.ok(alias.some(e=>e.kind==='focus'));assert.ok(alias.some(e=>e.kind==='country'));assert.ok(alias.every(e=>e.data.searchMatch.ambiguous));
  const country=alias.find(e=>e.id==='INS')!;assert.equal(country.data.nameAliases.find((a:any)=>a.key==='INS_HOL').mapping.source,'history/countries/INS - Indonesia.txt');
  assert.equal(search('Shared Country Name').entries.filter(e=>e.kind==='country').length,2);
  assert.equal(search('Dutch East Indies','&contextCountry=HOL').entries.length,2,'context does not exclude other countries');
  put('localisation/english/names.yml','l_english:\n INS:0 "Indonesia"\n INS_HOL:0 "Changed colonial name"');indexGame(store,game);
  assert.equal(search('Dutch East Indies').entries.length,0);assert.equal(search('Changed colonial name').entries[0].id,'INS');
 }finally{store.db.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('name matching tolerates a bounded spelling difference, IDs and punctuation without auto-resolving',()=>{
 assert.equal(matchName('GER_prioritize', {id:'GER_prioritize_economic_growth',title:'Prioritize Economic Growth'})!.spelling,false);
 assert.ok(matchName('economic growtH',{id:'A',title:'Prioritize Economic Growth'}));
 assert.equal(matchName('nonsense',{id:'INS',title:'Indonesia'}),null);
 assert.equal(matchName('Indonesai',{id:'INS',title:'Indonesia'})!.spelling,true);
 assert.ok(matchName('Cote',{id:'X',title:'Côte d’Ivoire'}));
});
test('known effects have correct signs and units; unsupported scopes/variables never become unconditional rewards',()=>{
 assert.deepEqual(explainEffects(parseScript('add_stability=-0.1 add_war_support=0.05 add_political_power=50 add_manpower=-1000')).map(e=>e.text),['Decrease stability by 10 percentage points.','Increase war support by 5 percentage points.','Gain 50 political power.','Lose 1,000 manpower.']);
 assert.equal(explainEffects(parseScript('GER={add_political_power=100}'))[0].text,'For GER:');assert.equal(explainEffects(parseScript('GER={add_political_power=100}'))[0].children![0].text,'Gain 100 political power.');
 assert.equal(explainEffects(parseScript('random_list={50={add_political_power=100}}'))[0].unknown,true);
 assert.equal(explainEffects(parseScript('add_stability=my_variable'))[0].unknown,true);
 assert.equal(explainEffects(parseScript('invented_effect=5'))[0].unknown,true);
 const condition=explainEffects(parseScript('if={limit={has_completed_focus=A} add_political_power=50} else={add_stability=0.1}'),id=>id==='A'?'Known focus':id);
 assert.match(condition[0].text,/Only if/);assert.equal(condition[0].children![0].text,'Complete Known focus.');assert.match(condition[1].text,/Otherwise/);
 assert.equal(explainEffects(parseScript('else={add_political_power=50}'))[0].unknown,true);
 assert.equal(explainConditions(parseScript('SOV={has_war=yes}'))[0].status,'state-unknown');
});
test('requirements preserve AND/OR, exclusions, bypass and readable research costs without fabricated days',()=>{
 const e:Entry={uid:'test',id:'T',title:'Test',kind:'focus',source:'fixture',line:1,hash:'fixture',version:'fixture',description:'',data:{days:35,prerequisites:[['A','B'],['C']],exclusive:['D'],nodes:parseScript('bypass={has_completed_focus=X} completion_reward={add_political_power=10}')}};
 const value=entryMechanics(e,id=>({A:'Alpha',B:'Beta',C:'Gamma',D:'Delta',X:'Other'}[id]||id));
 assert.match(value.requirements[0].text,/AND/);assert.match(value.requirements[1].text,/Alpha OR Beta/);assert.match(value.requirements[2].text,/Gamma/);assert.match(value.requirements[3].text,/Delta/);assert.equal(value.requirements[4].text,'May be skipped if:');
 const tech=entryMechanics({...e,kind:'technology',data:{nodes:parseScript('research_cost=1.5 start_year=1936 production_factory_max_efficiency_factor=0.1')} });
 assert.match(tech.summary[0].text,/factor: 1.5/);assert.match(tech.summary[0].text,/depend on/);assert.ok(tech.summary.some(s=>s.text.includes('Production efficiency cap: +10%')));
});
