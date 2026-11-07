# M7 inventory update

The M6.5 emitter and manifest are unchanged. M7 improves batch reading (two identity probes per batch), rollback quarantine, connection diagnostics and shared field qualification. No new scripted field or loaded-save behavior is claimed. Agent Tools 4.7.0 was reused to inspect installed on_startup documentation; that hook listing does not prove same-date load behavior. Existing M6.5 script validation/native evidence remains applicable to the unchanged emitter, with its unresolved argument-validation limits.

A real archived M6.5 plaintext autosave was found and read without modification: 1936.4.1.1 GER, one completed focus, 55 positive-level technologies, four serialized slots (Basic Machine Tools plus three empty). There is no explicit current-focus token despite progress=10, so current focus/progress stay unavailable. All save mappings are parsed-unqualified. This is persisted save evidence, not new native validation or an expanded mod export. See MILESTONE-7.md and M7-NATIVE-PLAN.md.

No regular playset was enabled or changed in M7. Future script work should first qualify startup/load markers and bounded existing checks; investigate documented manpower_k and additional named research/focus checks only with independent version-specific evidence. Complete current focus/research inventories may need qualified save/native sources rather than wider logging. No OCR expansion is necessary for this platform milestone.

# Telemetry mod inventory — Milestone 6.5

Current source audit and native evidence: [MILESTONE-6.5.md](MILESTONE-6.5.md). Human GER, exact **1.19.4.2**, schema 2 / manifest ger-m65-1. Descriptor 0.2.0's 1.19.* range is broader than verified compatibility.

Source: `mods/hoi4-companion-telemetry/descriptor.mod`, `common/on_actions/hoi4_companion_telemetry.txt` and generated `common/scripted_effects/hoi4_companion_telemetry.txt`. Startup marker + startup/daily snapshot; seven numeric values and eight named checks. Temporary variables only, no replace_path or gameplay rewards. One daily GER record; no per-tick/all-country scan.

Verified numeric fields: country/date/PP at UI precision/stability; newly war support, total research slots, civilian factories including trade, military factories and dockyards. Active research for **basic_machine_tools** independently verified false then true. Two focus-completed checks, three known-tech checks and three active-research checks are exported, but only that one research transition is qualified; all-group completion qualification remains open. Current focus, progress, complete inventories, availability and completion events stay unavailable. See report table for exact IDs, source mechanisms and independent evidence limits.

Installation after cleanup: not active in a current laptop playset; the formerly absent default profile is again absent. Disposable installed source is archived under `.bridge-local/native-dR04YQ/owned-game-profile/mod/companion_telemetry/`. No desktop saves/mods/playset were touched. Eight connected owned snapshots and 110 archived raw snapshots were replayed offline. One launch/four ordinary actions; the 25-minute timing gate was exceeded during context recovery and is explicitly recorded as failed. No second launch.

Recommended expansion: qualified disposable text-save observation for current focus/progress and full inventories; broader named scripting checks only with patch/country coverage and load/restart tests. Installed `manpower` is deprecated and may overflow; investigate `manpower_k` before any future export. General completion hooks were not found; do not use MIO hooks as universal events or rewrite vanilla rewards. No new OCR, DLL or memory adapter is required for this foundation.

The M5 inventory below is retained as historical context and is superseded by this section where fields were added.

# Historical inventory — Milestone 5

Inspected on 2026-11-04 EST against installed HOI4 **1.19.4.1**. No game was launched and no mod script was changed for M5.

## Source and installation

Source: `mods/hoi4-companion-telemetry/descriptor.mod` and `common/on_actions/hoi4_companion_telemetry.txt` below that directory. Descriptor version 0.1.0 declares 1.19.* compatibility; that declaration is not a test of every 1.19 patch. There is no `replace_path`. The script adds uniquely named on-actions and log effects, without changing unrelated mechanics.

Current environment inspection (`.bridge-local/m5-environment.json`) found the Steam installation but **no regular HOI4 user profile or detected launcher selection**. Thus the prototype is not detected as installed/enabled in a current laptop playset; a running playset is unavailable. Do not label it currently active based on old evidence. The previous disposable sessions exclusively created an absent normal profile, enabled `mod/companion_telemetry.mod` in that owned profile's `dlc_load.json`, then archived it and restored the profile's absence. Archived copies remain under `.bridge-local/native-vCXJuK/owned-game-profile/` and `.bridge-local/native-HN3JuU/owned-game-profile/`. They are evidence, not current launcher configuration. No desktop or regular playset was altered.

