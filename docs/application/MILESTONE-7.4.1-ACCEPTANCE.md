# M7.4.1 isolated development build

This is a provisional mechanical-knowledge candidate, not a release or a complete game simulator. No provider configuration or HOI4 launch is needed to inspect it.

1. Extract the whole ZIP into a new folder and keep the resources alongside the executable. Open `win-unpacked/HOI4 Companion M7.4.1-1d58eb7b79f7.exe`.
2. Allow initial read-only installed-source indexing to finish. The build uses its own development profile. Keep older apps, builds and profiles intact.
3. The main engineering acceptance is the structured strategy-review API and the deterministic/installed-source tests in `docs/application/MILESTONE-7.4.1.md`. The production interface was not redesigned. Source interpretation does not establish current campaign conditions or a successful union.
4. Inspect the Portugal monarchist route's planning coverage review. Accept/refuse branches, scoped annexation/cores, a refusal war goal and follow-up events are now available in nested source explanations. Names may retain source IDs. Unknown rules remain visible, and ranking/optimization remains disabled.
5. Report misleading conditional/scoped wording or missing source evidence against draft PR #9. Desktop usefulness and owner acceptance are still pending; fixture or package success cannot grant them.

Runtime: `1d58eb7b79f756620225998bed04ded9e5d16c74`, based on `bdb8a4887522b38f5110f3900bbf1655cc5fd600`. PR #6 is excluded. Supported benchmark source snapshot: HOI4 1.19.4.2, English base-game index, both Trial of Allegiance script alternatives; active playset, entitlement and campaign applicability are unconfirmed. No gameplay actions, paid requests or live-Q&A pilot changes are part of this build.
