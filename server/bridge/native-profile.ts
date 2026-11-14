import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const marker='.hoi4-companion-test-owner.json';
export interface ProfileLease {schemaVersion:1;token:string;profileRoot:string;runRoot:string;identity:{dev:number;ino:number};}

/** Reserve a previously absent default game profile. Never overwrite a user profile. */
export function reserveEmptyProfile(profileRoot:string,runRoot:string):ProfileLease {
  profileRoot=path.resolve(profileRoot);runRoot=path.resolve(runRoot);
  if(profileRoot===runRoot||profileRoot.startsWith(runRoot+path.sep)||runRoot.startsWith(profileRoot+path.sep))throw new Error('Profile and evidence directories must be separate');
  if(!fs.statSync(runRoot).isDirectory()||fs.lstatSync(path.dirname(profileRoot)).isSymbolicLink())throw new Error('Invalid profile parent/evidence directory');
  fs.mkdirSync(profileRoot); // Exclusive: EEXIST protects even an empty pre-existing profile.
  const stat=fs.statSync(profileRoot);
  const lease:ProfileLease={schemaVersion:1,token:randomUUID(),profileRoot,runRoot,identity:{dev:stat.dev,ino:stat.ino}};
  fs.writeFileSync(path.join(profileRoot,marker),JSON.stringify(lease),{flag:'wx'});
  fs.writeFileSync(path.join(runRoot,'profile-lease.json'),JSON.stringify(lease,null,2),{flag:'wx'});
  return lease;
}

export function verifyProfileLease(lease:ProfileLease){
  const root=path.resolve(lease.profileRoot),run=path.resolve(lease.runRoot);
  if(root!==lease.profileRoot||run!==lease.runRoot||root===run||run.startsWith(root+path.sep)||root.startsWith(run+path.sep))throw new Error('Invalid lease paths');
  const stat=fs.lstatSync(root);
  if(stat.isSymbolicLink()||!stat.isDirectory()||stat.dev!==lease.identity.dev||stat.ino!==lease.identity.ino)throw new Error('Profile identity changed; do not touch');
  const recorded=JSON.parse(fs.readFileSync(path.join(root,marker),'utf8'));
  if(JSON.stringify(recorded)!==JSON.stringify(lease))throw new Error('Profile ownership marker mismatch');
}

/** Caller must establish no game process is running. Moves owned artifacts; deletes nothing. */
export function archiveOwnedProfile(lease:ProfileLease){
  verifyProfileLease(lease);
  const destination=path.join(lease.runRoot,'owned-game-profile');
  if(fs.existsSync(destination))throw new Error('Evidence destination already exists');
  fs.renameSync(lease.profileRoot,destination);
  return destination;
}
