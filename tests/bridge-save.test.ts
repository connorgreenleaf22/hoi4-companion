import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {inspectSaveBytes,inspectSaveFile} from '../server/bridge/save-reader';
import {digest} from '../server/bridge/telemetry';
const saveFixture=fs.readFileSync(new URL('./fixtures/bridge-save-1.19.4.2.txt',import.meta.url),'utf8');
const inspect=(text=saveFixture)=>inspectSaveBytes(Buffer.from(text),'sanitized-fixture','2026-11-06T09:26:55Z');
test('save inspection preserves repeated slots and explicit levels without inventing current focus from stored progress',()=>{
 const result=inspect();assert.equal(result.classification,'save-derived');assert.equal(result.sessionId,null);assert.equal(result.gameDate,'1936.4.1.1');
 assert.equal(result.fields.currentFocus.status,'unavailable');assert.equal(result.fields.focusProgress.status,'unavailable');
 assert.deepEqual(result.fields.completedFocuses.value,['GER_prioritize_economic_growth']);assert.deepEqual(result.fields.completedTechnologies.value,['infantry_weapons']);
 assert.equal((result.fields.researchAssignments.value as any[]).length,4);assert.equal((result.fields.researchAssignments.value as any[])[0].researchPoints,91.91);
 assert.ok(Object.values(result.fields).every(f=>f.qualification!=='native-verified'));
 const current=inspect(saveFixture.replace('focus={','focus={current="GER_the_four_year_plan" '));assert.equal(current.fields.currentFocus.value,'GER_the_four_year_plan');assert.equal(current.fields.focusProgress.value,10);
 const invalid=inspect(saveFixture.replace('focus={','focus={current="invalid focus" '));assert.equal(invalid.fields.currentFocus.status,'unavailable');assert.equal(invalid.fields.focusProgress.status,'unavailable');
});
test('save reader refuses ambiguous, partial, binary, compressed, incompatible and foreign-country inputs',()=>{
 for(const input of ['HOI4bin'+saveFixture.slice(7),'PK'+saveFixture,saveFixture.slice(0,-3),saveFixture.replace('1.19.4.2.','1.19.4.1.'),saveFixture+'countries={GER={focus={}}}',saveFixture.replace('research_slot=4','research_slot=4 research_slot=5'),saveFixture.replace('slots={','slots={} slots={')])assert.throws(()=>inspect(input));
 assert.throws(()=>inspectSaveBytes(Buffer.from(saveFixture),'fixture','2026-11-06','ITA'),/player country|block missing/);
 const absent=inspect(saveFixture.replace('research_slot=4','research_slot=-1').replace('completed="GER_prioritize_economic_growth"',''));
 assert.equal(absent.fields.completedFocuses.status,'unavailable');assert.equal(absent.fields.researchSlots.status,'unavailable');
});
test('selected save is read-only and provenance hashes original bytes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-save-')),file=path.join(root,'disposable.hoi4');try{
  fs.writeFileSync(file,saveFixture);const before=fs.statSync(file),hash=digest(fs.readFileSync(file)),s=inspectSaveFile(file);
  assert.equal(s.source.hash,hash);assert.equal(digest(fs.readFileSync(file)),hash);assert.equal(fs.statSync(file).mtimeMs,before.mtimeMs);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
