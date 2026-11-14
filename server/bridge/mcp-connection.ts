import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
export class McpConnection {
 private token=randomBytes(32).toString('hex');private instanceId=randomBytes(16).toString('hex');
 readonly file:string;
 constructor(directory:string){this.file=path.join(directory,'bridge-connection.json');}
 accepts(header:string|undefined){const actual=Buffer.from(header||''),expected=Buffer.from('Bearer '+this.token);return actual.length===expected.length&&timingSafeEqual(actual,expected);}
 publish(port:number){fs.writeFileSync(this.file,JSON.stringify({schemaVersion:1,url:`http://127.0.0.1:${port}/api/v1/bridge/mcp`,token:this.token,instanceId:this.instanceId,pid:process.pid},null,2),{mode:0o600});}
 close(){try{const current=JSON.parse(fs.readFileSync(this.file,'utf8'));if(current.instanceId===this.instanceId)fs.unlinkSync(this.file);}catch{/* Another instance or prior cleanup owns the path. */}}
}
export function readMcpConnection(file:string){
 if(!path.isAbsolute(file)||fs.statSync(file).size>8192)throw Error('Supply an absolute companion bridge-connection.json path');
 const value=JSON.parse(fs.readFileSync(file,'utf8'));
 if(value.schemaVersion!==1||typeof value.url!=='string'||!/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}\/api\/v1\/bridge\/mcp$/.test(value.url)||!/^[a-f0-9]{64}$/.test(value.token))throw Error('Invalid local bridge connection descriptor');
 new URL(value.url);return value as {schemaVersion:1;url:string;token:string};
}
