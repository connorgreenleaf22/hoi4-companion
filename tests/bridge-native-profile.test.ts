import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {reserveEmptyProfile,archiveOwnedProfile} from '../server/bridge/native-profile';

test('disposable profile refuses pre-existing data and archives only its owned directory',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-profile-')),profile=path.join(root,'profile'),evidence=path.join(root,'evidence');fs.mkdirSync(evidence);
  try{
    fs.mkdirSync(profile);fs.writeFileSync(path.join(profile,'personal-save'),'untouched');
    assert.throws(()=>reserveEmptyProfile(profile,evidence),/EEXIST/);assert.equal(fs.readFileSync(path.join(profile,'personal-save'),'utf8'),'untouched');
    const fresh=path.join(root,'fresh'),lease=reserveEmptyProfile(fresh,evidence);fs.writeFileSync(path.join(fresh,'game.log'),'owned evidence');
    assert.throws(()=>archiveOwnedProfile({...lease,token:'wrong'}),/mismatch/);
    const archived=archiveOwnedProfile(lease);assert.equal(fs.existsSync(fresh),false);assert.equal(fs.readFileSync(path.join(archived,'game.log'),'utf8'),'owned evidence');
    assert.equal(fs.readFileSync(path.join(profile,'personal-save'),'utf8'),'untouched');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
