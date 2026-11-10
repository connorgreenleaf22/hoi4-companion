import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
export function violations(name, content) {
  const problems = [];
  if (/(^|\/)(\.env(?:\..*)?|bridge-connection\.json|credentials[^/]*|account-metadata[^/]*|private-planning|personal-saves|raw-telemetry|node_modules|\.bridge-local|artifacts|private)(\/|$)/i.test(name) && !/(^|\/)\.env\.example$/.test(name)) problems.push('private/generated path');
  if (/\.(hoi4(?:_backup)?|sqlite(?:3)?(?:-.*)?|db(?:-.*)?|pem|key|p12|pfx|log)$/i.test(name)) problems.push('private data extension');
  if (/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{32,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(content)) problems.push('credential pattern');
  return problems;
}
if (process.argv[1]?.replaceAll('\\','/').endsWith('scripts/ci/hygiene.mjs')) {
  const files = execFileSync('git', ['ls-files', '-z'], {encoding: 'utf8'}).split('\0').filter(Boolean);
  const failures = files.flatMap(file => violations(file, fs.readFileSync(file, 'utf8')).map(reason => `${file}: ${reason}`));
  if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
  const base = process.env.CI_DIFF_BASE;
  if (base) {
    if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('Invalid CI diff base');
    const from = /^0+$/.test(base) ? execFileSync('git', ['hash-object', '-t', 'tree', '--stdin'], {input: '', encoding: 'utf8'}).trim() : base;
    execFileSync('git', ['diff', '--check', from, 'HEAD'], {stdio: 'inherit'});
  } else {
    execFileSync('git', ['diff', '--check'], {stdio: 'inherit'});
    execFileSync('git', ['diff', '--cached', '--check'], {stdio: 'inherit'});
  }
  console.log(`Hygiene passed for ${files.length} tracked files (heuristic scan; manual audit still required)`);
}
