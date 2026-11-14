import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
export const schema = JSON.parse(fs.readFileSync('schemas/milestone.schema.json', 'utf8'));
export const validate = new Ajv({allErrors: true, strict: true}).compile(schema);
export function checkManifest(value) {
  if (!validate(value)) throw new Error(JSON.stringify(validate.errors));
  if (!fs.existsSync(value.report)) throw new Error('Missing milestone report: ' + value.report);
  if (!fs.readFileSync(value.report, 'utf8').includes(value.milestoneId + '.json')) throw new Error('Report must link manifest');
  if (!value.github.some(url => fs.readFileSync(value.report, 'utf8').includes(url))) throw new Error('Report must link a relevant GitHub issue or PR');
  if (value.status === 'complete' && value.testEvidence.some(e => e.result !== 'passed')) throw new Error('Complete milestone has unresolved test evidence');
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/ci/schemas.mjs')) {
  const files = fs.readdirSync('docs/milestones').filter(f => f.endsWith('.json'));
  if (!files.length) throw new Error('No milestone manifests');
  for (const file of files) checkManifest(JSON.parse(fs.readFileSync('docs/milestones/' + file, 'utf8')));
  console.log(`Validated ${files.length} milestone manifest(s)`);
}
