import type {Entry} from '../../src/types';
import type {PlanCoverage} from '../../src/planning-coverage-types';
import type {Explanation,ExplanationEvidence} from '../../src/mechanics-interpreter';
import {conditionSentence} from '../../src/mechanics-interpreter';

type Fact={text:string;code?:string;status:Explanation['status'];classification:'source-mechanic';appliesWhen:string[];evidence:ExplanationEvidence[];verification:'source-only';unresolvedContext:boolean};
type Branch=Fact&{consequences:Fact[];omittedConsequences:number};
const proof=(e:Entry):ExplanationEvidence[]=>[{source:e.source,line:e.line,hash:e.hash,version:e.version}];
/** Additive presentation over the actual coverage review. Does not evaluate state, rank paths or alter policy. */
export function summarizePath(coverage:PlanCoverage,selected:Entry[],tree:Entry){
 const branches:Branch[]=[],timing:Fact[]=[],milestones: {reference:string;title:string;prerequisites:Explanation[];consequences:Fact[];omittedConsequences:number;nominalDays:number|null;evidence:ExplanationEvidence[]}[]=[];
 let remaining=12000,omittedBranches=0,omittedTiming=0;const diagnostics:string[]=[];
 const guardUnknown=(x:Explanation,depth=0):boolean=>{if(depth>32||--remaining<0){diagnostics.push('Summary guard bound reached; applicability remains unresolved.');return true;}return !!x.unknown||x.status==='state-unknown'||!!x.children?.some(c=>guardUnknown(c,depth+1));};
 for(const e of selected){
  const r=coverage.references.find(x=>x.reference==='definition:'+e.uid);if(!r)continue;
  const base=r.evidence.length?r.evidence:proof(e);
  const consequences:Fact[]=[];let omittedConsequences=0;
  const visit=(xs:Explanation[],parents:string[]=[],inherited=base,unresolvedContext=false,depth=0,eventDepth=0,branch?:Branch)=>{if(depth>32){diagnostics.push('Summary nesting bound reached; inspect the complete coverage review.');return;}
   for(const x of xs){if(--remaining<0){diagnostics.push('Summary work bound reached; inspect the complete coverage review.');return;}
    const evidence=x.evidence?.length?x.evidence:inherited.map(p=>({...p,line:x.line||p.line}));
    const guards=(x.children||[]).filter(c=>c.role==='condition'||c.status==='state-unknown');
    const uncertain=unresolvedContext||!!x.unknown||guards.some(g=>guardUnknown(g));
    const fact:Fact={text:x.text,code:x.code,status:x.status,classification:'source-mechanic',appliesWhen:parents,evidence,verification:'source-only',unresolvedContext:uncertain};
    let currentBranch=branch;
    if(x.code==='option'){if(branches.length<16){currentBranch={...fact,consequences:[],omittedConsequences:0};branches.push(currentBranch);}else {omittedBranches++;currentBranch=undefined;}}
    if(x.role==='timing'){if(timing.length<24)timing.push(fact);else omittedTiming++;}
    const dispatch=['country_event','news_event','state_event'].includes(x.code||'');
    if(!x.unknown&&x.role==='effect'&&(!x.children?.length||dispatch||['add_ideas','add_timed_idea','swap_ideas','promote_character','start_civil_war'].includes(x.code||''))){
     if(eventDepth===0){if(consequences.length<6)consequences.push(fact);else omittedConsequences++;}
     if(currentBranch){if(currentBranch.consequences.length<4)currentBranch.consequences.push(fact);else currentBranch.omittedConsequences++;}
    }
    if(x.children?.length)visit(x.children,[...parents,x.text,...guards.map(conditionSentence)],evidence,uncertain,depth+1,eventDepth+(dispatch?1:0),currentBranch);
   }
  };visit(r.summary);
  milestones.push({reference:r.reference,title:r.title,prerequisites:r.requirements,consequences,omittedConsequences,nominalDays:typeof e.data.days==='number'?e.data.days:null,evidence:base});
 }
 const unknownCampaignState=coverage.gaps.filter(g=>g.kind==='campaign-state');
 const unsupported=coverage.gaps.filter(g=>g.kind==='semantics');
 const recommendations:{classification:'rules-based-inference';text:string;evidence:ExplanationEvidence[]}[]=[{classification:'rules-based-inference',text:'Confirm that the selected focus tree, DLC configuration and mod playset match these sources before following this route.',evidence:proof(tree)}];
 const first=milestones[0];if(first)recommendations.push({classification:'rules-based-inference',text:`Start by checking ${first.title} and its listed prerequisites against your campaign. Later milestones are conditional projections.`,evidence:first.evidence});
 const war=coverage.gaps.find(g=>/civil.war|start_civil_war/.test(g.code+' '+g.message));if(war)recommendations.push({classification:'rules-based-inference',text:'Prepare for the civil-war branch before committing. Force allocation, territorial distribution and victory are unresolved; this summary cannot promise a safe transition.',evidence:war.evidence});
 if(coverage.events.length)recommendations.push({classification:'rules-based-inference',text:'Pause at event choices and reassess the resulting country state before continuing. A source event call or war goal does not establish delivery, acceptance, victory or annexation.',evidence:coverage.events[0].evidence});
 return {schemaVersion:1,summaryVersion:'path-brief-v1',verification:'source-only' as const,reviewFingerprint:coverage.reviewFingerprint,label:coverage.label,policy:{...coverage.policy},
  startingConditions:{countryState:'unknown; no live observations supplied',tree:{reference:'definition:'+tree.uid,title:tree.title,selectionScript:tree.data.countryScript||null,evidence:proof(tree),qualification:'Selection weights and source guards are not proof of active tree/DLC entitlement.'},assumptions:coverage.assumptions},
  milestones,supportingReferences:coverage.references.filter(r=>!selected.some(e=>r.reference==='definition:'+e.uid)),branches,timing,omittedBranches,omittedTiming,diagnostics:[...new Set(diagnostics)],
  dependencies:coverage.events,unsupported:{total:unsupported.length,checks:unsupported.slice(0,12)},unknownCampaignState:{total:unknownCampaignState.length,checks:unknownCampaignState.slice(0,12)},
  recommendations,documentedExternalStrategy:[],
  limits:['This is a bounded player brief over the submitted sequence and explicit supporting references; full detail and remaining gaps are in coverage.','Consequences are conditional source statements; source-only verification does not establish native engine behavior or a current campaign outcome.','No external strategy was imported; recommendations are rules-based inference, with no paid model call.','Nominal focus days exclude waiting for events, wars, bypasses, stored progress and other delays. No completion date or optimality is asserted.']};
}

