import type {ActionReceipt,BridgeAction,BridgeCapability,BridgeMode,BridgeSnapshot} from '../../src/bridge-types';
import {BridgeDatabase,digest,freshness} from './telemetry';

/** Adapters require explicit session registration and version constraints; dispatch never proves success. */
export interface ActionAdapter {
  capability:string; commands:string[]; verifiedVersions:string[];
  validate(action:BridgeAction,before:BridgeSnapshot):string|null;
  stateFresh?(before:BridgeSnapshot):boolean;
  execute(action:BridgeAction,signal:AbortSignal):Promise<void>;
  verify(action:BridgeAction,before:BridgeSnapshot,signal:AbortSignal):Promise<{outcome:'success'|'failure'|'unknown';snapshotId?:string;reason:string}>;
}
export class ActionGateway {
  constructor(private db:BridgeDatabase,private context:()=>{mode:BridgeMode;snapshot:BridgeSnapshot|null},private adapters:ActionAdapter[]=[],private grants=new Set<string>()){}
  capabilities():BridgeCapability[]{return [...new Set(['game.pause','game.resume',...this.adapters.map(a=>a.capability)])].map(id=>({id,available:this.adapters.some(a=>a.capability===id),reason:this.adapters.some(a=>a.capability===id)?'Registered adapter; authorization and preconditions still required':'No independently verified compatible native adapter registered',evidence:'unverified'}));}
  stop(){this.db.set('emergency-stop',true);return {stopped:true,meaning:'Prevents subsequent dispatch. Does not undo an executed action or guarantee cancellation of an in-flight input.'};}
  receipt(id:string):ActionReceipt|null{const row=this.db.db.prepare('SELECT payload FROM receipts WHERE id=?').get(id);return row?JSON.parse(String(row.payload)):null;}
  private assess(a:BridgeAction){
    const context=this.context(),before=context.snapshot,adapter=this.adapters.find(x=>x.capability===a.requiredCapability&&x.commands.includes(a.command));
    let reason='';
    if(context.mode!=='control'||a.mode!=='control')reason='Gameplay commands are forbidden outside Control Mode';
    else if(this.db.get('emergency-stop',false))reason='Emergency stop is latched';
    else if(a.authorization!=='local-grant'||!this.grants.has(a.controllerId))reason='Controller has no local authorization grant';
    else if(!adapter)reason='Unsupported capability or command';
    else if(!a.parameters||typeof a.parameters!=='object'||Array.isArray(a.parameters)||!a.verification||a.verification.policy!=='independent-readback'||!Number.isInteger(a.verification.timeoutMs)||a.verification.timeoutMs<1||a.verification.timeoutMs>30000)reason='Invalid parameters or verification policy';
    else if(!before||!(adapter.stateFresh?adapter.stateFresh(before):freshness(before).status==='recent-log-write')||before.sessionId!==a.sessionId||before.id!==a.expected?.snapshotId||before.values.country.status!=='observed'||before.values.country.value!==a.expected.country||before.gameVersion!==a.expected.gameVersion)reason='Session, freshness or expected state does not match';
    else if(!before.gameVersion||!adapter.verifiedVersions.includes(before.gameVersion))reason='Adapter is not verified for this game version';
    else if(this.db.db.prepare('SELECT request FROM controller_lock WHERE id=1').get())reason='Another controller action is in flight or needs reconciliation';
    else reason=adapter.validate(a,before)||'';
    return {reason,before,adapter};
  }
  validate(input:unknown){
    const a=input as BridgeAction;
    if(!a||a.schemaVersion!==1||typeof a.requestId!=='string'||!/^[-\w]{1,100}$/.test(a.requestId)||typeof a.sessionId!=='string'||a.sessionId.length>100||typeof a.command!=='string'||a.command.length>100)return {schemaVersion:1,allowed:false,reason:'Invalid action envelope',execution:false};
    const prior=this.receipt(a.requestId);if(prior)return {schemaVersion:1,allowed:false,reason:'Request already has a receipt; retrieve it without re-execution',execution:false,receipt:prior};
    const {reason}=this.assess(a);return {schemaVersion:1,allowed:!reason,reason:reason||'Preconditions pass at validation time; execution still requires revalidation',execution:false};
  }
  async submit(input:unknown):Promise<ActionReceipt>{
    const a=input as BridgeAction;
    if(!a||a.schemaVersion!==1||typeof a.requestId!=='string'||!/^[-\w]{1,100}$/.test(a.requestId)||typeof a.sessionId!=='string'||a.sessionId.length>100||typeof a.command!=='string'||a.command.length>100)throw new Error('Invalid action envelope');
    const fingerprint=digest(JSON.stringify(a));
    const make=(status:ActionReceipt['status'],reason:string,afterSnapshotId?:string):ActionReceipt=>({schemaVersion:1,requestId:a.requestId,sessionId:a.sessionId,command:a.command,status,reason,recordedAt:new Date().toISOString(),beforeSnapshotId:a.expected?.snapshotId,afterSnapshotId});
    const write=(receipt:ActionReceipt)=>{this.db.db.prepare('INSERT OR REPLACE INTO receipts VALUES(?,?,?)').run(a.requestId,fingerprint,JSON.stringify(receipt));return receipt;};
    let adapter:ActionAdapter|undefined;let before:BridgeSnapshot|null=null;
    this.db.db.exec('BEGIN IMMEDIATE');
    try{
      const prior=this.db.db.prepare('SELECT fingerprint,payload FROM receipts WHERE id=?').get(a.requestId);
      if(prior){this.db.db.exec('COMMIT');return prior.fingerprint===fingerprint?JSON.parse(String(prior.payload)):make('rejected','Request ID already belongs to a different action; original receipt retained');}
      const assessment=this.assess(a);before=assessment.before;adapter=assessment.adapter;
      const reason=assessment.reason;
      if(reason){const result=write(make('rejected',reason));this.db.db.exec('COMMIT');return result;}
      // Write-ahead receipt prevents retries after a crash from redispatching an uncertain action.
      write(make('uncertain','Reserved before dispatch; reconcile if execution is interrupted'));
      this.db.db.prepare('INSERT INTO controller_lock VALUES(1,?)').run(a.requestId);
      this.db.db.exec('COMMIT');
    }catch(error){if(this.db.db.isTransaction)this.db.db.exec('ROLLBACK');throw error;}
    const controller=new AbortController();let expired=false;let timer:ReturnType<typeof setTimeout>|undefined;
    const operation=(async()=>{
      try{
        if(this.db.get('emergency-stop',false))return make('rejected','Emergency stop before dispatch');
        await adapter!.execute(a,controller.signal);
        if(controller.signal.aborted)return make('uncertain','Execution finished after deadline; reconciliation required');
        const result=await adapter!.verify(a,before!,controller.signal);
        if(result.outcome==='success'&&(!result.snapshotId||result.snapshotId===before!.id))return make('uncertain','Readback did not provide distinct result evidence');
        return make(result.outcome==='success'?'confirmed-success':result.outcome==='failure'?'confirmed-failure':'uncertain',result.reason,result.snapshotId);
      }catch(error){return make('uncertain',`Adapter error after reservation: ${String(error)}`);}
    })();
    // Keep the shared lock until the adapter actually settles, even after returning a timeout.
    void operation.then(()=>{this.db.db.prepare('DELETE FROM controller_lock WHERE request=?').run(a.requestId);}).catch(()=>{});
    const timeout=new Promise<ActionReceipt>(resolve=>{timer=setTimeout(()=>{expired=true;controller.abort();resolve(make('timeout','Deadline exceeded; outcome unknown. Retry only the same request ID to retrieve this receipt.'));},a.verification.timeoutMs);});
    const result=await Promise.race([operation,timeout]);if(timer)clearTimeout(timer);
    return write(expired?make('timeout','Deadline exceeded; outcome unknown. No automatic redispatch.'):result);
  }
}
