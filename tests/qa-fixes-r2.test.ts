import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from '../server/store';
import {searchEntries} from '../server/search';
import {sourceNumber} from '../src/format';
import {productionSupport} from '../server/domain';
import type {Entry} from '../src/types';

const entry=(id:string,kind:string,title:string,data:Entry['data']={}):Entry=>({id,uid:`${kind}:fixture:${id}`,kind,title,data,description:'',source:'fixture',line:1,version:'test',hash:'test'});
test('event and short cost questions find their subject while literal names, IDs and filters remain precise',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-search-r2-'));const store=openStore(directory);
  try{
    [entry('denmark_occupation_event.1','event','Someone attacked us'),entry('denmark_occupation_event.10','event','A later event'),entry('professional_officer_corps_spirit','idea','Professional Officer Corps',{countries:['GER'],year:1936}),entry('price_of_freedom','idea','The Price of Freedom'),entry('no_step_back','dlc','No Step Back'),entry('tank_medium_cannon','module','Medium Cannon')].forEach(e=>store.insert(e));
    const search=(q:string,extra:Record<string,string>={})=>searchEntries(store,new URLSearchParams({q,...extra}));
    for(const q of ['What happens after Denmark occupation event 1?','What occurs next after Denmark occupation event 1?','Denmark occupation event 1','denmark_occupation_event.1']){
      assert.deepEqual(search(q).entries.map(e=>e.id),['denmark_occupation_event.1']);
    }
    for(const q of ['professional officer corps cost','How much does professional officer corps cost?','professional officer corps price','professional_officer_corps_spirit'])assert.equal(search(q).entries[0]?.id,'professional_officer_corps_spirit');
    assert.equal(search('professional officer corps cost',{country:'GER',year:'1936',kind:'idea'}).total,1);assert.equal(search('professional officer corps cost',{country:'FRA'}).total,0);
    assert.equal(search('The Price of Freedom').entries[0]?.id,'price_of_freedom');assert.equal(search('No Step Back').entries[0]?.id,'no_step_back');assert.equal(search('What does No Step Back give?').entries[0]?.id,'no_step_back');
    assert.equal(search('What happens after?').total,0);assert.equal(search('What unlocks tank_medium_cannon?').entries[0]?.id,'tank_medium_cannon');
    assert.match(search('professional officer corps cost').question!.verification,/Source declarations/);
  }finally{store.db.close();assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(directory,{recursive:true,force:true});}
});
test('declared reference coefficients preserve precision across added, multiplied and base values',()=>{
  for(const value of [-0.025,-0.015,1.25,0.000015,0.0000001,12345.678901,20])assert.equal(Number(sourceNumber(value)),value);
  assert.equal(sourceNumber(-0.025),'-0.025');assert.equal(sourceNumber(-0.015),'-0.015');assert.equal(sourceNumber(1.25),'1.25');
});
test('naval estimates remain unsupported with version-neutral copy',()=>{
  const convoy=entry('convoy','equipment','Convoy',{type:'convoy',stats:{build_cost_ic:70}});const result=productionSupport(convoy,[convoy]);
  assert.equal(result.supported,false);assert.match(result.reason!,/Naval production is unsupported\. Ships and convoys use dockyards/);assert.doesNotMatch(result.reason!,/v\d/);
});
