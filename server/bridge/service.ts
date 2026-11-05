import type {Store} from '../store';
import type {BridgeMode} from '../../src/bridge-types';
import {inspectEnvironment,queryReference} from './environment';
import {BridgeDatabase,TelemetryReader,freshness} from './telemetry';
import {ActionGateway} from './actions';
import path from 'node:path';

export class GameBridge {
  readonly database:BridgeDatabase;
  readonly gateway:ActionGateway;
  private reader:TelemetryReader;
  readonly mode:BridgeMode;
  constructor(private store:Store,private options:{mode?:BridgeMode;gameRoot?:string;userRoot?:string;logPath?:string}={}){
    this.mode=options.mode||'observer';
    if(!['observer','telemetry','control'].includes(this.mode))throw new Error('Invalid bridge mode');
    this.database=new BridgeDatabase(store.directory);
    const environment=this.environment();
    this.reader=new TelemetryReader(this.database,options.logPath||(environment.logs?path.join(environment.logs,'game.log'):''),environment.version);
    this.gateway=new ActionGateway(this.database,()=>({mode:this.mode,snapshot:this.database.latest()}));
  }
  environment(){return inspectEnvironment(this.options.gameRoot??(this.store.getSetting('gameRoot','')||undefined),this.options.userRoot);}
  reference(ref:string,kind?:string){return queryReference(this.store,this.environment(),ref,kind);}
  status(){return {schemaVersion:1,mode:this.mode,capabilities:[{id:'environment.inspect',available:true,evidence:'implemented'},{id:'reference.query',available:true,evidence:'implemented'},{id:'telemetry.read',available:this.mode!=='observer',evidence:'implemented',reason:'Wire reader implemented; live verification is version-specific. See STATUS.md.'},{id:'telemetry.replay',available:true,evidence:'implemented'},...this.gateway.capabilities()],reader:this.reader.diagnostic,emergencyStop:this.database.get('emergency-stop',false),latest:this.database.latest(),freshness:freshness(this.database.latest())};}
  poll(){if(this.mode==='observer')throw new Error('Enable Telemetry Mode explicitly before polling a mod log');return {schemaVersion:1,added:this.reader.poll(),diagnostic:this.reader.diagnostic};}
  close(){this.database.close();}
}
