import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from '../server/store';
import {indexGame} from '../server/importer';
import type {Entry,Relationship,Coverage} from '../src/types';

function fixture(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-knowledge-'));const root=path.join(temp,'game');const store=openStore(path.join(temp,'data'));
  const put=(file:string,text:string)=>{const full=path.join(root,file);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,text);};
  put('common/national_focus/main.txt','focus_tree={ id=main focus={ id=A completion_reward={ if={ limit={ OR={ has_dlc="Test DLC" unknown_gate=yes } } country_event={id=test.1 days=2 random_days=3} } } } }');
  put('launcher-settings.json','{"rawVersion":"fixture.1"}');put('common/defines/00.lua','FOCUS_POINT_DAYS = 7,');
  put('dlc_metadata/dlc_info/00.txt','dlcs={ dlc001={name="Test DLC"} }');
  const list=():Entry[]=>store.db.prepare('SELECT payload FROM entries').all().map(r=>JSON.parse(r.payload as string));
  const edges=():Relationship[]=>store.db.prepare('SELECT payload FROM relationships').all().map(r=>JSON.parse(r.payload as string));
  const done=()=>{store.db.close();if(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(temp,{recursive:true,force:true});};
  return {temp,root,store,put,list,edges,done};
}

test('importer preserves every repeated mutually-exclusive focus block',()=>{
 const f=fixture();try{
  f.put('common/national_focus/main.txt','focus_tree={id=main focus={id=A mutually_exclusive={focus=B} mutually_exclusive={focus=C}} focus={id=B} focus={id=C}}');
  indexGame(f.store,f.root);const a=f.list().find(e=>e.kind==='focus'&&e.id==='A')!;assert.deepEqual(a.data.exclusive,['B','C']);assert.equal(a.data.nodes.filter((n:any)=>n.key==='mutually_exclusive').length,2);
 }finally{f.done();}
});

