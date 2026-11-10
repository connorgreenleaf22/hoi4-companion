const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const tunnel = process.argv[2];
if (!/^tunnel_[A-Za-z0-9_-]+$/.test(tunnel || '')) throw Error('Enter the existing tunnel ID, not an API key.');
const local = path.join(root, '.bridge-local', 'qa-tunnel');
fs.mkdirSync(local, {recursive:true});
// JSON is valid YAML. Paths are computed on the destination PC, never copied from the developer machine.
const quote = value => '"' + value.replaceAll('\\','/') + '"';
const profile = {
  config_version:1,
  control_plane:{base_url:'https://api.openai.com',tunnel_id:tunnel,api_key:'env:CONTROL_PLANE_API_KEY'},
  health:{listen_addr:'127.0.0.1:0',url_file:path.join(local,'health-url.txt')},
  admin_ui:{open_browser:false},
  log:{level:'info',format:'json',file:path.join(local,'tunnel.log')},
  mcp:{commands:[{channel:'main',command:quote(process.execPath)+' '+quote(path.join(root,'desktop','adapter.cjs'))}]}
};
fs.writeFileSync(path.join(local,'profile.yaml'),JSON.stringify(profile,null,2));
console.log('Local profile prepared. No credential was written.');
