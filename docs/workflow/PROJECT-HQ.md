# Project HQ update procedure

HQ: https://chatgpt.com/space/page_6af25f0e983c81918c96a2fa075d2901

On 2026-11-10 this Codex session successfully read the HQ Page through the connected Pages tool; the response reported read/write access. This proves access for that session only. No HQ edits or automatic synchronization were performed. Future sessions must read the current Page and check access again; do not infer access from a URL, prior success or a selected-page snapshot.

1. Read GitHub's current candidate, manifest/report, Issues, PR review and checks. Confirm exact tested SHA, artifact availability and remaining native/acceptance gates. Do not copy private planning notes or raw Page/account metadata into the public repo.
2. Run `npm run hq:handoff -- docs/milestones/<ID>.json`. Add the PR/check-run and independent-review links to the resulting short summary. Generation does not mark acceptance or update the Page.
3. Rook/ChatGPT (or Codex with freshly verified access and an explicit edit request) reads the current HQ and relevant milestone section. Apply only the engineering summary and links. Preserve product decisions, forecasts and user acceptance unless the user explicitly changes them. If evidence conflicts, flag the discrepancy and cite both sources.
4. Use Page edit conflict/hash checks and reread after saving. Record the Page link and update date in the PR, or explicitly say update pending. A failed read/write means no synchronization claim: provide the handoff text for Rook/ChatGPT to apply manually.
5. At milestone completion, update roadmap/STATUS/report/manifest, generate the summary and verify it still names unresolved gates correctly. Accepted means an actual user/maintainer decision with evidence, not green tests. No recurring update automation is configured.
