import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoveryReview,reviewScope} from '../src/discovery-review';
import type {PlannerReport} from '../src/types';

function fixture(){
  return {plan:{assumptions:['Guide route r1; source hash/review context retained.','Manual government check.']},report:{assumptions:['Nominal effort only.','Guide route r1; source hash/review context retained.','Manual government check.','First focus is conditional.','Check ownership, not control.','Shared only by steps one and three.'],steps:[
    {position:0,assumptions:['Guide route r1; source hash/review context retained.','Manual government check.','First focus is conditional.','Shared only by steps one and three.']},
    {position:1,assumptions:['Guide route r1; source hash/review context retained.','Manual government check.','Check ownership, not control.','Check ownership, not control.']},
    {position:2,assumptions:['Guide route r1; source hash/review context retained.','Manual government check.','Shared only by steps one and three.','Check control, not ownership.']}
  ],issues:[{position:0,id:'A',type:'manual',message:'Availability needs a game check.'},{position:2,id:'C',type:'manual',message:'Availability needs a game check.'},{position:2,id:'C',type:'branch',message:'Availability needs a game check.'},{position:1,id:'B',type:'missing',message:'Different unresolved definition.'}]} as Pick<PlannerReport,'assumptions'|'steps'|'issues'>};
}
test('discovery review displays each distinct assumption once, preserving unique step reasoning and source wording',()=>{
  const {plan,report}=fixture(),before=structuredClone({plan,report}),review=discoveryReview(plan,report);
  const displayed=[...review.sharedAssumptions.map(item=>item.text),...review.steps.flatMap(step=>step.assumptions)];
  const expected=new Set([...plan.assumptions,...report.assumptions,...report.steps.flatMap(step=>step.assumptions)]);
  assert.equal(displayed.length,expected.size);assert.deepEqual(new Set(displayed),expected);
  assert.deepEqual(review.steps.map(step=>step.assumptions),[['First focus is conditional.'],['Check ownership, not control.'],['Check control, not ownership.']]);
  assert.deepEqual(review.sharedAssumptions.find(item=>item.text==='Shared only by steps one and three.')?.positions,[0,2]);
  assert.deepEqual(review.sharedAssumptions.find(item=>item.text===plan.assumptions[0])?.positions,[0,1,2]);
  assert.deepEqual({plan,report},before,'The presentation must not mutate source/provenance, preview identity or captured answers.');
});
test('repeated planner warnings show once with every affected focus and distinct diagnostic origin retained',()=>{
  const {plan,report}=fixture(),review=discoveryReview(plan,report);
  assert.equal(review.findings.length,2);assert.deepEqual(review.findings[0].occurrences,[{position:0,id:'A',type:'manual'},{position:2,id:'C',type:'manual'},{position:2,id:'C',type:'branch'}]);
  assert.equal(reviewScope(review.findings[0].occurrences.map(item=>item.position),[0,1,2]),'Steps 1, 3');
  assert.equal(reviewScope([1],[0,1,2]),'Step 2');assert.equal(reviewScope([0,1,2],[0,1,2]),'All steps');assert.equal(reviewScope([],[]),'Plan');
});
