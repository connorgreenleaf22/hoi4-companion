import {z} from 'zod';
import type {KnowledgeDesign,KnowledgeSearchResult} from '../../src/knowledge-engine-types';
import {compareKnowledgeDesigns} from './index';
import {designSchema,searchSchema} from './schema';
import type {KnowledgeSource} from './source';

const ref=z.string().min(1).max(1600);
const common={scenario:searchSchema.shape.scenario,objective:searchSchema.shape.objective,constraints:searchSchema.shape.constraints,includePartialEstimates:searchSchema.shape.includePartialEstimates};
const schema=z.discriminatedUnion('kind',[
  z.strictObject({...common,kind:z.literal('division-counts'),base:designSchema,dimensions:z.array(z.strictObject({unit:ref,min:z.number().int().min(0).max(25),max:z.number().int().min(0).max(25)}).refine(v=>v.max>=v.min)).min(1).max(4)}),
  z.strictObject({...common,kind:z.literal('tank-modules'),base:designSchema,dimensions:z.array(z.strictObject({slot:z.string().min(1).max(120),modules:z.array(ref).min(1).max(16)})).min(1).max(8)})
]);
/** Exhaustive only inside explicit finite bounds; refuses truncation instead of claiming a full search. */
export function searchKnowledgeDesigns(source:KnowledgeSource,input:unknown):KnowledgeSearchResult & {searchedCandidates:KnowledgeDesign[];searchSpace:{kind:string;enumerated:number;completeWithinDeclaredBounds:true}} {
  const r=schema.parse(input);let candidates:KnowledgeDesign[]=[structuredClone(r.base)];
  const dimensions=r.kind==='division-counts'?r.dimensions.map(d=>({key:d.unit,size:d.max-d.min+1})):r.dimensions.map(d=>({key:d.slot,size:d.modules.length}));
  if(new Set(dimensions.map(d=>d.key)).size!==dimensions.length)throw new Error('Search dimensions must be unique.');
  const total=dimensions.reduce((n,d)=>n*d.size,1);if(total<2||total>128)throw new Error('Choose bounds that enumerate 2–128 candidates. No search was truncated.');
  if(r.kind==='division-counts'){
    if(r.base.kind!=='division')throw new Error('Count search requires a division.');
    if(r.base.rows.every(row=>r.dimensions.some(d=>d.unit===row.unit&&d.min===0)))throw new Error('These bounds can remove every battalion. Keep at least one unit fixed or set one minimum to 1.');
    const base=r.base;for(const d of r.dimensions){if(!base.rows.some(row=>row.unit===d.unit))throw new Error('Vary a unit already present in the base design.');const next:KnowledgeDesign[]=[];
      for(const candidate of candidates){if(candidate.kind!=='division')throw new Error('Expected division.');for(let count=d.min;count<=d.max;count++)next.push({...candidate,rows:[...candidate.rows.filter(row=>row.unit!==d.unit),...(count?[{unit:d.unit,count}]:[])]});}candidates=next;}
  }else{
    if(r.base.kind!=='tank')throw new Error('Module search requires a tank.');
    for(const d of r.dimensions){if(new Set(d.modules).size!==d.modules.length)throw new Error('Module alternatives must be unique.');const next:KnowledgeDesign[]=[];
      for(const candidate of candidates){if(candidate.kind!=='tank')throw new Error('Expected tank.');for(const module of d.modules)next.push({...candidate,modules:[...candidate.modules.filter(m=>m.slot!==d.slot),{slot:d.slot,module}]});}candidates=next;}
  }
  candidates=candidates.map((c,i)=>({...c,name:`${r.base.name.slice(0,90)} alternative ${i+1}`}));
  return {...compareKnowledgeDesigns(source,{scenario:r.scenario,candidates,objective:r.objective,constraints:r.constraints,includePartialEstimates:r.includePartialEstimates}),searchedCandidates:candidates,searchSpace:{kind:r.kind,enumerated:total,completeWithinDeclaredBounds:true}};
}
