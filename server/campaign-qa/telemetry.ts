import {createHash} from 'node:crypto';
import type {GameObservation,ObservationField} from '../../src/integration-types';

export const PLAYER_MANIFEST='player-country-1';
export const PLAYER_VERSION='1.19.4.2';
// Positional order is a versioned contract. New fields require a new manifest.
export const playerNumbers=[
 ['politicalPower','political_power',-1e6,1e6],['stability','stability',0,1],
 ['warSupport','has_war_support',0,1],['researchSlots','amount_research_slots',0,100],
 ['civilianFactories','num_of_civilian_factories',0,100000],
 ['militaryFactories','num_of_military_factories',0,100000],
 ['dockyards','num_of_naval_factories',0,100000],['manpower','has_manpower',0,2e9],
] as const;
export const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
export function playerMod(producer:string){
 if(!/^[a-f0-9]{16}$/.test(producer))throw Error('Expected random 16-hex producer token');
 const lines=['# Generated player-country observation candidate. No gameplay effects.', 'hc_qa_observe = {'];
 for(const [i,[,variable]] of playerNumbers.entries())lines.push(`    set_temp_variable = { hcqa${i} = ${variable} }`);
 lines.push('    set_temp_variable = { hcqawar = 0 }','    if = { limit = { has_war = yes } set_temp_variable = { hcqawar = 1 } }');
 const wire=`HC_QA|v1|state|p=${producer}|m=${PLAYER_MANIFEST}|tag=[THIS.GetTag]|n=${playerNumbers.map((_,i)=>`[?hcqa${i}]`).join(',')}|war=[?hcqawar]|END`;
 if(wire.length>255)throw Error('Portable log string limit exceeded');
 lines.push(`    log = "${wire}"`,'}','');
 return {effects:lines.join('\n'),hooks:`# Early human-country guard. No every_country loop or per-ID inventory scan.\non_actions = {\n    on_startup = { effect = { log = "HC_QA|v1|begin|p=${producer}|END" } }\n    on_daily = { effect = { if = { limit = { is_ai = no } hc_qa_observe = yes } } }\n}\n`,wireLength:wire.length};
}
export function parsePlayerLine(line:string,context:{producer:string;sessionId:string;country:string;observedAt:string;offset:number;sourcePath:string}):GameObservation|null {
 line=line.trimEnd();
 if(line.length>16384)return null;
 const match=line.match(/\[(\d{4}\.\d{2}\.\d{2}\.\d{2})\].*?HC_QA\|v1\|state\|p=([a-f0-9]{16})\|m=player-country-1\|tag=([A-Z0-9]{3})\|n=([^|]+)\|war=([^|]+)\|END\s*$/);
 if(!match||match[2]!==context.producer||match[3]!==context.country)return null;
 const [y,m,d,h]=match[1].split('.').map(Number);
 if(m<1||m>12||d<1||d>new Date(Date.UTC(y,m,0)).getUTCDate()||h<0||h>24)return null;
 const values=match[4].split(',');if(values.length!==playerNumbers.length)return null;
 const fields:Record<string,ObservationField>={};
 for(const [i,[key,,min,max]] of playerNumbers.entries()){
  const n=Number(values[i]),valid=/^-?\d+(?:\.\d+)?$/.test(values[i])&&Number.isFinite(n)&&n>=min&&n<=max&&(i<3||Number.isSafeInteger(n));
  fields[key]=valid?{status:'available',value:n,qualification:'parsed-unqualified',reason:'Installed documented dynamic variable; player-country emitter awaits independent native comparison'}:{status:'unavailable',value:null,qualification:'unsupported',reason:'Missing, unexpanded or invalid numeric token'};
 }
 fields.atWar=/^[01](?:\.0+)?$/.test(match[5])?{status:'available',value:Number(match[5])===1,qualification:'parsed-unqualified',reason:'Documented has_war trigger; no opponents, fronts or supply inferred'}:{status:'unavailable',value:null,qualification:'unsupported',reason:'Invalid war boolean'};
 return {schemaVersion:1,id:sha(context.sessionId+':'+context.offset+':'+line),sessionId:context.sessionId,source:{kind:'telemetry',path:context.sourcePath,hash:sha(line)},classification:'historical',country:match[3],gameVersion:PLAYER_VERSION,gameDate:match[1],capturedAt:context.observedAt,fields,limitations:['Observed during opt-in monitor; process ownership and same-date save reload are unverified','Fresh file append is not verified live state','Single-player candidate; is_ai=no does not identify one person in multiplayer','General country support requires independent captures for at least two tags']};
}
