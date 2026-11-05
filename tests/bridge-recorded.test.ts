import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseTelemetry,replaySnapshots,freshness} from '../server/bridge/telemetry';

test('sanitized native 1.19.4.1 records retain engine midnight and replay without becoming live',()=>{
  // Adapted from Milestone 1's retained native-vCXJuK capture: producer identity replaced.
  // This test is recorded-data regression coverage, not a new native-game test.
  const lines=fs.readFileSync(new URL('./fixtures/bridge-native-1.19.4.1.txt',import.meta.url),'utf8').trim().split(/\r?\n/);
  const snapshots=lines.map((line,offset)=>parseTelemetry(line,{sessionId:'recorded-native-m1',observedAt:'2026-11-05T02:09:37.191Z',gameVersion:'1.19.4.1',path:'sanitized-native-fixture',offset})).filter(s=>s!==null);
  assert.equal(snapshots.length,2);
  assert.deepEqual(snapshots.map(s=>s.values.gameDate.value),['1936.01.01.24','1936.01.02.24']);
  assert.deepEqual(snapshots.map(s=>s.values.politicalPower.value),[2.324,4.648]);
  for(const s of snapshots){assert.equal(s.values.country.value,'GER');assert.equal(s.values.stability.value,0.81);assert.ok(s.unavailable.includes('focus'));}
  const replay=replaySnapshots(snapshots.map(s=>JSON.stringify(s)).join('\n'));
  assert.deepEqual(replay,snapshots);
  assert.equal(freshness(replay[1],Date.parse('2026-11-06T00:00:00Z')).status,'stale');
});
