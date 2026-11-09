import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Store} from '../store';
import type {Entry,Meta,Profile,CampaignPlan} from '../../src/types';
import type {AiConfiguration,AiContext,AiSource,AiStrategy,StrategyContent,AiSettings,AiAttempt,AiGeneration} from '../../src/ai-planning-types';
import type {PlanningSources} from '../../src/strategy-types';
import {aiCampaignContext} from '../../src/ai-planning-types';
import {treeFocuses} from '../domain';
import {entryMechanics,explanationPreview} from '../../src/mechanics';
import {evaluatePlanner} from './evaluate';
import {reviewPlanCoverage,reviewProposal} from './coverage';
import {PlanConflict} from './service';
import {strategyContentSchema,OpenAiPlanningProvider,ProviderFailure,providerWire,type PlanningProvider} from './ai-provider';

import {normalizeStrategy,StrategyReferenceError} from './ai-resolution';
import {costPreview,usageCost,PRICE_VERSION} from './ai-cost';
import {selectContext} from './ai-context';
const settingsSchema=z.object({model:z.string().regex(/^[a-zA-Z0-9._:-]{1,100}$/),maxOutputTokens:z.number().int().min(1000).max(10000),reasoningEffort:z.enum(['low','medium','high','xhigh','max']),sessionBudgetUsd:z.number().positive().max(100),requestCeilingUsd:z.number().positive().max(10),confirmationThresholdUsd:z.number().nonnegative().max(10)}).strict();
const requestSchema=z.object({intent:z.literal('provisional').optional(),objective:z.string().min(3).max(3000),indexRevision:z.string().min(1).max(200),manualContext:z.string().max(4000).default(''),instruction:z.string().max(2000).default(''),parentId:z.string().max(100).optional(),additionalReferences:z.array(z.string().max(800)).max(20).default([])});
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reference=(e:Entry)=>'definition:'+e.uid;

