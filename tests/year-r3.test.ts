import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from '../server/store';
import {startServer} from '../server/api';
import {searchEntries} from '../server/search';
import {declaredYear} from '../src/year';
import type {Entry} from '../src/types';

const vectors:[string,Record<string,any>,boolean][]=[
  ['number',{year:1936},true],['string',{year:'1936'},true],['decimal_text',{year:'1936.0'},true],['spaced_text',{year:' 1936 '},true],['exponent_text',{year:'1.936e3'},true],
  ['start_number',{stats:{start_year:1936}},true],['start_string',{stats:{start_year:'1936'}},true],['null_fallback',{year:null,stats:{start_year:'1936'}},true],
  ['absent',{},false],['null',{year:null},false],['blank',{year:''},false],['unknown',{year:'unknown'},false],['trailing_text',{year:'1936x'},false],
  ['fraction_number',{year:1936.5},false],['fraction_string',{year:'1936.5'},false],['before',{year:1935},false],['after',{year:'1937'},false],
  ['true',{year:true},false],['false',{year:false},false],['array',{year:[1936]},false],['object',{year:{year:1936}},false],['quoted_number',{year:'"1936"'},false],
  ['priority',{year:'1935',stats:{start_year:1936}},false],['unknown_priority',{year:'unknown',stats:{start_year:1936}},false]
];
const record=(id:string,data:Entry['data'],kind='equipment'):Entry=>({id,uid:`${kind}:fixture:${id}`,kind,title:`Infantry ${id}`,description:'',source:'fixture',line:1,hash:'fixture',version:'test',data});
const remove=(directory:string)=>{assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(directory,{recursive:true,force:true});};

test('declared year normalizes numeric/text types without matching absent, malformed, fractional or adjacent years',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-year-r3-'));const store=openStore(directory);
  try{
    for(const [id,data]of vectors)store.insert(record(id,data));
    const result=searchEntries(store,new URLSearchParams({year:'1936',limit:'100'}));
    assert.deepEqual(result.entries.map(e=>e.id).sort(),vectors.filter(v=>v[2]).map(v=>v[0]).sort());
    for(const [id,data,match]of vectors)assert.equal(declaredYear(data)===1936,match,id);
    store.insert(record('zero',{year:0}));assert.deepEqual(searchEntries(store,new URLSearchParams({year:'0000'})).entries.map(e=>e.id),['zero']);
    assert.equal(searchEntries(store,new URLSearchParams({year:'1935'})).entries.some(e=>e.id==='before'),true);
    assert.equal(searchEntries(store,new URLSearchParams({year:'1937'})).entries.some(e=>e.id==='after'),true);
    for(const year of ['193','19360','1936.5','1936x'])assert.throws(()=>searchEntries(store,new URLSearchParams({year})),/four-digit/);
  }finally{store.db.close();remove(directory);}
});

test('public year filters preserve exact-ID, text, kind and country intersections with imported string years',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-year-api-r3-'));const service=await startServer({dataDir:directory,port:0,autoIndex:false});
  try{
    [record('infantry_equipment_1',{year:'1936',stats:{year:1936},countries:['GER']}),record('infantry_equipment_0',{year:'1918',countries:['GER']}),record('foreign',{year:1936,countries:['FRA']}),record('missing',{countries:['GER']}),record('other_kind',{year:1936,countries:['GER']},'technology')].forEach(e=>service.store.insert(e));
    const get=(params:Record<string,string>)=>fetch(service.url+'/api/v1/entries?'+new URLSearchParams(params)).then(r=>r.json());
    assert.equal((await get({id:'infantry_equipment_1',kind:'equipment',year:'1936'})).total,1);
    for(const year of ['1935','1937'])assert.equal((await get({id:'infantry_equipment_1',year})).total,0);
    const combined=await get({q:'infantry',kind:'equipment',country:'GER',year:'1936'});assert.deepEqual(combined.entries.map((e:Entry)=>e.id),['infantry_equipment_1']);
    assert.equal((await get({q:'infantry',kind:'equipment',year:'1936'})).total,2);
    assert.equal((await get({q:'infantry',kind:'equipment',country:'GER'})).total,3);
    assert.equal((await get({q:'infantry',kind:'technology',country:'GER',year:'1936'})).entries[0].id,'other_kind');
    assert.equal((await get({q:'infantry',kind:'equipment',country:'ITA',year:'1936'})).total,0);
  }finally{await service.close();remove(directory);}
});
