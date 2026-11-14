import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPageScrollController} from '../src/page-scroll';

function fixture(){
 const calls:ScrollToOptions[]=[],frames:(()=>void)[]=[];
 const navigation=createPageScrollController(options=>calls.push(options),restore=>frames.push(restore));
 return {navigation,calls,flush:()=>{while(frames.length)frames.shift()!();}};
}

test('document starts at the tool heading on each page change but remains positioned on same-page updates',()=>{
 const {navigation,calls}=fixture();navigation.commitPage('planner');navigation.commitPage('planner');navigation.commitPage('lab');navigation.commitPage('lab');navigation.commitPage('planner');
 assert.deepEqual(calls,Array.from({length:3},()=>({top:0,left:0,behavior:'instant'})));
});

test('closing a reference on its original page restores the captured document position on the queued frame',()=>{
 const {navigation,calls,flush}=fixture();navigation.commitPage('planner');let origin=1240;const closeReference=navigation.captureReference(origin);closeReference();origin=2400;
 assert.equal(calls.length,1);navigation.commitPage('planner');flush();assert.deepEqual(calls.at(-1),{top:1240,behavior:'instant'});assert.equal(calls.length,2);
});

test('reference actions that navigate before or after closing cannot override the destination heading',()=>{
 for(const eventOrder of ['close-then-search','focus-then-close']){
  const {navigation,calls,flush}=fixture();navigation.commitPage('encyclopedia');const closeReference=navigation.captureReference(1820);
  if(eventOrder==='close-then-search'){closeReference();navigation.commitPage('lab');}else{navigation.commitPage('planner');closeReference();}flush();
  assert.deepEqual(calls,[{top:0,left:0,behavior:'instant'},{top:0,left:0,behavior:'instant'}]);
 }
});

test('a delayed reference restoration stays invalid after navigating away and back to the same page',()=>{
 const {navigation,calls,flush}=fixture();navigation.commitPage('planner');const closeReference=navigation.captureReference(3700);closeReference();navigation.commitPage('lab');navigation.commitPage('planner');flush();
 assert.equal(calls.length,3);assert.deepEqual(calls.at(-1),{top:0,left:0,behavior:'instant'});
});

test('only the latest queued reference close restores position on the current page',()=>{
 const {navigation,calls,flush}=fixture();navigation.commitPage('planner');navigation.captureReference(500)();navigation.captureReference(1200)();flush();
 assert.deepEqual(calls,[{top:0,left:0,behavior:'instant'},{top:1200,behavior:'instant'}]);
});

test('opening a new reference invalidates a previous queued restoration on the same page',()=>{
 const {navigation,calls,flush}=fixture();navigation.commitPage('planner');navigation.captureReference(500)();const closeCurrent=navigation.captureReference(900);flush();
 assert.equal(calls.length,1);closeCurrent();flush();assert.deepEqual(calls.at(-1),{top:900,behavior:'instant'});
});
