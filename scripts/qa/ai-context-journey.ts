import {expect,type Page} from '@playwright/test';import assert from 'node:assert/strict';import path from 'node:path';
import type {AiContext} from '../../src/ai-planning-types';import {providerWire} from '../../server/planner/ai-provider';
import {germanyObjective,contextMarkers} from './ai-context-fixture';import type {createQaRun} from './fixture';

export async function exerciseAiContext(p:Page,run:ReturnType<typeof createQaRun>){
 const panel=p.getByRole('region',{name:'AI strategy planner',exact:true});
 const previewButton=()=>panel.getByRole('button',{name:'Preview AI source bundle',exact:true});
 const contextResponse=()=>p.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/ai/context'&&response.request().method()==='POST');
 const preview=async()=>{const next=contextResponse();await previewButton().click();return next;};
 const extra=()=>panel.getByLabel('Additional AI context references',{exact:true});
 let first:AiContext;let generateRequests=0;p.on('request',request=>{if(new URL(request.url()).pathname==='/api/v1/ai/generate')generateRequests++;});
 await run.check('broad Germany objective previews a bounded source selection with complete requirements, costs and gaps',['AI-CONTEXT-01'],async()=>{
  await p.getByRole('button',{name:'Campaign planner',exact:true}).click();await panel.getByLabel('Strategy objective',{exact:true}).fill(germanyObjective);
  await panel.getByText('Optional campaign context — manual assertion',{exact:true}).click();await panel.getByLabel('Shared manual campaign context').fill('Manual fixture; current campaign state unknown.');
  const response=await preview();assert.equal(response.status(),200);first=await response.json();assert.ok(first.contextBudget);assert.ok(first.contextBudget.omittedGroups.length>0);assert.ok(first.contextBudget.sourceCharacters<=first.contextBudget.limitCharacters);assert.ok(first.contextBudget.wireBytes<=first.contextBudget.limitWireBytes);
  assert.equal(Buffer.byteLength(JSON.stringify(providerWire(first,first.settings!))),first.contextBudget.wireBytes);assert.ok(!JSON.stringify(first).includes(contextMarkers.privateNote));assert.ok(first.references.some(source=>source.kind==='technology'),'Broad research objective retains a technology group');
  const included=first.references.find(source=>source.reference.startsWith('definition:budget-')&&source.requirements.some(text=>text.includes(contextMarkers.requirement)));assert.ok(included,'At least one complete matching focus must fit');assert.ok(included.interpretationGaps?.some(gap=>gap.code.startsWith(contextMarkers.gap)));assert.ok(included.costsAndTiming?.some(text=>text.includes('70 nominal days')));
  await expect(p.getByRole('region',{name:'Source context budget',exact:true})).toContainText('does not establish complete strategy coverage');await expect(panel.getByRole('button',{name:'Generate provisional strategy',exact:true})).toBeDisabled();
  run.write('context-metrics.json',{referenceCount:first.references.length,budget:first.contextBudget,privateNotesExcluded:true,wholeRecordsRetained:true});
 });
 await run.check('repeated preview is deterministic and shows exact units without changing spending limits',['AI-CONTEXT-01'],async()=>{
  const response=await preview();assert.equal(response.status(),200);const next:AiContext=await response.json();assert.equal(next.fingerprint,first.fingerprint);assert.equal(next.quoteFingerprint,first.quoteFingerprint);assert.deepEqual(next.references,first.references);
  const budget=p.getByRole('region',{name:'Source context budget',exact:true});await budget.getByText('Inspect selection limits and omissions',{exact:true}).click();await expect(budget).toContainText('UTF-8 bytes');await expect(budget).toContainText('spending estimate and request ceiling remain separate');assert.equal(next.settings?.requestCeilingUsd,.15);assert.equal(next.settings?.sessionBudgetUsd,.5);
 });
 await run.check('oversized required reference refuses with recovery guidance and preserves editable work',['AI-CONTEXT-01'],async()=>{
  await panel.getByRole('button',{name:'Start local draft',exact:true}).click();await panel.getByLabel('AI strategy name').fill('Context budget strategy');await panel.getByText('Expand source context locally',{exact:true}).click();await extra().fill('definition:00-huge');
  const response=await preview();assert.notEqual(response.status(),200);const failure=await response.json();assert.match(failure.error,/mandatory|required/i);assert.match(failure.error,/remove|smaller|split|shorten/i);await expect(panel.getByRole('alert')).toContainText(/mandatory|required/i);await expect(panel.getByLabel('Strategy objective')).toHaveValue(germanyObjective);await expect(panel.getByLabel('AI strategy name')).toHaveValue('Context budget strategy');await expect(extra()).toHaveValue('definition:00-huge');
 });
 await run.check('late overflow response cannot replace current inputs with a stale error',['AI-CONTEXT-01'],async()=>{
  let release!:()=>void,ready!:()=>void;const hold=new Promise<void>(resolve=>{release=resolve;}),received=new Promise<void>(resolve=>{ready=resolve;});
  await p.route('**/api/v1/ai/context',async route=>{const response=await route.fetch();assert.notEqual(response.status(),200);ready();await hold;await route.fulfill({response});});
  const next=contextResponse();await previewButton().click();await received;try{await extra().fill('definition:budget-root');}finally{release();}await next;await expect(previewButton()).toBeEnabled();await p.unroute('**/api/v1/ai/context');await expect(panel.getByRole('alert')).toHaveCount(0);await expect(extra()).toHaveValue('definition:budget-root');
 });
 await run.check('explicit smaller reference recovers preview, retains required root and saves locally without dispatch',['AI-CONTEXT-01'],async()=>{
  const response=await preview();assert.equal(response.status(),200);const context:AiContext=await response.json();assert.ok(context.references.some(source=>source.reference==='definition:budget-root'));assert.ok(context.contextBudget!.mandatoryReferences>=2);await expect(p.getByRole('region',{name:'Source context budget',exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'Save and recheck strategy',exact:true}).click();await expect(panel.getByRole('button',{name:'Context budget strategy · revision 1',exact:true})).toBeVisible();
  const state=await p.evaluate(()=>(window as any).__hoi4CloseState);assert.equal(state.unsavedDrafts,0);assert.equal(state.pendingWrites,0);assert.equal(generateRequests,0);assert.equal((await p.evaluate(()=>fetch('/api/v1/ai/evaluations?profile=nav-a').then(r=>r.json()))).filter((attempt:any)=>attempt.schemaVersion===2).length,0);
 });
 await run.check('saved source references and objective reopen across tools while preview approval stays transient',['AI-CONTEXT-01'],async()=>{
  await p.getByRole('button',{name:'Division & production',exact:true}).click();await p.getByRole('button',{name:'Campaign planner',exact:true}).click();await expect(panel.getByLabel('AI strategy name')).toHaveValue('Context budget strategy');await panel.getByText('Expand source context locally',{exact:true}).click();await expect(extra()).toHaveValue('definition:budget-root');await expect(p.getByRole('region',{name:'Outgoing AI context',exact:true})).toHaveCount(0);
  const response=await preview();assert.equal(response.status(),200);await expect(panel.getByRole('button',{name:'Generate provisional strategy',exact:true})).toBeDisabled();assert.equal(generateRequests,0);await p.screenshot({path:path.join(run.output,'context-preview-final.png'),fullPage:true});
 });
 return {savedName:'Context budget strategy',objective:germanyObjective,generateRequests};
}
