import fs from 'node:fs';
import path from 'node:path';
import {openStore} from '../server/store';
import {indexedKnowledgeSource,knowledgeCatalog} from '../server/knowledge-engine/source';
import {evaluateKnowledgeDesign,compareKnowledgeDesigns} from '../server/knowledge-engine';
import {block} from '../server/parser';
import type {KnowledgeDesign,KnowledgeScenario} from '../src/knowledge-engine-types';
const directory=process.argv[2];if(!directory)throw new Error('Pass an explicit isolated installed-source index directory.');
const store=openStore(path.resolve(directory));
try{
 const source=indexedKnowledgeSource(store),meta=source.meta()!;if(!meta?.gameVersion||meta.mods.length)throw new Error('Expected a versioned no-mod index.');
 const tankModules=['tank_light_one_man_tank_turret','tank_heavy_machine_gun','tank_bogie_suspension','tank_riveted_armor','tank_gasoline_engine'];
 const needed=new Set(['infantry','artillery_brigade','infantry_equipment_1','artillery_equipment_1','light_tank_chassis_1',...tankModules]);
 const research=source.entries(['technology']).filter(t=>t.data.nodes.some((n:any)=>['enable_equipments','enable_subunits','enable_equipment_modules'].includes(n.key)&&Array.isArray(n.value)&&n.value.some((v:any)=>needed.has(v.value))));
 const scenario:KnowledgeScenario={schemaVersion:1,gameVersion:meta.gameVersion,indexRevision:meta.indexRevision!,configuration:'all-dlc-no-mods',stateSource:'manual',country:'SIA',date:'1938-01-01',researched:research.map(t=>t.id),modifiers:[]};
 const infantry:KnowledgeDesign={kind:'division',name:'9 infantry',rows:[{unit:'infantry',count:9}],equipment:[{archetype:'infantry_equipment',model:'infantry_equipment_1'}]};
 const artillery:KnowledgeDesign={kind:'division',name:'9 infantry + 1 artillery',rows:[{unit:'infantry',count:9},{unit:'artillery_brigade',count:1}],equipment:[{archetype:'infantry_equipment',model:'infantry_equipment_1'},{archetype:'artillery_equipment',model:'artillery_equipment_1'}]};
 const tank:KnowledgeDesign={kind:'tank',name:'Basic light tank',chassis:'light_tank_chassis_1',modules:['turret_type_slot','main_armament_slot','suspension_type_slot','armor_type_slot','engine_type_slot'].map((slot,i)=>({slot,module:tankModules[i]})),upgrades:[]};
 const result=(design:KnowledgeDesign)=>{const r=evaluateKnowledgeDesign(source,{scenario,design});return {name:design.name,status:r.status,metrics:Object.fromEntries(Object.entries(r.metrics).map(([k,m])=>[k,m.value])),issues:r.issues,dependencies:r.provenance.definitions.length};};
 const comparison=compareKnowledgeDesigns(source,{scenario,candidates:[infantry,artillery],objective:{metric:'soft_attack',direction:'maximize',perIndustrialCost:true},constraints:[{metric:'max_organisation',min:30}],includePartialEstimates:true});
 const report={gameVersion:meta.gameVersion,indexRevision:meta.indexRevision,configuration:'Manually asserted all DLC/no mods; no entitlement/campaign qualification',sourceCounts:meta.counts,knowledgeCatalogCounts:knowledgeCatalog(source).counts,research:research.map(t=>t.id),samples:[infantry,artillery,tank].map(result),comparison:{status:comparison.status,best:comparison.best?.design.name,excluded:comparison.excluded,candidateCount:comparison.candidatesEvaluated},gameCalls:0,providerCalls:0,engineParity:'not-tested'};
 const out=path.resolve('artifacts/knowledge-engine-installed-summary.json');fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({output:out,gameVersion:meta.gameVersion,samples:report.samples.map(s=>({name:s.name,status:s.status,issues:s.issues.length})),comparison:report.comparison}));
}finally{store.db.close();}
