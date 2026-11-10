import fs from 'node:fs';
import {checkManifest} from './schemas.mjs';
const file = process.argv[2];
if (!file) throw new Error('Usage: npm run hq:handoff -- docs/milestones/<ID>.json');
const m = JSON.parse(fs.readFileSync(file, 'utf8')); checkManifest(m);
const repo = 'https://github.com/connorgreenleaf22/hoi4-companion';
console.log([
  `Project HQ handoff: ${m.milestoneId}`,
  `Status: ${m.status}; acceptance: ${m.acceptance.state}; native: ${m.nativeQualification.state} (${m.nativeQualification.scope}).`,
  `Tested implementation: ${repo}/commit/${m.commitSha} on ${m.branch}.`,
  `Evidence: ${m.testEvidence.map(e => `${e.kind}: ${e.result} — ${e.summary} (${e.reference})`).join('; ')}`,
  `Artifact: ${m.artifact ? `${m.artifact.name}; SHA256 ${m.artifact.sha256}; ${m.artifact.reference}` : 'none produced'}.`,
  `Blockers: ${m.blockers.map(b => `${b.summary} (${b.issue})`).join('; ') || 'none recorded'}.`,
  `Manifest: ${file}; report: ${m.report}; GitHub: ${m.github.join(', ')}.`,
  'Apply after reading current HQ; preserve product decisions. HQ update pending; no automatic synchronization.'
].join('\n'));
