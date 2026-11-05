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

// Independent oracle: ECMAScript whitespace/line terminators, including NBSP and BOM.
const whitespace=[0x0009,0x000a,0x000b,0x000c,0x000d,0x0020,0x00a0,0x1680,0x2000,0x2001,0x2002,0x2003,0x2004,0x2005,0x2006,0x2007,0x2008,0x2009,0x200a,0x2028,0x2029,0x202f,0x205f,0x3000,0xfeff];
const entry=(id:string,data:Entry['data'],kind='equipment'):Entry=>({id,uid:`${kind}:fixture:${id}`,kind,title:`Unicode ${id}`,description:'',source:'fixture',line:1,hash:'fixture',version:'test',data});
const remove=(directory:string)=>{assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(directory,{recursive:true,force:true});};

test('regular and bookmark years agree for all 25 edge-whitespace characters without stripping interior or invalid data',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-unicode-r4-')),store=openStore(directory);
  const vectors:{id:string;data:Entry['data'];expected?:number}[]=[];
  for(const cp of whitespace){const c=String.fromCodePoint(cp);vectors.push({id:`primary_${cp}`,data:{year:c+'1936'+c},expected:1936},{id:`fallback_${cp}`,data:{stats:{start_year:c+'1936'+c}},expected:1936});}
  vectors.push({id:'mixed',data:{year:'\ufeff\u00a0\t1936\r\u3000\u202f'},expected:1936},{id:'leading_nbsp',data:{year:'\u00a01936'},expected:1936},{id:'trailing_bom',data:{year:'1936\ufeff'},expected:1936},{id:'null_fallback',data:{year:null,stats:{start_year:'\ufeff1936\u00a0'}},expected:1936},{id:'precedence',data:{year:'\u00a01935\ufeff',stats:{start_year:1936}},expected:1935},{id:'zero',data:{year:'\ufeff0\u00a0'},expected:0},{id:'high',data:{year:'\u00a09999\ufeff'},expected:9999});
  for(const cp of [0x0000,0x0085,0x180e,0x200b,0x200d,0x202e,0x2060]){const c=String.fromCodePoint(cp);vectors.push({id:`not_whitespace_${cp}`,data:{year:c+'1936'+c}});}
  for(const [id,value]of Object.entries({interior_nbsp:'19\u00a036',interior_bom:'19\ufeff36',nul_tail:'1936\u0000',nul_suffix:'1936\u0000x',nul_inside:'19\u000036',fraction:'\ufeff1936.5\u00a0',suffix:'\u00a01936x\ufeff',boolean:'\ufefftrue\u00a0',nested:'\u00a0"1936"\ufeff',array:'\ufeff[1936]\u00a0',fullwidth:'\u00a0１９３６\ufeff',empty:'\ufeff\u00a0',nonfinite:'\ufeff1e999\u00a0'}))vectors.push({id,data:{year:value}});
  vectors.push({id:'invalid_primary',data:{year:'\u00a0unknown\ufeff',stats:{start_year:1936}}},{id:'missing',data:{}},{id:'boolean_value',data:{year:false}});
  try{
    vectors.forEach(v=>store.insert(entry(v.id,v.data)));
    for(const v of vectors)assert.equal(declaredYear(v.data),v.expected,v.id);
    for(const year of ['0000','1935','1936','1937','9999']){const result=searchEntries(store,new URLSearchParams({year,limit:'100'}));assert.deepEqual(result.entries.map(e=>e.id).sort(),vectors.filter(v=>v.expected===Number(year)).map(v=>v.id).sort(),year);}
  }finally{store.db.close();remove(directory);}
});

test('public Unicode year queries preserve category/country boundaries, exact IDs and source text',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-unicode-api-r4-')),service=await startServer({dataDir:directory,port:0,autoIndex:false});
  const nbsp='\u00a01936\u00a0',bom='\ufeff1936\ufeff';
  try{
    [entry('nbsp',{year:nbsp,countries:['GER']}),entry('bom',{year:bom,countries:['GER']}),entry('fallback',{stats:{start_year:bom},countries:['FRA']}),entry('other_kind',{year:nbsp,countries:['GER']},'technology'),entry('missing',{countries:['GER']})].forEach(e=>service.store.insert(e));
    const get=(params:Record<string,string>)=>fetch(service.url+'/api/v1/entries?'+new URLSearchParams(params)).then(r=>r.json());
    for(const id of ['nbsp','bom','fallback']){assert.equal((await get({id,kind:'equipment',year:'1936'})).total,1);for(const year of ['1935','1937'])assert.equal((await get({id,year})).total,0);}
    const both=await get({q:'unicode',kind:'equipment',country:'GER',year:'1936'});assert.deepEqual(both.entries.map((e:Entry)=>e.id).sort(),['bom','nbsp']);assert.equal(both.entries.find((e:Entry)=>e.id==='nbsp').data.year,nbsp);assert.equal(both.entries.find((e:Entry)=>e.id==='bom').data.year,bom);
    assert.equal((await get({q:'unicode',kind:'equipment',year:'1936'})).total,3);assert.equal((await get({q:'unicode',kind:'equipment',country:'GER'})).total,3);assert.equal((await get({q:'unicode',kind:'technology',year:'1936'})).total,1);
    const invalid=await fetch(service.url+'/api/v1/entries?'+new URLSearchParams({year:nbsp}));assert.equal(invalid.status,400);
  }finally{await service.close();remove(directory);}
});
