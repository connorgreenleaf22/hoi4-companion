import {execFileSync} from 'node:child_process';
const game=process.env.HOI4_COVERAGE_GAME_DIR,output=process.env.HOI4_COVERAGE_OUTPUT,ledger=process.env.HOI4_COVERAGE_LEDGER;
if(!game||!output||!ledger)throw Error('Final-release explanation coverage is not approved. Supply HOI4_COVERAGE_GAME_DIR, HOI4_COVERAGE_OUTPUT (new evidence directory), and HOI4_COVERAGE_LEDGER. See docs/application/EXPLANATION-COVERAGE-CONTRACT.md. Isolated package:development remains available.');
execFileSync(process.execPath,['--import','tsx','scripts/release-coverage.ts',game,output,'--check',ledger],{stdio:'inherit',windowsHide:true});
