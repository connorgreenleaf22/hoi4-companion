import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validate, checkManifest} from './schemas.mjs';
import {violations} from './hygiene.mjs';
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
