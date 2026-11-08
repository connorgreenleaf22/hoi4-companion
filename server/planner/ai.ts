import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Store} from '../store';
import type {Entry,Meta,Profile,CampaignPlan,Node} from '../../src/types';
import type {AiConfiguration,AiContext,AiSource,AiStrategy,StrategyContent} from '../../src/ai-planning-types';
import type {PlanningSources} from '../../src/strategy-types';
import {aiCampaignContext} from '../../src/ai-planning-types';
import {treeFocuses} from '../domain';
import {entryMechanics,explanationPreview} from '../../src/mechanics';
import {evaluatePlanner} from './evaluate';
import {reviewPlanCoverage,reviewProposal} from './coverage';
import {PlanConflict} from './service';
import {strategyContentSchema,OpenAiPlanningProvider,type PlanningProvider} from './ai-provider';

const requestSchema=z.object({intent:z.literal('provisional').optional(),objective:z.string().min(3).max(3000),indexRevision:z.string().min(1).max(200),manualContext:z.string().max(4000).default(''),instruction:z.string().max(2000).default(''),parentId:z.string().max(100).optional()});
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reference=(e:Entry)=>'definition:'+e.uid;
const eventIds=(nodes:Node[]):string[]=>nodes.flatMap(n=>['country_event','news_event','state_event'].includes(n.key)?[typeof n.value==='string'?n.value:String(n.value.find(x=>x.key==='id')?.value||'')]:Array.isArray(n.value)?eventIds(n.value):[]).filter(Boolean);

