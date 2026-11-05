import type {CampaignPlan,DLCState,Entry,Evidence,Node,PlannerIssue,PlannerReport,PlannerStep,Profile,RequirementResult,RequirementRole,Truth} from '../../src/types';
import {parseScript} from '../parser';
import {andTruth,evaluateRequirements,notTruth,orTruth,plannerDlcFacts} from './requirements';
import {actualCompletionContext,addProjection,resolveFocus} from './projection';
import {applyTiming,nominalDuration} from './timing';

const unique=(values:string[])=>[...new Set(values)];
const sourceOf=(entry:Entry):Evidence=>entry.evidence?.[0]||{class:'installed-script',source:entry.source,line:entry.line,hash:entry.hash,gameVersion:entry.version,rule:'planner-extracted-declaration'};
function gateNodes(entry:Entry,key:string):Node[]{
  const raw=(entry.data.nodes||[]) as Node[];
  const declarations=raw.filter(n=>n.key===key);
  // Keep scalar/malformed declarations as unsupported nodes. Treating them as
  // an absent gate would incorrectly make the supported eligibility true.
  return declarations.length?declarations.flatMap(n=>Array.isArray(n.value)?n.value:[n]):Array.isArray(entry.data.conditions?.[key])?entry.data.conditions[key]:[];
}
function gatePresent(entry:Entry,key:string):boolean{return ((entry.data.nodes||[]) as Node[]).some(n=>n.key===key)||Object.hasOwn(entry.data.conditions||{},key);}
function gateSource(entry:Entry,key:string,source:Evidence):Evidence{const declaration=((entry.data.nodes||[]) as Node[]).find(n=>n.key===key);return declaration?{...source,line:declaration.line}:source;}
function requirement(truth:Truth,key:string,role:RequirementRole,reason:string,source:Evidence,children:RequirementResult[]=[],assumptions:string[]=[]):RequirementResult{
  return {truth,key,role,reason,source,children,assumptions:unique([...assumptions,...children.flatMap(c=>c.assumptions)])};
}

