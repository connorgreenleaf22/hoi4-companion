import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as asar from '@electron/asar';
import {captureRuntime,captureRuntimeArchive,verifyRuntime} from '../verify-package.mjs';

test('exact frozen runtime verifier detects missing, additional and changed packed bytes while allowing package metadata normalization',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-qa-verifier-'));const runtime=path.join(root,'runtime');
  try{
    for(const name of ['build','dist/assets','assets','node_modules/synthetic-dependency'])fs.mkdirSync(path.join(runtime,name),{recursive:true});
    fs.writeFileSync(path.join(runtime,'package.json'),JSON.stringify({name:'qa-fixture',version:'0.0.0',main:'build/electron.cjs',dependencies:{},devDependencies:{test:'0'},build:{private:true}}));
    fs.writeFileSync(path.join(runtime,'build/electron.cjs'),'/* synthetic runtime only */');fs.writeFileSync(path.join(runtime,'dist/index.html'),'<script src="/assets/index-a.js"></script>');fs.writeFileSync(path.join(runtime,'dist/assets/index-a.js'),'/* synthetic renderer */');fs.writeFileSync(path.join(runtime,'assets/icon.png'),'synthetic icon');
    fs.writeFileSync(path.join(runtime,'node_modules/synthetic-dependency/index.js'),'/* synthetic dependency */');
    const manifest=captureRuntime(runtime),archive=path.join(root,'fixture.asar');
    await asar.createPackage(runtime,archive);assert.equal(verifyRuntime(archive,manifest).passed,true);const archived=captureRuntimeArchive(archive);assert.equal(verifyRuntime(archive,archived).passed,true);assert.ok(archived.members.some(member=>member.file==='node_modules/synthetic-dependency/index.js'));
    fs.writeFileSync(path.join(runtime,'package.json'),JSON.stringify({name:'qa-fixture',version:'0.0.0',main:'build/electron.cjs',dependencies:{}}));await asar.createPackage(runtime,archive);const normalized=verifyRuntime(archive,manifest);assert.equal(normalized.passed,true);assert.equal(normalized.checks.find(check=>check.file==='package.json').byteIdentical,false);
    fs.writeFileSync(path.join(runtime,'dist/assets/stale.js'),'extra');await asar.createPackage(runtime,archive);assert.deepEqual(verifyRuntime(archive,manifest).unexpected,['dist/assets/stale.js']);
    fs.unlinkSync(path.join(runtime,'dist/assets/stale.js'));fs.writeFileSync(path.join(runtime,'dist/assets/index-a.js'),'changed');await asar.createPackage(runtime,archive);assert.equal(verifyRuntime(archive,manifest).checks.find(check=>check.file==='dist/assets/index-a.js').match,false);
    fs.unlinkSync(path.join(runtime,'dist/assets/index-a.js'));await asar.createPackage(runtime,archive);assert.deepEqual(verifyRuntime(archive,manifest).missing,['dist/assets/index-a.js']);
    assert.throws(()=>verifyRuntime(archive,{...manifest,members:[{file:'../escape',sha256:'f'.repeat(64),bytes:1}]}),/Invalid frozen runtime member/);
  }finally{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(root,{recursive:true,force:true});}
});
