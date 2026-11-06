import {McpServer} from '@modelcontextprotocol/server';
import {serveStdio} from '@modelcontextprotocol/server/stdio';
import {bridgeTools} from './bridge/tools';
import {readMcpConnection} from './bridge/mcp-connection';

export function createBridgeMcp(connectionFile:string){
 const server=new McpServer({name:'hoi4-companion-bridge',version:'1.0.0'});
 for(const tool of bridgeTools)server.registerTool(tool.name,{description:tool.description,inputSchema:tool.schema,annotations:{readOnlyHint:tool.readOnly,destructiveHint:false,openWorldHint:false}},async(args:unknown)=>{
  try{
   // Re-read after app restart; never follow a redirect with the bearer credential.
   const connection=readMcpConnection(connectionFile);
   const response=await fetch(connection.url,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+connection.token},body:JSON.stringify({tool:tool.name,args}),signal:AbortSignal.timeout(15000)});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Local bridge rejected request');
   return {content:[{type:'text' as const,text:JSON.stringify(data)}],structuredContent:data};
  }catch(error){return {isError:true,content:[{type:'text' as const,text:'Bridge unavailable or request refused: '+String(error)+'. Open the matching companion build and check its connection descriptor.'}]};}
 });
 return server;
}
const connectionFile=process.env.HOI4_BRIDGE_CONNECTION;
if(!connectionFile)throw Error('Set HOI4_BRIDGE_CONNECTION to the running companion data directory/bridge-connection.json');
serveStdio(()=>createBridgeMcp(connectionFile));
