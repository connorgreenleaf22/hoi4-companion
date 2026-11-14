import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Client} from '@modelcontextprotocol/client';import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {startServer} from '../server/api';import {readMcpConnection} from '../server/bridge/mcp-connection';
import {BridgeDatabase,TelemetryReader} from '../server/bridge/telemetry';
const wire=(date:string)=>`[${date}] HC_BRIDGE|v2|state|producer=fixture|manifest=ger-m65-1|tag=GER|n=2,0.81,0.35,4,35,28,10|f=0,0|t=1,0,0|r=0,1,0|END\n`;
test('date rollback splits historical sessions without inventing a supported loaded-game lifecycle',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-rollback-')),db=new BridgeDatabase(root),log=path.join(root,'game.log');try{
  fs.writeFileSync(log,wire('1936.02.01.24'));const reader=new TelemetryReader(db,log,'1.19.4.2'),first=reader.poll()[0];fs.appendFileSync(log,wire('1936.01.01.24'));const second=reader.poll()[0];assert.notEqual(first.sessionId,second.sessionId);assert.equal(second.ownership,undefined);
 }finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('real stdio MCP and UI HTTP share observation state, receipt store and stop latch with no execution tool',{timeout:30000},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-m7-')),game=path.join(root,'game'),data=path.join(root,'data'),log=path.join(root,'game.log');fs.mkdirSync(game);fs.writeFileSync(path.join(game,'hoi4.exe'),'fixture');fs.writeFileSync(path.join(game,'launcher-settings.json'),JSON.stringify({rawVersion:'1.19.4.2'}));fs.writeFileSync(log,wire('1936.01.01.24')+wire('1936.01.02.24'));
 const app=await startServer({dataDir:data,port:0,autoIndex:false,bridge:{gameRoot:game,userRoot:path.join(root,'profile')}}),connectionFile=path.join(data,'bridge-connection.json');
 const client=new Client({name:'m7-integration-test',version:'1.0.0'}),transport=new StdioClientTransport({command:process.execPath,args:['--import','tsx',path.resolve('server/bridge-mcp.ts')],cwd:process.cwd(),env:{...process.env as Record<string,string>,HOI4_BRIDGE_CONNECTION:connectionFile},stderr:'pipe'});
 try{
  const unauth=await fetch(app.url+'/api/v1/bridge/mcp',{method:'POST',body:JSON.stringify({tool:'hoi4_bridge_environment',args:{}})});assert.equal(unauth.status,401);
  const connection=readMcpConnection(connectionFile);assert.ok(connection.url.startsWith(app.url));
  const foreign=await fetch(connection.url,{method:'POST',headers:{Origin:'https://untrusted.example',Authorization:'Bearer '+connection.token},body:'{}'});assert.equal(foreign.status,403);
  await client.connect(transport);const tools=await client.listTools();assert.equal(tools.tools.length,15);assert.ok(!tools.tools.some(t=>/execute|submit/.test(t.name)));
  const call=async(name:string,args:Record<string,unknown>={})=>{const response=await client.callTool({name,arguments:args});assert.ok(!response.isError,JSON.stringify(response));return (response.structuredContent as any).data;};
  assert.equal((await call('hoi4_bridge_environment')).version,'1.19.4.2');
  const connected=await call('hoi4_bridge_connect',{source:'log',path:log});assert.equal(connected.connection.state,'log-monitoring');
  const ui=await fetch(app.url+'/api/v1/bridge/platform/status').then(r=>r.json());assert.equal(ui.connection.state,'log-monitoring');assert.equal(ui.observations[0].classification,'historical');
  const history=await call('hoi4_bridge_history');assert.equal(history.snapshots.length,2);
  const comparison=await call('hoi4_bridge_compare',{before:history.snapshots[0].id,after:history.snapshots[1].id});assert.match(comparison.interpretation,/not completion events/);
  fs.appendFileSync(log,wire('1936.01.03.24'));await new Promise(resolve=>setTimeout(resolve,5300));assert.equal((await call('hoi4_bridge_history')).snapshots.length,3);
  const save=path.join(root,'disposable.hoi4');fs.copyFileSync(new URL('./fixtures/bridge-save-1.19.4.2.txt',import.meta.url),save);
  const saved=await call('hoi4_bridge_save_inspect',{path:save});
  assert.equal(saved.classification,'save-derived');assert.equal(saved.sessionId,null);
  assert.equal(saved.provenance.freshness,'persisted-state');assert.equal(saved.provenance.sessionBinding,'unverified');
  assert.equal(saved.fields.storedFocusProgress.raw,'10');assert.equal(saved.fields.playerCountry.qualification,'parsed-unqualified');
  assert.ok(Object.values(saved.fields).every((field:any)=>field.qualification!=='native-verified'));
  assert.equal((await call('hoi4_bridge_focus_research')).find((s:any)=>s.source.kind==='plaintext-save').fields.currentFocus.status,'unavailable');
  const action={schemaVersion:1,requestId:'dry-run',sessionId:'not-live',command:'focus.select',mode:'control'};
  assert.equal((await call('hoi4_bridge_action_validate',{action})).allowed,false);assert.equal(await call('hoi4_bridge_receipt',{requestId:'dry-run'}),null);
  const submit=await fetch(app.url+'/api/v1/bridge/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)}).then(r=>r.json());assert.equal(submit.status,'rejected');assert.equal((await call('hoi4_bridge_receipt',{requestId:'dry-run'})).status,'rejected');
  await call('hoi4_bridge_emergency_stop');assert.equal((await fetch(app.url+'/api/v1/bridge/status').then(r=>r.json())).emergencyStop,true);assert.equal((await call('hoi4_bridge_connection')).state,'stopped');
  const forbidden=await client.callTool({name:'hoi4_bridge_connect',arguments:{source:'log',path:log}});assert.equal(forbidden.isError,true);
  assert.equal((await call('hoi4_bridge_history')).snapshots.length,3);
 }finally{await client.close();await transport.close();await app.close();assert.equal(fs.existsSync(connectionFile),false);fs.rmSync(root,{recursive:true,force:true});}
});
