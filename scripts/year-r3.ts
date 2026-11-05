import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {searchEntries} from '../server/search';
import type {Store} from '../server/store';

// Read-only reproduction and regression check against the retained disposable installed index.
const file=path.resolve('../candidate/artifacts/v0.2-installed-import/disposable-data/companion.sqlite');
const hash=(p:string)=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const before=hash(file),db=new DatabaseSync(file,{readOnly:true});const mode=process.argv.includes('--baseline')?'before':'after';
const store={db,getSetting(key:string,fallback:any){const row=db.prepare('SELECT value FROM settings WHERE key=?').get(key);return row?JSON.parse(String(row.value)):fallback;}} as Store;
try{
  const inputs=[
    {id:'infantry_equipment_1',kind:'equipment'},
    {id:'infantry_equipment_1',kind:'equipment',year:'1936'},
    {id:'infantry_equipment_1',kind:'equipment',year:'1935'},
    {id:'infantry_equipment_1',kind:'equipment',year:'1937'},
    {q:'infantry',kind:'equipment',year:'1936'},
    {id:'basic_machine_tools',kind:'technology',year:'1936'}
  ];
  const cases=inputs.map(input=>{const result=searchEntries(store,new URLSearchParams(input as Record<string,string>));return {input,total:result.total,ids:result.entries.map(e=>e.id)};});
  const entry=JSON.parse(String(db.prepare("SELECT payload FROM entries WHERE id='infantry_equipment_1' AND kind='equipment'").get()!.payload));
  const source=path.join('G:\\Steam Games\\steamapps\\common\\Hearts of Iron IV',entry.source);
  const passed=cases[0].total===1&&cases[1].total===1&&cases[2].total===0&&cases[3].total===0&&cases[4].ids.includes('infantry_equipment_1')&&cases[5].total===1;
  const report={at:new Date().toISOString(),mode,cases,declaredYear:entry.data.year,declaredYearType:typeof entry.data.year,statsYear:entry.data.stats.year,source:entry.source,sourceHash:hash(source),entryHash:entry.hash,cacheUnchanged:before===hash(file),passed,independentAcceptance:false};
  fs.mkdirSync('artifacts/year-fix-r3',{recursive:true});fs.writeFileSync(`artifacts/year-fix-r3/${mode}-installed.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  if(mode==='after'&&(!passed||!report.cacheUnchanged||report.sourceHash!==report.entryHash))process.exitCode=1;
}finally{db.close();}
