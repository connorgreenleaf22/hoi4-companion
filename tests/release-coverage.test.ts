import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {assessCoverage,sourceObligations,type CoverageLedger,type CoverageObligation} from '../server/release-coverage';
const source='focus = { prerequisite = { focus = A } completion_reward = { if = { limit = { tag = GER } country_event = { id = event.1 } } } }';
const items=[...sourceObligations('common/national_focus/example.txt','source-hash',source)];
function reviewed(obligations:CoverageObligation[]):CoverageLedger{return {schemaVersion:1,profileDigest:'profile',engineRevision:'engine',scopeApproval:'synthetic denominator review',validation:{engineRevision:'engine',passedTests:['synthetic-semantics'],report:'fixture only'},reviews:obligations.map(o=>({id:o.id,disposition:'explained',evidence:['fixture source + independent expected result'],tests:['synthetic-semantics'],reviewer:'fixture reviewer',semantics:'Fixture expectation only',conditions:'Both conditional branches addressed',dependencies:'Event reference resolved in fixture'}))};}
test('release census preserves nested scopes/conditions and blocks one unresolved branch or dependency',()=>{
 assert.ok(items.some(i=>i.construct==='limit'));assert.ok(items.some(i=>i.construct==='country_event'));
 const ledger=reviewed(items);assert.equal(assessCoverage(items,'profile','engine',ledger).passed,true);
 ledger.reviews.pop();const blocked=assessCoverage(items,'profile','engine',ledger);assert.equal(blocked.passed,false);assert.equal(blocked.counts.unresolved,1);
});
test('source updates, implementation changes, empty inventory and unsupported syntax cannot pass',()=>{
 const ledger=reviewed(items);
 assert.equal(assessCoverage([...sourceObligations('common/national_focus/example.txt','changed',source)],'profile','engine',ledger).passed,false);
 assert.equal(assessCoverage(items,'changed-profile','engine',ledger).passed,false);
 assert.equal(assessCoverage(items,'profile','changed-engine',ledger).passed,false);
 assert.equal(assessCoverage([],'profile','engine',reviewed([])).passed,false);
 for(const text of [null,'x = {']){const unknown=[...sourceObligations('common/x.txt','hash',text)];assert.equal(assessCoverage(unknown,'profile','engine',reviewed(unknown)).passed,false);}
});
test('diagnostic labels, unpassed tests, missing scope approval, duplicate and stale reviews fail closed',()=>{
 for(const mutate of [
  (l:CoverageLedger)=>{l.reviews[0].semantics='';},
  (l:CoverageLedger)=>{l.validation.passedTests=[];},
  (l:CoverageLedger)=>{l.scopeApproval='';},
  (l:CoverageLedger)=>{l.reviews.push(l.reviews[0]);},
  (l:CoverageLedger)=>{l.reviews.push({...l.reviews[0],id:'stale'});},
 ]){const ledger=reviewed(items);mutate(ledger);assert.equal(assessCoverage(items,'profile','engine',ledger).passed,false);}
});
test('release CLI inventories an exact fixture installation and rejects an unapproved final release',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-release-census-')),game=path.join(root,'game'),output=path.join(root,'audit');
 try{
  fs.mkdirSync(path.join(game,'common'),{recursive:true});fs.writeFileSync(path.join(game,'hoi4.exe'),'synthetic executable');fs.writeFileSync(path.join(game,'launcher-settings.json'),JSON.stringify({rawVersion:'1.19.4.2'}));
  const input=path.join(game,'common','focus.txt');fs.writeFileSync(input,source);
  const result=spawnSync(process.execPath,['--import','tsx','scripts/release-coverage.ts',game,output,'--check'],{cwd:process.cwd(),encoding:'utf8',timeout:15000,windowsHide:true});
  assert.equal(result.status,1,result.stderr);const report=JSON.parse(fs.readFileSync(path.join(output,'report.json'),'utf8'));
  assert.equal(report.passed,false);assert.equal(report.counts.total,items.length);assert.equal(report.counts.unresolved,items.length);
  assert.equal(fs.readFileSync(input,'utf8'),source);assert.ok(fs.readFileSync(path.join(output,'obligations.jsonl'),'utf8').includes('country_event'));
  const profile=JSON.parse(fs.readFileSync(path.join(output,'profile.json'),'utf8'));assert.equal(profile.gameVersion,'1.19.4.2');assert.equal(profile.files.length,1);assert.equal(profile.files[0].file,'common/focus.txt');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
