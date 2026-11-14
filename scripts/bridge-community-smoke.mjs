// Exercise the registered upstream server THROUGH Codex's app-server, without a model turn.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pin=JSON.parse(fs.readFileSync(path.join(root,'integrations/hoi4-agent-tools.json'),'utf8'));
const binary=process.argv[2]||process.env.CODEX_BIN;
if(!binary)throw new Error('Supply the installed Codex executable path (or CODEX_BIN)');
const evidence=path.join(root,'.bridge-local/agent-tools');fs.mkdirSync(evidence,{recursive:true});
const child=spawn(binary,['app-server','--stdio'],{cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe']});
const pending=new Map();let sequence=0;let stderr='';
function failPending(error){for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();}
child.once('error',failPending);
child.once('exit',()=>failPending(new Error('Codex diagnostic process exited')));
child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-12000);});
const lines=createInterface({input:child.stdout});
lines.on('line',line=>{
  let message;try{message=JSON.parse(line);}catch{return;}
  if(message.id!==undefined&&pending.has(message.id)){
    const p=pending.get(message.id);pending.delete(message.id);clearTimeout(p.timer);
    message.error?p.reject(new Error(JSON.stringify(message.error))):p.resolve(message.result);
  }else if(message.id!==undefined&&message.method){
    // No permission, elicitation or sampling is implicitly granted by this diagnostic.
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'Unsupported diagnostic request'}})+'\n');
  }
});
function rpc(method,params={}){
  return new Promise((resolve,reject)=>{
    const id=++sequence;
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`${method} exceeded 150 seconds`));},150000);
    pending.set(id,{resolve,reject,timer});
    child.stdin.write(JSON.stringify({id,method,params})+'\n');
  });
}
function save(name,value){fs.writeFileSync(path.join(evidence,name+'.json'),JSON.stringify(value,null,2)+'\n');}
function data(result){assert.notEqual(result.isError,true);const value=result.structuredContent??JSON.parse(result.content.find(c=>c.type==='text').text);assert.equal(value.status,'ok',JSON.stringify(value.blockers));assert.deepEqual(value.changedFiles,[]);return value.data;}
let threadId;
try{
  save('codex-initialize',await rpc('initialize',{clientInfo:{name:'hoi4-community-verification',version:'1.0.0'},capabilities:{experimentalApi:true}}));
  child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');
  const session=await rpc('thread/start',{cwd:root,ephemeral:true});threadId=session.thread.id;
  const inventory=await rpc('mcpServerStatus/list',{threadId,serverName:pin.serverName});save('codex-tools',inventory);
  const server=inventory.data.find(s=>s.name===pin.serverName);assert.ok(server,'Registered server not discovered');
  const names=Object.keys(server.tools);assert.deepEqual(names.sort(),[...pin.enabledTools].sort());
  console.log(`Codex discovered ${names.length} allowed tools`);
  async function call(label,tool,args){const result=await rpc('mcpServer/tool/call',{threadId,server:pin.serverName,tool,arguments:{workspaceId:'companion',...args}});save(label,result);return data(result);}
  const focus=await call('focus-source','hoi4.source_lookup',{symbol:'GER_prioritize_economic_growth',kind:'focus',includeReferences:false,maxLines:15});
  assert.equal(focus.complete,true);assert.equal(focus.definitionCount,1);
  assert.equal(focus.definitions[0].id,'GER_prioritize_economic_growth');
  assert.equal(focus.definitions[0].path,'game:common/national_focus/germany.txt');
  console.log('Focus source response saved');
  const good=await call('valid-script','hoi4.script_validate',{source:'add_political_power = 10',kind:'effect',scope:'country'});
  assert.equal(good.valid,true);assert.equal(good.parametersChecked,false);
  const bad=await call('invalid-script','hoi4.script_validate',{source:'companion_nonexistent_effect = 10',kind:'effect',scope:'country'});
  assert.notEqual(bad.valid,true);
  const docs=await call('documentation','hoi4.reference_search',{query:'add_political_power',sources:['game_doc'],limit:2});
  assert.ok(docs.results.some(r=>r.source==='game_doc'&&r.heading==='add_political_power'));
  let denied=false;
  try{const result=await rpc('mcpServer/tool/call',{threadId,server:pin.serverName,tool:'hoi4.focus_rewrite',arguments:{}});save('write-tool-rejection',result);denied=result.isError===true&&/disabled/.test(JSON.stringify(result));}catch(error){assert.match(String(error),/tool 'hoi4\.focus_rewrite' is disabled/);denied=true;save('write-tool-rejection',{error:String(error)});}
  assert.equal(denied,true,'Unlisted mutation tool was not rejected');
  save('smoke-summary',{revision:pin.revision,toolCount:names.length,focus,documentation:docs,validScript:good.valid,invalidScript:bad.valid,mutationRejected:denied,gameLaunches:0,modelTurns:0,transport:'Codex app-server MCP',checkedAt:new Date().toISOString()});
  console.log('Source lookup, documentation, positive/negative validation and mutation rejection completed');
}catch(error){save('smoke-failure',{error:String(error),stderr});throw error;}
finally{
  if(threadId){try{await rpc('thread/unsubscribe',{threadId});}catch{/* Always close this diagnostic process below. */}}
  lines.close();child.stdin.end();
  const cleanup=setTimeout(()=>child.kill(),2000);child.once('exit',()=>clearTimeout(cleanup));
  for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Diagnostic closed'));}pending.clear();
}