/** Plain text export for offline review/future workspace consumers; the structured object remains authoritative. */
export function renderPathBrief(s:ReturnType<typeof summarizePath>):string{
 const lines=[`# ${s.milestones.at(-1)?.title||'Path brief'}`,`Source-only • ${s.label} • campaign state unknown`,
  '', 'Start: '+s.startingConditions.tree.qualification];
 const source=(f:Fact)=>f.evidence.map(p=>`${p.source}:${p.line}`).join(', ');
 for(const [i,m] of s.milestones.entries()){
  lines.push('',`${i+1}. ${m.title}${m.nominalDays!==null?` (${m.nominalDays} nominal days)`:''}`,
   ...m.prerequisites.map(x=>'   Check: '+conditionSentence(x)),
   ...m.consequences.slice(0,3).map(x=>'   Source action: '+[...x.appliesWhen,x.text].join(' ')),
   `   Source: ${m.evidence.map(p=>`${p.source}:${p.line}`).join(', ')}. ${m.omittedConsequences+Math.max(0,m.consequences.length-3)} further immediate statements in structured detail.`);
 }
 const consequential=s.branches.filter(b=>b.consequences.some(c=>['annex_country','create_wargoal','promote_character','set_politics','start_civil_war'].includes(c.code||'')));
 const shown=(consequential.length?consequential:s.branches).slice(0,4);
 lines.push('', 'Selected event choices (conditional, not predicted):');
 for(const b of shown)lines.push('- '+b.text+' ['+source(b)+']',...b.consequences.slice(0,2).map(x=>'  '+[...x.appliesWhen,x.text].join(' ')));
 lines.push('', 'Next steps:',...s.recommendations.map(r=>'- [Rules-based inference] '+r.text),'',`${shown.length} event options shown here; ${s.branches.length-shown.length} more in the structured summary; ${s.omittedBranches} further options require the full coverage review. Full branches, timing, prerequisites and evidence remain in the structured summary and coverage.`,
  `Open checks: ${s.unsupported.total} semantic; ${s.unknownCampaignState.total} campaign-state. Counts are diagnostics, not a quality score.`,...s.limits.map(x=>'- '+x));return lines.join('\n')+'\n';
}
