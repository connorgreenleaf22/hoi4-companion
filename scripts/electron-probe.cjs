// Minimal pinned-runtime probe: no companion/index, no security switches, no game.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=process.env.HOI4_ELECTRON_PROBE_DIR;
if(!root||!path.isAbsolute(root))throw Error('Supply an isolated absolute HOI4_ELECTRON_PROBE_DIR');
fs.mkdirSync(root,{recursive:true});app.setPath('userData',path.join(root,'user-data'));
const log=(event,data={})=>fs.appendFileSync(path.join(root,'events.jsonl'),JSON.stringify({at:new Date().toISOString(),event,...data})+'\n');
log('versions',{versions:process.versions,execPath:process.execPath});
app.on('child-process-gone',(_event,details)=>log('child-process-gone',details));
app.on('render-process-gone',(_event,_contents,details)=>log('render-process-gone',details));
let window,server;const stop=()=>{window?.destroy();server?.close();app.exit();};
setTimeout(()=>{log('timeout');stop();},40000).unref();
app.whenReady().then(async()=>{
 log('ready');if(process.env.HOI4_PROBE_BLOCK_MS){const ms=Number(process.env.HOI4_PROBE_BLOCK_MS);if(!Number.isInteger(ms)||ms<0||ms>25000)throw Error('Invalid diagnostic block bound');log('block-start',{ms});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);log('block-end');}
 window=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
 window.webContents.on('did-fail-load',(_event,code,description,url)=>log('did-fail-load',{code,description,url}));
 await window.loadURL('data:text/html,<h1>Electron probe</h1>');log('data-loaded',{text:await window.webContents.executeJavaScript('document.body.innerText')});
 server=http.createServer((_req,res)=>res.end('<h1>Loopback probe</h1>'));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 log('node-http',{status:(await fetch(url)).status});
 await window.loadURL(url);log('http-loaded',{text:await window.webContents.executeJavaScript('document.body.innerText')});
 stop();
}).catch(error=>{log('failure',{message:String(error)});stop();});
