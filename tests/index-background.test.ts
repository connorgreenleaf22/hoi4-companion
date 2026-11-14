import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {openStore} from '../server/store';
import {indexInBackground} from '../server/index-background';

test('worker builds installed definitions, refreshes atomically and preserves profiles on failure',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-index-worker-')),data=path.join(root,'data'),game=path.join(root,'game'),worker=path.join(root,'index-worker.cjs');
 const put=(name:string,text:string)=>{const file=path.join(game,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
 await build({entryPoints:['server/index-worker.ts'],outfile:worker,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
 const store=openStore(data);
 try{
  put('launcher-settings.json','{"rawVersion":"fixture"}');put('common/defines/00.lua','FOCUS_POINT_DAYS = 7');put('localisation/english/a.yml','l_english:\n A:0 "Observed source title"');put('common/national_focus/a.txt','focus_tree={id=test focus={id=A cost=5}}');
  store.db.prepare('INSERT INTO profiles VALUES(?,?)').run('saved',JSON.stringify({id:'saved',name:'Preserved',notes:{A:'manual'}}));
  let ticks=0;const interval=setInterval(()=>ticks++,1);const meta=await indexInBackground(worker,data,game);clearInterval(interval);
  assert.ok(ticks>0,'main event loop remains responsive');assert.equal(meta.counts.focus,1);assert.equal(store.entry('A')?.title,'Observed source title');
  assert.equal((await indexInBackground(worker,data,game)).changedFiles,0);
  await assert.rejects(indexInBackground(worker,data,path.join(root,'missing')));
  assert.equal(store.entry('A')?.title,'Observed source title');assert.equal(store.profile('saved')?.notes.A,'manual');
  await assert.rejects(indexInBackground(path.join(root,'missing-worker.cjs'),data,game));
 }finally{store.db.close();fs.rmSync(root,{recursive:true,force:true});}
});
