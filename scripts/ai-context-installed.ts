// Explicit retained-source audit. No indexing, personal-profile reads, provider requests or game launch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {startServer,validateProfile} from '../server/api';
import {openStore} from '../server/store';
import {providerWire} from '../server/planner/ai-provider';
import type {AiContext,AiConfiguration} from '../src/ai-planning-types';
import type {Entry,Meta,Profile} from '../src/types';
import {createQaRun,assertOwnedStatus} from './qa/fixture';

const objective='Give me a Germany 1936 campaign strategy with infantry and medium tanks, research and production. Prioritize fun, then winning, then efficiency. Current campaign state is unknown.';
const privateNote='UNSHARED_SYNTHETIC_NOTE_AI_CONTEXT_AUDIT';
async function streamHash(file:string){const hash=createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
const strings=(value:unknown):string[]=>typeof value==='string'?[value]:Array.isArray(value)?value.flatMap(strings):value&&typeof value==='object'?Object.values(value).flatMap(strings):[];

async function main(){
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=='--source-index'||!path.isAbsolute(args[1]))throw Error('Use --source-index <absolute retained source-index SQLite path>. This audit never discovers a personal database.');
 const sourceFile=fs.realpathSync.native(args[1]);if(!fs.statSync(sourceFile).isFile())throw Error('Source index must be an existing file.');
 const run=createQaRun('ai-context-installed','installed-source');
 let source:DatabaseSync|undefined,seed:ReturnType<typeof openStore>|undefined,service:Awaited<ReturnType<typeof startServer>>|undefined;
 let originalHash:string|undefined,afterHash:string|undefined,providerCalls=0,profile:Profile|undefined,meta:Meta|undefined,entriesCopied=0,first:AiContext|undefined;
 const timings:Record<string,number>={};
 try{
  await run.check('copy only retained source entries and metadata into an isolated synthetic campaign',['AI-CONTEXT-01-SOURCE'],async()=>{
   originalHash=await streamHash(sourceFile);source=new DatabaseSync(sourceFile,{readOnly:true});
   const row=source.prepare("SELECT value FROM settings WHERE key='meta'").get();assert.ok(row,'Source index metadata is missing.');meta=JSON.parse(String(row.value));assert.ok(meta?.version&&meta.indexRevision,'Source identity is incomplete.');
   seed=openStore(run.dataDirectory);seed.setSetting('meta',meta);seed.setSetting('gameRoot',path.join(run.root,'absent-game-installation'));
   const put=seed.db.prepare('INSERT INTO entries VALUES(?,?,?,?,?,?,?)');seed.db.exec('BEGIN');
   try{for(const row of source.prepare('SELECT uid,id,kind,title,description,source,payload FROM entries').iterate()){put.run(row.uid,row.id,row.kind,row.title,row.description,row.source,row.payload);entriesCopied++;}seed.db.exec('COMMIT');}catch(error){seed.db.exec('ROLLBACK');throw error;}
   const trees=seed.db.prepare("SELECT payload FROM entries WHERE kind='focus_tree' AND id='german_focus'").all();assert.equal(trees.length,1,'Expected one retained German tree; do not guess an override.');const tree:Entry=JSON.parse(String(trees[0].payload));
   profile=seed.saveProfile(validateProfile({id:'context-source-audit',name:'Synthetic source-only audit',country:'GER',tree:'definition:'+tree.uid,startDate:'1936-01-01',completed:[],dlcs:[],dlcConfirmed:false,notes:{private:privateNote}})).saved!;assert.ok(profile);
   seed.db.close();seed=undefined;
   service=await startServer({dataDir:run.dataDirectory,port:0,autoIndex:false,bridge:{gameRoot:path.join(run.root,'absent-game-installation'),userRoot:path.join(run.root,'absent-game-profile')},aiProvider:{name:'forbidden-audit-provider',async generate(){providerCalls++;throw Error('Provider requests are forbidden in this retained-source audit.');}}});
   assertOwnedStatus(await fetch(service.url+'/api/v1/status').then(r=>r.json()),run.dataDirectory);
  });
  const request={profile:profile!,objective,indexRevision:meta!.indexRevision,manualContext:'',instruction:'',additionalReferences:[]};
  const preview=async()=>{const start=performance.now();const response=await fetch(service!.url+'/api/v1/ai/context',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));return {context:value as AiContext,elapsedMs:performance.now()-start};};
  await run.check('exact broad Germany objective yields a bounded source preview with explicit omissions',['AI-CONTEXT-01-BUDGET'],async()=>{
   const result=await preview();first=result.context;timings.firstPreviewMs=result.elapsedMs;
   const selection=first.contextBudget;assert.ok(selection,'Source-budget disclosure is absent.');
   assert.equal(selection.limitCharacters,180000);assert.equal(selection.limitWireBytes,180000);
   const sourcePayload={schemaVersion:first.schemaVersion,country:first.country,startDate:first.startDate,sources:first.sources,references:first.references,omitted:first.omitted,omissions:first.omissions,disclosure:first.disclosure,manualContext:first.manualContext,dlcAssertions:first.dlcAssertions,objective:first.objective,revisionInstruction:first.revisionInstruction,...(first.previousProposal?{previousProposal:first.previousProposal}:{})};
   assert.equal(JSON.stringify(sourcePayload).length,selection.sourceCharacters,'Displayed source size must equal the complete serialized source payload, excluding preview-only fingerprints/budget/settings.');
   assert.ok(selection.sourceCharacters<=selection.limitCharacters);assert.ok(selection.wireBytes<=selection.limitWireBytes);assert.ok(selection.omittedGroups.length>0,'The oversized baseline must disclose omitted groups.');
   assert.ok(first.references.some(r=>r.kind==='focus'));assert.ok(first.references.some(r=>r.kind==='technology'));assert.equal(new Set(first.references.map(r=>r.reference)).size,first.references.length);
   assert.equal(first.sources.version,meta!.version);assert.equal(first.sources.indexRevision,meta!.indexRevision);assert.equal(first.sources.mode,'base-game');assert.ok(first.sources.warnings.length>0,'Applicability qualifications must remain visible.');
   assert.ok(first.settings);const wire=providerWire(first,first.settings);assert.equal(Buffer.byteLength(JSON.stringify(wire)),selection.wireBytes,'Displayed wire size must equal actual serialized provider request.');
   const disclosed=strings(first);assert.ok(disclosed.every(text=>!text.includes(privateNote)),'Private profile notes leaked into context.');assert.ok(disclosed.every(text=>!text.includes(sourceFile)),'Source database path leaked into context.');
   if(meta!.root&&meta!.root.length>5)assert.ok(disclosed.every(text=>!text.includes(meta!.root)),'Installed account/file root leaked into context.');
  });
  await run.check('every included definition retains matching source identity and hash',['AI-CONTEXT-01-PROVENANCE'],()=>{
   const find=source!.prepare('SELECT payload FROM entries WHERE uid=?');
   for(const ref of first!.references){assert.ok(ref.reference.startsWith('definition:'));const row=find.get(ref.reference.slice('definition:'.length));assert.ok(row,'Included definition is absent from retained corpus: '+ref.reference);const entry:Entry=JSON.parse(String(row.payload));for(const key of ['id','kind','title','source','line','hash','version'] as const)assert.equal(ref[key],entry[key],key+' mismatch: '+ref.reference);}
  });
  await run.check('repeated HTTP previews retain fingerprints, source selection and exact wire without dispatch',['AI-CONTEXT-01-DETERMINISM'],async()=>{
   const result=await preview(),second=result.context;timings.secondPreviewMs=result.elapsedMs;
   assert.equal(second.fingerprint,first!.fingerprint);assert.equal(second.quoteFingerprint,first!.quoteFingerprint);assert.deepEqual(second.references,first!.references);assert.deepEqual(second.contextBudget,first!.contextBudget);assert.deepEqual(providerWire(second,second.settings!),providerWire(first!,first!.settings!));
   const config:AiConfiguration=await fetch(service!.url+'/api/v1/ai/config').then(r=>r.json());assert.equal(config.configured,false);assert.equal(config.budget.unknownRequests,0);assert.equal(config.budget.estimatedUsd,0);assert.equal(providerCalls,0);
   assert.deepEqual(await fetch(service!.url+'/api/v1/ai/evaluations?profile='+profile!.id).then(r=>r.json()),[]);assert.deepEqual(await fetch(service!.url+'/api/v1/ai/strategies?profile='+profile!.id).then(r=>r.json()),[]);
  });
 }finally{
  const shutdownErrors:unknown[]=[];
  try{
   try{await service?.close();}catch(error){shutdownErrors.push(error);}
   try{seed?.db.close();}catch(error){shutdownErrors.push(error);}
   try{source?.close();source=undefined;}catch(error){shutdownErrors.push(error);}
   if(originalHash){afterHash=await streamHash(sourceFile);assert.equal(afterHash,originalHash,'Original retained source index changed during audit.');}
   if(shutdownErrors.length)throw new AggregateError(shutdownErrors,'Audit resources did not all close cleanly.');
  }finally{
   try{
    if(first)run.write('source-preview-summary.json',{objective,source:{version:meta!.version,indexRevision:meta!.indexRevision,importerRevision:meta!.importerRevision,files:meta!.files,entriesCopied},includedDefinitions:first.references.length,includedKinds:Object.fromEntries([...new Set(first.references.map(r=>r.kind))].map(kind=>[kind,first!.references.filter(r=>r.kind===kind).length])),contextBudget:first.contextBudget,fingerprint:first.fingerprint,quoteFingerprint:first.quoteFingerprint,timings,qualification:'Retained source-only retrieval and payload-size evidence. No current-game, DLC entitlement, strategy-quality or engine qualification.'});
    run.finish({sourceIndexSha256:originalHash,sourceIndexAfterSha256:afterHash,originalSourceIndexUnchanged:!!originalHash&&originalHash===afterHash,entriesCopied,realProviderCalled:providerCalls>0,providerCalls,nativeGameLaunched:false,timings,shutdownErrors:shutdownErrors.map(String),limits:['Explicit retained source index only; source entries/meta copied without profiles, keys, saves or telemetry.','No source index rebuild or installed-game file modification.','One-run automation timings are diagnostics, not user task-completion or performance qualification.','Current-patch semantics, active DLC/tree applicability, strategy usefulness and final-release coverage remain unqualified.']});
   }finally{run.cleanup();console.log(run.output);}
  }
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
