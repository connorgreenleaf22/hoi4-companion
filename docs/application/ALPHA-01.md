# ALPHA-01 — Campaign-first development candidate

Manifest: [ALPHA-01.json](../milestones/ALPHA-01.json). GitHub: https://github.com/connorgreenleaf22/hoi4-companion/pull/23. Owner walkthrough: [ALPHA-01-ACCEPTANCE.md](ALPHA-01-ACCEPTANCE.md).

Engineering candidate ready at **158d943819afd12c8a4c73b6101077800b5045d1**, independently reviewed and packaged. Owner usefulness acceptance and the real-provider evaluation remain pending; manifest status is `offline-tested`, not owner-accepted or final-release complete. [Sanitized receipt](ALPHA-01-VERIFICATION.json).

## Background, result and authority

The owner selected UXD-02 Variant B and requested one real-service Germany preparation journey. Current remote main was freshly verified at `6f0762a892efce1575834abb34fc49c52dbeeca1`; there was no base delta. Rollback anchor is that same main SHA. Work is isolated on `feature/alpha-01-campaign-first` in `hoi4-alpha01`.

The 25 pre-existing worktrees were inspected. The knowledge-engine worktree had untracked source and an active separate owner chat; it is preserved without integration. Other worktrees were clean at initial inspection. Compact-mode draft PR #22 remains separate at `89176b894fe8db47199a40f8429105bd67cd7633`. No already merged work was reintegrated. The new root AGENTS and workflow current-base rule replace obsolete active branch directions; original reports retain their historical restrictions.

Routine no-cost app implementation, isolated Companion checks, sanitized feature pushes and draft PR preparation are authorized. No real provider request, HOI4 launch/gameplay, personal save/playset/installed-file change, native memory/hook, public endpoint, protected merge or release is included. One primary application builder `/root` owns runtime; helper `/root/alpha_journey_qa` owns only acceptance scripts. Independent reviewer `/root/alpha_review` does not edit the candidate.

## Change and inherited evidence

The Campaign-first home and five main destinations wrap the existing service and AiPlanner. Tools retains the seven prior tools. The composer uses the existing source preview/quote, generation, recovery, review and strategy-save APIs. An explicitly local editorial checklist provides the manual path with no provider configured; it is neither an AI response nor a readiness prediction. The same saved strategy stores edited composition alternatives and assumptions.

Conversation uses one additive `campaign-conversation:v1:<profileId>` namespace in existing SQLite settings. Strict bounded append batches are atomic and retry-idempotent; profile and linked strategy ownership are checked. Only whitelisted questions, shared context, concise advice and revision links are retained. Pending/failed writes stay protected, with retry/download/discard. Existing strategy/planner/Lab draft registries, service ownership, ordered parser, canonical source identities, preview/apply and provider seam are retained. Recovery draft exports now omit context, quotes and settings while preserving correctable content.

The comparison invokes existing combat-input inspection through a thin local HTTP route. Current-patch qualification refuses; composition text and qualitative tradeoff questions stay editable. No combat/resource totals, winner or optimization are created. Changes require re-review; paid generation is separately approved.

Reuse: [STRATEGY-DRAFT-01](STRATEGY-DRAFT-01.md), reviewed runtime `b21e08b3ca7c403ef3e4aa28428ea37cf4f092d1`, supplies campaign-keyed draft protection and late-save acknowledgements. [AI-CONTEXT-01](AI-CONTEXT-01.md), reviewed source `7f8cd6e4a3e7d1c507e736fd2931ddf0b93a5998`, supplies complete dependency-group selection and separate 180,000-character/180,000-byte budgets. Startup PR #19 and navigation PR #20 are already in the base; no native/startup modes were rebuilt. The unchanged native bridge/qualification evidence and final-release gates are retained, not rerun or upgraded. UXD-02 source was read only as synthetic design evidence; its mock answers/recalculations supply no correctness claim.

## Three reviewable checkpoints

