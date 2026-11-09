// Actual packaged Electron acceptance, deliberately unconfigured: no paid/model or game requests.
import {_electron,expect} from '@playwright/test';import path from 'node:path';import assert from 'node:assert/strict';
import {createQaRun,assertOwnedStatus,fileHash} from './qa/fixture';
async function main(){
 const exe=path.resolve(process.argv[2]||'');if(!exe.endsWith('.exe'))throw Error('Supply isolated extracted Windows executable.');
 const run=createQaRun('ai-package','compiled-runtime');const env={...process.env,HOI4_DATA_DIR:run.dataDirectory,PATH:`${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_PATH;delete env.NODE_OPTIONS;
 let app:Awaited<ReturnType<typeof _electron.launch>>|undefined;
 try{
  app=await _electron.launch({executablePath:exe,cwd:path.dirname(exe),env,timeout:60000});run.ownedProcesses.push({pid:app.process().pid!,kind:'Owned M731 packaged Electron'});let p=await app.firstWindow({timeout:120000});
  await expect(p.getByRole('heading',{name:'Command center',exact:true})).toBeVisible({timeout:60000});
  const status=await p.evaluate(()=>fetch('/api/v1/status').then(r=>r.json()));assertOwnedStatus(status,run.dataDirectory);
  const setup=await p.evaluate(async()=>{
   const trees=await fetch('/api/v1/trees?country=POR').then(r=>r.json());const tree=trees.find((x:any)=>x.id!=='generic_focus');if(!tree)throw Error('Portugal tree unavailable');
   const response=await fetch('/api/v1/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'m73-package',name:'M73 local acceptance',country:'POR',tree:'definition:'+tree.uid})});if(!response.ok)throw Error(await response.text());const profile=await response.json();
   const selected=await fetch('/api/v1/selection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:profile.id})});if(!selected.ok)throw Error(await selected.text());
   const detail=await fetch('/api/v1/tree?uid='+encodeURIComponent('definition:'+tree.uid)).then(r=>r.json());return {tree,focus:detail.focuses.find((x:any)=>x.id==='POR_estado_novo')};
  });
  await p.reload();await p.getByRole('button',{name:'Campaign planner',exact:true}).click();let panel=p.getByRole('region',{name:'AI strategy planner'});
  await run.check('fresh packaged app loads installed sources and optional session-only provider configuration',['M73-PACKAGE'],async()=>{
   await expect(panel).toContainText('AI generation is unconfigured');await panel.getByText('AI provider configuration · unconfigured',{exact:true}).click();await panel.getByLabel('AI API key',{exact:true}).fill('acceptance-fixture-not-a-real-key');await panel.getByRole('button',{name:'Use key for this session'}).click();await expect(panel.getByLabel('AI API key',{exact:true})).toHaveValue('');await expect(panel).toContainText('No provider request sent');await panel.getByRole('button',{name:'Forget API key'}).click();await expect(panel).toContainText('AI generation is unconfigured');
  });
  await run.check('offline manual strategy supports source preview, editing, validation and saved comparison',['M73-OFFLINE'],async()=>{
   await panel.getByLabel('Strategy objective').fill('Monarchist Portugal: review political prerequisites and prepare the economy.');await panel.getByRole('button',{name:'Preview AI source bundle'}).click();await expect(panel.getByRole('region',{name:'Outgoing AI context'})).toContainText('Raw saves');await expect(panel.getByRole('button',{name:'Generate provisional strategy'})).toBeDisabled();await expect(panel).toContainText('conservative reservation');await expect(panel).toContainText('Session estimated usage');await panel.getByRole('region',{name:'Outgoing AI context'}).scrollIntoViewIfNeeded();await p.screenshot({path:path.join(run.output,'spending-preview.png')});
   await panel.getByRole('button',{name:'Start local draft'}).click();await panel.getByLabel('AI strategy name').fill('My Portugal review');await panel.getByLabel('Add AI focus',{exact:true}).selectOption('definition:'+setup.focus.uid);await panel.getByRole('button',{name:'Add focus to proposal'}).click();await panel.getByRole('button',{name:'Add recommendation',exact:true}).click();await panel.getByLabel('Recommendation 1 advice').fill('User planning note: check available factories before construction.');await panel.getByRole('button',{name:'Save and recheck strategy'}).click();await expect(panel.getByRole('status')).toContainText('Strategy saved and reviewed');await expect(panel).toContainText('Confident ranking and numerical optimization are unavailable');
   await panel.getByRole('button',{name:'Start local draft'}).click();await panel.getByLabel('AI strategy name').fill('My alternative review');await panel.getByRole('button',{name:'Save and recheck strategy'}).click();await expect(panel.getByRole('status')).toContainText('Strategy saved and reviewed');await panel.getByLabel('Compare whole strategy My Portugal review').check();await panel.getByLabel('Compare whole strategy My alternative review').check();await expect(panel).toContainText('comparison is unranked');
   await p.screenshot({path:path.join(run.output,'offline-planning.png'),fullPage:true});
  });
  const origin=new URL(p.url()).origin;await app.close();app=undefined;await assert.rejects(fetch(origin+'/api/v1/status'));
  app=await _electron.launch({executablePath:exe,cwd:path.dirname(exe),env,timeout:60000});run.ownedProcesses.push({pid:app.process().pid!,kind:'Owned M731 packaged restart'});p=await app.firstWindow({timeout:60000});await expect(p.getByRole('heading',{name:'Command center',exact:true})).toBeVisible({timeout:60000});await p.getByRole('button',{name:'Campaign planner',exact:true}).click();panel=p.getByRole('region',{name:'AI strategy planner'});
  await run.check('packaged restart retains manual proposal and keeps provider unconfigured',['M73-PACKAGE-REOPEN'],async()=>{
   await expect(panel).toContainText('AI generation is unconfigured');await panel.getByRole('button',{name:'My Portugal review · revision 1',exact:true}).click();await expect(panel.getByLabel('Recommendation 1 advice')).toHaveValue('User planning note: check available factories before construction.');await expect(panel).toContainText('Origin: manual');await p.screenshot({path:path.join(run.output,'reopened.png'),fullPage:true});
  });
  run.finish({executable:exe,executableSHA256:fileHash(exe),packagedElectronLaunched:true,nativeGameLaunched:false,realProviderCalled:false,aiGeneration:'unconfigured; source fixture transport qualified separately'});console.log(run.output);
 }catch(e){const p=app?.windows()[0];if(p)await p.screenshot({path:path.join(run.output,'failure.png'),fullPage:true});throw e;}finally{await app?.close();run.finish();run.cleanup();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
