import type {Store} from '../store';
import type {BridgeMode} from '../../src/bridge-types';
import {inspectEnvironment,queryReference} from './environment';
import {BridgeDatabase,TelemetryReader,freshness} from './telemetry';
import {ActionGateway} from './actions';
import path from 'node:path';
import fs from 'node:fs';
import {digest} from './telemetry';
import {OwnedSession,type OwnedManifest} from './owned-session';
import {FocusSelectionAdapter} from './focus-adapter';

export class GameBridge {
  readonly database:BridgeDatabase;
  readonly gateway:ActionGateway;
  private reader:TelemetryReader;
  readonly mode:BridgeMode;
  readonly owned?:OwnedSession;
  constructor(private store:Store,private options:{mode?:BridgeMode;gameRoot?:string;userRoot?:string;logPath?:string;ownedSession?:OwnedManifest}={}){
    this.mode=options.mode||'observer';
    if(!['observer','telemetry','control'].includes(this.mode))throw new Error('Invalid bridge mode');
    this.database=new BridgeDatabase(store.directory);
    const environment=this.environment();
    this.reader=new TelemetryReader(this.database,options.logPath||(environment.logs?path.join(environment.logs,'game.log'):''),environment.version);
    if(options.ownedSession)this.owned=new OwnedSession(options.ownedSession,this.database);
    const adapters=this.owned?[new FocusSelectionAdapter(this.owned,id=>{try{const r=this.reference(id,'focus'),c=r.reference.candidates[0];return r.reference.status==='resolved'&&r.reference.candidates.length===1&&r.overrides.status==='none-detected'&&c.id===id&&c.version===this.owned!.manifest.gameVersion&&c.hash===digest(fs.readFileSync(path.join(environment.gameRoot!,c.source)));}catch{return false;}})]:[];
    this.gateway=new ActionGateway(this.database,()=>({mode:this.mode,snapshot:this.owned?this.owned.latest():this.database.latest()}),adapters,new Set(options.ownedSession?[options.ownedSession.controllerId]:[]));
  }
  environment(){return inspectEnvironment(this.options.gameRoot??(this.store.getSetting('gameRoot','')||undefined),this.options.userRoot);}
  reference(ref:string,kind?:string){return queryReference(this.store,this.environment(),ref,kind);}
  status(){const latest=this.owned?this.owned.latest():this.database.latest();return {ownershipError:this.owned?.check()??null,schemaVersion:1,mode:this.mode,capabilities:[{id:'environment.inspect',available:true,evidence:'implemented'},{id:'reference.query',available:true,evidence:'implemented'},{id:'telemetry.read',available:this.mode!=='observer',evidence:'implemented',reason:'Wire reader implemented; live verification is version-specific. See STATUS.md.'},{id:'telemetry.replay',available:true,evidence:'implemented'},...this.gateway.capabilities()],reader:this.reader.diagnostic,emergencyStop:this.database.get('emergency-stop',false),latest,freshness:freshness(latest)};}
  poll(){if(this.mode==='observer')throw new Error('Enable Telemetry Mode explicitly before polling a mod log');const added=this.reader.poll();return {schemaVersion:1,added:this.owned?added.map(s=>this.owned!.bind(s)):added,diagnostic:this.reader.diagnostic};}
  async observeFocus(){if(this.mode==='observer'||!this.owned)throw new Error('Owned test session required');return this.owned.recordFocus(await this.owned.tool('observe'));}
  close(){this.database.close();}
}
