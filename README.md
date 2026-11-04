# Claims Intelligence Engine

A small full-stack exercise: submit a cosmetic product claim and study evidence, get an AI recommendation, and save the result for review.

Built with **NestJS, React JSX, PostgreSQL, Prisma and the OpenAI Responses API**. The scope is deliberately one complete flow rather than a half-built workflow platform.

## What to review

- [Technical proposal](docs/technical-proposal.md): business understanding, research, architecture choices and roadmap.
- [Build plan](docs/build-plan.md): implementation sequence, checks and next steps.
- [Prisma schema](apps/api/prisma/schema.prisma).
- [POST controller](apps/api/src/claims/claims.controller.ts) and [assessment service](apps/api/src/claims/claims.service.ts).
- [React component](apps/web/src/ClaimAssessment.jsx).
- [Verification notes](docs/verification.md): what was actually checked and what was not.

## Run locally

You need Node **22.12+**, npm, Docker, and an OpenAI API key with access to a model supporting Responses API Structured Outputs. No key is needed for the automated tests.

```sh
npm ci
cp apps/api/.env.example apps/api/.env
docker compose up -d --wait
npm run db:generate
npm run db:migrate
npm run dev
```

Before submitting a claim, fill in `OPENAI_API_KEY` and `OPENAI_MODEL` in `apps/api/.env`. Restart the API after changing these values. Choose a model available to your project; model quality on this task has not been benchmarked.

Open **http://localhost:5173**. The API runs on **127.0.0.1:3001**, and PostgreSQL is exposed locally on port **5439**. Vite forwards `/api` to NestJS, so no permissive CORS setup is needed. All services bind to loopback for this exercise.

Click a synthetic example, inspect the text and select **Assess claim**. Examples fill the form; they do not simulate a successful AI call. If the provider is not configured, the API returns an explicit 503 error.

Stop the app with Ctrl+C and the database with `docker compose stop`. The database volume preserves saved assessments. The Compose password is only a local development credential.

## API

```sh
curl http://127.0.0.1:3001/api/claims/assess \
  -H 'Content-Type: application/json' \
  -d '{
    "claim": "Reduces wrinkles by 20% in 4 weeks",
    "formulaVersion": "PARIS-RI-001-v3",
    "evidence": "Synthetic study summary: wrinkle depth was measured only at eight weeks. No four-week results are available."
  }'
```

A successful request returns **201** after persistence, with this shape (illustrative values):

```json
{
  "assessmentId": "generated-uuid",
  "claimId": "generated-uuid",
  "verdict": "INSUFFICIENT_EVIDENCE",
  "justified": false,
  "confidence": 0.92,
  "reasoning": "The report does not provide four-week results.",
  "missingEvidence": ["Four-week results"],
  "createdAt": "2026-11-04T00:00:00.000Z"
}
```

The internal verdict distinguishes unsupported findings from missing evidence. Only `SUPPORTED` maps to **Justified: Yes**. Confidence is model-reported certainty in the assessment, not a clinical probability or confidence interval.

| Status | Meaning |
|---|---|
| 400 | Invalid input, unknown fields or field limits exceeded |
| 413 | HTTP body exceeds 128 KB |
| 502 | Provider error, refusal, incomplete or invalid output |
| 503 | Missing provider configuration |
| 500 | Assessment could not be saved |

An outage is never returned as “Justified: No.”

## Checks

```sh
npm run build
npm test
npm run test:integration
```

The integration command needs the running database and applied migrations. It uses controlled provider responses, writes uniquely tagged test records and removes only those records afterward. It checks that the returned result matches PostgreSQL and that a failed nested write leaves no orphan claim. API and UI tests run without a real provider key.

GitHub Actions runs the same build, unit/HTTP/UI tests and database integration checks with a disposable PostgreSQL service.

The root package overrides `multer` and `deepmerge-ts` to patched releases because the selected NestJS/Prisma versions otherwise resolve vulnerable transitive versions. Recheck these overrides when upgrading those frameworks.

## How it works

```text
React form → NestJS request validation → OpenAI structured assessment
                                      → validate result
                                      → Prisma atomic nested write
                                      → return saved result → React
```

The provider call finishes before the database write starts. We save exact evidence, claim wording, formula reference, model, prompt version and provider response ID. Claim and assessment records are created together. `justified` is derived, so it cannot disagree with the stored verdict.

The frontend has labelled inputs, keyboard focus states, loading/error feedback and a result that clears when its input changes. Model-generated text is rendered as text, not HTML.

## Boundaries worth knowing

- This is a local technical exercise, with no login or role enforcement. Add those before shared use or real dossiers.
- Each submission creates a new claim and assessment. There is no idempotency or reassessment endpoint yet; retries can duplicate records and provider charges.
- Formula identity is a supplied reference, not a verified relation to a formula registry.
- Pasted text only: no PDF extraction, report-authenticity checks or source citations.
- `store: false` is used, but is not a zero-retention guarantee. Real reports require approved data handling.
- Scientific correctness and confidence calibration need expert evaluation. A schema-valid response is not proof that a claim is true.

This is an independent candidature exercise, not an official L’Oréal product or approval system. Final claim approval remains with the authorized evaluator.
