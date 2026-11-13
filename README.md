# HOI4 Companion

A local Windows encyclopedia and campaign planner that reads installed HOI4 scripts. Core workflows run offline; optional AI generation uses separately configured, paid provider access.

## Current common integration candidate — release blocked

The isolated `integration/common-2026-11-12` branch combines reviewed base `bdb8a4887522b38f5110f3900bbf1655cc5fd600` with PRs **#6 → #9 → #12 → #8 → #11**, preserving their merge ancestry, plus the independently reviewed NAV-01 fix from candidate `6984f884`. PR #4 and live campaign Q&A are excluded. Historical branches already present in the base are not merged again.

See the [continuation report](docs/workflow/COMMON-NAV01-CONTINUATION.md), [manifest](docs/milestones/COMMON-2026.11.12.json), and [rollback/promotion plan](docs/workflow/COMMON-PROMOTION-2026-11-12.md) for exact tested SHA, Windows artifact, review and gates. The new `M7.4.2n` package label identifies the NAV-01 integration build only; it does not complete a mechanics milestone. The earlier [integration report](docs/workflow/COMMON-INTEGRATION-2026-11-12.md) and `M7.4.2i` build remain historical evidence.

**NAV-01 is fixed:** unsaved template names, unit rows/counts and army size stay in the current window across tools and campaigns. Save persists name/rows through the existing API; replacing different rows under the same name asks for confirmation. Loading over dirty edits and discard require an explicit choice. Global draft review supports return, download and discard; normal reload/close offers Stay/review or explicit Leave/discard. Drafts are not crash durable. Army size is not part of saved templates; scratch/deleted-campaign drafts are download/discard only. Production/comparison state and whole-strategy editor recovery are outside this fix.

**Release promotion remains blocked by QUAL-195** and the existing explanation/acceptance gates. The explicit [release gate](docs/application/INTEGRATION-RELEASE-GATES.json) still makes `npm run package` refuse. Isolated development packaging remains available for review.