1. Entry/context and service connection: `c26852b90aea3bfb7c31f207da6dc87fca3f7e21`; five destinations, current campaign/source context, real planner reuse, additive conversation and deterministic ownership checks. Independent exact-SHA review: 58 affected tests passed, no blocking findings after early corrections.
2. Connected journey and lifecycle validation: affected browser/service checks, current Germany source trace, composition, tool return, isolation, failed/delayed saves, provider fixture wiring and final delta fixes. This includes the prominent-composer layout correction identified from a screenshot.
3. Persistence and delivery: final runtime `158d943819afd12c8a4c73b6101077800b5045d1` corrects the independently discovered desktop label refusal, then passes frozen Windows extraction/journey/restart and exact final source/artifact review. Evidence-only publication follows this runtime. Stop at acceptance handoff.

## Configuration and evidence limits

Read-only isolated indexing identifies installed HOI4 `1.19.5.0`, index `7b2d4bf94ac9cc04b96f3c4d604fb22af61dd8fb3a98646d0f2c1a2daf01d53b`. Source checks use current `german_focus` in `common/national_focus/germany.txt`, not legacy Germany or no-NSB tank samples. Campaign state is explicitly synthetic/manual; all indexed DLC are owner-default manual assertions, no mods, no exceptions in the validation scenario. Installed definitions and manual activation declarations do not qualify engine applicability.

Sources are copied into disposable test stores without profiles, keys, provider history, saves or observations. All included source identities are compared against the original source-only index, which remains unchanged. Requirement/cost/gap fields are retained as arrays; their unchanged serializer has inherited AI-CONTEXT-01 and deterministic field-preservation evidence, rather than a new independent semantic-equality check. Local raw source indexes/evidence remain ignored; no licensed source corpus is published.

Failures are classified and retained locally. Harness/environment failures were distinct: nested locator scope, source-fixture FTS population and wrapped select label. Each was diagnosed and corrected before continuing untested cases. Screenshot inspection: product layout put the composer below the first viewport; controls were moved up and rebuilt before further acceptance. Early review also corrected ineffective focus copying, failed-conversation close accounting, missing provider transcript turns and quote-bearing recovery exports. No assertions were weakened and no unchanged blocker was retried more than twice.

## Limits and next step

The declared engineering journey is ready with no unresolved blocking finding. Owner acceptance is pending. No real-provider usefulness is inferred from fixture tests; that test waits for the owner's explicit displayed-quote approval after candidate readiness. QUAL-195, all five unsupported combat metrics, final explanation coverage, native budgets and the remaining QA-LEDGER/release gates stay intact.

Conversation is capped at 160 entries; download before continuing in a new campaign. Unsaved strategy work is in-window only; save/download before restart. Saved conversation and strategy revisions persist locally. Broad knowledge work and compact-mode integration remain separate.


## Final verification and artifact

