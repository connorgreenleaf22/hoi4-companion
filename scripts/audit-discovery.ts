import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openStore} from '../server/store';
import {indexGame,discoverGame} from '../server/importer';
import {campaignGuides,inspectGuide,previewDiscovery} from '../server/discovery';
import {validateProfile} from '../server/api';
import {parseScript} from '../server/parser';
const directory=process.env.HOI4_DISCOVERY_DATA||path.resolve('artifacts/v04/installed-data');
const output=path.resolve('artifacts/v04');fs.mkdirSync(output,{recursive:true});
const root=process.env.HOI4_GAME_ROOT||discoverGame();const store=openStore(directory);
const results:any[]=[];
try{
 const meta=indexGame(store,root);assert.equal(meta.version,'1.19.4.1');
 for(const guide of campaignGuides){
   assert.equal(new Set(guide.claims.map(c=>c.id)).size,guide.claims.length);
   for(const source of guide.sources.filter(s=>s.kind==='installed-script')){
     const file=path.resolve(root,source.path);assert.ok(file.startsWith(path.resolve(root)+path.sep));const bytes=fs.readFileSync(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),source.hash);
     const lines=bytes.toString('utf8').split('\n');assert.ok(source.line>=1&&source.endLine>=source.line&&source.endLine<=lines.length);
   }
   for(const claim of guide.claims){for(const id of claim.sourceIds)assert.ok(guide.sources.some(s=>s.id===id));if(claim.verification==='script-extracted'){assert.ok(claim.sourceIds.length);assert.ok(claim.sourceIds.every(id=>guide.sources.find(s=>s.id===id)?.kind==='installed-script'));}if(claim.type==='lead')assert.equal(claim.verification,'unverified');}
   const view=inspectGuide(store,guide);assert.deepEqual(view.referenceProblems,[]);assert.equal(view.freshness,'matched');
   const evidence:any={id:guide.id,revision:guide.revision,freshness:view.freshness,references:view.resolvedReferences,claims:guide.claims.length,sources:guide.sources};
   if(guide.starter){const profile=validateProfile({id:'audit-'+guide.id,name:guide.title,country:guide.countries[0]});const before=store.listProfiles();const preview=previewDiscovery(store,view,profile,meta.indexRevision!);assert.deepEqual(store.listProfiles(),before);assert.equal(preview.preview.report.steps.length,guide.starter.focusIds.length);assert.ok(preview.preview.report.steps.every(s=>s.resolution==='resolved'));evidence.starter={plan:preview.plan,report:preview.preview.report,checklist:preview.profile.planner!.checklists.at(-1)};}
   results.push(evidence);console.log('PASS installed hashes, exact references, claim-source links and starter '+guide.id);
 }
 fs.writeFileSync(path.join(output,'installed-source-audit.json'),JSON.stringify({level:'installed-source',independentAcceptance:false,inGame:false,at:new Date().toISOString(),directory,meta,results},null,2));
 console.log('DATA_DIRECTORY='+directory);
}finally{store.db.close();}
