# Stage 1 reusable QA

This is developer QA infrastructure. It does not grant release acceptance or replace the mandatory independent native gate. Stage 2 scheduling, cache/seed reuse and broader historical-script merging are not implemented here.

Every adapted run uses a new temporary root, synthetic/disposable data, discovered loopback port and unique evidence directory. Evidence defaults to `artifacts/qa` so ephemeral sandbox temp cleanup cannot erase it. `HOI4_QA_OUTPUT` selects another evidence parent inside the workspace or temporary directory. Reports retain source/harness/oracle/runtime hashes, actual cases, evidence level and limitations. A changed source fingerprint during a developer run is disclosed; freeze source before certification. Earlier failed attempts are separate records.

Run from the candidate repository:

```powershell
$env:HOI4_QA_OUTPUT = Join-Path (Get-Location) 'artifacts\qa'
node node_modules/tsx/dist/cli.mjs --test tests/api.test.ts
node --test scripts/qa/verifier-selftest.mjs
# After the integrated build, with an installed browser explicitly selected if required:
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = '<installed Chromium executable>'
node node_modules/tsx/dist/cli.mjs scripts/regression-v020-ui.ts
node node_modules/tsx/dist/cli.mjs scripts/runtime-v020.ts
# Expensive source comparison, coordinated separately:
node node_modules/tsx/dist/cli.mjs scripts/knowledge-installed.ts --game-root '<installed game root>'
```

The auth test passes `testRemoteHost:'127.0.0.1'` only for its explicitly named temporary fixture and disables indexing. The internal seam changes only the listener bind address; real pairing, random sessions, cookie policy, origin checks, rate limiting and remote privilege checks remain active. It has no environment, HTTP or production authentication bypass. The test records the listener's actual bound address.

`regression-v020-ui.ts` remains the maintained reference renderer suite despite its historical filename. It adds permanent SEARCH-01 ordinary-event/short-cost queries with exact-ID controls and exact connections, PRECISION-01 actual declared-value text for fractions/zero/tiny values, and COPY-01 convoy suppression/version-neutral text. Function-only formatter assertions do not qualify the renderer or native UI. Browser route blocking is simulated, not physical offline evidence.

The compiled runtime check runs Electron as Node, opens no native window, uses `PORT=0`, reads the emitted actual URL and closes only its owned process. `HOI4_QA_ELECTRON` and `HOI4_QA_COMPILED_CLI` can select explicitly frozen runtime inputs. Installed comparison requires an explicit `--game-root`/`HOI4_GAME_ROOT`, writes only its run DB and reads installed sources without modifying them.

Freeze the full `app.asar` produced by the builder, or a **runtime-only** directory with every exact `build`, `dist`, `assets`, `package.json` and automatically included production `node_modules` member. Link its first-party members to frozen source/build inputs separately:

```powershell
node scripts/verify-package.mjs --capture-manifest '<new frozen manifest.json>' --runtime-root '<retained runtime directory>'
# Or capture every member of a retained full archive, including production dependencies:
node scripts/verify-package.mjs --capture-manifest '<new frozen manifest.json>' --runtime-archive '<frozen app.asar>'
node scripts/verify-package.mjs --archive '<actual candidate app.asar>' --manifest '<frozen manifest.json>' --executable '<portable.exe>' --output '<evidence parent>'
```

The verifier enumerates frozen manifest members, rejects missing/additional runtime files, hashes every packed member and compares all bytes except the documented production `package.json` normalization (name/version/main/dependencies still must agree). It clears ASAR's process-wide header cache before reading. It never treats unused loose repository assets as expected runtime members. Recording an executable hash alongside an unpacked archive does not independently prove that executable contains the archive; the native/extraction owner must establish that provenance. No verification here proves in-game semantics, physical disconnection, high-DPI or screen-reader behavior.
