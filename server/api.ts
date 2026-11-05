import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { openStore,dataDirectory,ProfileWriteRejected } from './store';
import { discoverGame, indexGame } from './importer';
import { treeFocuses, validatePlan, calculateTemplate, production, resolveEquipment, productionSupport, evaluate,dlcFacts,type TreeReferenceIssue } from './domain';
import { guides, troubleshooting, europe, majors } from './content';
import type { Entry, Profile, Meta, Relationship, FactState } from '../src/types';
import {searchEntries,summary} from './search';
import {validatePlanner} from './planner/validation';
import {mirrorPlanner} from './planner/plans';
import {preparePlanDraft,makePreview,validatePreviewContext,PlanConflict} from './planner/service';
import {listDiscovery,getDiscovery,previewDiscovery} from './discovery';

export function validateProfile(input:any):Profile {
  if(!input || typeof input!=='object')throw new Error('Expected a campaign profile.');
  const str=(key:string,max:number,defaultValue='')=>{const value=input[key]??defaultValue;if(typeof value!=='string'||value.length>max)throw new Error(`Invalid ${key}.`);return value;};
  const arr=(key:string,max:number,deduplicate=true)=>{const value=input[key]??[];if(!Array.isArray(value)||value.length>max||value.some(v=>typeof v!=='string'||v.length>800))throw new Error(`Invalid ${key}.`);return (deduplicate?[...new Set(value)]:[...value]) as string[];};
  const id=str('id',100,randomBytes(12).toString('hex'));
  if(input.revision!==undefined&&(!Number.isSafeInteger(input.revision)||input.revision<0))throw new Error('Invalid campaign revision.');
  const startDate=str('startDate',10,'1936-01-01');
  const date=new Date(`${startDate}T00:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==startDate)throw new Error('Use a valid starting date.');
  const country=str('country',3,'GER');if(!/^[A-Z0-9]{3}$/.test(country))throw new Error('Invalid country tag.');
  const notes=input.notes??{};if(typeof notes!=='object'||Array.isArray(notes)||!notes||Object.keys(notes).length>2000||Object.entries(notes).some(([k,v])=>k.length>800||typeof v!=='string'||v.length>30000))throw new Error('Invalid notes.');
  const templates=input.templates??[];
  if(!Array.isArray(templates)||templates.length>100||templates.some(t=>!t||typeof t.name!=='string'||t.name.length>100||!Array.isArray(t.rows)||t.rows.length>40||t.rows.some((r:any)=>typeof r.id!=='string'||r.id.length>100||!Number.isInteger(r.count)||r.count<0||r.count>25)))throw new Error('Invalid saved templates.');
  if(input.exportSchemaVersion!==undefined&&(!Number.isInteger(input.exportSchemaVersion)||input.exportSchemaVersion<1||input.exportSchemaVersion>3))throw new Error('Unsupported campaign export schema. Use a compatible app.');
  let dlcStates:Profile['dlcStates'];
  if(input.dlcStates!==undefined){
    if(!input.dlcStates||typeof input.dlcStates!=='object'||Array.isArray(input.dlcStates)||Object.keys(input.dlcStates).length>200)throw new Error('Invalid DLC assertions.');
    dlcStates={};
    const fact=(x:any):FactState=>{if(!x||!['yes','no','unknown'].includes(x.value)||typeof x.source!=='string'||x.source.length>300||x.checkedAt!==undefined&&(typeof x.checkedAt!=='string'||x.checkedAt.length>50))throw new Error('Invalid DLC fact.');return {value:x.value,source:x.source,...(x.checkedAt?{checkedAt:x.checkedAt}:{})};};
    for(const [key,value] of Object.entries(input.dlcStates) as [string,any][]){if(key.length>200||['__proto__','constructor','prototype'].includes(key))throw new Error('Invalid DLC identity.');dlcStates[key]={owned:fact(value?.owned),enabled:fact(value?.enabled)};}
  }
  const profile:Profile={id,revision:input.revision??0,name:str('name',150,'New campaign'),country,startDate,historical:input.historical!==false,goals:str('goals',10000),tree:str('tree',800),dlcs:arr('dlcs',200),dlcConfirmed:input.dlcConfirmed===true,queue:arr('queue',2000,false),completed:arr('completed',2000),bookmarks:arr('bookmarks',2000),notes,templates,...(dlcStates?{dlcStates}:{}),...(input.legacyDlcAssertions!==undefined?{legacyDlcAssertions:arr('legacyDlcAssertions',200)}:{}),...(input.referenceIndexRevision!==undefined?{referenceIndexRevision:str('referenceIndexRevision',200)}:{}),...(input.exportSchemaVersion!==undefined?{exportSchemaVersion:input.exportSchemaVersion}:{}),...(input.planner!==undefined?{planner:validatePlanner(input.planner)}:{})};
  return profile.planner?mirrorPlanner(profile):profile;
}

export async function startServer(options:{dataDir?:string;port?:number;staticDir?:string;autoIndex?:boolean;testRemoteHost?:'127.0.0.1'}={}) {
  // Internal test seam changes only listener binding. Pairing and all authorization remain active.
  if(options.testRemoteHost!==undefined){
    const fixture=options.dataDir&&path.resolve(options.dataDir),temporary=path.resolve(os.tmpdir());
    if(options.testRemoteHost!=='127.0.0.1'||options.autoIndex!==false||!fixture||fixture===path.resolve(dataDirectory())||!fixture.startsWith(temporary+path.sep)||!/^hoi4-[a-z0-9-]+$/i.test(path.basename(fixture)))throw new Error('The loopback test listener requires an explicit isolated temporary HOI4 fixture with auto-index disabled.');
  }
  const store=openStore(options.dataDir);
  let meta=store.getSetting<Meta|null>('meta',null);
  let indexingError='';
  let root=store.getSetting('gameRoot','') || discoverGame();
  if(options.autoIndex!==false && root)try{meta=indexGame(store,root);}catch(e){indexingError=String(e);}
  let port=options.port??39436;
  let lan:http.Server|undefined;let lanPort=0;let pairingCode='';
  const sessions=new Map<string,number>();const attempts=new Map<string,{count:number;reset:number}>();
  const all=(kind?:string):Entry[]=>store.db.prepare(`SELECT payload FROM entries ${kind?'WHERE kind=?':''}`).all(...(kind?[kind]:[])).map(r=>JSON.parse(r.payload as string));
  const focusEntries=()=>store.db.prepare("SELECT payload FROM entries WHERE kind IN ('focus','shared_focus','joint_focus')").all().map(r=>JSON.parse(r.payload as string)) as Entry[];
  const getTree=(uid:string)=>{const e=store.entry(uid);if(!e||e.kind!=='focus_tree')throw new Error('Focus tree is missing or ambiguous. Inspect its saved reference before planning.');const referenceIssues:TreeReferenceIssue[]=[];const focuses=treeFocuses(e,focusEntries(),referenceIssues);return {tree:{...e,data:{...e.data,referenceIssues}},focuses,referenceIssues};};
  const send=(res:http.ServerResponse,status:number,value:unknown)=>{res.setHeader('X-HOI4-Index-Revision',store.getSetting<Meta|null>('meta',null)?.indexRevision||'legacy');res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const body=async(req:http.IncomingMessage)=>{const chunks:Buffer[]=[];let bytes=0;for await(const c of req){const chunk=Buffer.isBuffer(c)?c:Buffer.from(c);bytes+=chunk.length;if(bytes>1024*1024)throw new Error('Request too large.');chunks.push(chunk);}const data=Buffer.concat(chunks).toString('utf8');return data?JSON.parse(data):{};};
  const authenticated=(req:http.IncomingMessage)=>{const token=req.headers.cookie?.match(/(?:^|; )hoi4_session=([\da-f]+)/)?.[1];return !!token && (sessions.get(token)||0)>Date.now();};
  const lanInfo=()=>({enabled:!!lan,host:typeof lan?.address()==='object'?(lan?.address() as any)?.address:undefined,port:lanPort,code:pairingCode,urls:Object.values(os.networkInterfaces()).flat().filter(a=>a?.family==='IPv4'&&!a.internal).map(a=>`http://${a!.address}:${lanPort}`)});
  async function handler(req:http.IncomingMessage,res:http.ServerResponse,remote=false){
    let readSnapshot=false;
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const host=req.headers.host||'';
      if(!remote && ![`127.0.0.1:${port}`,`localhost:${port}`,`[::1]:${port}`].includes(host))return send(res,403,{error:'Unrecognized local host.'});
      if(req.headers.origin && req.headers.origin!==`http://${host}`)return send(res,403,{error:'Cross-origin requests are not allowed.'});
      const url=new URL(req.url||'/',`http://${host||'localhost'}`);const route=url.pathname.replace('/api/v1/','');
      if(url.pathname.startsWith('/api/v1/')){
        if(route==='pair' && req.method==='POST'){
          if(!remote)return send(res,400,{error:'Use the phone address to pair.'});
          const key=req.socket.remoteAddress||'';let limit=attempts.get(key);
          if(!limit||limit.reset<Date.now()){limit={count:0,reset:Date.now()+60000};attempts.set(key,limit);}
          if(++limit.count>8)return send(res,429,{error:'Too many attempts. Try again in a minute.'});
          const input=await body(req);const code=String(input.code||'');
          if(code.length!==pairingCode.length||!timingSafeEqual(Buffer.from(code),Buffer.from(pairingCode)))return send(res,401,{error:'Pairing code does not match.'});
          const token=randomBytes(32).toString('hex');sessions.set(token,Date.now()+86400000);
          res.setHeader('Set-Cookie',`hoi4_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);return send(res,200,{paired:true});
        }
        if(remote&&!authenticated(req))return send(res,401,{error:'Enter the pairing code shown in the desktop app.',pairing:true});
        if(req.method==='GET'){store.db.exec('BEGIN');readSnapshot=true;}
        const meta=store.getSetting<Meta|null>('meta',null);
        res.setHeader('X-HOI4-Index-Revision',meta?.indexRevision||'legacy');
        if(route==='status'&&req.method==='GET')return send(res,200,{meta,appVersion:'0.3.0',dbSchemaVersion:3,indexingError,profiles:store.listProfiles(),selectedProfileId:remote?undefined:store.selectedProfileId(),local:!remote,network:remote?{enabled:true}:lanInfo(),dataDirectory:remote?undefined:store.directory,root:remote?undefined:meta?.root||root,roadmap:['Read-only save analysis','Real-time telemetry feasibility','Backup and preview based save editing','Optional local or cloud AI']});
        if(route==='countries'&&req.method==='GET')return send(res,200,all('country').map(e=>({...e,data:{...e.data,europe:europe.includes(e.id),major:majors.includes(e.id)}})).sort((a,b)=>a.title.localeCompare(b.title)));
        if(route==='entries'&&req.method==='GET'){
          return send(res,200,searchEntries(store,url.searchParams));
        }
        if(route==='resolve'&&req.method==='GET'){
          const result=store.resolve((url.searchParams.get('ref')||'').slice(0,1600),url.searchParams.get('kind')||undefined,url.searchParams.get('scope')||undefined);
          return send(res,200,{...result,entry:result.entry?summary(result.entry):undefined,candidates:result.candidates.map(summary)});
        }
        if(route==='relationships'&&req.method==='GET'){
          const reference=store.resolve((url.searchParams.get('ref')||'').slice(0,1600),url.searchParams.get('kind')||undefined,url.searchParams.get('scope')||undefined);
          const uids=new Set(reference.candidates.map(e=>e.uid));const direction=url.searchParams.get('direction')||'both';const type=url.searchParams.get('type');
          if(!['both','out','in'].includes(direction))throw new Error('Unknown relationship direction.');
          const rows:Relationship[]=[];
          for(const uid of uids){
            if(direction!=='in')rows.push(...store.db.prepare('SELECT payload FROM relationships WHERE from_uid=?').all(uid).map(r=>JSON.parse(r.payload as string)));
            if(direction!=='out')rows.push(...store.db.prepare('SELECT payload FROM relationships WHERE to_uid=?').all(uid).map(r=>JSON.parse(r.payload as string)));
          }
          if(direction!=='out'&&uids.size){const markers=[...uids].map(()=>'?').join(',');rows.push(...store.db.prepare(`SELECT payload FROM relationships WHERE to_uid IS NULL AND json_extract(payload,'$.resolution')='ambiguous' AND EXISTS(SELECT 1 FROM json_each(json_extract(payload,'$.candidates')) WHERE value IN (${markers}))`).all(...uids).map(r=>JSON.parse(r.payload as string)));}
          const relationships=[...new Map(rows.filter(r=>!type||r.type===type).map(r=>[r.id,r])).values()].sort((a,b)=>a.id.localeCompare(b.id));
          const related=new Set(relationships.flatMap(r=>[r.from,r.to,...r.candidates]).filter(Boolean) as string[]);
          return send(res,200,{indexRevision:meta?.indexRevision||'legacy',reference:{...reference,entry:reference.entry?summary(reference.entry):undefined,candidates:reference.candidates.map(summary)},relationships,entries:[...related].flatMap(uid=>{const e=store.entry('definition:'+uid);return e?[summary(e)]:[];})});
        }
        if(route==='coverage'&&req.method==='GET')return send(res,200,store.getSetting('coverage',{indexRevision:meta?.indexRevision||'legacy',supportedRoots:[],files:[],unsupportedRoots:[],relationships:{},verification:'Coverage unavailable for this legacy index. Refresh the installed sources to create a reconciled manifest.'}));
        if(route==='entry'&&req.method==='GET'){
          const resolution=store.resolve(url.searchParams.get('uid')||'');const e=resolution.entry;if(!e)return send(res,resolution.status==='ambiguous'?409:404,{error:resolution.status==='ambiguous'?'Reference matches multiple definitions. Choose a definition.':'Entry is missing from this index. Your saved reference remains preserved.',resolution:{...resolution,candidates:resolution.candidates.map(summary)}});
          if(e.kind==='equipment'){const equipments=all('equipment');e.data.resolvedStats=resolveEquipment(e,equipments);e.data.productionSupport=productionSupport(e,equipments);}
          return send(res,200,e);
        }
        if(route==='trees'&&req.method==='GET'){
          const country=url.searchParams.get('country');const trees=all('focus_tree');
          return send(res,200,trees.filter(t=>!country||t.data.countries.includes(country)||t.id==='generic_focus').map(t=>({...t,data:{...t.data,script:undefined}})));
        }
        if(route==='tree'&&req.method==='GET'){const result=getTree(url.searchParams.get('uid')||'');return send(res,200,{...result,tree:summary(result.tree),focuses:result.focuses.map(summary)});}
        if(route==='guides'&&req.method==='GET')return send(res,200,{guides:listDiscovery(store,{spoilers:url.searchParams.get('spoilers')==='show',q:url.searchParams.get('q')||'',country:url.searchParams.get('country')||''}),troubleshooting});
        if(route==='discovery/preview'&&req.method==='POST'){
          const input=await body(req),guide=getDiscovery(store,input.guideId,input.spoilers==='show');
          if(!guide)return send(res,404,{error:'Guide unavailable with the current spoiler setting.'});
          const saved=store.profile(input.profileId);
          if(!saved||saved.revision!==input.expectedProfileRevision)throw new PlanConflict('profile-conflict','This campaign changed or was deleted. Reload before previewing.',{current:saved});
          store.db.exec('BEGIN');readSnapshot=true;
          return send(res,200,previewDiscovery(store,guide,saved,input.expectedIndexRevision));
        }
        if(route==='profile'&&req.method==='POST'){
          const result=store.saveProfile(validateProfile(await body(req)));
          if(result.conflict)return send(res,409,{error:'This campaign changed in another window or was deleted. Your changes have not been saved.',current:result.current});
          return send(res,200,result.saved);
        }
        if(route==='profile'&&req.method==='DELETE'){
          const revision=Number(url.searchParams.get('revision'));
          if(!url.searchParams.has('revision')||!Number.isSafeInteger(revision)||revision<0)throw new Error('A current campaign revision is required to delete.');
          const result=store.deleteProfile(url.searchParams.get('id')||'',revision);
          if(result.conflict)return send(res,409,{error:'This campaign changed in another window or was already deleted. Review the latest version before deleting.',current:result.current});
          return send(res,200,{deleted:true,selectedProfileId:result.selectedProfileId});
        }
        if(route==='selection'&&req.method==='POST'){
          if(remote)return send(res,403,{error:'Select the desktop campaign from the desktop.'});
          const input=await body(req);if(typeof input.id!=='string'||input.id.length>100)throw new Error('Invalid campaign selection.');
          if(input.id&&!store.profile(input.id))return send(res,404,{error:'Campaign no longer exists.'});
          store.setSetting('selectedProfileId',input.id);return send(res,200,{selectedProfileId:store.selectedProfileId()});
        }
        if((route==='plan/preview'||route==='plan/apply')&&req.method==='POST'){
          const input=await body(req);const submitted=validateProfile(input.profile);validatePreviewContext(input,submitted);
          const draft=preparePlanDraft({...submitted,referenceIndexRevision:input.expectedIndexRevision},{...input.plan,referenceIndexRevision:input.expectedIndexRevision});
          if(route==='plan/preview'){
            store.db.exec('BEGIN');readSnapshot=true;
            return send(res,200,makePreview(store,draft.profile,draft.plan,input.expectedProfileRevision,input.expectedIndexRevision));
          }
          if(typeof input.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(input.fingerprint))throw new Error('Review a preview before applying this plan.');
          let preview:ReturnType<typeof makePreview>|undefined;
          const result=store.saveProfile(draft.profile,{semanticApply:true,beforeWrite(){
            preview=makePreview(store,draft.profile,draft.plan,input.expectedProfileRevision,input.expectedIndexRevision);
            if(preview.fingerprint!==input.fingerprint)throw new PlanConflict('preview-changed','This draft or its context changed. Review a new preview before applying.');
          }});
          if(result.conflict)return send(res,409,{code:'profile-conflict',error:'This campaign changed or was deleted. Review a new preview.',current:result.current});
          return send(res,200,{profile:result.saved,report:preview!.report});
        }
        if(route==='plan'&&req.method==='POST'){
          const p=validateProfile(await body(req));store.db.exec('BEGIN');readSnapshot=true;const currentMeta=store.getSetting<Meta|null>('meta',null);
          if(p.referenceIndexRevision&&p.referenceIndexRevision!==currentMeta?.indexRevision)return send(res,409,{error:'Installed references changed. Review the current sources before recalculating this plan.',expectedIndexRevision:p.referenceIndexRevision,currentIndexRevision:currentMeta?.indexRevision||'legacy',indexRevision:currentMeta?.indexRevision||'legacy'});
          const {focuses}=getTree(p.tree);return send(res,200,{...validatePlan(p,focuses,currentMeta?.dlcs.filter(d=>d.integrated).map(d=>d.name)||[],dlcFacts(p,currentMeta?.dlcs||[])),indexRevision:currentMeta?.indexRevision||'legacy'});
        }
        if(route==='units'&&req.method==='GET')return send(res,200,all('unit').filter(e=>e.data.need && Object.keys(e.data.need).length).map(summary));
        if(route==='equipment'&&req.method==='GET'){
          const equipments=all('equipment');return send(res,200,equipments.map(e=>({...summary(e),data:{...summary(e).data,resolvedStats:resolveEquipment(e,equipments),productionSupport:productionSupport(e,equipments)}})));
        }
        if(route==='calculate'&&req.method==='POST'){
          const input=await body(req);if(!Array.isArray(input.rows)||input.rows.length>40)throw new Error('Expected up to 40 unit rows.');
          store.db.exec('BEGIN');readSnapshot=true;
          return send(res,200,calculateTemplate(input.rows,all('unit'),input.divisions));
        }
        if(route==='production'&&req.method==='POST'){
          const input=await body(req);const fields=['quantity','stockpile','factories','efficiency','output','resourceFactor'] as const;
          if(fields.some(k=>typeof input[k]!=='number'))throw new Error('Production inputs must be numeric.');
          store.db.exec('BEGIN');readSnapshot=true;const currentMeta=store.getSetting<Meta|null>('meta',null);
          if(!currentMeta?.defines.BASE_FACTORY_SPEED_MIL)throw new Error('Military factory base output was not found in installed defines.');
          if(typeof input.equipmentId!=='string')throw new Error('Choose indexed equipment before estimating production.');
          const equipments=all('equipment');const equipment=equipments.find(e=>e.id===input.equipmentId);
          if(!equipment)throw new Error('Equipment was not found in the installed index.');
          const support=productionSupport(equipment,equipments);if(!support.supported)throw new Error(support.reason);
          const cost=resolveEquipment(equipment,equipments).build_cost_ic;
          // Equipment identity and cost come from the index, never a submitted cost override.
          return send(res,200,production({quantity:input.quantity,stockpile:input.stockpile,cost,factories:input.factories,efficiency:input.efficiency,output:input.output,resourceFactor:input.resourceFactor},currentMeta.defines.BASE_FACTORY_SPEED_MIL));
        }
        if(route==='reindex'&&req.method==='POST'){
          if(remote)return send(res,403,{error:'Refresh game data from the desktop.'});
          const input=await body(req);const nextRoot=typeof input.root==='string'?input.root:store.getSetting<Meta|null>('meta',null)?.root||root;
          try{const refreshed=indexGame(store,nextRoot);root=nextRoot;indexingError='';res.setHeader('X-HOI4-Index-Revision',refreshed.indexRevision||'legacy');return send(res,200,refreshed);}catch(e){indexingError=String(e);throw e;}
        }
        if(route==='network'&&req.method==='POST'){
          if(remote)return send(res,403,{error:'Manage phone access from the desktop.'});
          const input=await body(req);
          if(lan){lan.closeAllConnections();await new Promise<void>(r=>lan!.close(()=>r()));lan=undefined;}sessions.clear();attempts.clear();pairingCode='';
          if(input.enabled===true){
            pairingCode=String(randomInt(100000,1000000));
            const server=http.createServer((req,res)=>void handler(req,res,true));
            await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,options.testRemoteHost||'0.0.0.0',()=>resolve());});
            lan=server;lanPort=(server.address() as any).port;
          }
          return send(res,200,lanInfo());
        }
        return send(res,404,{error:'API endpoint not found.'});
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed.'});
      const staticDir=options.staticDir||path.join(process.cwd(),'dist');
      const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');let file=path.resolve(staticDir,relative||'index.html');
      if(!file.startsWith(path.resolve(staticDir)+path.sep))return send(res,403,{error:'Invalid path.'});
      if(!fs.existsSync(file)||!fs.statSync(file).isFile()){
        if(path.extname(relative))return send(res,404,{error:'File not found.'});file=path.join(staticDir,'index.html');
      }
      if(!fs.existsSync(file))return send(res,503,{error:'Build the interface with npm run build.'});
      const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
      if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
    }catch(error){
      if(error instanceof PlanConflict)send(res,409,{error:error.message,code:error.code,...error.context});
      else if(error instanceof ProfileWriteRejected)send(res,409,{error:error.message,code:error.code,current:error.current});
      else send(res,400,{error:error instanceof Error?error.message:String(error)});
    }
    finally{if(readSnapshot&&store.db.isTransaction)store.db.exec('COMMIT');}
  }
  const server=http.createServer((req,res)=>void handler(req,res));
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve());});
  port=(server.address() as any).port;
  return {port,url:`http://127.0.0.1:${port}`,store,close:async()=>{if(lan){lan.closeAllConnections();await new Promise<void>(r=>lan!.close(()=>r()));}server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));store.db.close();}};
}