| Check | Observed result and scope |
| --- | --- |
| Focused deterministic checks | 9 campaign/conversation/draft tests plus the affected desktop startup regression pass; no skips. Long Unicode context remains complete and valid through the existing strategy schema. Independent overlapping runs passed 58 tests at c26852b, 26 at e06c2a and the final startup regression at 158d943. Counts overlap. |
| Required portable CI | 217 fixture tests + 3 workflow guards pass. The two hosted conversation additions and their transitive effects were independently reviewed. The four hosted checks at runtime 158d943 pass in [run43986933318](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/43986933318). Final documentation-head checks are recorded in PR 23. |
| TypeScript/build | TypeScript/Vite/Node/Electron build and strict acceptance-harness import checks pass. Packaging scripts allow the additive ALPHA label, preserve old labels, require a clean source commit, refuse overwrite and embed the full runtime SHA. Release guard/qualification files are unchanged. |
| Browser | 11 cases pass at frozen e06c2a; the later runtime change touches only desktop development identity/startup, leaving renderer/service/dist identical. Create/select with actual DLC defaults, missing context, manual advice, actual source preview, editable comparison/refusal, all seven tool links, A/B/A, failed/delayed save, service/browser restart and one injected TEST FIXTURE generation/recovery pass. No real provider call. Desktop and 900 px screenshots inspected independently. |
| Germany source trace | 65,144 actual source entries copied read-only into synthetic campaigns. Current tree `german_focus`/germany.txt:24 and root GER_prioritize_economic_growth:124 share SHA256 ac730be5ccc9095fb400e58b2f7d44501288a94186beb148dbbb0b32cf8ea03c. 84 included definitions, 165,618 source characters, 179,759 wire bytes; 3 mandatory records, 24 optional groups admitted, 12 explicitly omitted. All included identities match source; requirement/cost/gap fields are retained as arrays, with unchanged serialization covered by inherited and deterministic regressions. The private profile note is excluded. |
| Exact extracted Windows journey | 11 cases pass at 158d943; frozen source, zero renderer errors, zero generation calls. Normal clean close stops the owned service; full process restart reopens revision 2, objective/manual context, compositions and conversation in the right campaign. Both owned Electron processes are closed. |
| Independent final artifact review | alpha_review recomputed ZIP/executable hashes, matched all 75 original/extracted files and 14 build/dist/assets files against current outputs, read embedded fullSHA/BUILD/receipt identity, inspected raw records/screenshots and confirmed closed processes. No blocking finding remains. |
| Schemas/hygiene | Existing schema and hygiene checks plus committed-diff whitespace are validated for final publication; no new QA framework or licensed corpus/raw evidence is committed. |

Windows ZIP (local only): `Documents/HOI4 Companion Development Builds/ALPHA-01-158d943819af/ALPHA-01-158d943819af-windows-x64.zip`. SHA256 **ebd3a25bd859555dbefbc332a4e77fe5b99de72b399881a480853afec46cc011**. Fresh executable: that directory's `acceptance-extracted/win-unpacked/HOI4 Companion ALPHA-01-158d943819af.exe`; SHA256 e3a617ba75715cd168618ddf3facb9a2ad09098da81833e9389d66ca6c574255. All 75 extracted files match. Older builds and installed Companion are retained. The packaged START-HERE is the owner walkthrough.

Raw browser/package records remain local at the paths and SHA256s in the sanitized receipt. The successful frozen browser run elapsed 79.417 s and package run 44.709 s, including fixture/startup work; these are observed test durations, not developer-hour estimates. No owner action/approval was requested during implementation. The only provider response was one explicitly injected TEST FIXTURE used to validate wiring; it establishes no real AI usefulness or owner acceptance.

Independent review caught the alpha-name startup refusal before packaging; the runtime validator now accepts the same bounded label format as packaging and rejects path traversal. The meaningful startup fixture covers both legacy and alpha isolation. The corrected runtime was rebuilt, independently re-reviewed and then packaged once for final acceptance. No known failed runtime/package was promoted.

## Review and HQ handoff

Reviewer `/root/alpha_review` approved exact runtime 158d943 and the matching extracted artifact; the builder did not certify its own review. [PR 23](https://github.com/connorgreenleaf22/hoi4-companion/pull/23) remains draft and unmerged. The [generated HQ handoff](../workflow/ALPHA-01-HQ-HANDOFF.md) uses `npm run hq:handoff -- docs/milestones/ALPHA-01.json`. The [HQ roadmap](https://chatgpt.com/space/page_873a0b5a11fc819196334ba3859b3d52) was updated November 16 ET through fresh authorized access and verified by block readback: engineering-ready status and five engineering checklist items updated; player-understanding and owner-acceptance items remain unchecked. No other HQ page or owner decision is claimed changed. Owner next step: follow the packaged walkthrough and record accepted, accepted with limitations, changes requested, or pending. A real-provider evaluation needs a separate explicit displayed-quote approval. No next feature begins here.
