# Technical proposal — revised scope

Updated 6 November 2026.

## Business process

Business raises a claim. The Claim manager identifies nearby products and existing formulas relevant to the requested benefit. The Scientist checks whether to keep a formula or propose a new version that could strengthen the claim. The Evaluator reviews studies and assesses the claim. Finally, Business receives the recommendation **and the human review**, then decides whether to proceed, hold or stop.

```text
Business → Claim manager → Scientist → Evaluator → Business
Raise       Match product    Review       Study +     Summary +
claim       and formula      formula      judgement   final decision
```

The frontend now demonstrates all five handoffs using four fictional users. The initial three cases are at evaluator review so a presenter can immediately show high, medium and low confidence. Raising a new claim starts at product matching and demonstrates the whole sequence.

## What each screen does

- **Business:** raise a claim, see the matched product/formula and scientific rationale, read the assessment and evaluator conclusion, then record a final decision with a reason.
- **Claim manager:** inspect a dummy nearby-product shortlist, choose an existing formula and explain its relevance. The shortlist is a fixed wrinkle-care catalogue; no similarity search is implied.
- **Scientist:** keep the formula or propose a new version with a rationale. A new version clears inherited evidence and results; reformulating does not itself substantiate a claim.
- **Evaluator:** enter study text, choose a scripted result or request a real Gemini assessment, then make an explicit human conclusion and record its conditions.

No score skips human review. Business cannot decide until the evaluator has signed off. Evaluators may challenge the AI; their conclusion and rationale remain separate from its recommendation. Business retains the final decision, including holding an apparently promising claim for more work.

## Dummy data and confidence

The synthetic cases have fixed scores of 92%, 64% and 28%. The medium case uses a small pilot with a wide uncertainty interval and missing comparator results, making it useful for a human-in-the-loop walkthrough. Scores are presentation fixtures, not scientific measurements or model outputs. Loading a dummy result does not calculate anything from edited claim or study text; the UI states this explicitly.

Confidence means certainty in an assessment, not probability of product efficacy. A low score does not mean a product fails, and a high score can accompany a finding of insufficient evidence. Confidence colours are only visual aids. They do not authorize a claim.

## Architecture and persistence

```text
Four-role React demo
  ├─ Dummy actions → in-memory state → human review → Business summary
  └─ Explicit Gemini button → POST /api/claims/assess
                           → validate input
                           → Google Gemini structured JSON
                           → validate response
                           → Prisma nested write → PostgreSQL
                           → saved assessment → React
```

The frontend workflow is deliberately in memory, as requested for dummy data. Refreshing resets it. There are no actual accounts, cross-browser synchronization or server-side workflow permissions. The role switcher is a demo device.

The existing Claim/Assessment schema and endpoint are preserved, so previously saved records need no destructive migration. Only live AI assessment records are durable. Matching, proposed formulas, human reviews and business decisions are not saved to PostgreSQL in this scope. A production workflow would need its own persistent records and authorization.

## Gemini migration

The server uses Node's built-in `fetch` against the Gemini `generateContent` REST endpoint. This replaces the OpenAI SDK and removes that dependency without adding an SDK for a single HTTP request.

`GEMINI_API_KEY` and `GEMINI_MODEL` are read only on the server. The key is in the `x-goog-api-key` header, not a URL. A fixed system instruction is separate from untrusted claim/evidence content. JSON Schema comes from the existing Zod schema; parsed output is validated again for verdict, score range and reasoning bounds. The service accepts only completed `STOP` candidates and ignores thought parts. Safety blocks, truncated output, invalid JSON and provider failures are errors, never negative claim assessments.

The provider call finishes before the atomic Claim/Assessment insert. PostgreSQL saves the exact input, result, model version, response ID and prompt version. The UI only identifies a Gemini result as saved after the API returns success. There are no retries or automatic dummy fallbacks. A failed request clears the previous displayed assessment so old dummy output cannot look like a new Gemini response.

## Research and design decisions

- [Gemini structured output guidance](https://ai.google.dev/gemini-api/docs/structured-output): JSON Schema constrains shape; application validation is still required. The structured-output capability is not proof of scientific correctness.
- [Google's v1beta API discovery schema](https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta): checked the `generationConfig.responseMimeType`, `responseJsonSchema`, `systemInstruction`, `modelVersion` and `responseId` fields used by this REST integration.
- [Prisma nested writes](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions): retained atomic related writes and the existing rollback test.
- The prior proposal's evidence rubric remains: compare exact wording, finished formula, endpoint, effect magnitude, timepoint, population, comparator and study limitations. Do not invent universal scientific acceptance cutoffs.

Gemini model access, cost, latency and scientific quality have not been benchmarked. No data-retention guarantees from the former provider are carried over; review Google's applicable service terms and organizational data policy before sending real dossiers.

## Why keep it this small?

React local state is enough to demonstrate the revised workflow with dummy data. NestJS, PostgreSQL and Prisma already implement assessment persistence and remain appropriate for that path. Native fetch and the installed Zod library cover Gemini integration. A new authentication system, workflow engine, vector database or agent framework would add scope without improving this requested demonstration.

## Evolution roadmap

1. **Persist the workflow:** Claim versions, Product/Formula records, scientific proposals, studies, reviewer decisions and business decisions, with immutable history.
2. **Add real users:** identity, role permissions and server-side transition checks; the browser must never be the authority for approvals.
3. **Improve evidence quality:** document ingestion, source page/table references, expert-labelled evaluations and model regression checks. Measure false support and reviewer overrides before choosing approval policies.
4. **Operational reliability:** idempotency, bounded retries, quotas, background jobs when latency demands them, and safe audit/observability records.
5. **Knowledge reuse:** permission-aware nearby-product matching, approved study retrieval, formula-change reassessment triggers and market/language-specific review policies.

Success should mean faster, better-supported reviewer decisions—not more claims approved. Track evaluator time, agreement with expert review, false-support rate, override reasons, latency and cost.
