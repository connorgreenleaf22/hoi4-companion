import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {declaredYear} from '../src/year';
import {openStore} from '../server/store';
import {indexGame} from '../server/importer';

test('year normalization treats corrupt non-scalar values as unknown without coercion or mutation',()=>{
  let calls=0;const object={year:1936,toString(){calls++;return '1936';},valueOf(){calls++;return 1936;}};
  for(const value of [object,{year:1936},[1936],[],true,false,NaN,Infinity,1936.5,Symbol('1936'),1936n,()=>1936])assert.equal(declaredYear({year:value}),undefined);
  assert.equal(calls,0);assert.equal(object.year,1936);assert.equal(declaredYear({year:null,stats:{start_year:1936}}),1936);assert.equal(declaredYear({year:{year:1935},stats:{start_year:1936}}),undefined);
});

test('equipment importer retains block-year source evidence while omitting it from scalar metadata',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-robust-source-r5-')),root=path.join(directory,'game'),store=openStore(path.join(directory,'data'));
  try{
    const equipment=path.join(root,'common/units/equipment');fs.mkdirSync(equipment,{recursive:true});fs.mkdirSync(path.join(root,'common/national_focus'),{recursive:true});fs.writeFileSync(path.join(root,'launcher-settings.json'),'{"rawVersion":"QA-SYNTHETIC"}');
    fs.writeFileSync(path.join(equipment,'test.txt'),'equipments = { QA_OBJECT_YEAR = { year = { year = 1936 } } QA_SCALAR_YEAR = { year = 1936 } QA_STRING_YEAR = { year = unknown } }');indexGame(store,root);
    const get=(id:string)=>store.resolve(id,'equipment').entry!;const block=get('QA_OBJECT_YEAR'),scalar=get('QA_SCALAR_YEAR'),text=get('QA_STRING_YEAR');
    assert.equal(block.data.year,undefined);assert.equal(block.data.stats.year,undefined);assert.deepEqual(block.data.nodes.find((n:any)=>n.key==='year').value,[{key:'year',op:'=',value:'1936',line:1}]);
    assert.equal(scalar.data.year,'1936');assert.equal(scalar.data.stats.year,1936);assert.equal(text.data.year,'unknown');assert.equal(text.data.stats.year,undefined);
  }finally{store.db.close();assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(directory,{recursive:true,force:true});}
});
