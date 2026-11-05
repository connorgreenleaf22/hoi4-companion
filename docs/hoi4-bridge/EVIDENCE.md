# Milestone 1 evidence — 2026-11-04

Evidence classes are deliberately separate. Raw captures are local-only under ignored `.bridge-local/`.

| Check | Result | Evidence |
|---|---|---|
| Repository/branch | Existing private repo, feature/hoi4-bridge | Initial checkpoint 9017453; no history replacement |
| Skill discovery | Enabled repo skill; no loader errors | skill-discovery.json from Codex app-server skills/list; workflow applied in this chat |
| YAML validation | Passed with existing js-yaml | Python validator blocked by absent PyYAML; not reported as a Python pass |
| Installed reference | GER_prioritize_economic_growth resolved, source line/hash/version retained | reference-query.json; germany.txt:124, 1.19.4.1 |
| Unit/integration | 174/174 passed, zero skipped | full-tests.txt; includes original regression suite and seven bridge/profile tests |
| Build | TypeScript, Vite, Node/Electron bundles passed | build.txt; no release package/native Electron acceptance claimed |
| Static mod preflight | Installed documented primitives and parser accepted | bridge:validate; independent of native gate |
| Native telemetry | Two GER daily records emitted and ingested | native-vCXJuK/telemetry-lines.txt, snapshots.jsonl |
| Native readback | Date/country, integer PP and stability percentage matched | Chat captures; daily-2.jpg captures second exact date; fractional PP remains log-only |
| Replay after exit | Two snapshots reproduced exactly | native-vCXJuK/replay.json and result.json |
| Cleanup | Owned process exited; normal profile absent again | native-vCXJuK/result.json and archived owned-game-profile |
| Native control | Unsupported; no adapter installed | Pointer navigation belongs to test setup only |

Native session: 21:05:08–21:10:29 EST, 1 launch, 16 inputs, 5m21s. Dates `1936.01.01.24` and `1936.01.02.24`; PP `2.324` and `4.648`; stability `0.81` both. The UI showed PP 2/4 and 81%. No scripted token remained unexpanded in these fields. The game emitted an unrelated `Conflict Risk` diagnostic; no companion-matching error appeared. These observations do not certify other tags, saves, patches, checksums, longer campaigns or achievement eligibility.

SHA256 of retained artifacts:

- snapshots.jsonl: `3367f21c7660978d3a349882ef127b9d6f6578c32d2e3779ffa98249b052e0f1`
- daily-2.jpg: `cf9994b4018ceeae39a919e43d5e2952a7fac24dec1c390d61e7543e7f2d99fb`
- telemetry-lines.txt: `b3b58ba53f0459815a0502c7483bc1f46984abbb5e6ddde378aca95b02b976ec`
- installed hoi4.exe: `cf781ed178cd801643b233b7e3fcd1c0efd19bd01aecd24bf07a35f69f10476f`

Retain the first failed native session `native-IxwG5O` as environmental/isolation evidence. Its failed argument forms and restoration history are summarized in STATUS.md; no earlier failure was converted into a pass.
