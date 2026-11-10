export const pilotHtml=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HOI4 campaign observation pilot</title>
<style>body{font:16px system-ui;background:#111827;color:#e5e7eb;max-width:960px;margin:32px auto;padding:0 20px}h1{font-size:28px}fieldset{margin:20px 0;border:1px solid #64748b;border-radius:8px}label{display:block;margin:12px 0}input,select,textarea,button{font:inherit;padding:10px;border-radius:5px}input[type=text],textarea{display:block;width:90%;margin:5px 0}button{cursor:pointer;margin:6px;background:#dbeafe;color:#111827}button:disabled{opacity:.5}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#1e293b;padding:16px}a{color:#93c5fd}.warning{color:#fde68a}</style>
<h1>Campaign observation pilot</h1><p>Local recording only. You control HOI4. This panel never launches the game or sends gameplay input.</p>
<p class="warning">Candidate telemetry: independent country/field verification is pending. Stop ends recording; exit the game and deselect the pilot playset to stop game-side logging.</p>
<fieldset id="setup"><legend>Dedicated single-player session</legend>
<label>Dedicated profile game.log <input id="log" type="text" placeholder="Absolute path to dedicated profile logs/game.log"></label>
<label>Producer token from prepare output <input id="producer" type="text" maxlength="16"></label>
<label>Selected country tag <input id="country" type="text" maxlength="3" placeholder="POR"></label>
<label>Duration <select id="minutes"><option value="2">2-minute connection smoke test</option><option value="30">30-minute gameplay recording</option><option value="45">45-minute gameplay recording</option><option value="60">60-minute gameplay recording</option></select></label>
<label>Displayed game checksum (or unknown) <input id="checksum" type="text" maxlength="32" value="unknown"></label>
<label>DLC/mod configuration note (local only) <input id="configuration" type="text" maxlength="500" value="unknown"></label>
<label><input id="dedicated" type="checkbox"> I selected the dedicated modded playset and will preserve normal saves/configuration.</label>
<label><input id="single" type="checkbox"> This is single player; I will compare the country tag with the game.</label>
<button id="start">Start recording</button></fieldset><button id="stop" disabled>Stop recording</button><strong id="state" role="status">Loading status…</strong><pre id="status"></pre>
<fieldset><legend>Optional persisted state</legend><p>Select a stable plaintext save copy explicitly. Binary/compressed saves refuse. This reads the file and keeps parsed observations locally; it does not alter the save.</p><label>Plaintext save copy <input id="save" type="text"></label><button id="inspect">Read selected save copy</button></fieldset>
<button id="export">Download sanitized observation snapshot</button><p>Review the JSON before attaching it in ChatGPT. Exported observations are historical, with source hashes and explicit unknown fields. Raw logs, paths and credentials stay local.</p>
<fieldset><legend>Independent performance note</legend><p>At baseline and during recording, note Task Manager HOI4 CPU and the same frame-rate method. These are user assertions, not automatic measurements.</p><label>Baseline / during observations <textarea id="note" maxlength="2000" rows="3"></textarea></label><button id="note-save">Save local note</button></fieldset>
<pre id="result" role="status"></pre><script src="/api/v1/campaign-qa/panel.js"></script></html>`;
export const pilotJs=`const $=id=>document.getElementById(id);
async function call(route,input){const r=await fetch('/api/v1/campaign-qa/'+route,{method:input===undefined?'GET':'POST',headers:input===undefined?{}:{'Content-Type':'application/json'},body:input===undefined?undefined:JSON.stringify(input)});const data=await r.json();if(!r.ok)throw Error(data.error||'Request refused');return data;}
async function refresh(){try{const s=await call('pilot/status');$('state').textContent=s.state+' — '+s.remainingSeconds+' seconds remaining';$('status').textContent=JSON.stringify(s,null,2);$('stop').disabled=s.state!=='recording';$('start').disabled=s.state==='recording';}catch(e){$('state').textContent='Connection lost — recording status unknown';$('result').textContent=e.message;}}
async function act(fn){try{$('result').textContent=JSON.stringify(await fn(),null,2);}catch(e){$('result').textContent=e.message;}await refresh();}
$('start').onclick=()=>act(()=>call('pilot/start',{logPath:$('log').value,country:$('country').value.toUpperCase(),producer:$('producer').value,minutes:Number($('minutes').value),checksum:$('checksum').value,configurationNote:$('configuration').value,dedicatedPlayset:$('dedicated').checked,singlePlayer:$('single').checked}));
$('stop').onclick=()=>act(()=>call('pilot/stop',{}));
$('inspect').onclick=()=>act(()=>call('save',{path:$('save').value}));
$('note-save').onclick=()=>act(()=>call('pilot/note',{text:$('note').value}));
$('export').onclick=()=>act(async()=>{const data=await call('export',{limit:5});const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='hoi4-observation-snapshot.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);return {downloaded:true,warning:'Historical sanitized snapshot; inspect before sharing.'};});
refresh();setInterval(refresh,5000);`;
