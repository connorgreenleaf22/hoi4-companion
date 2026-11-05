import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {startServer} from '../server/api';
import {createQaRun,assertOwnedStatus} from '../scripts/qa/fixture';

test('API persists profiles, searches FTS, blocks cross-origin writes, and pairs remote sessions',async()=>{
  const run=createQaRun('api-auth','source-http');const directory=run.dataDirectory,started=Date.now();
  let service=await startServer({dataDir:directory,port:0,autoIndex:false,testRemoteHost:'127.0.0.1'});
  try{
    run.write('preflight.json',assertOwnedStatus(await fetch(service.url+'/api/v1/status').then(r=>r.json()),directory));
    service.store.insert({uid:'focus:test:A',id:'A',kind:'focus',title:'An unusual empire',description:'A sourced focus',source:'test',line:1,version:'test',hash:'hash',data:{}});
    const query=await fetch(service.url+'/api/v1/entries?q=unusual').then(r=>r.json());assert.equal(query.total,1);
    const special=await fetch(service.url+'/api/v1/entries?q=%22%20OR%20*').then(r=>r.json());assert.ok(!special.error);
    const profile={id:'persisted',name:'Saved campaign',country:'GER',startDate:'1936-01-01',queue:['A'],notes:{A:'A note'},bookmarks:['focus:test:A']};
    const save=await fetch(service.url+'/api/v1/profile',{method:'POST',body:JSON.stringify(profile)});assert.equal(save.status,200);
    const attack=await fetch(service.url+'/api/v1/profile',{method:'POST',headers:{Origin:'https://other.example'},body:JSON.stringify(profile)});assert.equal(attack.status,403);
    const invalid=await fetch(service.url+'/api/v1/profile',{method:'POST',body:JSON.stringify({...profile,startDate:'bad'})});assert.equal(invalid.status,400);
    const net=await fetch(service.url+'/api/v1/network',{method:'POST',body:JSON.stringify({enabled:true})}).then(r=>r.json());assert.match(net.code,/^\d{6}$/);assert.equal(net.host,'127.0.0.1');
    run.write('remote-listener.json',{host:net.host,port:net.port,authentication:'Real pairing/session handler; no bypass',productionDefaultUnchanged:true});
    const remote=`http://127.0.0.1:${net.port}`;
    assert.equal((await fetch(remote+'/api/v1/status')).status,401);
    assert.equal((await fetch(remote+'/api/v1/pair',{method:'POST',body:JSON.stringify({code:'000000'})})).status,401);
    const pair=await fetch(remote+'/api/v1/pair',{method:'POST',body:JSON.stringify({code:net.code})});assert.equal(pair.status,200);
    const setCookie=pair.headers.get('set-cookie')!;assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Strict/);
    const cookie=setCookie.split(';')[0];const status=await fetch(remote+'/api/v1/status',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(status.local,false);assert.equal(status.root,undefined);assert.equal(status.profiles[0].name,'Saved campaign');
    assert.equal((await fetch(remote+'/api/v1/profile',{method:'POST',headers:{Cookie:cookie,Origin:'https://other.example'},body:JSON.stringify(profile)})).status,403);
    assert.equal((await fetch(remote+'/api/v1/reindex',{method:'POST',headers:{Cookie:cookie},body:'{}'})).status,403);
    assert.equal((await fetch(remote+'/api/v1/selection',{method:'POST',headers:{Cookie:cookie},body:JSON.stringify({id:'persisted'})})).status,403);assert.equal(status.selectedProfileId,undefined);
    for(let attempt=3;attempt<=8;attempt++)assert.equal((await fetch(remote+'/api/v1/pair',{method:'POST',body:JSON.stringify({code:'000000'})})).status,401);
    assert.equal((await fetch(remote+'/api/v1/pair',{method:'POST',body:JSON.stringify({code:net.code})})).status,429);
    assert.equal((await fetch(remote+'/api/v1/status',{headers:{Cookie:cookie}})).status,200);
    await fetch(service.url+'/api/v1/network',{method:'POST',body:'{"enabled":false}'});
    const net2=await fetch(service.url+'/api/v1/network',{method:'POST',body:'{"enabled":true}'}).then(r=>r.json());
    assert.equal((await fetch(`http://127.0.0.1:${net2.port}/api/v1/status`,{headers:{Cookie:cookie}})).status,401);
    await service.close();service=await startServer({dataDir:directory,port:0,autoIndex:false,testRemoteHost:'127.0.0.1'});
    const restored=await fetch(service.url+'/api/v1/status').then(r=>r.json());assert.equal(restored.profiles[0].notes.A,'A note');assert.deepEqual(restored.profiles[0].queue,['A']);
    run.results.push({name:'Real pairing, rate limiting, cross-origin/remote privilege guards, session revocation and restart persistence',status:'passed',level:'source-http',requirements:['A03','RG12'],ms:Date.now()-started});
  }catch(error){run.results.push({name:'API auth/persistence',status:'failed',level:'source-http',requirements:['A03','RG12'],ms:Date.now()-started,error:String(error)});throw error;
  }finally{await service.close();run.finish({desktopUsed:false,externalListener:false});run.cleanup();}
});

test('loopback auth seam refuses default, non-temporary and auto-indexed configurations before opening a store',async()=>{
  for(const options of [{testRemoteHost:'127.0.0.1'}, {testRemoteHost:'127.0.0.1',dataDir:process.cwd(),autoIndex:false}, {testRemoteHost:'0.0.0.0',dataDir:path.join(os.tmpdir(),'hoi4-invalid-host'),autoIndex:false}]){
    await assert.rejects(startServer(options as any),/loopback test listener requires/);
  }
});
