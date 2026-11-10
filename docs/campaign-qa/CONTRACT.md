# Campaign Q&A contract v1

`src/campaign-qa-types.ts` defines the shared envelope `hoi4-campaign-qa/1`. `CampaignQa.query` is the single implementation for the six-tool stdio adapter and future in-app assistant. The UI's sanitized export calls the same projection, explicitly downgrading live observations to historical. This task does not send campaign data through the existing AI planner.

| Tool | Allowed input | Output |
|---|---|---|
| `hoi4_qa_session` | none | Connection state, pilot state, latest attributed observation |
| `hoi4_qa_observations` | optional country/session, limit 1–20 | Per-field status, value, independent qualification, unavailable desired fields |
| `hoi4_qa_changes` | optional country/session | Latest two comparable snapshots, or explicit unavailable; never an event claim |
| `hoi4_qa_provenance` | optional country/session, limit 1–20 | Hash, capture/game dates, source kind and qualification; no local path |
| `hoi4_qa_reference` | exact ID and supported kind | Installed source/line/hash/version and existing mechanics explanation; stale source suppresses explanation |
| `hoi4_qa_diagnostics` | none | Sanitized field limits, monitor metrics, query counters |

Unknown tool names/arguments are rejected. No tool accepts a path, command, arbitrary URL, raw save, controller ID or game mutation. No tools connect/disconnect, poll, inspect a save, start/stop the recorder, validate actions, retrieve receipts or stop the game. All six advertise read-only, idempotent and non-destructive annotations. Actual enforcement is the separate query handler and strict schemas, not the annotations. Queries are bounded to 128 KiB and 120 per minute; local request audit contains only time/tool/success, never question text or args.

The local monitor is separate from this tool catalog. It requires a same-origin JSON request for changes and never opens a network listener of its own. The existing app owns the one Node service, bridge/store and SQLite database. Pilot observations use a namespaced metadata key; old M7 telemetry records, action gateway, parser and save schema are unchanged. New files have independent ownership; shared `server/api.ts` changes only mount routes/lifecycle and preserve existing AI error handling. Coordination with the M7.3.1 task confirmed no reservation conflict; no active separate QA task/open PR was discoverable at inspection time.

## Attribution

Each observation includes an opaque observation/session ID, country, engine date, wall-clock capture timestamp, source kind/hash, freshness basis, classification and field qualifications. Freshness is recomputed at query time. Unsupported fields always have `status: unavailable`, `value: null`; never infer a false/zero/empty list. Source strings are untrusted data. Advice must cite its observation and any separately retrieved reference rule.

`verified-live` is retained only from the existing bridge's ownership-qualified current observation, within its freshness window. Even there, only `native-verified` fields may be described as verified live. `parsed-unqualified` fields remain unverified. Pilot readings are **historical observations acquired during monitoring**, because new process identity, game-side schema and independent native comparisons are not yet qualified. A producer token and selected country reduce accidental cross-session mixing; they do not prove process ownership. Plaintext saves remain `save-derived`, with no verified live session ID. User notes are user assertions. References are installed declarations, not observed eligibility or effective mod precedence.

## Player telemetry successor

The pilot package is generated from `server/campaign-qa/telemetry.ts` and supersedes the GER-only package for this experiment. The legacy package/manifest and native evidence remain intact for compatibility. Wire: `HC_QA|v1`, manifest `player-country-1`, exact version 1.19.4.2, fixed numeric-vector order, one boolean war flag, explicit country and producer. Version/length/token mismatches fail closed. Changing field order requires a new manifest. It contains no fixed focus/technology IDs and never implies full inventories.

The country hook checks `is_ai = no` before temp-variable work and logging. No explicit country enumeration, all-country snapshot emission or inventory scan occurs. The engine still invokes the generic daily hook; its guard cost and frame impact must be measured in the pilot. Multiplayer and console AI changes can defeat the assumption that one non-AI country is the user; the monitor requires single-player attestation and stops on mismatched emitted tags. On startup, only a small boundary marker is logged; there is no startup all-country scan.

Installed primary evidence inspected on 2026-11-10:

| Source | Evidence |
|---|---|
| `documentation/triggers_documentation.md:5244` | `is_ai` supported in COUNTRY scope; revision `7d27ed77dadaf3a213a4b3e2c624bf9c02dae495317abe8eee833b27c2d1de29` |
| `common/on_actions/_documentation.md:7` | Lists startup/daily/daily_TAG hooks; revision `a9d233a3ab17246919286b6aa47fa4147d06ba1ee2fa3696b0d55a8a70576fa6` |
| `common/on_actions/04_mtg_on_actions.txt:526` | Installed guarded daily effect example |
| `common/on_actions/05_lar_on_actions.txt:1445` | Installed weekly country-trigger guard example |
| `documentation/dynamic_variables_documentation.md` | PP 743, stability 785, war support 439, research slots 156, civilian factories 604, military factories 629, `has_manpower` 427 |
| `documentation/effects_documentation.md:7820` | Temporary-variable assignment, any scope; revision `2cdc93d26775990468eed167442f7a416b13059fb8fe07d139b54250b79209af` |

Agent Tools validated trigger syntax/kind/scope for `is_ai` and `has_war`. Emitter effect validation returned `valid: null`, `parametersChecked: false` due to native temporary-variable argument blocks; this is explicitly **not** a native or complete script-validation pass. The assignment pattern is reused from the existing emitter. Two-country native verification remains required.

## Desired coverage

| Domain | Current candidate coverage | Explicit gap |
|---|---|---|
| Focus | Existing qualified plaintext-save mapping when explicitly selected | No general live focus selection/progress/completion inventory |
| Research | Scripted total slots; save assignments/positive completed levels | No general live assignment inventory, verified slot order, progress or completion events |
| Politics | PP, stability, war support | No complete laws/ideology/leader/decision eligibility state |
| Factories | Civilian/military/dockyard counts | Allocation, construction queue, output efficiency unavailable |
| Production | None | Lines, deficits, equipment stockpiles unavailable |
| Resources | None | Trade balance and local shortages unavailable |
| Manpower | `has_manpower` numeric candidate | Units/precision and displayed match await native comparison |
| Diplomacy/wars | `has_war` boolean candidate | Opponents, guarantees, relations, fronts and war goals unavailable |
| Supply | None | Network, hubs, local supply/fuel shortages unavailable |

The plaintext reader is deliberately not expanded using guessed mappings. Installed source documentation is not evidence that a field was emitted correctly by this game version.
