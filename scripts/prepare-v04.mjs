// One-time integration of separately researched original content. No game writes.
import fs from 'node:fs';
import path from 'node:path';
if(fs.existsSync('server/discovery-content.json')&&JSON.parse(fs.readFileSync('server/discovery-content.json','utf8').replace(/^\uFEFF/,'' )).length)throw Error('Refuse to overwrite the reviewed guide catalog with the initial research import. Edit the versioned canonical content and retain its corrections.');
const root=path.resolve('..');
const guides=['priority-guides.json','europe-guides.json'].flatMap(file=>JSON.parse(fs.readFileSync(path.join(root,'evidence',file),'utf8').replace(/^\uFEFF/,'')));
const external={
 'usa-fascist':['https://hoi4.paradoxwikis.com/United_States','United States wiki research lead'],
 'british-elizabeth':['https://hoi4.paradoxwikis.com/British_events_MtG','British events wiki research lead'],
 'japan-secret-leaders':['https://hoi4.paradoxwikis.com/Japan','Japan wiki research lead']
};
for(const guide of guides){const link=external[guide.id];if(!link)continue;guide.sources.push({id:'wiki-lead',kind:'external',path:link[0],line:0,endLine:0,hash:'',label:link[1],author:'Paradox HOI4 Wiki contributors',accessedAt:'2026-11-03',reviewStatus:'Direct fetch returned 401. Full page and patch applicability unreviewed; link only.',rights:'No page text reproduced; original research-lead annotation only.'});guide.claims.push({id:'wiki-boundary',type:'lead',text:'This wiki link is a research lead. Its full route and patch applicability remain unreviewed; it does not establish an unlock condition.',sourceIds:['wiki-lead'],verification:'unverified'});}
fs.writeFileSync('server/discovery-content.json',JSON.stringify(guides,null,2)+'\n');
console.log(JSON.stringify({guides:guides.length,claims:guides.reduce((n,g)=>n+g.claims.length,0),references:guides.reduce((n,g)=>n+g.references.length,0),starters:guides.filter(g=>g.starter).length}));
