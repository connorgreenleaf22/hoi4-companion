// Explicit installed readback, excluded from hosted CI. Reads source only; never launches HOI4.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {parseScript,plain,numeric,children,block} from '../server/parser';import {digest} from '../server/design-evaluation/source';import {projectCombatInput} from '../server/combat-evaluation/source';
import inputs from '../tests/fixtures/combat-evaluation/inputs.json';
const root=process.argv[2];if(!root)throw Error('Supply the installed game root explicitly.');
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'launcher-settings.json'),'utf8')).rawVersion,'1.19.4.2');
const files=[...new Set(inputs.entries.map(e=>e.source))];
for(const source of files){
  const text=fs.readFileSync(path.join(root,source),'utf8'),hash=createHash('sha256').update(text).digest('hex'),nodes=parseScript(text);
  for(const entry of inputs.entries.filter(e=>e.source===source)){
    assert.equal(hash,entry.hash,'Changed source: '+source);
    const matches=children(nodes,entry.kind==='unit'?'sub_units':'equipments').flatMap(n=>Array.isArray(n.value)?n.value:[]).filter(n=>n.key===entry.id&&Array.isArray(n.value));
    assert.equal(matches.length,1);const node=matches[0],body=node.value as ReturnType<typeof parseScript>;
    assert.equal(digest(projectCombatInput({...entry,line:node.line,data:{...plain(body),stats:numeric(body),nodes:body,...(entry.kind==='unit'?{need:numeric(block(body,'need'))}:{})}})),digest(entry),'Changed declaration projection: '+entry.id);
  }
}
console.log(JSON.stringify({passed:true,gameVersion:'1.19.4.2',sourceFiles:files.length,sourceInputs:inputs.entries.length,qualifiedDivisionCombatMetrics:0,scope:'Raw declaration readback only; no aggregation or engine certification.'},null,2));