/** AI drafts/evaluations are separate from applied campaign history and existing planner state. */
export class AiPlanningService {
 private config:AiSettings & {key:string}={model:'gpt-6.1-sol',key:'',maxOutputTokens:3000,reasoningEffort:'low',sessionBudgetUsd:.5,requestCeilingUsd:.15,confirmationThresholdUsd:.05};
 private sessionId:string;
 private active?:AbortController;
 private disposed=false;
 constructor(private store:Store,private sources:()=>PlanningSources,private provider:PlanningProvider=new OpenAiPlanningProvider()){
  this.sessionId=store.getSetting<string>('ai-budget-session','')||randomUUID();store.setSetting('ai-budget-session',this.sessionId);
  const saved=settingsSchema.safeParse(store.getSetting('ai-settings',null));if(saved.success)this.config={...saved.data,key:''};
  store.db.exec('CREATE TABLE IF NOT EXISTS ai_strategies(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS ai_evaluations(id TEXT PRIMARY KEY,payload TEXT NOT NULL);');
 }
 private settings():AiSettings{const {key,...settings}=this.config;return settings;}
 private attempts():AiAttempt[]{return this.store.db.prepare('SELECT payload FROM ai_evaluations').all().map(r=>JSON.parse(String(r.payload))).filter(r=>r.schemaVersion===2);}
 budget(){const rows=this.attempts().filter(r=>r.sessionId===this.sessionId);const estimatedUsd=rows.reduce((s,r)=>s+(r.cost?.usd??0),0),unknown=rows.filter(r=>r.cost?.usd==null),heldUsd=unknown.reduce((s,r)=>s+r.reservedUsd,0);return {sessionId:this.sessionId,estimatedUsd,heldUsd,committedUsd:estimatedUsd+heldUsd,remainingUsd:Math.max(0,this.config.sessionBudgetUsd-estimatedUsd-heldUsd),unknownRequests:unknown.length};}
 status():AiConfiguration{return {...this.settings(),provider:'openai',configured:!!this.config.key,busy:!!this.active,budget:this.budget()};}
 updateSettings(input:unknown){if(this.active)throw Error('Wait for the active request.');const settings=settingsSchema.parse(input);this.config={...settings,key:this.config.key};this.store.setSetting('ai-settings',settings);return this.status();}
 configure(input:unknown){
  if(this.active)throw Error('Wait for or cancel the active request before changing configuration.');
  const c=z.object({provider:z.literal('openai'),model:z.string().regex(/^[a-zA-Z0-9._:-]{1,100}$/),key:z.string().min(1).max(500).regex(/^\S+$/),maxOutputTokens:z.number().int().min(1000).max(10000)}).strict().parse(input);
  this.updateSettings({...this.settings(),model:c.model,maxOutputTokens:c.maxOutputTokens});this.config.key=c.key;return this.status();
 }
 private entries():Entry[]{return this.store.db.prepare('SELECT payload FROM entries').all().map(r=>JSON.parse(String(r.payload)));}
 clear(){this.active?.abort();this.config.key='';return this.status();}
 cancel(){this.active?.abort();return {cancelled:true,warning:'Stops waiting locally; cannot undo provider work or charges.'};}
 close(){this.disposed=true;this.clear();}
 private check(profile:Profile,revision:string){
  if(this.store.getSetting<Meta|null>('meta',null)?.indexRevision!==revision)throw new PlanConflict('reference-conflict','Source index changed. Refresh and review this strategy again.');
  const saved=this.store.profile(profile.id);if(!saved||saved.revision!==profile.revision)throw new PlanConflict('profile-conflict','Save or reload the campaign before using AI planning.');
 }
 private tree(profile:Profile){
  const tree=this.store.entry(profile.tree);if(!tree||tree.kind!=='focus_tree')throw Error('Select a resolved focus tree first.');
  const all=this.store.db.prepare("SELECT payload FROM entries WHERE kind IN ('focus','shared_focus','joint_focus')").all().map(r=>JSON.parse(String(r.payload)) as Entry);
  return {tree,focuses:treeFocuses(tree,all)};
 }
 context(profile:Profile,input:unknown):AiContext{
  const r=requestSchema.parse(input);this.check(profile,r.indexRevision);const {tree,focuses}=this.tree(profile);
  const sources=this.sources();
  let previousProposal:StrategyContent|undefined;
  if(r.parentId){const parent=this.get(r.parentId,profile.id);if(!parent)throw Error('Previous strategy is missing.');if(parent.sources.indexRevision!==r.indexRevision)throw Error('Previous strategy uses stale sources. Save a current reviewed revision first.');previousProposal=parent.content;}
  const selection=selectContext(this.entries(),tree,focuses,profile,r.objective,[...r.additionalReferences,...(previousProposal?[...previousProposal.focusIds,...previousProposal.recommendations.flatMap(r=>r.references)]:[])]);
  const chosen=selection.chosen;
  const refs:AiSource[]=chosen.map(e=>{const m=entryMechanics(e);return {reference:reference(e),id:e.id,kind:e.kind,title:e.title,source:e.source,line:e.line,hash:e.hash,version:e.version,prerequisites:e.data.prerequisites||[],exclusions:e.data.exclusive||[],summary:explanationPreview(m.summary,e.kind==='event'?40:5).map(x=>x.text),requirements:explanationPreview(m.requirements,4).map(x=>x.text)};});
  const base={schemaVersion:1 as const,country:profile.country,startDate:profile.startDate,sources:{...sources,mods:sources.mods.map(m=>m.replaceAll('\\','/').split('/').at(-1)!)},references:refs,omitted:selection.omitted,omissions:selection.omissions,disclosure:'Objective, selected country/tree definitions and derived summaries, game/index version, detected mod names and manual DLC assertions are sent. Optional campaign text is a manual assertion. Raw saves, logs, account paths and observations are not sent. Advice and event consequences remain provisional; retrieval is bounded.',manualContext:r.manualContext,dlcAssertions:Object.fromEntries(Object.entries(profile.dlcStates||{}).map(([id,v])=>[id,{owned:v.owned.value,enabled:v.enabled.value}])),objective:r.objective,revisionInstruction:r.instruction,...(previousProposal?{previousProposal}:{})};
  // No silent context-window overflow: smaller selection requires a new explicit preview.
  if(JSON.stringify(base).length>180000)throw Error('Source bundle exceeds 180,000 characters. Choose a smaller tree/objective; no provider request was sent.');
  const ctx:AiContext={...base,fingerprint:hash(base)};const settings=this.settings(),budget=this.budget();
  const preview=costPreview(ctx,settings,Buffer.byteLength(JSON.stringify(providerWire(ctx,settings))));
  return {...ctx,settings,budget,costPreview:preview,quoteFingerprint:hash([ctx.fingerprint,settings,budget,PRICE_VERSION])};
 }
 review(profile:Profile,contentInput:unknown,input:unknown,id:string=randomUUID(),disclosed?:AiSource[]):Omit<AiStrategy,'revision'|'createdAt'|'updatedAt'|'origin'|'provider'>{
  const r=requestSchema.parse(input);this.check(profile,r.indexRevision);const {tree,focuses}=this.tree(profile),entries=this.entries();
  const {content,repairs}=normalizeStrategy(strategyContentSchema.parse(contentInput),entries,focuses,disclosed);
  const byRef=new Map(entries.map(e=>[reference(e),e]));
  const items=content.focusIds.map(ref=>({reference:ref,legacyId:byRef.get(ref)!.id}));
  const supporting=content.recommendations.flatMap(rec=>rec.references.map(ref=>byRef.get(ref)!)).filter(e=>['decision','technology'].includes(e.kind));
  const support=[...new Map(supporting.map(e=>[e.uid,e])).values()];if(support.length>50)throw Error('At most 50 supporting decision/research references can be reviewed.');
  const plan:CampaignPlan={id,name:content.name,tree:reference(tree),startDate:profile.startDate,items,assumptions:content.assumptions,referenceIndexRevision:r.indexRevision};
  const sources=this.sources(),meta=this.store.getSetting<Meta|null>('meta',null);
  const report=evaluatePlanner(profile,plan,focuses,{tree,dlcs:meta?.dlcs||[],indexRevision:r.indexRevision});
  const review=reviewProposal('provisional',reviewPlanCoverage(profile,plan,focuses,tree,report,sources,support,this.store.entry));
  return {schemaVersion:1,id,profileId:profile.id,objective:r.objective,content,plan,review,sources,repairs,instruction:r.instruction,...(r.parentId?{parentId:r.parentId}:{}),manualContext:r.manualContext,classification:'provisional',campaignContext:aiCampaignContext(profile)};
 }
 private record(id:string,value:unknown){if(this.disposed)return;this.store.db.prepare('INSERT OR REPLACE INTO ai_evaluations VALUES(?,?)').run(id,JSON.stringify(value));}
 async generate(profile:Profile,input:any):Promise<AiGeneration>{
  if(!this.config.key)throw Error('AI generation is unconfigured. Add an API key in this app session, or create a local draft.');
  if(this.active)throw Error('One provider request is already active.');
  const ctx=this.context(profile,input),budget=this.budget(),reservation=ctx.costPreview!.reservedUsd;
  if(input.disclosureAccepted!==true||input.contextFingerprint!==ctx.fingerprint||input.quoteFingerprint!==ctx.quoteFingerprint)throw Error('Preview and approve the current source bundle and spending quote before generation.');
  const requestId=z.string().uuid().parse(input.requestId);
  if(this.store.db.prepare('SELECT id FROM ai_evaluations WHERE id=?').get(requestId))throw Error('This request ID was already used. No duplicate provider call was sent.');
  const requestFingerprint=hash([profile.id,ctx.fingerprint,this.config.model,this.config.maxOutputTokens,this.config.reasoningEffort]);
  if(this.attempts().some(a=>a.requestFingerprint===requestFingerprint))throw Error('This generation was already attempted. Recover its local output; to request a different paid revision, change the objective or revision instructions.');
  if(reservation===null)throw Error('No qualified pricing table for this model; generation is blocked.');
  if(reservation>this.config.requestCeilingUsd)throw Error('Conservative reservation exceeds the request ceiling. Reduce context/output or explicitly change the ceiling.');
  if(reservation>budget.remainingUsd)throw Error('Session budget exhausted or insufficient. Unknown usage retains its reservation.');
  if(reservation>this.config.confirmationThresholdUsd&&input.overThresholdApproved!==true)throw Error('Explicit confirmation of the above-threshold reservation is required.');
  const config={...this.config},controller=new AbortController();this.active=controller;const timer=setTimeout(()=>controller.abort(),90000);
  const clean=<T>(v:T):T=>JSON.parse(JSON.stringify(v,(_k,value)=>typeof value==='string'?value.replaceAll(config.key,'[REDACTED]'):value));
  const attempt:AiAttempt={schemaVersion:2,requestId,profileId:profile.id,sessionId:this.sessionId,objective:ctx.objective,context:clean(ctx),provider:this.provider.name,model:config.model,startedAt:new Date().toISOString(),status:'pending',reservedUsd:reservation,requestFingerprint};
  try{
   this.store.db.prepare('INSERT INTO ai_evaluations VALUES(?,?)').run(requestId,JSON.stringify(attempt));
   const result=await this.provider.generate(ctx,config,controller.signal);
   attempt.metadata=clean(result.metadata||{model:config.model,serviceTier:'unknown',completionStatus:'unknown',usage:result.usage});
   attempt.cost=usageCost(attempt.metadata.model,attempt.metadata.serviceTier,attempt.metadata.usage);
   const parsed=strategyContentSchema.safeParse(result.content);if(parsed.success)attempt.content=clean(parsed.data);
   attempt.status=attempt.content?'needs-correction':'failed';this.record(requestId,attempt); // Durable BEFORE local validation.
   if(controller.signal.aborted)throw Error('Request cancelled; returned content is retained for local review only.');
   if(result.error)throw Error(result.error);
   if(!attempt.content)throw Error('Provider output does not match the strategy schema. Usage retained; no automatic retry.');
   const reviewed=this.review(profile,attempt.content,input,requestId,ctx.references),now=new Date().toISOString();
   const strategy:AiStrategy=clean({...reviewed,revision:0,createdAt:now,updatedAt:now,origin:'provider',provider:{name:this.provider.name,model:attempt.metadata.model,usage:attempt.metadata.usage}});
   attempt.strategy=strategy;attempt.status='reviewed';this.record(requestId,attempt);return {attempt,strategy};
  }catch(e){
   if(e instanceof ProviderFailure&&e.metadata)attempt.metadata=clean(e.metadata);
   attempt.cost=usageCost(attempt.metadata?.model||config.model,attempt.metadata?.serviceTier,attempt.metadata?.usage);
   attempt.status=attempt.content?'needs-correction':'failed';attempt.error=clean(e instanceof Error?e.message:'Provider failure');
   if(e instanceof StrategyReferenceError)attempt.problems=clean(e.problems);
   this.record(requestId,attempt);return {attempt};
  }finally{clearTimeout(timer);this.active=undefined;}
 }
 save(profile:Profile,input:any):AiStrategy{
  const id=z.string().uuid().parse(input.id),expected=z.number().int().nonnegative().parse(input.expectedRevision),existing=this.get(id,profile.id);
  if((existing?.revision||0)!==expected)throw new PlanConflict('strategy-conflict','Strategy changed in another window. Reopen before saving.');
  if(this.store.db.prepare('SELECT id FROM ai_strategies WHERE id=? AND profile_id<>?').get(id,profile.id))throw Error('Strategy belongs to another campaign.');
  const attempt=this.attempts().find(a=>a.requestId===id);
  if(attempt&&(attempt.profileId!==profile.id||attempt.context.sources.indexRevision!==input.indexRevision))throw Error('Recovered draft belongs to another campaign or stale source revision. Preserve it and review against a matching index.');
  const reviewed=this.review(profile,input.content,input,id,attempt?.context.references),now=new Date().toISOString();
  const generated=this.store.db.prepare('SELECT payload FROM ai_evaluations WHERE id=?').get(id);
  const original:AiStrategy|undefined=existing||(generated?JSON.parse(String(generated.payload)).strategy:undefined);
  if(original&&original.profileId!==profile.id)throw Error('Generated proposal belongs to another campaign.');
  const value:AiStrategy={...reviewed,revision:expected+1,createdAt:original?.createdAt||now,updatedAt:now,origin:original?.origin||(attempt?'provider':'manual'),provider:original?.provider||(attempt?{name:attempt.provider,model:attempt.metadata?.model||attempt.model,usage:attempt.metadata?.usage}:{name:'none',model:'manual'})};
  this.store.db.exec('BEGIN IMMEDIATE');try{
   const current=this.get(id,profile.id);if((current?.revision||0)!==expected)throw Error('Strategy revision conflict.');
   this.store.db.prepare('INSERT INTO ai_strategies VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload').run(id,profile.id,value.revision,JSON.stringify(value));
   this.record(randomUUID(),{schemaVersion:1,status:'saved-revision',strategy:value});this.store.db.exec('COMMIT');
  }catch(e){this.store.db.exec('ROLLBACK');throw e;}return value;
 }
 get(id:string,profileId:string):AiStrategy|undefined{const row=this.store.db.prepare('SELECT payload FROM ai_strategies WHERE id=? AND profile_id=?').get(id,profileId);return row?JSON.parse(String(row.payload)):undefined;}
 list(profileId:string):AiStrategy[]{return this.store.db.prepare('SELECT payload FROM ai_strategies WHERE profile_id=? ORDER BY rowid DESC').all(profileId).map(row=>JSON.parse(String(row.payload)));}
 evaluations(profileId:string){return this.store.db.prepare('SELECT payload FROM ai_evaluations ORDER BY rowid').all().map(row=>JSON.parse(String(row.payload))).filter(r=>r.strategy?.profileId===profileId||r.profileId===profileId);}
}
