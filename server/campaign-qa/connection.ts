import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
/** Separate credential: the Q&A token cannot authorize the existing 15-tool endpoint. */
export class QaConnection {
 private token=randomBytes(32).toString('hex');
 readonly file:string;
 constructor(directory:string){this.file=path.join(directory,'campaign-qa-connection.json');}
 accepts(header:string|undefined){const actual=Buffer.from(header||''),expected=Buffer.from('Bearer '+this.token);return actual.length===expected.length&&timingSafeEqual(actual,expected);}
 publish(port:number){fs.writeFileSync(this.file,JSON.stringify({schemaVersion:1,url:`http://127.0.0.1:${port}/api/v1/campaign-qa/query`,token:this.token}),{mode:0o600});}
 close(){try{if(JSON.parse(fs.readFileSync(this.file,'utf8')).token===this.token)fs.unlinkSync(this.file);}catch{}}
}
export function readQaConnection(file:string){
 if(!path.isAbsolute(file)||fs.statSync(file).size>8192)throw Error('Invalid Q&A descriptor');
 const c=JSON.parse(fs.readFileSync(file,'utf8'));
 if(c.schemaVersion!==1||typeof c.url!=='string'||!/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}\/api\/v1\/campaign-qa\/query$/.test(c.url)||!Number.isInteger(Number(new URL(c.url).port))||Number(new URL(c.url).port)>65535||!/^[a-f0-9]{64}$/.test(c.token))throw Error('Invalid Q&A descriptor');
 return c as {url:string;token:string};
}