test('knowledge records preserve module inheritance, typed unlocks, comparison limits and scoped mission statistics',()=>{
  const f=fixture();try{
    f.put('common/technologies/artillery.txt','technologies={ artillery1={ enable_equipment_modules={ tank_medium_cannon } enable_subunits={ light_armor } enable_building={building=radar_station level=1} allow={ROOT={is_special_project_completed=sp:radar}} path={leads_to_tech=artillery2} ai_will_do={modifier={factor=2 has_dlc="Test DLC"}} } artillery2={} }');
    f.put('common/units/equipment/modules/modules.txt','equipment_modules={ limit={has_dlc="Test DLC"} tank_medium_cannon={category=tank_medium_main_armament add_stats={soft_attack=3}} heavy_mg_4x={category=fighter_weapon add_stats={air_attack=18} mission_type_stats={limit={attack_logistics} add_stats={air_ground_attack=1}}} } equipment_modules={another_module={category=fighter_weapon}}');
    f.put('common/units/equipment/airframes.txt','equipments={ small_plane_airframe={module_slots={fixed_main_weapon_slot={required=yes allowed_module_categories={fighter_weapon cas_weapon}}} module_count_limit={module=heavy_mg_4x count<2} module_count_limit={category=fighter_weapon count<2} default_modules={fixed_main_weapon_slot=heavy_mg_4x}} small_plane_airframe_0={archetype=small_plane_airframe module_slots=inherit upgrades={engine_upgrade}} }');
    f.put('common/units/equipment/upgrades/land.txt','upgrades={ engine_upgrade={max_level=20 reliability=-.015 add_stats={maximum_speed=.1} level_requirements={5={has_tech=artillery1}}} }');
    f.put('common/units/units.txt','sub_units={light_armor={}}');f.put('common/buildings/main.txt','buildings={radar_station={}}');f.put('common/special_projects/main.txt','radar={}');
    indexGame(f.store,f.root);const all=f.list();const edges=f.edges();
    const module=all.find(e=>e.id==='heavy_mg_4x')!;assert.equal(module.data.addStats.air_attack,18);assert.equal(module.data.addStats.air_ground_attack,undefined);assert.equal(module.data.missionStats[0].value[0].value[0].value,'attack_logistics');
    assert.equal(all.filter(e=>e.kind==='module').length,3);assert.ok(edges.some(e=>e.type==='enables-module'&&e.targetRef.id==='tank_medium_cannon'&&e.resolution==='resolved'));
    assert.ok(edges.some(e=>e.type==='enables-unit'&&e.targetRef.id==='light_armor'&&e.resolution==='resolved'));assert.ok(edges.some(e=>e.type==='enables-building'&&e.targetRef.id==='radar_station'&&e.details?.some(n=>n.key==='level'&&n.value==='1')));
    assert.ok(edges.some(e=>e.type==='inherits-module-slots'&&e.targetRef.id==='small_plane_airframe'&&e.resolution==='resolved'));
    const limits=all.find(e=>e.id==='small_plane_airframe')!.data.constraints.filter((n:any)=>n.key==='module_count_limit');assert.equal(limits.length,2);assert.equal(limits[0].value[1].op,'<');
    assert.ok(edges.some(e=>e.type==='uses-upgrade'&&e.resolution==='resolved'));assert.ok(edges.some(e=>e.type==='requires-technology'&&e.scope.some(s=>s.startsWith('5['))));
    assert.ok(edges.some(e=>e.type==='requires-dlc'&&e.scope[0]==='inherited'&&e.condition.some(n=>n.key==='limit')));
    assert.ok(all.some(e=>e.kind==='module_category'&&e.id==='fighter_weapon'&&e.data.declarationOnly));assert.ok(edges.some(e=>e.type==='slot-accepts-category'&&e.targetRef.id==='fighter_weapon'&&e.resolution==='resolved'));assert.ok(edges.some(e=>e.type==='limits-category'&&e.resolution==='resolved'&&e.details!.some(n=>n.op==='<')));
    assert.ok(edges.some(e=>e.type==='defaults-module'&&e.targetRef.id==='heavy_mg_4x'&&e.resolution==='resolved'));assert.ok(edges.some(e=>e.type==='mentions-dlc'&&e.scope.some(s=>s.startsWith('ai_will_do['))));assert.ok(!edges.some(e=>e.type==='requires-dlc'&&e.scope.some(s=>s.startsWith('ai_will_do['))));
  }finally{f.done();}
});