`scripts/bridge-prepare-native.ts` and the owned-session workflow create disposable copies with a unique producer token. Reuse the reviewed isolation procedure only in a future authorized native milestone; never copy a stale test `dlc_load.json` over regular settings.

## Exported versus verified

| Field/mechanism | Current implementation | Independent native evidence |
|---|---|---|
| Version and producer | `HC_BRIDGE\|v1` framing; disposable producer token | Real records parsed in M1/M3; parser/session correlation tested |
| Country | `[THIS.GetTag]`, GER scope | GER matched the campaign in M1/M3 |
| Game date | Engine log prefix, not an invented string formatter | M1 two distinct engine dates, M3 startup anchor; hour 24 preserved as engine text |
| Political power | `[?political_power]` | 2.324/4.648 logged in M1; UI displayed 2/4. Fractional precision is log evidence, not independently measurable in the rounded UI |
| Stability | `[?stability]` | .81 matched 81% in M1/M3 |
| Startup/daily timing | `on_startup` begin record and non-AI GER observation; `on_daily_GER` daily observation | Startup and daily records observed. Daily scope is GER even if the player is another country; this is not a general player-country exporter |
| Current focus | **Not exported by this mod** | M3 idle-focus evidence came from separate UI OCR. No selected-focus action/readback was verified |

Version metadata is supplied by the host's installed launcher settings; session identity and freshness are bridge-side facts. The game script does not authenticate a recording's origin. Startup can be absent in a loaded-game workflow not yet tested. See `EVIDENCE.md` and `MILESTONE-3.md` for limits, exact captures and prior native failures.

Unavailable now: completed focuses, current/queued research and slots, focus progress/current-focus identity from script, decisions, political conditions, wars/diplomacy, factories/production lines, construction, resources/stockpiles, units/supply, air/naval missions, game pause/speed, and reliably captured DLC/mod/playset identity. The schema's explicit unknowns must remain unknown. Installation definitions and current launcher files cannot fill historical gaps.

## Next supported-scripting opportunities

These are **source-supported candidates**, not tested exports. The primary references are this installation's `documentation/*.md` and script files, reviewed locally; no new community survey is necessary.

1. Add a small numerical batch using documented country dynamic variables: `manpower` (dynamic variables line 466), `num_of_civilian_factories` (604), `num_of_military_factories` (629), and `has_war_support` (439). Confirm scope, interpolation, units, absent values and in-game readback independently before extending the wire schema. A variable's documented existence does not prove that this log formatter exports it correctly.
2. Generate bounded, explicit per-ID condition checks for `has_completed_focus`, `has_tech` and `is_researching_technology` (installed triggers documentation). Logging a known identifier from a verified true/false branch could give semantic evidence without OCR. Include a manifest of checked IDs and a completed-batch marker: absence of a line must not mean false. Handle mod replacements and patch-specific IDs before interpreting coverage.
3. Investigate focus/research completion on-actions from installed source for event observations, backed by periodic reconciliation. Events alone miss state before capture. `focus_progress` checks a named focus and is **not proof that it is currently selected**; cancelled/stored progress and selection/cancellation need independent tests.
4. Broaden country coverage only with an explicit player/scope policy and tested new-game/load/restart behavior. Avoid scanning every country/focus every tick. Add versioned producer capabilities, field scope, export completeness and performance bounds first.

Recommended telemetry milestone: qualify manpower/war support plus a tiny known-ID completion/research manifest in two real snapshots, including missing/false/cancelled cases. Keep this one-way and separate from command adapters. It could remove important planner unknowns before any game-control work. No DLL injection, executable changes or achievement claims are implied.

## M7.2 qualification outcome

Mod source and exports are unchanged from M6.5/M7. The temporary laptop profile contained only the dedicated test mod; it was archived after the one failed startup and the prior absent profile restored. There is no new regular-playset enablement. M7.2 produced no new state capture or field qualification; prior version-specific M6.5 claims remain bounded to their original evidence. Save extraction now exposes raw/persisted provenance without native promotion. Same-date load identity, complete focus/research inventories, units of raw research/focus progress and broad country/mod coverage remain unqualified. Consult M72-FIELD-QUALIFICATION.md before offering a value to any planning condition. No additional memory/interface need was empirically eliminated by this attempt.
