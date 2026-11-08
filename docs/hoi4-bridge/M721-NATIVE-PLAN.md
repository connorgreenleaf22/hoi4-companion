# M7.2.1 recovery plan — 2026-11-08

User authorizes one new recovery session, distinct from the stopped M72 budget. Stay on feature/hoi4-native-m72; no M7.1 integration or release work. Prior failure evidence is immutable.

## Safety gate

Require passing Windows tests of the **shared production supervisor lifecycle**: independent child readiness, both concurrent append-only heartbeats, shared atomic budget writes during peer reads, actual deadline/stop/peer-loss/corrupt-budget handling, exact creation-time refusal and survival of an unrelated process. Run existing heartbeat/deadline regressions once alongside this new test. Retain synthetic process receipts; never call a synthetic result native verification.

Installed target: launcher raw version 1.19.4.2, full Operation Postern v1.19.4.2.2da5 (0bdb), executable SHA256 bccc62909b6a1ec2c1d5a46ef18608e4d0c7cdc89ad341b7402a23c40f7a8037. Recheck before launch. Require no existing HOI4 process and an absent default laptop profile. Existing lease helper reserves only that absent profile, copies the existing telemetry mod, enables plaintext saves and archives all owned data after verified exit. No normal playset/profile may be displaced.

## Budget and operations

- New `m721-native-budget.json`: one launch, twelve minutes wall clock, four ordinary gameplay actions, no unchanged failed-operation retries. Independent paired supervisor deadline exactly **540 seconds** from launch reservation. No reset of any earlier budget.
- Setup/inspection bounded to **60 individual UI inputs** total, recorded with timestamps and screenshots; stop inputs by minute eight. Startup, choosing the disposable 1936 GER/non-Ironman campaign, closing tutorials and opening panels are setup/inspection. They consume the recorded UI-input budget even though excluded from the four gameplay actions per the user's request.
- Gameplay 1: assign Basic Machine Tools. Gameplay 2: unpause. Gameplay 3: pause after a daily observation. Gameplay 4: save once as disposable plaintext. Record gameplay reservations before dispatch; failures consume their reservation. A baseline save/reload/additional focus is omitted to preserve this budget.
- Before assignment: paused research UI showing empty slots and initial telemetry if emitted. After assignment: independently read the research UI; after brief advancement, pause and collect UI, latest owned telemetry and matching save. If initial telemetry is absent, record that limitation rather than adding unbudgeted advancement.
- If safely completed, leave the paused owned game under supervision until the nine-minute deadline; check matching session/identity receipts and actual process exit. On safety/ownership failure, stop early; early shutdown cannot qualify the timed deadline. Do not restart.

## Qualification and cleanup

Retain screenshots, original log/save hashes, exact path/version, country/date, capture time, owned session and producer IDs. The same technology's absent-to-assigned UI/telemetry state supports only that transition. A matching save assignment can qualify the captured membership fact, not serialized UI slot order, raw points conversion, full inventories or unrelated focus fields. Historical copies never become live or change plan confidence. No memory, injection, console or experimental action adapter.

After the deadline/earlier termination, confirm owned game/supervisor exit, archive only the leased profile, restore original absence, and keep the new budget stopped. Update MILESTONE-7.2.1.md, the field matrix and STATUS; commit locally. Recheck origin visibility before any push; public/unknown means no push. No new package unless an application-facing change is required.
