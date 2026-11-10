import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {qaTools} from '../../server/campaign-qa/service';
import {readQaConnection} from '../../server/campaign-qa/connection';
async function main(){
 const descriptor=process.argv[2];if(!descriptor)throw Error('Supply the absolute Q&A descriptor path');readQaConnection(descriptor);
 const client=new Client({name:'hoi4-qa-local-smoke',version:'1.0.0'}),transport=new StdioClientTransport({command:process.execPath,args:[path.resolve('build/campaign-qa-mcp.cjs')],env:{...process.env as Record<string,string>,HOI4_QA_CONNECTION:descriptor},stderr:'pipe'});
 const output=path.resolve('.bridge-local','qa-smoke-'+new Date().toISOString().replaceAll(':','-'));fs.mkdirSync(output,{recursive:true});
 try{
  await client.connect(transport);const catalog=await client.listTools();assert.deepEqual(catalog.tools.map(t=>t.name),qaTools.map(t=>t.name));
  const calls=[];
  for(const t of qaTools){const result=await client.callTool({name:t.name,arguments:t.name==='hoi4_qa_reference'?{id:'POR_estado_novo',kind:'focus'}:{}});assert.ok(!result.isError,`${t.name} failed`);assert.equal((result.structuredContent as any).schemaVersion,'hoi4-campaign-qa/1');fs.writeFileSync(path.join(output,t.name+'.json'),JSON.stringify(result.structuredContent,null,2),{mode:0o600});calls.push({tool:t.name,ok:true});}
  await assert.rejects(client.callTool({name:'hoi4_bridge_connect',arguments:{}}));
  const summary={schemaVersion:1,kind:'local-stdio-only',calls,toolCount:catalog.tools.length,controlsRefused:true,chatGptTunnelVerified:false,gameplayUsefulnessAccepted:false};
  fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({...summary,localEvidence:output},null,2));
 }finally{await client.close();await transport.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
