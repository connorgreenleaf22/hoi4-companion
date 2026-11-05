import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {openStore} from '../server/store';
import {searchEntries} from '../server/search';
import {declaredYear} from '../src/year';

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-unicode-r4-')),store=openStore(directory),mode=process.argv.includes('--baseline')?'before':'after';
try{
  const cases=[['nbsp','\u00a01936\u00a0'],['bom','\ufeff1936\ufeff']].map(([id,year])=>{
    store.insert({id,uid:`equipment:fixture:${id}`,kind:'equipment',title:id,description:'',source:'fixture',line:1,hash:'fixture',version:'fixture',data:{year}});
    const result=searchEntries(store,new URLSearchParams({id,year:'1936'}));const bookmarkYear=declaredYear({year});return {id,codePoints:[...year].map(c=>c.codePointAt(0)),regularTotal:result.total,bookmarkYear,consistent:result.total===1&&bookmarkYear===1936};
  });
  const cache=new DatabaseSync(path.resolve('../candidate/artifacts/v0.2-installed-import/disposable-data/companion.sqlite'),{readOnly:true});
  let installedCorpus;try{installedCorpus={textYears:Number(cache.prepare("SELECT COUNT(*) AS n FROM entries WHERE json_type(payload,'$.data.year')='text'").get()!.n),nbspOrBomYears:Number(cache.prepare("SELECT COUNT(*) AS n FROM entries WHERE json_type(payload,'$.data.year')='text' AND (instr(json_extract(payload,'$.data.year'),char(160))>0 OR instr(json_extract(payload,'$.data.year'),char(65279))>0)").get()!.n)};}finally{cache.close();}
  const report={at:new Date().toISOString(),mode,cases,installedCorpus,passed:cases.every(c=>c.consistent),method:'Disposable source SQL/helper fixture; read-only retained installed-corpus count. No native or engine claim.',independentAcceptance:false};
  fs.mkdirSync('artifacts/unicode-year-r4',{recursive:true});fs.writeFileSync(`artifacts/unicode-year-r4/${mode}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(mode==='after'&&!report.passed)process.exitCode=1;
}finally{store.db.close();if(!path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep))throw new Error('Unexpected fixture path');fs.rmSync(directory,{recursive:true,force:true});}