/** Rebuilds projection from scratch in queue order; never executes rewards or mutates campaign history. */
export function evaluatePlanner(profile:Profile,plan:CampaignPlan,focuses:Entry[],options:{tree?:Entry;dlcs?:DLCState[];indexRevision?:string}={}):PlannerReport{
  const projected=new Map<string,Truth>();const actual=actualCompletionContext(profile,focuses);
  const ambiguousActualCandidates=new Set(profile.completed.flatMap(ref=>{const resolved=resolveFocus(ref,focuses);return resolved.status==='ambiguous'?resolved.candidates.map(e=>e.uid):[];}));
  const actualProfile={...profile,completed:[...actual]};
  const dlcAvailability=plannerDlcFacts(profile,options.dlcs||[]);
  const steps:PlannerStep[]=[];const seen=new Set<string>();let sequence:Truth='yes';
  let applicability:RequirementResult|undefined;
  if(options.tree){
    const tree=options.tree;let countryNodes=gateNodes(tree,'country');
    if(!countryNodes.length&&typeof tree.data.countryScript==='string'&&tree.data.countryScript.trim())try{countryNodes=parseScript(tree.data.countryScript);}catch{countryNodes=[{key:'unparsed_tree_selection',value:tree.data.countryScript,line:tree.line}];}
    applicability=evaluateRequirements(countryNodes,actualProfile,{role:'applicability',dlcAvailability,source:sourceOf(tree)});
    // Country selection blocks contain weights and modifiers, not a general Boolean gate.
    if(countryNodes.length){applicability.truth='unknown';applicability.reason='Tree selection and its weights require an in-game check; selecting a tree is not proof of applicability.';sequence='unknown';}
  }
  for(const [position,item] of plan.items.entries()){
    const reference=item.reference;const resolved=resolveFocus(reference,focuses);const entry=resolved.entry;
    const issues:PlannerIssue[]=[];const addIssue=(type:string,message:string)=>issues.push({position,id:entry?.id||item.legacyId||reference,type,message});
    const step:PlannerStep={position,reference,id:entry?.id,title:entry?.title||item.legacyId||reference,resolution:resolved.status,eligibility:'unknown',reachability:'no',projectedCompletion:'no',requirements:[],issues,assumptions:[],sources:entry?[...entry.evidence||[sourceOf(entry)]]:[],days:null,cumulativeKnownDays:0,cumulativeDays:null,finishDate:null};
    if(!entry){
      addIssue(resolved.status==='ambiguous'?'ambiguous':'missing',resolved.status==='ambiguous'?`Reference matches ${resolved.candidates.length} definitions: ${resolved.candidates.map(e=>e.uid).join(', ')}. Select a definition explicitly.`:'Focus is missing from the selected tree. The original reference remains preserved.');
      sequence='no';steps.push(step);continue;
    }
    const source=sourceOf(entry);const identity=entry.uid;
    step.resolvedReference=entry.entityKey&&focuses.filter(e=>e.entityKey===entry.entityKey).length===1?entry.entityKey:`definition:${entry.uid}`;
    for(const dependency of entry.data.durationEvidence?.definesHashes||[])if(typeof dependency.source==='string'&&typeof dependency.hash==='string')step.sources.push({class:'installed-script',source:dependency.source,hash:dependency.hash,gameVersion:entry.version,rule:'FOCUS_POINT_DAYS nominal-duration dependency'});
    if(seen.has(identity)){
      step.eligibility='no';step.reachability='no';step.days=0;sequence='no';
      addIssue('duplicate','Repeated submitted queue position; inspect and remove the duplicate. Nominal effort is not charged twice.');steps.push(step);continue;
    }
    seen.add(identity);
    if(actual.has(identity)||actual.has(entry.id)){
      step.eligibility='yes';step.reachability=sequence;step.projectedCompletion='yes';step.days=0;
      step.requirements.push(requirement('yes','actual_completed','prerequisite','Explicit manual actual completion; remaining nominal effort is zero. The saved plan order is preserved.',source));
      addIssue('completed','Already manually completed. Preserved here as plan context; no remaining nominal duration is charged.');steps.push(step);continue;
    }
    const requirements:RequirementResult[]=[];const eligibility:Truth[]=[];
    const prerequisiteRows=Array.isArray(entry.data.prerequisites)?entry.data.prerequisites as string[][]:[];
    for(const [rowIndex,group] of prerequisiteRows.entries()){
      const children=(Array.isArray(group)?group:[]).map((id:string)=>{
        const target=resolveFocus(id,focuses);const positive=actual.has(id)||!!target.entry&&actual.has(target.entry.uid);
        const prior=positive?'yes':projected.get(id)||target.entry&&projected.get(target.entry.uid);
        const truth:Truth=positive?'yes':prior==='yes'?'yes':prior==='unknown'?'unknown':'no';
        const reason=positive?'Satisfied by an explicit manual actual-completion assertion.':prior==='yes'?'Satisfied by an earlier projected completion.':prior==='unknown'?'Earlier prerequisite completion is conditional on manual checks.':prior==='no'?'Earlier blocked or unreachable focus supplies no prerequisite credit.':target.status==='ambiguous'?'Prerequisite definition is ambiguous; no automatic selection.':'Absent from actual positives and earlier reachable queue positions; unmet in this plan, not a proved in-game negative. A circular or later dependency cannot satisfy this step.';
        const leaf=requirement(target.status==='ambiguous'&&!positive?'unknown':truth,'focus','prerequisite',reason,source,[],prior==='yes'?[`Assume earlier queued ${id} completes.`]:prior==='unknown'?[`Earlier queued ${id} requires a manual check.`]:[]);leaf.value=id;return leaf;
      });
      const row=requirement(orTruth(children.map(c=>c.truth)),`prerequisite_row_${rowIndex+1}`,'prerequisite','One member of this prerequisite row must be supported; separate rows are all required.',source,children);
      requirements.push(row);eligibility.push(row.truth);
      if(row.truth!=='yes')addIssue(row.truth==='no'?'prerequisite':'manual',`Prerequisite row ${rowIndex+1}: ${group.join(' / ')}. ${row.truth==='no'?'Unmet in this sequence.':'Conditional or ambiguous; check the source and game.'}`);
    }
    const exclusionChecks:RequirementResult[]=[];
    const exclusiveIds=new Set<string>(Array.isArray(entry.data.exclusive)?entry.data.exclusive:[]);
    for(const other of focuses)if(Array.isArray(other.data.exclusive)&&other.data.exclusive.includes(entry.id))exclusiveIds.add(other.id);
    for(const id of exclusiveIds){
      const target=resolveFocus(id,focuses);
      // For a reverse declaration, only the candidate that actually declares the
      // edge is relevant. A different variant with the same ID must not inherit it.
      const outgoing=Array.isArray(entry.data.exclusive)&&entry.data.exclusive.includes(id);
      const candidates=outgoing?target.candidates:target.candidates.filter(e=>e.data.exclusive?.includes(entry.id));
      const actualConflict=actual.has(id)||candidates.some(e=>actual.has(e.uid));
      const candidateTruths=candidates.flatMap(e=>{const truth=projected.get(e.uid);return truth?[truth]:[];});
      const ambiguousActualConflict=candidates.some(e=>ambiguousActualCandidates.has(e.uid));
      const prior:Truth|undefined=actualConflict?'yes':candidateTruths.includes('yes')?'yes':ambiguousActualConflict?'unknown':candidateTruths.length?orTruth(candidateTruths):projected.get(id);
      const truth=prior?notTruth(prior):'yes';
      const declaringCandidate=candidates.find(e=>e.data.exclusive?.includes(entry.id)&&(actual.has(e.uid)||projected.get(e.uid)==='yes'))||candidates.find(e=>e.data.exclusive?.includes(entry.id));
      const evidence=outgoing?source:declaringCandidate?sourceOf(declaringCandidate):source;
      const check=requirement(truth,'mutually_exclusive','exclusion',prior==='yes'?`Conflicts with ${id} (${actualConflict?'actual manual completion':'earlier projected completion'}).`:prior==='unknown'?`Conflict with conditional or ambiguous completion ${id} needs review.`:`No known actual or earlier projected conflict with ${id}; absence is a planning assumption.`,evidence,[],actualConflict?[]:prior==='yes'?[`Earlier queued ${id} is assumed complete.`]:prior==='unknown'?[`Completion of ${id} remains conditional or ambiguous.`]:[`No unrecorded actual completion of exclusive ${id} is assumed.`]);check.value=id;exclusionChecks.push(check);
      if(prior==='yes'||prior==='unknown'){
        if(!step.sources.some(s=>s.source===evidence.source&&s.hash===evidence.hash))step.sources.push(evidence);
        addIssue(prior==='yes'?'exclusive':'manual',check.reason);
      }
    }
    if(exclusionChecks.length){requirements.push(requirement(andTruth(exclusionChecks.map(c=>c.truth)),'exclusions','exclusion','Exclusions are checked in both declaration directions.',source,exclusionChecks));eligibility.push(andTruth(exclusionChecks.map(c=>c.truth)));}
    for(const [key,role] of [['available','availability'],['allow_branch','branch']] as const){
      const nodes=gateNodes(entry,key);if(!nodes.length&&!gatePresent(entry,key))continue;
      const result=evaluateRequirements(nodes,actualProfile,{role,projected,dlcAvailability,source:gateSource(entry,key,source)});
      if(!nodes.length){result.key=key;result.reason='Explicit empty gate: no additional conditions are declared. This is extracted syntax, not live game verification.';}
      requirements.push(result);eligibility.push(result.truth);
      if(result.truth!=='yes')addIssue(result.truth==='no'?'blocked':'manual',`${role==='branch'?'Branch visibility':'Availability'} ${result.truth==='no'?'does not match the supported context.':'requires an in-game check.'}`);
    }
    for(const [key,role] of [['bypass','bypass'],['cancel','cancel']] as const){
      const nodes=gateNodes(entry,key);if(!nodes.length&&!gatePresent(entry,key))continue;
      const result=evaluateRequirements(nodes,actualProfile,{role,projected,dlcAvailability,source:gateSource(entry,key,source)});
      if(!nodes.length){result.key=key;result.reason='Explicit empty block retained from the source.';}
      result.reason=`${key==='bypass'?'Bypass':'Cancellation'} is inspected separately and is not simulated. ${result.reason}`;requirements.push(result);
    }
    for(const node of (entry.data.nodes||[]) as Node[])if(['cancel_if_invalid','continue_if_invalid'].includes(node.key))requirements.push(requirement('unknown',node.key,'cancel',`${node.key} is a runtime policy, not a known cancellation event; no progress is simulated.`,{...source,line:node.line}));
    const rewardNodes=gateNodes(entry,'completion_reward');
    if(rewardNodes.length||entry.data.effects){
      const outcome=evaluateRequirements(rewardNodes.length?rewardNodes:[{key:'completion_reward',value:String(entry.data.effects),line:entry.line}],actualProfile,{role:'outcome',source});outcome.truth='unknown';outcome.reason='Completion rewards and scripted effects are not executed. Later flags, ideas, territory, technology and diplomacy remain unknown.';requirements.push(outcome);
    }
    step.requirements=requirements;step.eligibility=andTruth(eligibility);
    step.reachability=andTruth([sequence,step.eligibility]);step.projectedCompletion=step.reachability;
    if(sequence!=='yes')addIssue(sequence==='no'?'sequence':'manual',sequence==='no'?'An earlier blocked or unresolved step prevents this full queue from being executable, even if this focus has independent eligibility.':'Earlier manual checks or tree applicability keep this sequence conditional.');
    step.assumptions=unique([...plan.assumptions,...requirements.flatMap(r=>r.assumptions),...(step.reachability==='yes'?[`Assume ${entry.id} completes before the next queued focus.`]:step.reachability==='unknown'?[`Completion of ${entry.id} remains conditional.`]:[])]);
    try{step.days=nominalDuration(entry.data.days);}catch{step.days=null;addIssue('duration','Installed duration is malformed or out of supported range; nominal total and downstream dates are unknown.');}
    addProjection(projected,entry,step.projectedCompletion,focuses);sequence=step.reachability;steps.push(step);
  }
  const timing=applyTiming(steps,plan.startDate);
  const assumptions=unique([`Nominal sequential effort from ${plan.startDate}; no stored progress, bypasses, interruptions or campaign delays are simulated.`, 'Manual completion is positive-only; unrecorded game state remains unknown. Only hypothetical focus completion is projected, never rewards.',...plan.assumptions,...steps.flatMap(s=>s.assumptions)]);
  return {steps,issues:steps.flatMap(s=>s.issues),knownDays:timing.knownDays,totalDays:timing.totalDays,finishDate:timing.finishDate,unresolvedDays:timing.totalDays===null,assumptions,indexRevision:options.indexRevision||'legacy',treeReference:plan.tree,applicability,verification:'extracted',days:timing.knownDays,assumption:assumptions.slice(0,2).join(' ')};
}
