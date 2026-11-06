import {z} from 'zod';
import type {BridgePlatform} from './platform';
const empty=z.object({}).strict(),id=z.string().min(1).max(200),file=z.string().min(1).max(4096);
export const bridgeTools=[
 {name:'hoi4_bridge_environment',description:'Inspect installed game references and paths; not running-campaign state.',schema:empty,readOnly:true},
 {name:'hoi4_bridge_connection',description:'Inspect observation source, ownership, polling and disconnection diagnostics.',schema:empty,readOnly:true},
 {name:'hoi4_bridge_connect',description:'Attach a read-only log monitor or compatible owned telemetry manifest. Does not launch or control HOI4.',schema:z.object({source:z.enum(['detected-log','log','owned']),path:file.optional()}).strict(),readOnly:false},
 {name:'hoi4_bridge_disconnect',description:'Stop monitoring; preserve historical observations and plans.',schema:empty,readOnly:false},
 {name:'hoi4_bridge_poll',description:'Read complete telemetry records from an explicitly connected source.',schema:empty,readOnly:false},
 {name:'hoi4_bridge_observations',description:'Read typed telemetry and save observations with source, confidence and unavailable fields.',schema:empty,readOnly:true},
 {name:'hoi4_bridge_focus_research',description:'Read available focus/research fields; no inference of selection from progress or missing data.',schema:empty,readOnly:true},
 {name:'hoi4_bridge_history',description:'Read bounded snapshot history and imported recording inventory.',schema:z.object({sessionId:id.optional(),recordingId:id.optional(),limit:z.number().int().min(1).max(200).optional()}).strict(),readOnly:true},
 {name:'hoi4_bridge_compare',description:'Compare same-session historical snapshots; differences are not completion events.',schema:z.object({before:id,after:id,recordingId:id.optional()}).strict(),readOnly:true},
 {name:'hoi4_bridge_save_inspect',description:'Read a selected plaintext save without modifying it; retain derived observations as unqualified save state.',schema:z.object({path:file,country:z.string().regex(/^[A-Z0-9]{3}$/).optional()}).strict(),readOnly:false},
 {name:'hoi4_bridge_capabilities',description:'Discover implemented versus independently qualified fields and disabled commands.',schema:empty,readOnly:true},
 {name:'hoi4_bridge_diagnostics',description:'Read source provenance and integration diagnostics. Never returns connection credentials.',schema:empty,readOnly:true},
 {name:'hoi4_bridge_action_validate',description:'Dry-run the existing action gateway checks. No execution, receipt reservation or authorization grant.',schema:z.object({action:z.record(z.string(),z.unknown())}).strict(),readOnly:true},
 {name:'hoi4_bridge_receipt',description:'Retrieve a structured command receipt by request ID. Never retries execution.',schema:z.object({requestId:id}).strict(),readOnly:true},
 {name:'hoi4_bridge_emergency_stop',description:'Latch the shared action stop and stop monitoring. Does not undo actions or close a regular game.',schema:empty,readOnly:false},
] as const;
export async function callBridgeTool(platform:BridgePlatform,name:string,args:unknown={}){
 const tool=bridgeTools.find(t=>t.name===name);if(!tool)throw Error('Unknown bridge tool; gameplay execution is not exposed');
 const input=tool.schema.parse(args) as any;let data:unknown;
 switch(name){
  case 'hoi4_bridge_environment':data=platform.bridge.environment();break;
  case 'hoi4_bridge_connection':data=platform.status().connection;break;
  case 'hoi4_bridge_connect':data=platform.connect(input);break;
  case 'hoi4_bridge_disconnect':data=platform.disconnect();break;
  case 'hoi4_bridge_poll':data=platform.poll();break;
  case 'hoi4_bridge_observations':data=platform.observations();break;
  case 'hoi4_bridge_focus_research':data=platform.observations().map(s=>({...s,fields:Object.fromEntries(Object.entries(s.fields).filter(([key])=>/focus|research|technolog/i.test(key)))}));break;
  case 'hoi4_bridge_history':data=platform.snapshots(input);break;
  case 'hoi4_bridge_compare':data=platform.compare(input);break;
  case 'hoi4_bridge_save_inspect':data=platform.inspectSave(input);break;
  case 'hoi4_bridge_capabilities':data=platform.status().capabilities;break;
  case 'hoi4_bridge_diagnostics':data=platform.status();break;
  case 'hoi4_bridge_action_validate':data=platform.bridge.gateway.validate(input.action);break;
  case 'hoi4_bridge_receipt':data=platform.bridge.gateway.receipt(input.requestId);break;
  case 'hoi4_bridge_emergency_stop':data=platform.stop();break;
 }
 return {schemaVersion:1,tool:name,data};
}
