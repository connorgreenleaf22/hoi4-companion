import type {Entry,Profile,ResolutionStatus,Truth} from '../../src/types';

export function resolveFocus(reference:string,focuses:Entry[]):{status:ResolutionStatus;entry?:Entry;candidates:Entry[]}{
  const definition=reference.startsWith('definition:');const exact=definition?reference.slice(11):reference;
  const direct=focuses.filter(e=>e.uid===exact);
  const candidates=direct.length?direct:definition?[]:focuses.filter(e=>e.entityKey===reference||e.id===reference||(e.data.legacyAliases||[]).includes(reference));
  const unique=[...new Map(candidates.map(e=>[e.uid,e])).values()];
  const ambiguousAlias=!definition&&focuses.some(e=>(e.data.ambiguousAliases||[]).includes(reference));
  return {status:ambiguousAlias||unique.length>1?'ambiguous':unique.length===1?'resolved':'unresolved',entry:!ambiguousAlias&&unique.length===1?unique[0]:undefined,candidates:unique};
}

/** Only unambiguous assertions can be translated to scripted completion IDs. */
export function actualCompletionContext(profile:Profile,focuses:Entry[]):Set<string>{
  const actual=new Set<string>();
  for(const ref of profile.completed){
    const resolved=resolveFocus(ref,focuses);
    if(resolved.entry){actual.add(resolved.entry.uid);if(focuses.filter(e=>e.id===resolved.entry!.id).length===1)actual.add(resolved.entry.id);}
    // A legacy positive may refer to an out-of-tree focus. Keep it as a positive only if
    // no indexed definition conflicts; references with explicit namespaces are not IDs.
    else if(!resolved.candidates.length&&!ref.includes(':'))actual.add(ref);
  }
  return actual;
}

export function addProjection(projected:Map<string,Truth>,entry:Entry,truth:Truth,focuses:Entry[]){
  projected.set(entry.uid,truth);
  if(focuses.filter(e=>e.id===entry.id).length===1)projected.set(entry.id,truth);
}
