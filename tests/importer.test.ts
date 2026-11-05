import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from '../server/store';
import {indexGame} from '../server/importer';

test('index refresh resolves localization/constants, imports documentation, and preserves user plans',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-import-'));const root=path.join(temp,'game');const store=openStore(path.join(temp,'data'));
  const put=(file:string,text:string)=>{const full=path.join(root,file);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,text);};
  try{
    put('launcher-settings.json','{"rawVersion":"test.1"}');
    put('common/defines/00_defines.lua','FOCUS_POINT_DAYS = 7,\nBASE_FACTORY_SPEED_MIL = 3.5,');
    put('dlc_metadata/dlc_info/00_dlc_info.txt','dlcs = { dlc001 = { name = "Test DLC" } }');
    put('integrated_dlc/test/test.dlc','name = "Integrated test"');
    put('localisation/english/test_l_english.yml','l_english:\n A:0 "Localized Focus"\n A_desc:0 "Choose $A$."\n');
    put('common/country_tags/00_countries.txt','GER = "countries/Germany.txt"');
    put('common/national_focus/test.txt','@cost = 5\n focus_tree = { id = test country = { modifier = { tag = GER } } focus = { id = A cost = @cost x = 2 y = 1 completion_reward = { add_political_power = 50 } } }');
    put('common/terrain/test.txt','categories = { forest = { combat_width = 60 } hills = { combat_width = 70 } } terrain = { color = 1 }');
    put('documentation/triggers_documentation.md','## Triggers for scope country\n* [has_dlc](#has_dlc)\n\n## has_dlc\nChecks DLC availability.\n');
    const initial=indexGame(store,root);assert.equal(initial.counts.focus,1);assert.equal(initial.counts.terrain,2);assert.equal(initial.counts.trigger,1);assert.equal(initial.dlcs.find(d=>d.name==='Integrated test')?.integrated,true);
    const focus=store.entry('focus:common/national_focus/test.txt:A')!;assert.equal(focus.title,'Localized Focus');assert.equal(focus.description,'Choose Localized Focus.');assert.equal(focus.data.days,35);assert.deepEqual(focus.data.effectsSummary,['Political power: +50']);
    store.db.prepare('INSERT INTO profiles VALUES(?,?)').run('saved',JSON.stringify({id:'saved',queue:['A'],notes:{A:'Keep this'}}));
    assert.equal(indexGame(store,root).changedFiles,0);
    put('common/national_focus/test.txt','focus_tree = { id = test focus = { id = B cost = 10 } }');
    const changed=indexGame(store,root);assert.equal(changed.changedFiles,1);assert.equal(store.entry(focus.uid),undefined);assert.ok(store.entry('focus:common/national_focus/test.txt:B'));
    put('localisation/english/test_l_english.yml','l_english:\n B:0 "Renamed focus"');
    indexGame(store,root);assert.equal(store.entry('focus:common/national_focus/test.txt:B')?.title,'Renamed focus');
    fs.unlinkSync(path.join(root,'common/terrain/test.txt'));indexGame(store,root);assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM entries WHERE kind='terrain'").get()?.n,0);
    const saved=store.listProfiles()[0];assert.deepEqual(saved.queue,['A']);assert.equal(saved.notes.A,'Keep this');
    assert.throws(()=>indexGame(store,path.join(temp,'missing')));assert.ok(store.entry('focus:common/national_focus/test.txt:B'));
    const entries=store.db.prepare('SELECT COUNT(*) AS n FROM entries').get()?.n;const searches=store.db.prepare('SELECT COUNT(*) AS n FROM search').get()?.n;assert.equal(entries,searches);
  }finally{store.db.close();if(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(temp,{recursive:true,force:true});}
});