test('doctrine rewards, role variants, recruitment and event stages remain separate ordered entities',()=>{
  const f=fixture();try{
    f.put('common/doctrines/grand_doctrines/main.txt','new_mobile_warfare={folder=land tracks={infantry} enable_tactic=tactic_delay milestones={{enable_tactic=tactic_delay}}}');
    f.put('common/doctrines/tracks/main.txt','infantry={mastery={categories={category_cavalry}}}');f.put('common/doctrines/folders/main.txt','land={}');
    f.put('common/doctrines/subdoctrines/main.txt','mobile_infantry={track=infantry rewards={cavalry_charge={category_cavalry={breakthrough=.20} recon={defense=.1}}}}');f.put('common/combat_tactics.txt','tactic_delay={}');
    f.put('common/characters/AFG.txt','characters={AFG_shah={instance={allowed={NOT={has_dlc="Test DLC"}} country_leader={traits={rich_sultan}}} instance={allowed={has_dlc="Test DLC"} field_marshal={traits={politically_connected}}}}}');
    f.put('common/country_leader/main.txt','leader_traits={rich_sultan={}}');f.put('common/unit_leader/main.txt','leader_traits={politically_connected={}}');
    f.put('history/countries/AFG - Afghanistan.txt','recruit_character=AFG_shah 1939.1.1={recruit_character=missing_character}');
    f.put('events/main.txt','add_namespace=test country_event={id=test.1 is_triggered_only=yes immediate={add_ideas=spirit} option={name=test.1.a trigger={OR={AND={always=yes unknown_gate=yes} always=no}} FROM={country_event={id=test.2 hours=6}}} after={recruit_character=AFG_shah}} country_event={id=test.2}');
    f.put('common/idea_tags/main.txt','idea_categories={academy_spirit={type=army_spirit cost=20}}');f.put('common/ideas/main.txt','ideas={academy_spirit={spirit={modifier={max_command_power=30}}}}');
    const meta=indexGame(f.store,f.root);const all=f.list();const edges=f.edges();
    assert.equal(all.find(e=>e.id==='spirit')!.data.ideaCategory.declaredBaseCost,20);assert.equal(all.find(e=>e.id==='spirit')!.data.ideaCategory.type,'army_spirit');
    const reward=all.find(e=>e.id==='cavalry_charge')!;assert.equal(reward.kind,'doctrine_reward');assert.equal(reward.data.scopedStats[0].key,'category_cavalry');assert.ok(edges.some(e=>e.from===reward.uid&&e.type==='belongs-to'&&e.targetRef.id==='mobile_infantry'));
    assert.ok(all.some(e=>e.kind==='doctrine_milestone'&&e.data.anonymousIdentity));assert.equal(all.filter(e=>e.kind==='character_instance').length,2);assert.equal(all.filter(e=>e.kind==='character_role').length,2);
    assert.ok(edges.some(e=>e.type==='has-trait'&&e.targetRef.id==='rich_sultan'&&JSON.stringify(e.condition).includes('NOT')));
    const call=edges.find(e=>e.type==='triggers-event'&&e.targetRef.id==='test.2')!;assert.ok(call.scope.some(s=>s==='FROM[1]'));assert.ok(call.details!.some(n=>n.key==='hours'&&n.value==='6'));assert.ok(JSON.stringify(call.condition).includes('AND'));
    const delayed=edges.find(e=>e.type==='triggers-event'&&e.targetRef.id==='test.1')!;assert.ok(delayed.details!.some(n=>n.key==='random_days'));assert.ok(JSON.stringify(delayed.condition).includes('unknown_gate'));
    assert.ok(edges.some(e=>e.type==='recruits-character'&&e.targetRef.id==='missing_character'&&e.resolution==='unresolved'));assert.ok(all.some(e=>e.kind==='event_stage'&&e.data.stage==='after'));
    const coverage=f.store.getSetting<Coverage>('coverage',null as any);for(const c of coverage.files){assert.equal(c.discovered,c.accounted);assert.equal(c.records?.filter(r=>r.disposition==='emitted').length,c.emitted);}
    assert.equal(indexGame(f.store,f.root).indexRevision,meta.indexRevision);
  }finally{f.done();}
});

test('independent discovery exposes unsupported records and fatal refresh preserves committed graph, metadata and profiles',()=>{
  const f=fixture();try{
    f.put('common/technologies/test.txt','technologies={ tech={} odd_scalar=3 } unsupported_wrapper={lost_tech={}}');
    const first=indexGame(f.store,f.root);const coverage=f.store.getSetting<Coverage>('coverage',null as any);const file=coverage.files.find(c=>c.source==='common/technologies/test.txt')!;
    assert.equal(file.discovered,3);assert.equal(file.emitted,1);assert.ok(file.omissions.some(o=>o.path.includes('unsupported_wrapper')));assert.equal(file.status,'unsupported');
    f.store.db.prepare('INSERT INTO profiles VALUES(?,?)').run('saved',JSON.stringify({id:'saved',notes:{old:'retain'},queue:['A']}));const before=f.edges();
    f.put('events/broken.txt','country_event={ id="unterminated');assert.throws(()=>indexGame(f.store,f.root),/fatal parse failure/);
    assert.equal(f.store.getSetting<any>('meta',null).indexRevision,first.indexRevision);assert.deepEqual(f.edges(),before);assert.equal(f.store.listProfiles()[0].notes.old,'retain');
    fs.unlinkSync(path.join(f.root,'events/broken.txt'));f.put('common/defines/00.lua','FOCUS_POINT_DAYS = 5,');const changed=indexGame(f.store,f.root);assert.notEqual(changed.indexRevision,first.indexRevision);assert.equal(f.list().find(e=>e.id==='A')!.data.days,50);
  }finally{f.done();}
});
