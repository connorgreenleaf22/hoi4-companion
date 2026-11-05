// Read the pinned tool definitions, without invoking tools or changing Codex permissions.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const pin=JSON.parse(fs.readFileSync('integrations/hoi4-agent-tools.json','utf8'));
const source=path.resolve(pin.sourceDirectory);
if(execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim()!==pin.revision)throw Error('Unexpected source revision');
execFileSync('git',['-C',source,'diff','--exit-code','HEAD','--','src'],{windowsHide:true});
const root=path.join(source,'dist/hoi4_agent_tools/mcp');
const {taskToolCatalog}=await import(pathToFileURL(path.join(root,'server/task-tool-catalog.js')));
const {referenceTools}=await import(pathToFileURL(path.join(root,'tools/reference.js')));
const {jobControlTools}=await import(pathToFileURL(path.join(root,'tools/job.js')));
const tools=[...taskToolCatalog,...referenceTools,...jobControlTools].map(({name,title,description,annotations})=>({name,title,description,annotations,enabled:pin.enabledTools.includes(name),executionTestedHere:false}));
console.log(JSON.stringify({revision:pin.revision,version:pin.version,tools,privateOptInTools:['chaosx.visual_revision','chaosx.focus_country_assets'],meaning:'Metadata inventory only. See MCP-CAPABILITIES.md for prior execution evidence; compiled output must come from this reviewed source.'},null,2));
