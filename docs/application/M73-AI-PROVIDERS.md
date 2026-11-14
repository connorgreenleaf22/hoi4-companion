# AI providers for HOI4 planning

Checked 2026-11-08. Configure later: no provider account or paid request was used for this milestone's comparison. These are API options; availability, credits and billing must be checked in the selected API account. The companion cannot borrow Codex's access. No HOI4 strategy-quality benchmark has yet compared these models.

## Representative costs

USD per million tokens, standard uncached text requests in the short-context tier. Example = 20,000 billed input tokens plus 4,000 billed output tokens, one request. It is arithmetic, not a measured companion bill. Reasoning tokens, larger retrieval bundles, revisions and retries can increase cost; provider tokenizers differ. No caching/batch discounts, tools, taxes or promotions beyond those explicitly listed are assumed.

| Provider / model | Input | Output | Example | 100 examples |
|---|---:|---:|---:|---:|
| OpenAI GPT-6.1 Sol | $2 | $10 | $0.08 | $8 |
| OpenAI GPT-6.1 Terra | $1 | $5 | $0.04 | $4 |
| OpenAI GPT-6 Luna | $0.10 | $0.50 | $0.004 | $0.40 |
| OpenAI GPT-6 Astra | $10 | $50 | $0.40 | $40 |
| Anthropic Claude Sonnet 5.5 | $2 | $10 | $0.08 | $8 |
| Anthropic Claude Opus 5.5 | $4 | $20 | $0.16 | $16 |
| Google Gemini 3.8 Flash | $0.75 | $3.75 | $0.03 | $3 |
| Google Gemini 4 Argon | $2 | $10 | $0.08 | $8 |
| Local model through Ollama | No metered hosted inference when fully local | Hardware/electricity | Hardware-dependent | Hardware-dependent |

OpenAI rates: [official API pricing](https://developers.openai.com/api/docs/pricing). Anthropic rates: [official Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing). Gemini rates: [official Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing). Gemini 3.8 Flash prices double on January 1, 2027; Argon prices double on December 1, 2026, under the current published schedule. Recheck before configuring. Cheap tokens do not establish reliable strategy reasoning.

## Practical tradeoffs

| Option | Advantages for this application | Disadvantages / unresolved questions |
|---|---|---|
| OpenAI | Responses API offers strict JSON-schema output; a practical first transport for the existing typed proposal boundary. Several cost tiers allow the same evaluation case to be rerun. | Network/API account required. Schema validity does not prove valid HOI4 mechanics. Reasoning/output costs and timeouts need monitoring. Portugal quality remains untested. |
| Anthropic | Structured JSON output provides another credible implementation of the same provider-neutral contract; Sonnet is a cost-comparable evaluation candidate. | Separate Messages API integration, account and model compatibility checks required. More expensive tiers need evidence of better results before paying extra. |
| Google Gemini | Flash provides a lower-cost candidate for repeated revisions; paid and free tiers are available for selected models. | Promotion expiry changes costs; free-tier data policy is materially different. Thinking tokens are billable. A separate adapter and evaluation are required. |
| Local Ollama | Can keep prompts on the PC and operate offline after model download; schema-constrained output is supported. | Model choice, licenses, memory, context size and speed depend on the machine. Running alongside HOI4 may compete for resources. No local model was installed or qualified here. |

These are engineering suitability judgments, not measured quality rankings. Structured-output documentation: [OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs), [Claude](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Ollama](https://docs.ollama.com/capabilities/structured-outputs).

## Privacy and configuration

OpenAI API data is not used for training by default; standard abuse-monitoring retention can apply. `store:false` is not a promise of zero retention. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). Anthropic commercial/API data is not used for training by default, with opt-in/feedback exceptions: [Anthropic policy](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training). Google's pricing page distinguishes free-tier use to improve products from ordinary paid-tier treatment; do not send private campaign details through a free tier without reviewing its terms.

Local Ollama prompts remain local when using local models; cloud models are different. Cloud features can be disabled and context limits must be set deliberately: [Ollama FAQ](https://docs.ollama.com/faq). This report does not install it or expose a local server.

Recommended evaluation order: start with a mid-cost model (GPT-6.1 Sol or Claude Sonnet 5.5), compare the same Portugal objective and source bundle with a cheaper candidate, then consider a higher-cost model only if it demonstrably reduces unsupported claims or revision effort. This is an evaluation recommendation, not a strategy-quality endorsement. Keep the deterministic coverage gate unchanged across models. Record invalid identifiers, contradictions, omitted consequences, latency, billed usage and user usefulness separately.

The initial application transport and its actual validation status are documented in MILESTONE-7.3.md. Configuration remains optional. No provider can grant ranking eligibility, certify observations, or execute gameplay. All model prose remains provisional even when its cited definitions resolve.
