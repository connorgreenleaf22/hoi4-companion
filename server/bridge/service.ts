import type {Store} from '../store';
import type {BridgeMode,CampaignIntelligence} from '../../src/bridge-types';
import {inspectEnvironment,queryReference} from './environment';
import {BridgeDatabase,TelemetryReader,freshness} from './telemetry';
import {ActionGateway} from './actions';
import path from 'node:path';
import fs from 'node:fs';
import {digest} from './telemetry';
import {OwnedSession,type OwnedManifest} from './owned-session';
import {FocusSelectionAdapter} from './focus-adapter';
import {observationCapabilities} from './observation-capabilities';

export class GameBridge {
  readonly database:BridgeDatabase;
  readonly gateway:ActionGateway;
  private reader:TelemetryReader;
  mode:BridgeMode;
  owned?:OwnedSession;
  constructor(private store:Store,private options:{mode?:BridgeMode;gameRoot?:string;userRoot?:string;logPath?:string;ownedSession?:OwnedManifest}={}){
    this.mode=options.mode||'observer';
    if(!['observer','telemetry','control'].includes(this.mode))throw new Error('Invalid bridge mode');
    this.database=new BridgeDatabase(store.directory);
    const environment=this.environment();
    this.reader=new TelemetryReader(this.database,options.logPath||(environment.logs?path.join(environment.logs,'game.log'):''),environment.version);
    if(options.ownedSession)this.owned=new OwnedSession(options.ownedSession,this.database);
    const adapters=this.owned&&options.ownedSession?.purpose!=='telemetry'?[new FocusSelectionAdapter(this.owned,id=>{try{const r=this.reference(id,'focus'),c=r.reference.candidates[0];return r.reference.status==='resolved'&&r.reference.candidates.length===1&&r.overrides.status==='none-detected'&&c.id===id&&c.version===this.owned!.manifest.gameVersion&&c.hash===digest(fs.readFileSync(path.join(environment.gameRoot!,c.source)));}catch{return false;}})]:[];
    this.gateway=new ActionGateway(this.database,()=>({mode:this.mode,snapshot:this.owned?this.owned.latest():this.database.latest()}),adapters,new Set(options.ownedSession&&options.ownedSession.purpose!=='telemetry'?[options.ownedSession.controllerId]:[]));
  }
  environment(){return inspectEnvironment(this.options.gameRoot??(this.store.getSetting('gameRoot','')||undefined),this.options.userRoot);}
  reference(ref:string,kind?:string){return queryReference(this.store,this.environment(),ref,kind);}
  attachTelemetry(logPath:string,manifest?:OwnedManifest){
    if(this.mode==='control'||this.options.ownedSession&&this.options.ownedSession.purpose!=='telemetry')throw Error('Read-only connection cannot replace a controller session');
    let owned:OwnedSession|undefined;
    if(manifest){
      if(manifest.purpose!=='telemetry'||manifest.gameVersion!==this.environment().version||manifest.identity.executable_path!==this.environment().executable)throw Error('Expected compatible read-only owned manifest');
      owned=new OwnedSession(manifest,this.database);const reason=owned.check();if(reason)throw Error(reason);
    }
    this.owned=owned;this.mode='telemetry';this.reader=new TelemetryReader(this.database,logPath,this.environment().version);
  }
  detachTelemetry(){if(this.mode==='control')throw Error('Cannot replace a controller session');this.owned=undefined;this.mode='observer';}
  intelligence():CampaignIntelligence {
    const current=this.owned?.latest()??null;
    const fresh=!!current&&(freshness(current).status==='recent-log-write'||this.owned!.focusFresh(current));
    return {schemaVersion:1,checkedAt:new Date().toISOString(),mode:this.mode,environment:this.environment(),
      session:{state:current?'owned-connected':'disconnected',id:current?.sessionId??null,reason:current?'Owned process and log binding checked':this.owned?.check()||'No owned game session connected. Recent log writes alone do not prove a running game.'},
      liveSnapshotId:fresh&&current?.dataOrigin!=='fixture'?current!.id:null,
      observationCapabilities:observationCapabilities(current??this.database.latest(),!!current,this.environment().version),snapshots:this.database.snapshots(undefined,200),emergencyStop:this.database.get('emergency-stop',false)};
  }
  status(){const latest=this.owned?this.owned.latest():this.database.latest();return {observationCapabilities:observationCapabilities(latest,!!this.owned&&!!latest,this.environment().version),ownershipError:this.owned?.check()??null,schemaVersion:1,mode:this.mode,capabilities:[{id:'environment.inspect',available:true,evidence:'implemented'},{id:'reference.query',available:true,evidence:'implemented'},{id:'telemetry.read',available:this.mode!=='observer',evidence:'implemented',reason:'Wire reader implemented; live verification is version-specific. See STATUS.md.'},{id:'telemetry.replay',available:true,evidence:'implemented'},...this.gateway.capabilities()],reader:this.reader.diagnostic,emergencyStop:this.database.get('emergency-stop',false),latest,freshness:freshness(latest)};}
  poll(){if(this.mode==='observer')throw new Error('Enable Telemetry Mode explicitly before polling a mod log');const added=this.reader.poll();return {schemaVersion:1,added:this.owned?this.owned.bindBatch(added):added,diagnostic:this.reader.diagnostic};}
  async observeFocus(){if(this.mode==='observer'||!this.owned)throw new Error('Owned test session required');return this.owned.recordFocus(await this.owned.tool('observe'));}
  close(){this.database.close();}
}
