import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseScript} from './parser';
import type {Node} from '../src/types';

// This is an obligation census, not an interpreter or the M7.1 plan-risk gate.
export const coverageRoots=['common','events','history','map','interface','localisation','tutorial','dlc','integrated_dlc','dlc_metadata'];
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
export interface CoverageObligation {
 id:string;file:string;sourceHash:string;line:number;address:string;construct:string;
 kind:'source'|'script'|'text'|'opaque'|'parse-error';
}
export interface CoverageReview {
 id:string;disposition:'explained'|'non-mechanic';evidence:string[];tests:string[];reviewer:string;
 // These must describe scopes, branches, dependencies and localization; a diagnostic is insufficient.
 semantics:string;conditions:string;dependencies:string;
}
export interface CoverageLedger {
 schemaVersion:1;profileDigest:string;engineRevision:string;scopeApproval:string;
 validation:{engineRevision:string;passedTests:string[];report:string};reviews:CoverageReview[];
}
export function* sourceObligations(file:string,sourceHash:string,text:string|null):Generator<CoverageObligation>{
 const make=(kind:CoverageObligation['kind'],address:string,line:number,construct:string):CoverageObligation=>({
  id:hash(JSON.stringify([file,sourceHash,kind,address])),file,sourceHash,line,address,construct,kind,
 });
 yield make('source','file',1,'source/dependency review');
 if(text===null){yield make('opaque','opaque',1,'uninterpreted content');return;}
 if(!file.endsWith('.txt')){
  for(const [index,line] of text.split(/\r?\n/).entries())if(line.trim()&&!line.trim().startsWith('#'))yield make('text',String(index),index+1,'non-script declaration');
  return;
 }
 let nodes:Node[];try{nodes=parseScript(text);}catch{yield make('parse-error','parse-error',1,'strict parser rejected source');return;}
 function* walk(values:Node[],prefix=''):Generator<CoverageObligation>{
  for(const [index,node] of values.entries()){
   const address=prefix+'/'+index;yield make('script',address,node.line,node.key||'<list item>');
   if(Array.isArray(node.value))yield* walk(node.value,address);
  }
 }
 yield* walk(nodes);
}

/** All files under the declared roots are accounted for, including opaque DLC archives. */
export function listCoverageFiles(root:string):string[]{
 const result:string[]=[];
 const walk=(relative:string)=>{
  const absolute=path.join(root,relative),stat=fs.lstatSync(absolute);
  if(stat.isSymbolicLink())throw Error('Coverage scope contains a link: '+relative);
  if(stat.isDirectory())for(const child of fs.readdirSync(absolute).sort())walk(path.join(relative,child));
  else if(stat.isFile())result.push(relative.replaceAll('\\','/'));
 };
 for(const directory of coverageRoots)if(fs.existsSync(path.join(root,directory)))walk(directory);
 if(!result.length)throw Error('No content found in declared coverage roots');
 return result.sort();
}
export function fileDigest(file:string):string{
 const fd=fs.openSync(file,'r'),digest=createHash('sha256'),buffer=Buffer.alloc(1024*1024);
 try{let size:number;while((size=fs.readSync(fd,buffer,0,buffer.length,null))>0)digest.update(buffer.subarray(0,size));return digest.digest('hex');}finally{fs.closeSync(fd);}
}
export function assessCoverage(obligations:Iterable<CoverageObligation>,profileDigest:string,engineRevision:string,ledger:CoverageLedger){
 const problems:string[]=[],reviews=new Map<string,CoverageReview>(),counts={total:0,explained:0,nonMechanic:0,unresolved:0};
 if(ledger.schemaVersion!==1||ledger.profileDigest!==profileDigest)problems.push('Missing or changed exact content profile');
 if(!engineRevision||ledger.engineRevision!==engineRevision||ledger.validation?.engineRevision!==engineRevision)problems.push('Explanation implementation or test attestation changed');
 if(!ledger.scopeApproval?.trim())problems.push('Supported-content denominator/configurations not independently approved');
 if(!ledger.validation?.report?.trim())problems.push('Missing source-backed regression report');
 for(const review of ledger.reviews||[]){if(reviews.has(review.id))problems.push('Duplicate review '+review.id);reviews.set(review.id,review);}
 const missingByConstruct=new Map<string,number>();
 for(const item of obligations){
  counts.total++;const review=reviews.get(item.id);reviews.delete(item.id);
  const valid=review&&['explained','non-mechanic'].includes(review.disposition)&&review.evidence?.length&&review.tests?.length&&review.reviewer?.trim()&&review.semantics?.trim()&&review.conditions?.trim()&&review.dependencies?.trim()&&review.tests.every(t=>ledger.validation?.passedTests?.includes(t));
  // Parser failures / opaque content cannot be waived by attaching an explanation label.
  if(valid&&item.kind!=='opaque'&&item.kind!=='parse-error')counts[review.disposition==='explained'?'explained':'nonMechanic']++;
  else{counts.unresolved++;missingByConstruct.set(item.construct,(missingByConstruct.get(item.construct)||0)+1);}
 }
 if(!counts.total)problems.push('Empty inventory cannot establish coverage');
 if(reviews.size)problems.push('Stale or unknown review IDs');
 if(counts.unresolved)problems.push('Unexplained supported-content obligations remain');
 const passed=problems.length===0;
 return {schemaVersion:1,passed,profileDigest,engineRevision,counts,problems,
  unresolvedConstructs:[...missingByConstruct].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([construct,count])=>({construct,count})),
  interpretation:'Census/review gate only. Counts are not strategic-risk scores, campaign outcomes or plan confidence. Reviews require independent semantic and test auditing.'};
}
