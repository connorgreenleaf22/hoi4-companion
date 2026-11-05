export type CloseState={pendingWrites:number;unsavedDrafts:number};
type Choice='stay'|'review'|'discard';
export function closeState(value:unknown):CloseState{
  if(value===undefined||value===null)return {pendingWrites:0,unsavedDrafts:0};
  const input=value as CloseState;
  if(![input.pendingWrites,input.unsavedDrafts].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000))throw Error('Invalid renderer close state.');
  return {pendingWrites:input.pendingWrites,unsavedDrafts:input.unsavedDrafts};
}
/** No persistence: closing never resolves a draft by saving it or overwriting a profile. */
export function createCloseGuard(actions:{read:()=>Promise<unknown>;choose:()=>Promise<Choice>;review:()=>void;pending:()=>Promise<void>;failed:()=>Promise<void>;close:()=>void}){
  let busy=false,approved=false,discarded=false;
  async function request(forcePrompt=false){
    if(busy)return;busy=true;
    try{
      const state=closeState(await actions.read());
      if(state.pendingWrites){await actions.pending();return;}
      if(state.unsavedDrafts||forcePrompt){
        const choice=await actions.choose();if(choice==='stay')return;
        if(choice==='review'){actions.review();return;}
        // A save could have begun while the dialog was being prepared.
        if(closeState(await actions.read()).pendingWrites){await actions.pending();return;}
        discarded=true;
      }
      approved=true;actions.close();
    }catch{approved=false;discarded=false;await actions.failed();}
    finally{busy=false;}
  }
  return {request,isApproved:()=>approved,discardConfirmed:()=>discarded,blocked:()=>{approved=false;discarded=false;}};
}
