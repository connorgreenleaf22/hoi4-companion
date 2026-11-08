import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inspectEnvironment} from '../server/bridge/environment';
import {reserveEmptyProfile,archiveOwnedProfile,type ProfileLease} from '../server/bridge/native-profile';

// No launches, termination or installed-game writes. Refuse every existing profile.
if(process.platform!=='win32')throw new Error('This native profile workflow is Windows-only');
const processes=execFileSync('tasklist.exe',['/FI','IMAGENAME eq hoi4.exe','/FO','CSV','/NH'],{encoding:'utf8',windowsHide:true});
if(/"hoi4\.exe"/i.test(processes))throw new Error('An HOI4 process is running; leave it alone');
const parent=path.resolve('.bridge-local');fs.mkdirSync(parent,{recursive:true});
if(process.argv[2]==='--restore'){
  const file=path.resolve(process.argv[3]||'');
  if(!file.startsWith(parent+path.sep)||path.basename(file)!=='profile-lease.json')throw new Error('Supply an owned .bridge-local profile-lease.json');
  const lease=JSON.parse(fs.readFileSync(file,'utf8')) as ProfileLease;
  if(lease.runRoot!==path.dirname(file))throw new Error('Evidence directory mismatch');
  console.log(JSON.stringify({archived:archiveOwnedProfile(lease),normalProfileRestoredTo:'absent'}));
}else{
  if(process.argv[2]!=='--empty-user-root'||!process.argv[3])throw new Error('Use --empty-user-root <ABSENT default HOI4 user directory> or --restore <profile-lease.json>');
  const user=path.resolve(process.argv[3]);
  const candidates=[path.join(os.homedir(),'Documents'),path.join(process.env.OneDrive||path.join(os.homedir(),'OneDrive'),'Documents')].map(p=>path.join(p,'Paradox Interactive','Hearts of Iron IV'));
  if(!candidates.includes(user))throw new Error('Profile must be a recognized default Documents HOI4 directory');
  const environment=inspectEnvironment();if(!environment.executable)throw new Error('Game installation unavailable');
  if(fs.existsSync(user))throw new Error('A game profile already exists; this workflow cannot safely use it');
  const run=fs.mkdtempSync(path.join(parent,'native-'));
  const lease=reserveEmptyProfile(user,run),mod=path.join(user,'mod','companion_telemetry');
  fs.mkdirSync(path.dirname(mod));fs.cpSync(path.resolve('mods/hoi4-companion-telemetry'),mod,{recursive:true});
  for(const relative of ['common/on_actions/hoi4_companion_telemetry.txt','common/scripted_effects/hoi4_companion_telemetry.txt']){const script=path.join(mod,relative);fs.writeFileSync(script,fs.readFileSync(script,'utf8').replaceAll('producer=prototype',`producer=${lease.token}`));}
  fs.writeFileSync(path.join(user,'mod','companion_telemetry.mod'),`name="HOI4 Companion Disposable Telemetry"\npath="${mod.replaceAll('\\','/')}"\nsupported_version="1.19.*"\n`);
  fs.writeFileSync(path.join(user,'dlc_load.json'),JSON.stringify({enabled_mods:['mod/companion_telemetry.mod'],disabled_dlcs:[]}));
  fs.writeFileSync(path.join(user,'settings.txt'),'language="l_english"\ngraphics={ size={ x=1280 y=720 } fullScreen=no borderless=no }\nsave_as_binary=no\nautosave="never"\n');
  const recovery=process.argv.includes('--telemetry-m721'),m72=process.argv.includes('--telemetry-m72')||recovery,m7=process.argv.includes('--telemetry-m7')||m72,telemetryOnly=process.argv.includes('--telemetry-m65')||m7;
  const plan={schemaVersion:1,...(telemetryOnly?{purpose:'telemetry'}:{}),...(m7?{milestone:recovery?'M7.2.1':m72?'M7.2':'M7',budgetFile:path.join(parent,recovery?'m721-native-budget.json':m72?'m72-native-budget.json':'m7-native-budget.json'),...(m72?{supervisedSeconds:recovery?540:600}:{})}:{}),createdAt:new Date().toISOString(),run,user,producer:lease.token,environment,executableHash:createHash('sha256').update(fs.readFileSync(environment.executable)).digest('hex'),limits:{launches:m7?1:2,actions:recovery?4:m7?8:telemetryOnly?10:20,minutes:recovery?12:m7?20:telemetryOnly?25:20,sameFailureAttempts:recovery?1:2},launchArguments:['-debug_mode','-gdpr-compliant'],isolation:'Exclusively owned previously absent default profile; no redirection flags',procedure:recovery?'M721-NATIVE-PLAN.md: disposable GER; paused empty research evidence, assign Basic Machine Tools, unpause/pause, one plaintext save; await 540-second supervisor deadline then archive.': 'New 1936 GER campaign; advance two days; pause; compare country/date/PP/stability; exit owned game; replay snapshots; archive owned profile with --restore. No native action adapter.'};
  fs.writeFileSync(path.join(run,'plan.json'),JSON.stringify(plan,null,2));
  console.log(JSON.stringify(plan,null,2));
}
