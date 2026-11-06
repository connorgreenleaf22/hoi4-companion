import type {BridgeSnapshot,Value} from '../../src/bridge-types';
import {telemetryManifest as manifest,telemetryNumbers} from '../../src/telemetry-manifest';
const absent=(reason:string):Value<never>=>({status:'unavailable',value:null,reason});
/** Positional vectors are meaningful only under the exact manifest. Wrong lengths reject the record. */
export function unpackTelemetry(fields:Record<string,string>):boolean {
 if(fields.manifest!==manifest.id)return false;
 for(const [vector,keys] of [['n',['pp','stability',...Object.values(telemetryNumbers).map(n=>n.wire)]],['f',manifest.focuses.map((_,i)=>'fc'+i)],['t',manifest.technologies.map((_,i)=>'tc'+i)],['r',manifest.technologies.map((_,i)=>'tr'+i)]] as const){
  if(fields[vector]===undefined)continue;
  const values=fields[vector].split(',');if(values.length!==keys.length)return false;
  for(const [i,key] of keys.entries()){if(fields[key]!==undefined)return false;fields[key]=values[i];}
 }
 return true;
}
export function extendTelemetry(snapshot:BridgeSnapshot,fields:Record<string,string>):BridgeSnapshot|null {
 if(fields.manifest!==manifest.id||snapshot.gameVersion!==manifest.gameVersion||snapshot.values.country.value!==manifest.country)return null;
 const boolean=(token:string|undefined):Value<boolean>=>token!==undefined&&/^[01](?:\.0+)?$/.test(token)?{status:'observed',value:Number(token)===1}:absent('Check missing or not a literal boolean; no negative inferred');
 const checks=(ids:readonly string[],prefix:string)=>Object.fromEntries(ids.map((id,i)=>[id,boolean(fields[prefix+i])]));
 for(const [key,spec] of Object.entries(telemetryNumbers)){
  const token=fields[spec.wire],n=Number(token),valid=token!==undefined&&/^\d+(?:\.\d+)?$/.test(token)&&Number.isFinite(n)&&(spec.unit==='fraction'?n<=1:Number.isSafeInteger(n)&&n<=100000);
  (snapshot.values as any)[key]=valid?{status:'observed',value:n}:absent('Missing, unexpanded or out-of-range scripted value');
 }
 snapshot.schemaVersion=2;snapshot.campaign={manifestId:manifest.id,method:'scripted-snapshot',coverage:'explicit-id-subset',focusCompleted:checks(manifest.focuses,'fc'),technologyCompleted:checks(manifest.technologies,'tc'),technologyResearching:checks(manifest.technologies,'tr')};
 snapshot.unavailable=['currentFocus','focusProgress','focusAvailability','completeFocusInventory','researchProgress','completeResearchInventory','completionEvents','production','construction','diplomacy','military','pause',...Object.entries(snapshot.values).filter(([,v])=>v?.status==='unavailable').map(([key])=>key)];
 for(const [group,values] of Object.entries(snapshot.campaign))if(typeof values==='object')for(const [id,v] of Object.entries(values))if(v.status==='unavailable')snapshot.unavailable.push(group+':'+id);
 return snapshot;
}
export function validateExpandedSnapshot(s:BridgeSnapshot){
 if(s.schemaVersion===1){if(s.campaign||Object.keys(telemetryNumbers).some(k=>k in s.values))throw Error('Expanded values require schema 2');return;}
 const c=s.campaign;
 if(s.schemaVersion!==2||s.gameVersion!==manifest.gameVersion||s.values.country.value!==manifest.country||!c||c.manifestId!==manifest.id||c.method!=='scripted-snapshot'||c.coverage!=='explicit-id-subset')throw Error('Unsupported telemetry manifest, country or game version');
 const value=(v:any,type:'boolean'|'number',valid:(n:any)=>boolean)=>!!v&&(v.status==='observed'?typeof v.value===type&&valid(v.value):v.status==='unavailable'&&v.value===null&&typeof v.reason==='string'&&!!v.reason);
 for(const [key,spec] of Object.entries(telemetryNumbers))if(!value((s.values as any)[key],'number',n=>Number.isFinite(n)&&n>=0&&(spec.unit==='fraction'?n<=1:Number.isSafeInteger(n)&&n<=100000)))throw Error('Invalid telemetry value: '+key);
 for(const [key,ids] of [['focusCompleted',manifest.focuses],['technologyCompleted',manifest.technologies],['technologyResearching',manifest.technologies]] as const){const group=c[key];if(!group||Object.keys(group).length!==ids.length||ids.some(id=>!value(group[id],'boolean',()=>true)))throw Error('Invalid or incomplete coverage: '+key);}
}
