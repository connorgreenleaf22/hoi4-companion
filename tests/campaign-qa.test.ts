import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {startServer} from '../server/api';
import {BridgeDatabase,parseTelemetry} from '../server/bridge/telemetry';
import {telemetryObservation} from '../server/bridge/platform';
import {CampaignPilot} from '../server/campaign-qa/pilot';
import {sanitizeObservation,qaTools} from '../server/campaign-qa/service';
import {parsePlayerLine,playerMod,sha} from '../server/campaign-qa/telemetry';
import {readQaConnection} from '../server/campaign-qa/connection';
const producer='0123456789abcdef';
const line=(tag='POR',date='1936.01.01.24',pp=2)=>`[00:01:00][${date}] HC_QA|v1|state|p=${producer}|m=player-country-1|tag=${tag}|n=${pp},0.81,0.35,4,35,28,10,12345|war=0|END\n`;
const begin=`[00:00:00] HC_QA|v1|begin|p=${producer}|END\n`;
const ctx=(country='POR')=>({producer,country,sessionId:'fixture-session',observedAt:new Date().toISOString(),offset:0,sourcePath:'C:/private/account/game.log'});
test('player candidate uses one early human guard; two tags parse but neither is native qualification',()=>{
 const mod=playerMod(producer);assert.match(mod.hooks,/on_daily = .*is_ai = no/);assert.doesNotMatch(mod.hooks,/every_country\s*=|GER\s*=|on_daily_[A-Z]/);assert.ok(mod.wireLength<=255);
 const template=playerMod('0000000000000000');assert.equal(fs.readFileSync('mods/hoi4-companion-player-telemetry/common/on_actions/hoi4_companion_qa.txt','utf8').replaceAll('\r\n','\n'),template.hooks);assert.equal(fs.readFileSync('mods/hoi4-companion-player-telemetry/common/scripted_effects/hoi4_companion_qa.txt','utf8').replaceAll('\r\n','\n'),template.effects);
 for(const tag of ['GER','POR']){const o=parsePlayerLine(line(tag),ctx(tag))!;assert.equal(o.country,tag);assert.equal(o.classification,'historical');assert.equal(o.fields.manpower.value,12345);assert.equal(o.fields.manpower.qualification,'parsed-unqualified');}
 assert.equal(parsePlayerLine(line('GER'),ctx()),null);assert.equal(parsePlayerLine(line().replace(producer,'fedcba9876543210'),ctx()),null);
 assert.equal(parsePlayerLine(line().replace('player-country-1','future-2'),ctx()),null);assert.equal(parsePlayerLine(line('POR','1936.02.31.24'),ctx()),null);
 assert.equal(parsePlayerLine(line().replace('|END',''),ctx()),null);
 assert.equal(parsePlayerLine(line().replace(',12345|',',[?unexpanded]|'),ctx())!.fields.manpower.status,'unavailable');
});
test('sanitized projection excludes paths, raw values, arbitrary fields and free-text diagnostics',()=>{
 const o=parsePlayerLine(line(),ctx())!;o.fields.politicalPower.reason='secret C:/private/token';o.fields.politicalPower.raw='secret';o.fields.secret={status:'available',qualification:'parsed-unqualified',value:'secret',reason:'secret'};
 const exported=sanitizeObservation(o,Date.now(),true),text=JSON.stringify(exported);assert.doesNotMatch(text,/secret|private|game\.log/);assert.equal(exported.fields.supply.status,'unavailable');assert.equal(exported.fields.currentFocus.value,null);assert.equal(exported.source.hash,sha(line().trimEnd()));
 o.classification='verified-live';assert.equal(sanitizeObservation(o,Date.now()+60000).classification,'historical');assert.equal(sanitizeObservation(o,Date.now(),true).classification,'historical');
});
function harness(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-qa-')),db=new BridgeDatabase(dir),log=path.join(dir,'game.log');fs.writeFileSync(log,line());let clock=0;const pilot=new CampaignPilot(db,dir,()=> '1.19.4.2',()=>Date.parse('2026-11-10T12:00:00Z')+clock,()=>clock);const config={logPath:log,country:'POR',producer,minutes:2,dedicatedPlayset:true,singlePlayer:true};return {dir,db,log,pilot,config,tick:(ms=5000)=>{clock+=ms;pilot.sample();},close:()=>{pilot.close();db.close();fs.rmSync(dir,{recursive:true,force:true});}};}
test('monitor excludes old bytes, waits for marker, handles split records, deduplicates and keeps raw local evidence',()=>{
 const h=harness();try{h.pilot.start(h.config);h.tick();assert.equal(h.pilot.observations().length,0);
 fs.appendFileSync(h.log,line());h.tick();assert.equal(h.pilot.status().metrics.rejected,1);
 fs.appendFileSync(h.log,'État 日本語\n'+begin+line().slice(0,65));h.tick();assert.equal(h.pilot.observations().length,0);
 fs.appendFileSync(h.log,line().slice(65)+line()+line('POR','1936.01.03.24',8));h.tick();
 assert.equal(h.pilot.observations().length,2);assert.equal(h.pilot.status().metrics.duplicates,1);assert.equal(h.pilot.status().metrics.estimatedMissedDays,1);
 const s=h.pilot.stop(),report=JSON.parse(fs.readFileSync(path.join(s.localDirectory!,'report.json'),'utf8'));assert.equal(report.capturedObservations,2);assert.equal(report.usefulnessAcceptance,'pending real user questions and paired comparison');assert.ok(report.rawFiles[0].sha256);assert.ok(fs.existsSync(h.log));
 }finally{h.close();}
});
test('monitor stops on monotonic deadline, wrong country, source disappearance and date rollback',()=>{
 for(const scenario of ['deadline','wrong-country','missing','rollback']){
  const h=harness();try{h.pilot.start(h.config);
   if(scenario==='deadline')h.tick(120001);
   else if(scenario==='missing'){fs.unlinkSync(h.log);h.tick();}
   else {fs.appendFileSync(h.log,begin+line());h.tick();fs.appendFileSync(h.log,scenario==='wrong-country'?line('GER'):line('POR','1935.01.01.24'));h.tick();}
   assert.equal(h.pilot.status().state,'stopped',scenario);assert.ok(fs.existsSync(path.join(h.pilot.status().localDirectory!,'report.json')));
  }finally{h.close();}
 }
});
test('log rotation requires new marker and changes session; no freshness promotion',()=>{
 const h=harness();try{h.pilot.start(h.config);fs.appendFileSync(h.log,begin+line());h.tick();const first=h.pilot.observations()[0];fs.writeFileSync(h.log,begin+line('POR','1936.01.02.24',5));h.tick();const last=h.pilot.observations().at(-1)!;assert.notEqual(first.sessionId,last.sessionId);assert.equal(last.classification,'historical');}finally{h.close();}
});
test('duration, opt-in and source-size bounds fail before recording',()=>{
 const h=harness();try{for(const change of [{minutes:61},{minutes:0},{dedicatedPlayset:false},{singlePlayer:false},{logPath:'relative.log'}])assert.throws(()=>h.pilot.start({...h.config,...change}));
 fs.truncateSync(h.log,65*1024*1024);assert.throws(()=>h.pilot.start(h.config),/64 MiB/);
 }finally{h.close();}
});
test('real historical GER recording retains provenance and does not become live or a complete inventory',()=>{
 const text=fs.readFileSync(new URL('./fixtures/bridge-native-1.19.4.2.txt',import.meta.url),'utf8'),rows=text.trim().split(/\r?\n/);
 const observations=rows.map((row,i)=>sanitizeObservation(telemetryObservation(parseTelemetry(row,{sessionId:'historical-m65',observedAt:'2026-11-05T00:00:00Z',gameVersion:'1.19.4.2',path:'private/game.log',offset:i})!,null)));
 assert.equal(observations[0].fields.politicalPower.value,2.324);assert.equal(observations[1].fields.civilianFactories.value,37);assert.ok(observations.every(o=>o.classification==='historical'));assert.equal(observations[1].fields.researchAssignments.status,'unavailable');assert.equal(observations[1].fields.currentFocus.status,'unavailable');
});
test('separate authenticated six-tool MCP refuses controls and shares sanitized HTTP/export contract',{timeout:30000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-qa-http-')),game=path.join(dir,'game');fs.mkdirSync(game);fs.writeFileSync(path.join(game,'hoi4.exe'),'fixture');fs.writeFileSync(path.join(game,'launcher-settings.json'),JSON.stringify({rawVersion:'1.19.4.2'}));
 const app=await startServer({dataDir:path.join(dir,'data'),port:0,autoIndex:false,bridge:{gameRoot:game,userRoot:path.join(dir,'profile')}});
 const file=path.join(dir,'data/campaign-qa-connection.json'),c=readQaConnection(file),old=JSON.parse(fs.readFileSync(path.join(dir,'data/bridge-connection.json'),'utf8'));
 const post=(route:string,payload:unknown,token?:string,origin?:string)=>fetch(app.url+'/api/v1/'+route,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(origin?{Origin:origin}:{})},body:JSON.stringify(payload)});
 const client=new Client({name:'qa-fixture-test',version:'1.0.0'}),transport=new StdioClientTransport({command:process.execPath,args:['--import','tsx',path.resolve('server/campaign-qa-mcp.ts')],cwd:process.cwd(),env:{...process.env as Record<string,string>,HOI4_QA_CONNECTION:file},stderr:'pipe'});
 try{
  assert.equal((await post('campaign-qa/query',{tool:'hoi4_qa_session'})).status,401);
  assert.equal((await post('bridge/mcp',{tool:'hoi4_bridge_connection'},c.token)).status,401);
  assert.equal((await post('campaign-qa/query',{tool:'hoi4_qa_session'},old.token)).status,401);
  assert.equal((await post('campaign-qa/query',{tool:'hoi4_qa_session'},c.token,'https://evil.example')).status,403);
  assert.equal((await post('campaign-qa/pilot/start',{},c.token)).status,403);
  await client.connect(transport);const catalog=await client.listTools();assert.deepEqual(catalog.tools.map(t=>t.name),qaTools.map(t=>t.name));assert.ok(catalog.tools.every(t=>t.annotations?.readOnlyHint));
  await assert.rejects(client.callTool({name:'hoi4_bridge_connect',arguments:{source:'log',path:'C:/private/game.log'}}),/not found/);
  const status=await client.callTool({name:'hoi4_qa_session',arguments:{}});assert.ok(!status.isError);assert.equal((status.structuredContent as any).schemaVersion,'hoi4-campaign-qa/1');
  const bad=await client.callTool({name:'hoi4_qa_observations',arguments:{path:'C:/private'}});assert.equal(bad.isError,true);
  const save=path.join(dir,'copy.hoi4');fs.copyFileSync(new URL('./fixtures/bridge-save-1.19.4.2.txt',import.meta.url),save);const before=sha(fs.readFileSync(save));
  assert.equal((await post('campaign-qa/save',{path:save},undefined,app.url)).status,200);assert.equal(sha(fs.readFileSync(save)),before);
  const exported=await post('campaign-qa/export',{limit:5},undefined,app.url).then(r=>r.json());assert.equal(exported.data.observations[0].classification,'save-derived');assert.doesNotMatch(JSON.stringify(exported),/copy.hoi4|private|token/);
  const obs=await client.callTool({name:'hoi4_qa_observations',arguments:{}});assert.equal((obs.structuredContent as any).data.observations[0].source.hash,before);
  assert.equal((await fetch(app.url+'/api/v1/campaign-qa/panel')).status,200);
 }finally{await client.close();await transport.close();await app.close();assert.equal(fs.existsSync(file),false);fs.rmSync(dir,{recursive:true,force:true});}
});
