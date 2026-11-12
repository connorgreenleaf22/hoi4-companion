import type {Entry,Meta} from '../../../src/types';
import type {DesignCandidateV1,DesignScenarioV1} from '../../../src/design-evaluation-types';
import type {DesignSource} from '../../../server/design-evaluation/source';
import definitions from './definitions.json';

export const entries=definitions.entries as Entry[];
export const meta=definitions.meta as Meta;
export const reference=(id:string,kind:string)=>'definition:'+entries.find(e=>e.id===id&&e.kind===kind)!.uid;
export function fixtureSource(records:Entry[]=structuredClone(entries),metadata:Meta=structuredClone(meta)):DesignSource {
  return {meta:()=>metadata,resolve:(reference,kind)=>{
    const canonical=reference.startsWith('definition:');
    const candidates=records.filter(e=>e.kind===kind&&(canonical?e.uid===reference.slice(11):e.id===reference));
    return {reference,status:candidates.length===1?'resolved':candidates.length>1?'ambiguous':'unresolved',reason:'fixture-resolution',candidates,entry:candidates.length===1?candidates[0]:undefined,indexRevision:metadata.indexRevision};
  }};
}
export const scenario:DesignScenarioV1={schemaVersion:1,gameVersion:meta.gameVersion!,indexRevision:meta.indexRevision!,divisions:1,context:'manual-counterfactual',basis:'unmodified-base',dlcs:{'No Step Back':false},mods:[],researchedTechnologies:entries.filter(e=>e.kind==='technology').map(e=>'definition:'+e.uid),modifiers:[]};
function candidate(id:string,name:string,family:DesignCandidateV1['family'],rows:[string,number][]):DesignCandidateV1 {
  const needs=new Set(rows.flatMap(([unit])=>Object.keys(entries.find(e=>e.kind==='unit'&&e.id===unit)!.data.need)));
  const models:Record<string,string>={infantry_equipment:'infantry_equipment_1',artillery_equipment:'artillery_equipment_1',motorized_equipment:'motorized_equipment_1',medium_tank_chassis:'medium_tank_equipment_1'};
  return {schemaVersion:1,id,name,family,rows:rows.map(([unit,count])=>({unit:reference(unit,'unit'),count})),equipment:[...needs].map(archetype=>({archetype,model:reference(models[archetype],'equipment')}))};
}
export const candidates=[
  candidate('i6','6 infantry','infantry',[['infantry',6]]),
  candidate('i9','9 infantry','infantry',[['infantry',9]]),
  candidate('i9-a1','9 infantry + 1 line artillery','infantry',[['infantry',9],['artillery_brigade',1]]),
  candidate('i9-a2','9 infantry + 2 line artillery','infantry',[['infantry',9],['artillery_brigade',2]]),
  candidate('t6-m4','6 medium + 4 motorized','medium-tank',[['medium_armor',6],['motorized',4]]),
  candidate('t5-m5','5 medium + 5 motorized','medium-tank',[['medium_armor',5],['motorized',5]]),
  candidate('t8-m7','8 medium + 7 motorized','medium-tank',[['medium_armor',8],['motorized',7]])
];
export const comparisonPairs=[['i9','i6'],['i9','i9-a1'],['i9','i9-a2'],['t6-m4','t5-m5'],['t6-m4','t8-m7']];
