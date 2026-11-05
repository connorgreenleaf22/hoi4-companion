import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScript, block, children, scalar } from '../server/parser';
import { evaluate, validatePlan, treeFocuses, calculateTemplate, production, resolveEquipment } from '../server/domain';
import { validateProfile } from '../server/api';
import type { Entry,Profile } from '../src/types';
const profile=(patch:Partial<Profile>={}):Profile=>({id:'test',name:'Test',country:'GER',startDate:'1936-01-01',historical:true,goals:'',tree:'tree',queue:[],completed:[],dlcs:[],dlcConfirmed:false,bookmarks:[],notes:{},...patch});
const entry=(id:string,data:any={},kind='focus'):Entry=>({uid:id,id,kind,title:id,description:'',source:'test',line:1,version:'test',hash:'test',data:{prerequisites:[],exclusive:[],days:70,conditions:{},...data}});
test('parser preserves repeated prerequisites, comments, strings, and line numbers',()=>{
  const parsed=parseScript('# heading\nfocus = {\n id = "A # quoted" prerequisite = { focus = B focus = C }\n prerequisite = { focus = D } x = -2 date > 1936.1.1\n}');
  const f=block(parsed,'focus');assert.equal(scalar(f,'id'),'A # quoted');assert.equal(children(f,'prerequisite').length,2);assert.equal(f[0].line,3);assert.equal(f.at(-1)?.op,'>');
});
test('parser fails malformed input by default and exposes recovery warnings when requested',()=>{
  assert.throws(()=>parseScript('a = { b = 1'));assert.throws(()=>parseScript('a = "bad'));
  const warnings:string[]=[];assert.equal(block(parseScript('a = { b = 1',{recover:true,warnings}),'a').length,1);assert.equal(warnings.length,1);
});
test('DLC unknown, boolean groups, and NOT semantics are conservative',()=>{
  const nodes=parseScript('OR = { has_dlc = A has_dlc = B }');
  assert.equal(evaluate(nodes,profile()),'unknown');assert.equal(evaluate(nodes,profile({dlcConfirmed:true,dlcs:['B']})),'yes');
  assert.equal(evaluate(parseScript('NOT = { tag = GER tag = FRA }'),profile()),'no');
  assert.equal(evaluate(parseScript('date > 1939.1.1'),profile()),'unknown');
  assert.equal(evaluate(parseScript('has_completed_focus = OTHER'),profile()),'unknown');
});
test('prerequisite rows are AND and entries within a row are OR',()=>{
  const focuses=[entry('A'),entry('B'),entry('C'),entry('D',{prerequisites:[['A','B'],['C']]})];
  const valid=validatePlan(profile({queue:['A','C','D']}),focuses);assert.equal(valid.issues.length,0);assert.equal(valid.days,210);assert.equal(valid.finishDate,'1936-07-29');
  assert.equal(validatePlan(profile({queue:['A','D']}),focuses).issues[0].type,'prerequisite');
});
test('exclusions are checked from either direction, and missing focuses stay visible',()=>{
  const report=validatePlan(profile({queue:['A','B','missing']}),[entry('A',{exclusive:['B']}),entry('B')]);
  assert.deepEqual(report.issues.map(i=>i.type),['exclusive','missing']);
});
test('unknown duration is not silently estimated and branch conditions are flagged',()=>{
  const report=validatePlan(profile({queue:['A']}),[entry('A',{days:null,conditions:{available:parseScript('has_war = yes')}})]);
  assert.equal(report.unresolvedDays,true);assert.equal(report.issues[0].type,'manual');
});
test('shared branches follow references and descendants; relative coordinates accumulate',()=>{
  const tree=entry('tree',{sharedIds:['S']},'focus_tree');const root=entry('R',{treeId:'tree',x:3,y:0,relative:''});
  const shared=entry('S',{x:1,y:1,relative:'R'},'shared_focus');const child=entry('T',{x:2,y:1,relative:'S',prerequisites:[['S']]},'joint_focus');
  const result=treeFocuses(tree,[root,shared,child]);assert.equal(result.length,3);assert.deepEqual(result.find(e=>e.id==='T')?.data.position,{x:6,y:2});
});
test('division totals account for support companies and army size',()=>{
  const units=[entry('inf',{stats:{combat_width:2,manpower:1000,supply_consumption:.06,max_organisation:60},need:{rifle:100}},'unit'),entry('eng',{support:true,stats:{combat_width:0,manpower:500,max_organisation:20},need:{support:30}},'unit')];
  const r=calculateTemplate([{id:'inf',count:9},{id:'eng',count:1}],units,24);
  assert.equal(r.width,18);assert.equal(r.armyManpower,228000);assert.equal(r.organization,56);assert.deepEqual(r.needs,{rifle:21600,support:720});
  assert.throws(()=>calculateTemplate([{id:'eng',count:2}],units));assert.throws(()=>calculateTemplate([{id:'inf',count:-1}],units));assert.throws(()=>calculateTemplate([{id:'inf',count:20},{id:'eng',count:0},{id:'inf',count:1}],units));
});
test('equipment inherits archetype defaults, not research parent statistics',()=>{
  const base=entry('rifle',{stats:{defense:20,soft_attack:3}},'equipment');const old=entry('old',{archetype:'rifle',stats:{soft_attack:6,defense:22}},'equipment');const next=entry('next',{archetype:'rifle',parent:'old',stats:{soft_attack:9}},'equipment');
  assert.deepEqual(resolveEquipment(next,[base,old,next]),{defense:20,soft_attack:9});
});
test('production handles stockpile, efficiency, penalties, and zero output',()=>{
  const input={quantity:1000,stockpile:100,cost:.5,factories:10,efficiency:.5,output:1.2,resourceFactor:.5};
  const r=production(input,3.5);assert.equal(r.dailyIC,10.5);assert.equal(r.days,43);assert.equal(production({...input,factories:0},3.5).days,null);assert.equal(production({...input,stockpile:1000,factories:0},3.5).days,0);assert.throws(()=>production({...input,cost:NaN},3.5));
});
test('profile validation rejects impossible dates and malformed imported templates',()=>{
  assert.throws(()=>validateProfile({...profile(),startDate:'1936-02-31'}));assert.throws(()=>validateProfile({...profile(),templates:[{name:'Bad',rows:[{id:'inf',count:-1}]}]}));
  assert.deepEqual(validateProfile({...profile(),queue:['A','A']}).queue,['A','A']);
});
