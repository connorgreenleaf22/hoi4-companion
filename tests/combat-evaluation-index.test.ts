import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {openStore} from '../server/store';import {indexedDesignSource} from '../server/design-evaluation';import {evaluateCombatDesign,combatResultIsCurrent} from '../server/combat-evaluation';
import {combatEntries,meta,scenario,candidates} from './fixtures/combat-evaluation/corpus';
test('partial combat result persists with provenance and unsupported metrics through existing SQLite',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-combat-index-'));let store=openStore(dir);
  try{
    for(const e of combatEntries)store.insert(structuredClone(e));store.setSetting('meta',meta);
    const r=evaluateCombatDesign(indexedDesignSource(store),{schemaVersion:1,design:{schemaVersion:1,candidate:candidates[4],scenario}});assert.equal(r.status,'partial');
    store.setSetting('combat-fixture',r);store.db.close();store=openStore(dir);
    const saved=store.getSetting<any>('combat-fixture',null);assert.deepEqual(saved,r);assert.equal(combatResultIsCurrent(indexedDesignSource(store),saved),true);
    store.setSetting('meta',{...meta,indexRevision:'changed'});assert.equal(combatResultIsCurrent(indexedDesignSource(store),saved),false);
  }finally{store.db.close();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
});
