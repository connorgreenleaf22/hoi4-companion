// Explicit local installed-source readback; excluded from hosted fixture CI. Never launches HOI4.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {parseScript,plain,numeric,block,children} from '../server/parser';
import {projectDefinition,digest} from '../server/design-evaluation/source';
import {evaluateDesign} from '../server/design-evaluation';
import {entries,meta,scenario,candidates,fixtureSource} from '../tests/fixtures/design-evaluation/corpus';
const root=path.resolve(process.argv[2]||'');
if(!process.argv[2])throw Error('Supply an installed game root explicitly; this audit is read-only.');
const version=JSON.parse(fs.readFileSync(path.join(root,'launcher-settings.json'),'utf8')).rawVersion;
assert.equal(version,meta.gameVersion,'Changed game version: establish a separately reviewed qualification.');
const files=[...new Set(entries.map(e=>e.source))],rebuilt=[];
for(const source of files){
  const text=fs.readFileSync(path.join(root,source),'utf8'),hash=createHash('sha256').update(text).digest('hex');
  assert.ok(entries.filter(e=>e.source===source).every(e=>e.hash===hash),'Changed source hash: '+source);
  const parsed=parseScript(text);
  for(const entry of entries.filter(e=>e.source===source)){
    const wrapper=entry.kind==='unit'?'sub_units':entry.kind==='equipment'?'equipments':'technologies';
    const matches=children(parsed,wrapper).flatMap(n=>Array.isArray(n.value)?n.value:[]).filter(n=>n.key===entry.id&&Array.isArray(n.value));
    assert.equal(matches.length,1,'Ambiguous or absent raw definition: '+entry.id);
    const node=matches[0],nodes=node.value as ReturnType<typeof parseScript>;
    const data={...plain(nodes),stats:numeric(nodes),nodes,...(entry.kind==='unit'?{need:numeric(block(nodes,'need')),support:plain(nodes).group==='support'&&plain(nodes).regimental==='no'}:{})};
    const projected=projectDefinition({...entry,line:node.line,hash,version,data});
    assert.equal(digest(projected),digest(entry),'Raw declaration/index projection mismatch: '+entry.id);rebuilt.push(projected);
  }
}
for(const candidate of candidates){const r=evaluateDesign(fixtureSource(rebuilt),{schemaVersion:1,candidate,scenario});assert.equal(r.status,'evaluated',JSON.stringify(r.diagnostics));}
console.log(JSON.stringify({passed:true,gameVersion:version,sourceFiles:files.length,definitions:rebuilt.length,candidates:candidates.length,scope:'Read-only source hashes and raw parsed declarations independently match importer-derived fixtures; no engine or current-campaign verification.'},null,2));
