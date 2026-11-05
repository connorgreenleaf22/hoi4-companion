import fs from 'node:fs';
import path from 'node:path';
import {parseScript,collect} from '../server/parser';
import {discoverGame} from '../server/importer';

const game=process.argv[2]||discoverGame();
const source='mods/hoi4-companion-telemetry/common/on_actions/hoi4_companion_telemetry.txt';
const nodes=parseScript(fs.readFileSync(source,'utf8'));
const required:[string,string][]=[['documentation/effects_documentation.md','## log'],['documentation/dynamic_variables_documentation.md','### political_power'],['documentation/dynamic_variables_documentation.md','### stability'],['documentation/loc_objects_documentation.md','**GetTag**'],['common/on_actions/_documentation.md','`on_daily_TAG`'],['common/on_actions/_documentation.md','`on_startup`']];
const checks=required.map(([file,token])=>({file,token,found:fs.readFileSync(path.join(game,file),'utf8').includes(token)}));
if(collect(nodes,'log').length!==3||checks.some(c=>!c.found))throw new Error('Prototype preflight failed: '+JSON.stringify(checks));
console.log(JSON.stringify({level:'static-installed-documentation',version:JSON.parse(fs.readFileSync(path.join(game,'launcher-settings.json'),'utf8')).rawVersion,checks,limitations:'Syntax and documented primitives only; export expansion and scheduling require native evidence.'},null,2));
