import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {openStore} from '../server/store';
import {evaluateDesign,indexedDesignSource,designResultIsCurrent} from '../server/design-evaluation';
import {entries,meta,candidates,scenario} from './fixtures/design-evaluation/corpus';

test('existing SQLite canonical resolver, persistence and source invalidation',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-design-index-'));let store=openStore(dir);
  try {
    for(const entry of entries)store.insert(structuredClone(entry));store.setSetting('meta',meta);
    const input={schemaVersion:1,candidate:candidates[4],scenario};
    const result=evaluateDesign(indexedDesignSource(store),input);assert.equal(result.status,'evaluated');
    store.setSetting('design-evaluation-fixture',result);store.db.close();store=openStore(dir);
    const saved=store.getSetting<any>('design-evaluation-fixture',null);assert.deepEqual(saved,result);assert.equal(designResultIsCurrent(indexedDesignSource(store),saved),true);
    store.setSetting('meta',{...meta,indexRevision:'changed'});assert.equal(designResultIsCurrent(indexedDesignSource(store),saved),false);
    assert.equal(evaluateDesign(indexedDesignSource(store),input).status,'source-invalidated');
    assert.equal(store.db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');
  }finally{store.db.close();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
});
