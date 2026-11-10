import {McpServer} from '@modelcontextprotocol/server';
import {serveStdio} from '@modelcontextprotocol/server/stdio';
import {qaTools} from './campaign-qa/service';
import {readQaConnection} from './campaign-qa/connection';
const file=process.env.HOI4_QA_CONNECTION;
if(!file)throw Error('Set HOI4_QA_CONNECTION to the matching campaign-qa-connection.json');
serveStdio(()=>{
 const server=new McpServer({name:'hoi4-campaign-qa',version:'1.0.0'});
 for(const tool of qaTools)server.registerTool(tool.name,{description:tool.description,inputSchema:tool.schema,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},async(args:unknown)=>{
  try{
   const connection=readQaConnection(file);
   const response=await fetch(connection.url,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+connection.token},body:JSON.stringify({tool:tool.name,args}),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('Request refused');
   // Bound reads even if the local descriptor points at an incompatible service.
   const reader=response.body!.getReader();let size=0;const chunks:Uint8Array[]=[];
   try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>128*1024)throw Error('Response too large');chunks.push(r.value);}}finally{await reader.cancel();}
   const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(data.schemaVersion!=='hoi4-campaign-qa/1')throw Error('Contract mismatch');
   return {content:[{type:'text' as const,text:JSON.stringify(data)}],structuredContent:data};
  }catch{return {isError:true,content:[{type:'text' as const,text:'Q&A unavailable or request refused. Check the local monitor and matching Q&A descriptor. No gameplay command was attempted.'}]};}
 });
 return server;
});
