import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validate, checkManifest} from './schemas.mjs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {violations, committedDiffBase} from './hygiene.mjs';
const fixture = () => JSON.parse(fs.readFileSync('docs/milestones/M7.3.1.json', 'utf8'));
test('manifest rejects malformed identity, unknown fields and unearned completion', () => {
  assert.doesNotThrow(() => checkManifest(fixture()));
  for (const patch of [{commitSha:'abc'}, {acceptance:{state:'accepted',evidence:[]}}, {nativeQualification:{state:'qualified',scope:'Claim without proof',evidence:[]}}, {nativeQualification:{state:'partial',scope:'Claim without proof',evidence:[]}}, {unexpected:true}, {status:'complete'}, {acceptance:{state:'accepted',evidence:[]}, status:'complete'}, {github:['https://example.com/issue/1']}]) {
    assert.equal(validate({...fixture(), ...patch}), false);
  }
  const complete = {...fixture(), status:'complete', blockers:[], acceptance:{state:'not-applicable', evidence:[]}, nativeQualification:{state:'not-applicable',scope:'Workflow only',evidence:[]}};
  assert.doesNotThrow(() => checkManifest(complete));
  complete.testEvidence[0].result = 'failed';
  assert.throws(() => checkManifest(complete), /unresolved test/);
});
test('hygiene blocks private paths and credential patterns without rejecting synthetic fixtures', () => {
  for (const name of ['.env', '.env.local', 'private/notes.md', 'raw-telemetry/session.json', 'account-metadata.json', 'save.hoi4', 'bridge-connection.json']) assert.ok(violations(name, '').length, name);
  assert.ok(violations('source.ts', 'gh' + 'p_' + 'a'.repeat(36)).length);
  assert.ok(violations('source.ts', 'sk-' + 'a'.repeat(40)).length);
  assert.deepEqual(violations('tests/fixtures/bridge-save-1.19.4.2.txt', 'synthetic fixture'), []);
  assert.deepEqual(violations('.env.example', 'TOKEN='), []);
});

test('initial branch push excludes old whitespace but catches earlier new commits', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hoi4-ci-git-'));
  const git = (...args) => execFileSync('git', args, {cwd: dir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']}).trim();
  try {
    git('init', '-b', 'main'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
    fs.writeFileSync(path.join(dir, 'old.txt'), 'legacy trailing whitespace   \n');
    git('add', '.'); git('commit', '-m', 'baseline');
    const baseline = git('rev-parse', 'HEAD'); git('update-ref', 'refs/remotes/origin/main', baseline);
    git('checkout', '-b', 'workflow/test');
    fs.writeFileSync(path.join(dir, 'new.txt'), 'clean\n'); git('add', '.'); git('commit', '-m', 'clean new change');
    const zero = '0'.repeat(40);
    assert.equal(committedDiffBase(zero, 'main', dir), baseline);
    assert.doesNotThrow(() => git('diff', '--check', committedDiffBase(zero, 'main', dir), 'HEAD'));
    fs.writeFileSync(path.join(dir, 'new.txt'), 'new whitespace   \n'); git('add', '.'); git('commit', '-m', 'bad earlier commit');
    fs.writeFileSync(path.join(dir, 'later.txt'), 'clean\n'); git('add', '.'); git('commit', '-m', 'later clean commit');
    assert.throws(() => git('diff', '--check', committedDiffBase(zero, 'main', dir), 'HEAD'));
    assert.equal(committedDiffBase(baseline, 'main', dir), baseline);
    assert.throws(() => committedDiffBase(zero, '', dir), /default branch/);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});
