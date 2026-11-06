import fs from 'node:fs';
import path from 'node:path';
import {parseScript,collect} from '../server/parser';
import {discoverGame} from '../server/importer';
import {telemetryManifest as manifest,telemetryNumbers} from '../src/telemetry-manifest';
const game=process.argv[2]||discoverGame();
const sources=['common/on_actions/hoi4_companion_telemetry.txt','common/scripted_effects/hoi4_companion_telemetry.txt'];
const nodes=sources.flatMap(file=>parseScript(fs.readFileSync(path.join('mods/hoi4-companion-telemetry',file),'utf8')));
const required:[string,string][]=[['documentation/effects_documentation.md','## log'],['documentation/effects_documentation.md','## set_temp_variable'],...['political_power','stability',...Object.values(telemetryNumbers).map(n=>n.variable)].map(key=>['documentation/dynamic_variables_documentation.md','### '+key] as [string,string]),...['has_completed_focus','has_tech','is_researching_technology','is_ai'].map(key=>['documentation/triggers_documentation.md','## '+key] as [string,string]),['documentation/loc_objects_documentation.md','**GetTag**'],['common/on_actions/_documentation.md','`on_daily_TAG`'],['common/on_actions/_documentation.md','`on_startup`']];
const checks=required.map(([file,token])=>({file,token,found:fs.readFileSync(path.join(game,file),'utf8').includes(token)}));
const version=JSON.parse(fs.readFileSync(path.join(game,'launcher-settings.json'),'utf8')).rawVersion;
if(version!==manifest.gameVersion||collect(nodes,'log').length!==2||checks.some(c=>!c.found))throw Error('Telemetry preflight failed: '+JSON.stringify({version,checks}));
function files(root:string):string[]{return fs.readdirSync(root,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(root,d.name)):d.name.endsWith('.txt')?[path.join(root,d.name)]:[]);}
const identifiers=[...manifest.focuses.map(id=>({id,root:'common/national_focus',pattern:new RegExp('\\bid\\s*=\\s*'+id+'\\b')})),...manifest.technologies.map(id=>({id,root:'common/technologies',pattern:new RegExp('\\b'+id+'\\s*=\\s*\\{')}))].map(({id,root,pattern})=>({id,sources:files(path.join(game,root)).filter(file=>pattern.test(fs.readFileSync(file,'utf8'))).map(file=>path.relative(game,file))}));
if(identifiers.some(i=>i.sources.length!==1))throw Error('Missing/ambiguous manifest IDs: '+JSON.stringify(identifiers));
console.log(JSON.stringify({level:'static-installed-documentation',version,manifest,checks,identifiers,limitations:'Syntax, documented primitives and ID declarations only; runtime interpolation, semantics and timing need independent evidence.'},null,2));
