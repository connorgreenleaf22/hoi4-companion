import type {Entry} from '../../src/types';
import type {AiSource,ReferenceProblem,StrategyContent} from '../../src/ai-planning-types';

export class StrategyReferenceError extends Error {
 constructor(public problems:ReferenceProblem[]){super(problems.map(p=>`${p.reference}: ${p.reason}${p.candidates.length?' — candidates: '+p.candidates.map(c=>c.reference+' ('+c.kind+', '+c.source+')').join(', '):''}`).join('; '));}
}
/** One contract for generation, local review and recovery. Never use untyped aliases or titles. */
export function normalizeStrategy(content:StrategyContent,entries:Entry[],focuses:Entry[],disclosed?:AiSource[]){
 const repairs:string[]=[],problems:ReferenceProblem[]=[];
 const resolve=(value:string,kinds:string[],location:string)=>{
  const matches=entries.filter(e=>value.startsWith('definition:')?value==='definition:'+e.uid:e.id===value);
  const typed=matches.filter(e=>kinds.includes(e.kind));
  const scoped=typed.filter(e=>!['focus','shared_focus','joint_focus'].includes(e.kind)||focuses.some(f=>f.uid===e.uid));
  // Uniqueness is checked BEFORE disclosure filtering: omitting a sibling cannot disambiguate it.
  const e=scoped.length===1?scoped[0]:undefined;
  const proof=e&&disclosed?.find(d=>d.reference==='definition:'+e.uid);
  const reason=!matches.length?'missing-or-stale':!typed.length?'wrong-kind':!scoped.length?'different-tree':scoped.length>1?'ambiguous':disclosed&&!proof?'not-disclosed':proof&&e&&(proof.hash!==e.hash||proof.version!==e.version)?'stale-source':null;
  if(reason){problems.push({reference:value,location,reason,candidates:matches.map(e=>({reference:'definition:'+e.uid,id:e.id,kind:e.kind,title:e.title,source:e.source,tree:e.data.treeId||null}))});return value;}
  const canonical='definition:'+e!.uid;if(value!==canonical)repairs.push(value+' → '+canonical);return canonical;
 };
 const result=structuredClone(content);
 result.focusIds=result.focusIds.map((id,i)=>resolve(id,['focus','shared_focus','joint_focus'],`focusIds[${i}]`));
 result.recommendations=result.recommendations.map((r,i)=>({...r,references:r.references.map((ref,j)=>resolve(ref,r.category==='decision'?['decision']:r.category==='research'?['technology']:['focus','shared_focus','joint_focus','decision','technology','event','idea'],`recommendations[${i}].references[${j}]`))}));
 if(problems.length)throw new StrategyReferenceError(problems);
 return {content:result,repairs};
}