/** AI drafts/evaluations are separate from applied campaign history and existing planner state. */
export class AiPlanningService {
 private config={model:'gpt-6.1-sol',key:'',maxOutputTokens:6000};
 private active?:AbortController;
 private disposed=false;
 constructor(private store:Store,private sources:()=>PlanningSources,private provider:PlanningProvider=new OpenAiPlanningProvider()){
  store.db.exec('CREATE TABLE IF NOT EXISTS ai_strategies(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS ai_evaluations(id TEXT PRIMARY KEY,payload TEXT NOT NULL);');
 }
 status():AiConfiguration{return {provider:'openai',model:this.config.model,configured:!!this.config.key,maxOutputTokens:this.config.maxOutputTokens,busy:!!this.active};}
 configure(input:unknown){
  if(this.active)throw Error('Wait for or cancel the active request before changing configuration.');
  const c=z.object({provider:z.literal('openai'),model:z.string().regex(/^[a-zA-Z0-9._:-]{1,100}$/),key:z.string().min(1).max(500).regex(/^\S+$/),maxOutputTokens:z.number().int().min(1000).max(10000)}).strict().parse(input);
  this.config={model:c.model,key:c.key,maxOutputTokens:c.maxOutputTokens};return this.status();
 }
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
  // Bounded country references, then objective-relevant research. No raw save, notes or account paths.
  const related=this.store.db.prepare("SELECT payload FROM entries WHERE kind IN ('decision','technology') ORDER BY id,uid").all().map(row=>JSON.parse(String(row.payload)) as Entry);
  const terms=r.objective.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>3);
  const relevance=(e:Entry)=>terms.filter(t=>(e.title+' '+e.id).toLowerCase().includes(t.slice(0,5))).length;
  const decisions=related.filter(e=>e.kind==='decision'&&(e.id.startsWith(profile.country+'_')||(e.data.countries||[]).includes(profile.country))).sort((a,b)=>relevance(b)-relevance(a)||a.id.localeCompare(b.id)).slice(0,30);
  const rankedTech=related.filter(e=>e.kind==='technology').sort((a,b)=>relevance(b)-relevance(a)||a.id.localeCompare(b.id));
  const year=Number(profile.startDate.slice(0,4));
  const basics=rankedTech.filter(e=>Number(e.data.nodes?.find((n:Node)=>n.key==='start_year')?.value)<=year);
  const folder=(e:Entry)=>JSON.stringify(e.data.nodes?.filter((n:Node)=>n.key==='folder')||[]);
  // Diverse reference retrieval, not a ranked research recommendation. Avoid alphabetically filling the bundle with one domain.
  const technologies=[...new Map([...rankedTech.filter(e=>relevance(e)>0).slice(0,8),...basics.filter(e=>folder(e).includes('industry_folder')).slice(0,8),...basics.filter(e=>folder(e).includes('electronics_folder')).slice(0,5),...basics.filter(e=>folder(e).includes('infantry_folder')).slice(0,5),...basics.slice(0,12)].map(e=>[e.uid,e])).values()].slice(0,30);
  const chosen=[tree,...[...focuses].sort((a,b)=>relevance(b)-relevance(a)||a.id.localeCompare(b.id)).slice(0,200),...decisions,...technologies];
  // Bounded event closure: exposed choices still carry the existing downstream-consequence gate.
  const seen=new Set(chosen.map(e=>e.uid));let scanned=0;
  for(let i=0;i<chosen.length&&scanned<24;i++)for(const id of eventIds(chosen[i].data.nodes||[])){
   const e=this.store.resolve(id,'event').entry;if(e&&!seen.has(e.uid)){seen.add(e.uid);chosen.push(e);if(++scanned>=24)break;}
  }
  const refs:AiSource[]=chosen.map(e=>{const m=entryMechanics(e);return {reference:reference(e),id:e.id,kind:e.kind,title:e.title,source:e.source,line:e.line,hash:e.hash,version:e.version,prerequisites:e.data.prerequisites||[],exclusions:e.data.exclusive||[],summary:explanationPreview(m.summary,e.kind==='event'?40:5).map(x=>x.text),requirements:explanationPreview(m.requirements,4).map(x=>x.text)};});
  let previousProposal:StrategyContent|undefined;
  if(r.parentId){const parent=this.get(r.parentId,profile.id);if(!parent)throw Error('Previous strategy is missing.');if(parent.sources.indexRevision!==r.indexRevision)throw Error('Previous strategy uses stale sources. Save a current reviewed revision first.');previousProposal=parent.content;}
  const base={schemaVersion:1 as const,country:profile.country,startDate:profile.startDate,sources:{...sources,mods:sources.mods.map(m=>m.replaceAll('\\','/').split('/').at(-1)!)},references:refs,omitted:Math.max(0,focuses.length-200)+Math.max(0,related.length-decisions.length-technologies.length),disclosure:'Objective, selected country/tree definitions and derived summaries, game/index version, detected mod names and manual DLC assertions are sent. Optional campaign text is a manual assertion. Raw saves, logs, account paths and observations are not sent. Advice and event consequences remain provisional; retrieval is bounded.',manualContext:r.manualContext,dlcAssertions:Object.fromEntries(Object.entries(profile.dlcStates||{}).map(([id,v])=>[id,{owned:v.owned.value,enabled:v.enabled.value}])),objective:r.objective,revisionInstruction:r.instruction,...(previousProposal?{previousProposal}:{})};
  // No silent context-window overflow: smaller selection requires a new explicit preview.
  if(JSON.stringify(base).length>180000)throw Error('Source bundle exceeds 180,000 characters. Choose a smaller tree/objective; no provider request was sent.');
  return {...base,fingerprint:hash(base)};
 }
 review(profile:Profile,contentInput:unknown,input:unknown,id:string=randomUUID()):Omit<AiStrategy,'revision'|'createdAt'|'updatedAt'|'origin'|'provider'>{
  const r=requestSchema.parse(input);this.check(profile,r.indexRevision);const content=strategyContentSchema.parse(contentInput),{tree,focuses}=this.tree(profile),repairs:string[]=[];
  const resolve=(ref:string,kinds:string[])=>{const e=this.store.entry(ref);if(!e||!kinds.includes(e.kind))throw Error('Missing, ambiguous or wrong-kind strategy identifier: '+ref);if(ref!==reference(e))repairs.push(ref+' → '+reference(e));return e;};
  const items=content.focusIds.map(id=>{const e=resolve(id,['focus','shared_focus','joint_focus']);if(!focuses.some(f=>f.uid===e.uid))throw Error('Focus is outside the selected tree: '+id);return {reference:reference(e),legacyId:e.id};});
  content.focusIds=items.map(i=>i.reference);
  const supporting:Entry[]=[];
  for(const rec of content.recommendations){rec.references=rec.references.map(id=>{const kinds=rec.category==='decision'?['decision']:rec.category==='research'?['technology']:['focus','shared_focus','joint_focus','decision','technology','event','idea'];const e=resolve(id,kinds);if(['decision','technology'].includes(e.kind))supporting.push(e);return reference(e);});}
  const support=[...new Map(supporting.map(e=>[e.uid,e])).values()];if(support.length>50)throw Error('At most 50 supporting decision/research references can be reviewed.');
  const plan:CampaignPlan={id,name:content.name,tree:reference(tree),startDate:profile.startDate,items,assumptions:content.assumptions,referenceIndexRevision:r.indexRevision};
  const sources=this.sources(),meta=this.store.getSetting<Meta|null>('meta',null);
  const report=evaluatePlanner(profile,plan,focuses,{tree,dlcs:meta?.dlcs||[],indexRevision:r.indexRevision});
  const review=reviewProposal('provisional',reviewPlanCoverage(profile,plan,focuses,tree,report,sources,support,this.store.entry));
  return {schemaVersion:1,id,profileId:profile.id,objective:r.objective,content,plan,review,sources,repairs,instruction:r.instruction,...(r.parentId?{parentId:r.parentId}:{}),manualContext:r.manualContext,classification:'provisional',campaignContext:aiCampaignContext(profile)};
 }
 private record(id:string,value:unknown){if(this.disposed)return;this.store.db.prepare('INSERT OR REPLACE INTO ai_evaluations VALUES(?,?)').run(id,JSON.stringify(value));}
 async generate(profile:Profile,input:any):Promise<AiStrategy>{
  if(!this.config.key)throw Error('AI generation is unconfigured. Add an API key in this app session, or create a local draft.');
  if(this.active)throw Error('One provider request is already active.');
  const ctx=this.context(profile,input);
  if(input.disclosureAccepted!==true||input.contextFingerprint!==ctx.fingerprint)throw Error('Preview and approve the current outgoing source bundle before generation.');
  const requestId=z.string().uuid().parse(input.requestId);
  if(this.store.db.prepare('SELECT id FROM ai_evaluations WHERE id=?').get(requestId))throw Error('This request ID was already used. No duplicate provider call was sent.');
  const controller=new AbortController();this.active=controller;const timer=setTimeout(()=>controller.abort(),90000),config={...this.config};
  const evidence={schemaVersion:1,requestId,profileId:profile.id,objective:ctx.objective,context:ctx,provider:this.provider.name,model:config.model,startedAt:new Date().toISOString()};
  let recorded=false;
  try{
   this.store.db.prepare('INSERT INTO ai_evaluations VALUES(?,?)').run(requestId,JSON.stringify({...evidence,status:'pending'}));recorded=true;
   const result=await this.provider.generate(ctx,config,controller.signal);
   if(controller.signal.aborted)throw Error('Request cancelled; returned content was not adopted.');
   const content=strategyContentSchema.parse(result.content);
   const allowed=new Set(ctx.references.flatMap(e=>[e.reference,e.id]));
   if([...content.focusIds,...content.recommendations.flatMap(r=>r.references)].some(ref=>!allowed.has(ref)))throw Error('Provider cited a reference outside the disclosed source bundle: '+[...content.focusIds,...content.recommendations.flatMap(r=>r.references)].filter(ref=>!allowed.has(ref)).join(', '));
   const reviewed=this.review(profile,content,input,requestId),now=new Date().toISOString();
   const strategy:AiStrategy={...reviewed,revision:0,createdAt:now,updatedAt:now,origin:'provider',provider:{name:this.provider.name,model:config.model,...(result.usage?{usage:result.usage}:{})}};
   this.record(requestId,{...evidence,status:'reviewed',strategy});return strategy;
  }catch(e){if(recorded)this.record(requestId,{...evidence,status:'rejected',error:e instanceof Error?e.message:'Provider failure'});throw e;}
  finally{clearTimeout(timer);this.active=undefined;}
 }
 save(profile:Profile,input:any):AiStrategy{
  const id=z.string().uuid().parse(input.id),expected=z.number().int().nonnegative().parse(input.expectedRevision),existing=this.get(id,profile.id);
  if((existing?.revision||0)!==expected)throw new PlanConflict('strategy-conflict','Strategy changed in another window. Reopen before saving.');
  if(this.store.db.prepare('SELECT id FROM ai_strategies WHERE id=? AND profile_id<>?').get(id,profile.id))throw Error('Strategy belongs to another campaign.');
  const reviewed=this.review(profile,input.content,input,id),now=new Date().toISOString();
  const generated=this.store.db.prepare('SELECT payload FROM ai_evaluations WHERE id=?').get(id);
  const original:AiStrategy|undefined=existing||(generated?JSON.parse(String(generated.payload)).strategy:undefined);
  if(original&&original.profileId!==profile.id)throw Error('Generated proposal belongs to another campaign.');
  const value:AiStrategy={...reviewed,revision:expected+1,createdAt:original?.createdAt||now,updatedAt:now,origin:original?.origin||'manual',provider:original?.provider||{name:'none',model:'manual'}};
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
