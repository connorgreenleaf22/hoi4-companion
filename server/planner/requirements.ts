import type {DLCState,Evidence,Node,Profile,RequirementResult,RequirementRole,Truth} from '../../src/types';

export const andTruth=(values:Truth[]):Truth=>values.includes('no')?'no':values.includes('unknown')?'unknown':'yes';
export const orTruth=(values:Truth[]):Truth=>values.includes('yes')?'yes':values.includes('unknown')?'unknown':'no';
export const notTruth=(value:Truth):Truth=>value==='yes'?'no':value==='no'?'yes':'unknown';
const unique=(values:string[])=>[...new Set(values)];

export type RequirementOptions={role?:RequirementRole;projected?:Map<string,Truth>;dlcAvailability?:Record<string,Truth>;knownDlcs?:string[];source?:Evidence};

/** Independent installed/owned/enabled facts, rather than the old combined DLC checkbox. */
export function plannerDlcFacts(profile:Profile,dlcs:DLCState[]):Record<string,Truth>{
  const result:Record<string,Truth>={};
  for(const dlc of dlcs){
    const assertion=profile.dlcStates?.[dlc.id]||profile.dlcStates?.[dlc.name];
    const installed=dlc.installed?.value||'unknown';
    const owned=assertion?.owned.value||dlc.owned?.value||'unknown';
    const enabled=dlc.disabled||dlc.enabled?.value==='no'||assertion?.enabled.value==='no'?'no':assertion?.enabled.value==='yes'||dlc.enabled?.value==='yes'?'yes':'unknown';
    result[dlc.name]=dlc.integrated&&installed==='yes'?'yes':andTruth([installed,owned,enabled]);
  }
  return result;
}

/** Pure, conservative interpretation of the supported trigger subset. Unsupported scopes stay scoped. */
export function evaluateRequirements(nodes:Node[],profile:Profile,options:RequirementOptions={}):RequirementResult{
  const role=options.role||'availability';
  let visited=0;
  const visit=(node:Node,scope:string[]=[],unsupported=false,depth=0):RequirementResult=>{
    const source=options.source?{...options.source,line:node.line||options.source.line}:undefined;
    const base={key:node.key,op:node.op,role,source,scope,children:[] as RequirementResult[],assumptions:[] as string[]};
    if(++visited>10000||depth>64)return {...base,truth:'unknown',reason:'Requirement exceeds the safe explanation limit; inspect the source.'};
    if(Array.isArray(node.value)){
      const operator=node.key.toUpperCase();const supported=['AND','OR','NOT'].includes(operator)&&(!node.op||node.op==='=');
      const nestedScope=supported?scope:[...scope,node.key];
      const children=node.value.map(n=>visit(n,nestedScope,unsupported||!supported,depth+1));
      const assumptions=unique(children.flatMap(n=>n.assumptions));
      if(unsupported||!supported)return {...base,children,scope:nestedScope,assumptions,truth:'unknown',reason:`Unsupported scope or script block ${node.key}; its children are not evaluated as the campaign country.`};
      const truths=children.map(n=>n.truth);
      // HOI4 NOT blocks require every enclosed condition to be false (negated OR).
      const truth=operator==='OR'?orTruth(truths):operator==='NOT'?notTruth(orTruth(truths)):andTruth(truths);
      return {...base,children,assumptions,truth,reason:operator==='NOT'?'NOT: every enclosed condition must be false.':operator==='OR'?'OR: at least one enclosed condition must hold.':'AND: every enclosed condition must hold.'};
    }
    const value=node.value;const leaf={...base,value};
    if(unsupported)return {...leaf,truth:'unknown',reason:'Unsupported surrounding scope; campaign assertions cannot establish this scoped condition.'};
    if(node.op&&node.op!=='=')return {...leaf,truth:'unknown',reason:`Unsupported comparator ${node.op}; inspect the in-game condition.`};
    if(role==='outcome')return {...leaf,truth:'unknown',reason:'Rewards and scripted effects are not simulated.'};
    if(node.key==='always')return {...leaf,truth:value==='yes'?'yes':value==='no'?'no':'unknown',reason:'Literal installed always condition.'};
    if(node.key==='tag'||node.key==='original_tag')return {...leaf,truth:'unknown',reason:`Selected country ${profile.country} is planning context, not evidence of the live ${node.key}.`};
    if(node.key==='has_dlc'){
      const truth=options.dlcAvailability?.[value]??(options.knownDlcs?.includes(value)?'yes':'unknown');
      return {...leaf,truth,reason:truth==='yes'?'Installed content and applicable DLC assertions satisfy this gate.':truth==='no'?'Independent DLC evidence indicates absent, unowned or disabled content.':'DLC installation, ownership or enabled state needs confirmation; a legacy combined assertion is insufficient.'};
    }
    if(node.key==='has_completed_focus'){
      if(profile.completed.includes(value))return {...leaf,truth:'yes',reason:'Explicit manual actual-completion assertion; no live game state was read.'};
      const projected=options.projected?.get(value);
      if(projected==='yes')return {...leaf,truth:'yes',reason:'Earlier queued focus is projected to complete; actual completion is unchanged.',assumptions:[`Assume earlier queued ${value} completes in this sequence.`]};
      if(projected==='unknown')return {...leaf,truth:'unknown',reason:'Earlier queued completion is conditional on a manual check or an earlier sequence assumption.',assumptions:[`Completion of earlier queued ${value} is conditional.`]};
      return {...leaf,truth:'unknown',reason:projected==='no'?'Earlier blocked focus supplies no projected completion; absence from manual positives does not prove an actual negative.':'No positive actual or earlier projected completion assertion; absence does not prove a negative.'};
    }
    return {...leaf,truth:'unknown',reason:node.key==='date'?'Planning baseline is not the current in-game date.':'Unsupported live condition or script call; check it in game.'};
  };
  const children=nodes.map(n=>visit(n));
  return {truth:andTruth(children.map(n=>n.truth)),key:'AND',reason:'All requirements in this role are evaluated together.',role,children,assumptions:unique(children.flatMap(n=>n.assumptions)),...(options.source?{source:options.source}:{})};
}