[Draft integration PR #13](https://github.com/connorgreenleaf22/hoi4-companion/pull/13) targets develop and stays unmerged. Four required hosted checks passed at reviewed candidate `668ad4e3`; the continuation report and final native handoff retain exact SHA/check scope. No main promotion or release is performed.

#11 preserves source-input inspection, not qualified division combat calculations. Organization, soft attack, hard attack, defense and breakthrough remain unsupported with null values/deltas; M7.4.2b remains blocked on [Issue #10](https://github.com/connorgreenleaf22/hoi4-companion/issues/10). Strategies remain provisional, and ranking/optimization stay disabled where coverage is insufficient. The earlier authorized provider request does not authorize further calls.

The current installed game is 1.19.5.0, while retained qualification is pinned to 1.19.4.2. A [separate read-only isolated-index audit](docs/application/QUALIFICATION-195-DELTA.json) compared 39 pins: 38 unchanged and only launcher settings changed. Current-index evaluations/inspection and retained fixture-result reuse refuse the mismatch. This is not semantic or all-DLC qualification. Legacy Germany/Hungary paths and no-NSB tank fixtures remain counterfactuals, not evidence for the installed all-DLC target configuration.

## Inherited v0.4 foundation

`release/HOI4-Companion-0.4.0-r3.exe` and `release/v0.4.0-r3/` are historical artifact references, not this integration candidate. Storage remains schema 3; the integration introduces no database migration. Older builds and their evidence must be retained.

Discovery now provides seven sourced campaign entries: Fascist USA, Elizabeth II, Japanese alternate leaders, Austrian and Hungarian Habsburgs, Liechtenstein and Scandinavia. Claims separate installed declarations, explanations, strategy and unverified research leads. Patch, DLC context, source lines/hashes, review metadata and known limits are visible. These are original summaries of narrow evidence, not completed in-game walkthroughs.

Secret guides and raw formation results require an explicit reveal on each visit. Hidden guide content is excluded on the server before search. The raw encyclopedia remains an unredacted source browser. Previously saved user notes, bookmarks and captured checklists are not erased when hiding discovery spoilers.

Use a matching saved campaign to preview a starter route. Preview and Cancel write nothing. Explicit Apply adds a new alternative and a sourced checklist through the existing revision/fingerprint checks. Old alternatives and personal data remain present. Japan has no starter because its full event chain is still incomplete. Source changes require review before suggesting a queue.

The release owner authorized continued beta development with incomplete earlier QA. See [QA-LEDGER.md](QA-LEDGER.md) for the genuine native pending-save dialog, physical offline, full accessibility/high-DPI, in-game comparisons and partial coverage still open. See [CONTRACT-v0.4.md](CONTRACT-v0.4.md) for boundaries. Independent acceptance of this candidate remains pending.

## Earlier planner baseline

The v0.3.0 **Campaign Planner** replacement candidate is `release/HOI4-Companion-0.3.0-r2.exe`. R1 and its source/runtime snapshots remain preserved. R2 fixes independent QA's DRAFT-CLOSE-01: unsaved planner drafts remain protected after navigation or campaign switches, with an actionable desktop close choice to Stay, Review/download, or explicitly Discard and close. Pending writes keep the app open. It is a candidate for the same independent QA owner, with no external publication. The portable needs no installer or Node.js installation. Keep the accepted v0.2 R5 snapshot and its pre-migration database backup.

The planner adds named alternatives with reviewed preview/Cancel/Apply, nested condition explanations, ordered hypothetical completion, separate actual manual completion, sourced checklists and remembered desktop view context. It projects completion only; unsupported conditions and effects remain manual. Unknown duration makes total and downstream dates unknown, and conditional/blocked routes have no unqualified finish date.

Before upgrading an existing database, close every Companion desktop and browser service. The desktop offers a verified closed-database backup and schema 3 migration. Cancel leaves the old database unchanged. Legacy payload bytes, revisions, tombstones, selection, notes, templates, bookmarks and DLC assertions are preserved; the new planner namespace is saved when you explicitly Apply. v0.2 cannot write schema 3. Downgrading requires closed-service restoration of the pre-migration backup.

R5 independent QA reported 64 pass, zero fail and five not tested, with no critical bugs. Physical offline, accessibility/high-DPI and three in-game comparisons remain limitations. Those historical observations do not qualify v0.3. Current candidate-specific evidence and remaining acceptance gates are in the implementation handoff. Developer tests are distinct from independent QA.

The first launch discovers Steam libraries and indexes the game. If discovery fails, open **Sources & settings**, enter the installation folder, and choose **Refresh game data**. Cached references remain available when the game drive is missing; a failed refresh retains the preceding index.

1. Create a campaign and choose its country and planning start date.
2. Confirm DLC ownership and enabled state independently. Installation, launcher evidence and integrated content have separate labels. Old combined selections remain labeled as legacy assertions.
3. Open **Campaign planner**, select a tree and inspect country/DLC rules before queueing focuses.
4. Use **Encyclopedia** to search a name, exact ID or short English question. Open **Connections** for declared links, conditions and evidence. Drawer **Back** returns to the previous entry; closing restores the originating list.
5. Use **Division & production** for base requirements and fixed-input military-factory estimates.
6. Inspect **Sources & settings** for coverage accounting, parser recovery, unsupported roots and source hashes.

Phone access is optional. Enable it in Sources & settings, open the displayed address on a phone on your home network, and enter the pairing code. The PC must remain on. Access is disabled on restart; disabling it revokes pairings. Local HTTP and existing firewall restrictions apply; the app does not change firewall settings.

## Knowledge Foundation

- Searchable countries/history, national/continuous/shared/joint focuses, technologies, ideas/categories, doctrine tracks/rewards/milestones, modules/upgrades, equipment, units, terrain, decisions/categories, characters/instances/roles/traits, events/options/stages, buildings, tactics and special projects.
- Exact forward/reverse links retain typed targets, repeated condition groups, comparison operators, scope/stages and declared delays. Resolution, condition truth and engine verification remain separate.
- Logical identities and retained legacy UID aliases preserve unique references across file moves. Removed or reused definitions stay visible for review. Anonymous positional records include source revision and require revalidation after edits.
- Country/year/category filters, exact candidate selection, missing bookmark/legacy-note review, drawer history, expandable evidence and a downloadable coverage manifest.
- One existing SQLite store for reference and campaign state, with revision CAS, deletion tombstones, selected campaign, templates, notes, JSON export/import and interrupted-save recovery.
- Bundled command/effect/modifier/trigger documentation, original mechanics explanations, editorial campaign suggestions and troubleshooting checklists.

## Accuracy and coverage

Each imported entry records source, line, build and SHA-256. Localization origins, defines and extraction rules are dependencies. An unchanged refresh updates its check time without changing the semantic index revision. Fatal failures roll back publication; recovered shipped syntax stays labeled.

An extracted declaration is not a proven campaign outcome. Slots and category tokens describe constraints, rather than a complete designer model. Event stages and delays do not establish exact engine scheduling. Unknown scripted conditions remain manual checks. An absent graph connection is not proof that a route does not exist.

Known narrow source disagreements remain visible on their entries: armor upgrade breakthrough 1.25 versus wiki table precision 1.2; HMG ground attack scoped to `attack_logistics` versus a CAS label; and older doctrine-as-technology documentation versus the installed grand-doctrine model. Notes become stale when their source hashes change.

Supported roots and record boundaries are listed in the coverage manifest. Its independent discovery ledger reconciles emitted entries and explicit omissions. Unsupported roots, structural metadata and parser recovery stay visible; counts alone do not prove complete game coverage.

Sources include agreed roots under `common/`, `history/countries/`, `events/`, `localisation/english/`, `documentation/`, DLC metadata/descriptors and selected installed archive evidence. Launcher `dlc_load.json` supplies read-only disable/mod context. Files do not establish ownership. User assertions cannot turn known absent or disabled content into proven availability.

The [Paradox HOI4 Wiki](https://hoi4.paradoxwikis.com/Hearts_of_Iron_4_Wiki) review is a separate workstream. This candidate records only narrow supplied audit assertions with installed evidence; no wholesale wiki content is imported or required for startup. Mod overrides are not applied. English is the localization target. Editorial campaign cards remain starting points, not verified event walkthroughs.

## Calculation limits

- The legacy Division Lab sums base width, manpower, supply and equipment needs. Its organization arithmetic mean is not independently qualified as an engine formula. The separate versioned resource API supports only its reviewed base-only scope; the combat API exposes declarations and unresolved dependencies, with all five combat totals null.
- Equipment inherits archetype defaults, rather than research-parent statistics. Module composition, designers, doctrines, technologies, MIOs, upgrades and campaign modifiers remain excluded from calculations.
- Production supports military-factory equipment only. Ships and convoys remain unsupported pending a validated dockyard model. Daily IC = installed base output * factories * efficiency * output factor * resource/disruption factor. Days = ceiling(shortage * indexed equipment IC cost / daily IC), assuming constant inputs.
- Focus timing uses installed `FOCUS_POINT_DAYS` and uninterrupted sequential work from the planning start date. Stored progress, bypasses, dynamic conditions and campaign delays are not simulated. Unknown durations remain unknown.
- Template regiment layout, special-forces caps and engine-specific designer restrictions are not simulated.

Changed source revisions invalidate derived reports while preserving editable inputs. Invalid, loading or delayed requests cannot show a preceding production estimate.

## Storage, migration and recovery

Data lives in `%APPDATA%\HOI4 Companion\companion.sqlite`, with WAL sidecars while open. Close every Companion window/service before copying the database. `HOI4_DATA_DIR` overrides this directory; `HOI4_GAME_DIR` overrides initial discovery. `PORT` changes the browser-service port. The desktop uses an available loopback port.

Schema 3 retains this same database and adds an older-writer compatibility barrier. The canonical planner namespace mirrors its active plan into the legacy tree/queue/startDate fields. Export schema 3 preserves alternatives, checklists and view context; schemas 1/2 remain importable, and future schemas are rejected before writes. Imports create a new campaign and preserve the original. Ordinary saves cannot strip the namespace or change plan semantics; semantic edits use atomic reviewed apply against campaign and reference revisions.

For browser-service migration, close all services, set `HOI4_DATA_DIR` to the intended directory, and run `node build/cli.cjs --migrate --closed-apps`. A verified backup and SHA-256/integrity manifest are written in `migration-backups/`. The flag confirms a real prerequisite; the command does not close other processes. Migration requires exclusive SQLite access and refuses incompatible newer schemas.

For rollback, close every service and use v0.3 tooling: `node build/cli.cjs --restore "<verified backup.sqlite>" --closed-apps`. Recovery verifies the manifest and retains a pre-restore database copy. Then launch the matching archived executable (v0.2 for a schema 2 backup). Restoring an older backup reverts changes saved since that backup; export newer campaigns first.

Save conflicts retain a visible draft with download, review, save-as-new and explicit discard controls. Retrying a response-lost save that committed reports a conflict. Drafts are not automatically merged. Unsaved in-memory drafts still do not survive a forced app/process crash; resolve or download them before closing.

Registered campaign/planner and Division Lab template drafts are listed in **Review unsaved drafts** from every page. Download preserves editable values; discard does not modify saved templates. A late save response cannot erase newer cached edits. The native close dialog keeps the service running when you choose Stay or Review/download. Whole-strategy editor state remains a separate limitation. Drafts have no crash durability.

## Development and validation

Requires Node.js 24 or newer on Windows.

```powershell
npm ci --ignore-scripts
node node_modules/electron/install.js
npm run build
npm run test-ci
npm run schemas
npm run hygiene
node --import tsx --test tests/integration-compatibility.test.ts tests/knowledge-store.test.ts
```

Run focused affected tests first. The integration report records the single combined run and representative Windows package/restart; do not repeat full historical milestone suites without a changed dependency. `npm run package` remains blocked by navigation and final explanation-coverage gates. Hosted CI stays on its reviewed fixture allowlist; Windows/process and installed-source qualification remain local.

The UI fixture script needs Playwright Chromium; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an existing executable. It uses disposable profiles and scripted references. Installed comparison additionally needs HOI4 and reads game files without writing them. Results and screenshots are under `artifacts/`. Historical v0.1.1 scripts retain original task-specific paths; adapt those before running them.

Developer checks cover migrations/rollback/restore, identity moves/deletions/ambiguity, lossless conditions, exact graph/search behavior, DLC unknowns, source accounting and v0.1.1 persistence/calculation safeguards. Independent packaged acceptance, physical internet-disconnection tests and representative in-game parity remain separate gates. No game/save or production-app-data writes are part of developer validation.

The desktop uses Electron context isolation, sandboxing and disabled renderer Node integration. React uses a versioned local API and SQLite FTS5. LAN pairing cannot reindex sources or manage network access. See [CHANGELOG.md](CHANGELOG.md), [CONTRACT-v0.3.md](CONTRACT-v0.3.md), [CONTRACT-v0.2.md](CONTRACT-v0.2.md) and [ROADMAP.md](ROADMAP.md) for scope and later milestones.



