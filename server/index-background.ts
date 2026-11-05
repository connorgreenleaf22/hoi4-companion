import {Worker} from 'node:worker_threads';
import type {Meta} from '../src/types';

/** Resolve after worker exit, not just its message: the temporary indexing heap is gone. */
export function indexInBackground(workerPath:string,directory:string,root:string):Promise<Meta>{
  return new Promise((resolve,reject)=>{
    const worker=new Worker(workerPath,{workerData:{directory,root}});let result:Meta|undefined;
    const timeout=setTimeout(()=>{void worker.terminate();reject(Error('Installed reference indexing exceeded the five-minute limit.'));},300000);
    worker.on('message',(meta:Meta)=>{result=meta;});
    worker.once('error',error=>{clearTimeout(timeout);reject(error);});
    worker.once('exit',code=>{clearTimeout(timeout);if(code!==0||!result)reject(Error(`Reference index worker exited without a result (${code}).`));else resolve(result);});
  });
}
