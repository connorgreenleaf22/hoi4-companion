import {createHash} from 'node:crypto';
import type {Entry,Meta} from '../../src/types';
import type {KnowledgeScenario,DivisionDesign,TankDesign} from '../../src/knowledge-engine-types';
import type {KnowledgeSource} from '../../server/knowledge-engine/source';
import {parseScript,numeric,block,scalar} from '../../server/parser';

// Original synthetic declarations. These prove the estimator contract, not HOI4 engine parity.
export function entry(kind:string,id:string,script:string):Entry{
 const nodes=parseScript(script);return {uid:kind+':synthetic:'+id,id,kind,title:id,description:'Synthetic test source',source:kind==='organization'?'common/military_industrial_organization/organizations/synthetic.txt':`synthetic/${kind}/${id}.txt`,line:1,version:'test-patch',hash:createHash('sha256').update(script).digest('hex'),data:{nodes,stats:numeric(nodes),need:numeric(block(nodes,'need')),archetype:scalar(nodes,'archetype'),category:scalar(nodes,'category'),is_archetype:scalar(nodes,'is_archetype')}};
}
export function fixtures(){
 const entries=[
 entry('equipment','rifles','is_archetype = yes type = infantry soft_attack = 5 hard_attack = 1 defense = 10 breakthrough = 2 maximum_speed = 4 build_cost_ic = 0.5 ap_attack = 2'),
 entry('equipment','rifles_1','archetype = rifles parent = unrelated soft_attack = 6'),
 entry('equipment','unrelated','soft_attack = 999 build_cost_ic = 999'),
 entry('unit','infantry','active = yes group = infantry categories = { category_infantry } combat_width = 2 manpower = 1000 max_strength = 25 max_organisation = 60 supply_consumption = 0.1 need = { rifles = 100 }'),
 entry('unit','artillery','active = yes group = artillery combat_width = 3 manpower = 500 max_strength = 2 max_organisation = 0 supply_consumption = 0.2 need = { rifles = 20 }'),
 entry('equipment','light_tank_chassis',`is_archetype = yes type = armor maximum_speed = 4 armor_value = 10 reliability = 0.8 build_cost_ic = 2 upgrades = { armor_upgrade } module_slots = { turret = { required = yes allowed_module_categories = { turret } } gun = { required = yes allowed_module_categories = { gun } } extra = { required = no allowed_module_categories = { radio } } extra2 = extra } module_count_limit = { category = radio count < 2 }`),
 entry('equipment','tank_1','archetype = light_tank_chassis module_slots = inherit module_add_stats_multiplier = { soft_attack = 0.1 }'),
 entry('module','turret','category = turret add_stats = { build_cost_ic = 1 breakthrough = 5 } multiply_stats = { maximum_speed = 0.1 }'),
 entry('module','gun','category = gun add_stats = { build_cost_ic = 2 soft_attack = 20 } multiply_stats = { maximum_speed = -0.2 }'),
 entry('module','radio','category = radio add_stats = { breakthrough = 2 }'),
 entry('upgrade','armor_upgrade','max_level = 4 reliability = -0.02 add_stats = { armor_value = 2 build_cost_ic = 0.5 } level_requirements = { 2 = { has_tech = better_armor } }'),
 entry('technology','basic','enable_equipments = { rifles_1 tank_1 } enable_equipment_modules = { turret gun radio }'),
 entry('technology','better_armor','research_cost = 1 start_year = 1940'),
 entry('technology','infantry_bonus','infantry = { soft_attack = 0.1 max_organisation = 5 }'),
 entry('idea','army_spirit','modifier = { army_org_factor = 0.1 army_attack_factor = 0.2 }'),
 entry('doctrine_reward','infantry_doctrine','category_infantry = { max_organisation = 10 defense = 0.1 }'),
 entry('organization','tank_mio','equipment_type = { armor } initial_trait = { equipment_bonus = { soft_attack = 0.1 } } trait = { token = expensive equipment_bonus = { armor_value = 0.2 } }'),
 entry('unit','tank_unit','active = yes group = armor combat_width = 2 manpower = 500 max_strength = 2 max_organisation = 10 supply_consumption = 0.2 need = { light_tank_chassis = 50 }'),
 ];
 const metadata={root:'synthetic',version:'test-patch',gameVersion:'test-patch',indexRevision:'synthetic-revision',indexedAt:'',counts:{},files:entries.length,warnings:[],dlcs:[],mods:[],defines:{ARMOR_VS_AVERAGE:0.4,PEN_VS_AVERAGE:0.4}} as Meta;
 const source:KnowledgeSource={meta:()=>metadata,entries:kinds=>entries.filter(e=>kinds.includes(e.kind)),resolve:(r,k)=>{const selected=entries.filter(e=>(!k||e.kind===k)&&(r==='definition:'+e.uid||e.id===r));return {reference:r,status:selected.length===1?'resolved':selected.length?'ambiguous':'unresolved',reason:'synthetic',candidates:selected,entry:selected.length===1?selected[0]:undefined};}};
 const scenario:KnowledgeScenario={schemaVersion:1,gameVersion:metadata.gameVersion!,indexRevision:metadata.indexRevision!,configuration:'all-dlc-no-mods',stateSource:'manual',country:'SIA',date:'1938-01-01',researched:['basic'],modifiers:[]};
 const division:DivisionDesign={kind:'division',name:'9 infantry',rows:[{unit:'infantry',count:9}],equipment:[{archetype:'rifles',model:'rifles_1'}]};
 const tank:TankDesign={kind:'tank',name:'Light tank',chassis:'tank_1',modules:[{slot:'turret',module:'turret'},{slot:'gun',module:'gun'}],upgrades:[]};
 return {source,entries,metadata,scenario,division,tank};
}
