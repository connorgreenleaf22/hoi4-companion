import type {BridgeAction,BridgeSnapshot} from '../../src/bridge-types';
import type {ActionAdapter} from './actions';
import {OwnedSession} from './owned-session';

export class FocusSelectionAdapter implements ActionAdapter {
  capability='focus.select';commands=['focus.select'];verifiedVersions=['1.19.4.1'];
  constructor(private session:OwnedSession,private resolve:(id:string)=>boolean){}
  stateFresh=(s:BridgeSnapshot)=>this.session.focusFresh(s);
  validate(a:BridgeAction,before:BridgeSnapshot):string|null {
    if(a.sessionId!==this.session.manifest.sessionId||a.controllerId!==this.session.manifest.controllerId)return 'Session/controller not owned';
    if(this.session.check())return 'Owned session is disconnected or contradictory';
    const id=a.parameters.focusId;
    if(id!=='GER_prioritize_economic_growth'||!this.resolve(id))return 'Unsupported or unresolved focus identifier';
    if(!this.stateFresh(before)||before.focusObservation?.current.value!==null)return 'Fresh independently observed idle focus required';
    return null;
  }
  async execute(_action:BridgeAction,signal:AbortSignal){
    this.session.reserveInput();await this.session.tool('select',signal);
  }
  async verify(a:BridgeAction,_before:BridgeSnapshot,signal:AbortSignal){
    // No input in this readback. Read the actual politics-panel button, not a command timer.
    await new Promise<void>((resolve,reject)=>{const t=setTimeout(resolve,800);signal.addEventListener('abort',()=>{clearTimeout(t);reject(new Error('Readback aborted'));},{once:true});});
    const capture=await this.session.tool('observe',signal);
    const snapshot=this.session.recordFocus(capture);
    return {outcome:snapshot.focusObservation?.current.status==='observed'&&snapshot.focusObservation.current.value===a.parameters.focusId?'success' as const:'unknown' as const,snapshotId:snapshot.id,reason:snapshot.focusObservation?.current.status==='observed'&&snapshot.focusObservation.current.value===a.parameters.focusId?'Independent politics-panel OCR matched the target; see snapshot image evidence.':'Post-action focus was not independently confirmed; see snapshot image evidence.'};
  }
}
