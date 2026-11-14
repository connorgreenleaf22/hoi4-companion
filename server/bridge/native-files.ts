import fs from 'node:fs';
/** Append-only records avoid replacing a file another Windows supervisor is reading. */
export function writeHeartbeat(file:string,sessionId:string,sequence:number){fs.appendFileSync(file,JSON.stringify({sessionId,sequence})+'\n');}
export function readHeartbeat(file:string):{sessionId:string;sequence:number}|null{
 if(!fs.existsSync(file))return null;const fd=fs.openSync(file,'r');try{
  const size=fs.fstatSync(fd).size;if(size>4*1024*1024)throw Error('Heartbeat exceeds bounded run size');
  const bytes=Buffer.alloc(Math.min(size,2048));const count=fs.readSync(fd,bytes,0,bytes.length,Math.max(0,size-bytes.length));const text=bytes.subarray(0,count).toString('utf8');const end=text.lastIndexOf('\n');if(end<0)return null;
  const start=text.lastIndexOf('\n',end-1)+1;return JSON.parse(text.slice(start,end));
 }finally{fs.closeSync(fd);}
}
/** A reader sees the old or complete new budget. Bounded sharing-violation retries never execute an action. */
export function writeNativeJson(file:string,value:unknown){
 const temporary=file+'.'+process.pid+'.tmp';fs.writeFileSync(temporary,JSON.stringify(value,null,2));
 for(let attempt=0;;attempt++)try{fs.renameSync(temporary,file);return;}catch(error:any){if(attempt>=20||!['EPERM','EACCES','EBUSY'].includes(error.code))throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5);}
}
