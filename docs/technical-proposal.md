# Technical proposal

## Business understanding

The business team starts with a proposed product benefit. Claim managers decide which claims are relevant and feasible. Scientists formulate the product and identify the version being tested. Evaluators conduct or review testing and attach the evidence used to substantiate the claim.

The feature implemented here helps at that last handoff: an evaluator submits a claim and evidence, gets an AI recommendation, and can inspect the result. It does not implement the whole product lifecycle or make the final approval decision.

```text
Business proposal → Claim screening → Formula submission
                 → Evaluator study/report → AI assessment → Human review
```

A formula can have several claims, and a claim can be assessed against different evidence over time. A formulation or stability test is not automatically an efficacy study. Changing the claim wording, formula or evidence can change the answer.

## What counts as support?

For “Reduces wrinkles by 20% in four weeks,” a 24% improvement after eight weeks is not enough to establish the timing. Hydration measurements do not directly establish wrinkle reduction. Ingredient findings do not automatically apply to the finished formula.

The assessment prompt therefore compares:

1. Finished product and formula version.
2. Exact measured benefit and numerical wording.
3. Study duration and measurement timepoint.
4. Population, comparator and use conditions.
5. Methods, uncertainty and stated limitations.

The evaluator needs to define the scientific standard for each claim type. I have not invented a universal sample size or p-value threshold. A point estimate above the promised percentage is not, on its own, a complete substantiation policy.

Three outcomes preserve the distinction between negative findings and missing information:

| Stored verdict | UI | Meaning |
|---|---|---|
| SUPPORTED | Justified: Yes | Evidence adequately supports the exact claim |
| NOT_SUPPORTED | Justified: No | Reported findings fail to support that wording |
| INSUFFICIENT_EVIDENCE | Justified: No, more evidence needed | Missing or inconclusive information prevents support |

Confidence is the model’s reported certainty in its assessment. It is not calibrated, a clinical confidence interval or a probability that the product works. No confidence threshold automatically approves a claim.

## Research performed

I checked official documentation to answer the design questions below. This was documentation research, not validation against real clinical studies or L’Oréal’s internal processes.

| Question | Source | Decision |
|---|---|---|
| How should the model return a stable result? | [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | Use Responses API parsing with a schema and reject absent/incomplete output |
| What should happen to submitted data? | [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) | Set `store: false`, keep the key server-side, and require a data-handling review before real reports |
| How should invalid input be handled? | [NestJS validation](https://docs.nestjs.com/techniques/validation) | Validate at the server boundary; this small implementation uses Zod directly in the service |
| How do related inserts stay consistent? | [Prisma nested writes](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions) | Insert the Claim and Assessment atomically |
| Why check product relevance and wording? | [EU Regulation 655/2013, Annex](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX%3A32013R0655) | Build the rubric around evidence relevant to the product and benefit; retain evaluator review |

The regulatory source informs the design. This exercise does not establish legal acceptability for any particular wording or market.

Still needed: an expert-labelled evaluation set, model cost/latency measurements, agreed scientific acceptance criteria and the organization’s approved confidentiality/hosting policy.

## Database design

The complete [Prisma schema](../apps/api/prisma/schema.prisma) defines two tables:

- **Claim:** immutable submitted wording and formula-version reference.
- **Assessment:** evidence snapshot, verdict, confidence, reasoning, missing evidence, model/prompt metadata and timestamp.

One Claim has many Assessments. The current route creates a new claim and its first assessment. This keeps the exercise small; appending a reassessment and grouping revised claims are later work. No update/delete routes are exposed.

Evidence belongs to the assessment because the same claim may be reviewed against a different study. The database also enforces confidence between 0 and 1. `justified` is derived from the verdict rather than stored separately.

## Backend design

The [controller](../apps/api/src/claims/claims.controller.ts) accepts `POST /api/claims/assess`. The [service](../apps/api/src/claims/claims.service.ts) owns the flow:

1. Reject invalid fields, extra properties and oversized text.
2. Send the claim, formula reference and evidence as data with a fixed instruction prompt.
3. Parse a structured assessment and validate its business bounds.
4. Save claim and assessment in one nested write.
5. Return fields from the saved record.

The external call is outside the database transaction, so a slow model does not hold a database transaction open. Provider failure is separate from an assessment of insufficient evidence. A successful model call followed by a database failure returns an error rather than an unsaved result.

The provider call has a 45-second timeout and no automatic retries. Retries require idempotency and a clear failure policy before they are useful here. There is no distributed transaction between OpenAI and PostgreSQL: a user retry can repeat a paid call or duplicate a saved submission.

Study text is untrusted. The prompt tells the model not to follow embedded instructions; the call has no tools or access to other reports. This reduces the scope of prompt injection but does not eliminate semantic errors. Application logs avoid evidence and raw provider errors.

## Frontend design

The [React JSX component](../apps/web/src/ClaimAssessment.jsx) uses a native form and local state. It sends the three fields, waits for the response and displays the required Yes/No, confidence and reasoning. It also shows missing information and the saved assessment ID.

Three synthetic examples make review easier without pretending to be real studies. During submission, inputs are disabled. Editing any field clears the prior result, preventing the user from mistaking an old assessment for an evaluation of new evidence. Error messages are announced accessibly, and model output is rendered as plain text.

## Why this architecture?

| Choice | Reason |
|---|---|
| NestJS | Required by the brief; controller/service split stays easy to read |
| PostgreSQL + Prisma | Relational history, migrations and atomic related writes |
| React JSX + Vite | Required UI technology with little setup |
| OpenAI SDK + Zod | A typed response shape and runtime validation without an agent framework |
| One synchronous endpoint | Fits a bounded text assessment and the one-day budget |
| No retrieval system | The evidence to assess is already in the request |

There is no need for microservices, a queue, a vector database or a generic AI abstraction to complete this task. Those choices should follow a measured need.

## Roadmap with more time

| Priority | Work | Reason / release condition |
|---|---|---|
| Reliable pilot | SSO, roles, access checks, verified formula versions, reviewer decisions, idempotency and audit events | Required before shared use and confidential reports |
| Evidence workspace | PDF ingestion, extraction/OCR, source page/table references and retention controls | Reviewers must be able to verify material statements against the source |
| Scientific quality | Expert-labelled cases, false-support analysis, prompt/model regression checks and confidence calibration research | Establish an agreed quality baseline before broadening use |
| Full workflow | Claim-manager screening, scientist/evaluator handoffs, claim versioning and reassessment triggers | Keep assessments attached to the right product/formula and avoid stale decisions |
| Operational scale | Background jobs, durable retries, quotas and monitoring | Add when actual latency/volume requires them |
| Broader intelligence | Approved evidence retrieval, conflicting-study detection, French/English support and market-specific review policies | Reuse knowledge while preserving source access and reviewer authority |

Measure evaluator time saved, agreement with expert review, false-support rate, override reasons, latency, failure rate and cost per assessment. Set targets with the scientific team after measuring a baseline. Approval rate is not a useful success metric by itself.

I would start with evaluator feedback and scientific evaluation before fine-tuning. If mistakes are caused by missing source context, a larger model or more training will not fix the underlying evidence gap.
