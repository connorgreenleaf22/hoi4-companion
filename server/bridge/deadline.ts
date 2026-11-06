import type {ProcessIdentity} from './owned-session';

export interface DeadlineRuntime {
 now():number; monotonic():number; sleep(ms:number):Promise<void>;
 stopped():boolean; terminate(expected:ProcessIdentity):void;
 finish(result:{reason:string;outcome:'terminated'|'refused';detail:string}):void;
}
/** Immutable wall + monotonic deadline. Corrupt stop state fails closed, never disables supervision. */
export async function superviseOwnedTest(expected:ProcessIdentity,deadline:number,runtime:DeadlineRuntime){
 if(!Number.isFinite(deadline))throw Error('Invalid native deadline');
 const remaining=Math.max(0,deadline-runtime.now()),start=runtime.monotonic();
 let reason='deadline';
 while(runtime.now()<deadline&&runtime.monotonic()-start<remaining){
  try{if(runtime.stopped()){reason='emergency-stop';break;}}
  catch{reason='invalid-budget';break;}
  await runtime.sleep(Math.min(250,Math.max(0,deadline-runtime.now()),Math.max(0,remaining-(runtime.monotonic()-start))));
 }
 let outcome:'terminated'|'refused'='terminated',detail='Exact owned process terminated; profile still requires archival';
 try{runtime.terminate(expected);}catch(error){outcome='refused';detail=String(error);}
 runtime.finish({reason,outcome,detail});
}
