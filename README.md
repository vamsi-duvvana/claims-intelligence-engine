# Claims Intelligence Engine

A four-role demo for taking a cosmetic claim from a business idea to an evidence-based decision. Built with **React JSX, NestJS, Prisma, PostgreSQL and Google Gemini**.

## The updated flow

| User | What they do |
|---|---|
| Business | Raises a claim with its target benefit and audience. Returns at the end to review the summary and decide whether to proceed, hold or stop. |
| Claim manager | Identifies nearby products and existing formulas, records the match rationale and hands off to the scientist. |
| Scientist | Keeps the matched formula or proposes a new version that might strengthen the claim, with scientific rationale and testing needs. |
| Evaluator | Reviews the study, assesses the claim and records a human conclusion before sending the summary to Business. |

The sidebar switches between four fictional demo users. It is a walkthrough tool, not authentication.

## Try the dummy workflow — no API key needed

```sh
npm ci
npm run dev -w @claims/web
```

Open **http://127.0.0.1:5173**. The frontend runs on its own: no database, backend or API key is needed for the dummy workflow.

Three seeded cases have already passed product matching and scientific review:

| Case | Scripted confidence | Demo purpose |
|---|---|---|
| Renewal serum | 92% | Strong synthetic evidence; still requires human review |
| Renewal light | 64% | Borderline pilot findings; demonstrate evaluator judgement |
| Renewal night | 28% | Limited evidence; identify what is missing |

These are fixed dummy scores and explanations, not generated AI results or clinical probabilities. Low confidence is uncertainty in the recommendation, not a 28% chance that a product works. A real model can be highly confident that evidence is insufficient.

### Suggested five-minute demo

1. In **Business**, select the 64% case. The final decision is disabled while human review is pending.
2. Switch to **Evaluator**. Read the synthetic study, recommendation and missing evidence.
3. Record a conclusion and rationale, then **Sign off & send to Business**. An evaluator can agree with or challenge the AI.
4. Return to **Business**. The summary now includes the human conclusion. Record a proceed, hold or stop decision with a reason.
5. Use **Raise a claim** to walk through the entire flow: Business → Claim manager → Scientist → Evaluator → Business. The manager has a dummy wrinkle-care shortlist, not an automated similarity search.

A proposed new formula requires a new version reference and fresh evidence. It does not inherit an earlier assessment. Editing study text also clears its assessment. All dummy changes live in memory and reset on refresh; **Reset dummy workspace** restores the original cases. Keep the same tab open while switching roles.

## Evaluate with your Gemini key

The **Evaluate with Gemini** button is separate from **Load dummy assessment**. It sends the selected claim, formula and study text to the NestJS endpoint. The backend calls Google's `generateContent` REST API, validates structured JSON, saves the Claim and Assessment atomically, and returns the saved result.

Use Node **22.12+**, npm and Docker. Create `apps/api/.env` from `.env.example` if it does not already exist; keep any existing local configuration. Set these values there:

```dotenv
DATABASE_URL=postgresql://claims:claims_local@localhost:5439/claims?schema=public
GEMINI_API_KEY=your-key-goes-here
GEMINI_MODEL=your-available-structured-output-model
PORT=3001
```

The model name is deliberately configurable. Use a model available to your Google project that supports JSON structured output. The key stays on the server and is sent in the `x-goog-api-key` header, never in the browser bundle or request URL. Do not commit `.env`.

```sh
docker compose up -d --wait
npm run db:generate
npm run db:migrate
npm run dev
```

The API binds to **127.0.0.1:3001**, PostgreSQL to **127.0.0.1:5439**, and Vite proxies `/api` to NestJS. There is no automatic fallback to dummy output if Gemini fails. A missing key/model produces a clear error. Gemini results can still be reviewed by the evaluator and carried into the demo Business summary.

Only live assessment records are saved to PostgreSQL. Product matching, formula proposals, human reviews and business decisions remain frontend demo state; they are not a server-backed multi-user workflow yet.

Stop the app with Ctrl+C and the database with `docker compose stop`. The volume keeps saved assessment records.

## API contract

`POST /api/claims/assess`

```json
{
  "claim": "Reduces wrinkle depth by 20% on average in 4 weeks",
  "formulaVersion": "PARIS-RI-002-v1",
  "evidence": "Approved, de-identified study text…"
}
```

A 201 response contains `assessmentId`, `claimId`, `verdict`, `justified`, `confidence`, `reasoning`, `missingEvidence` and `createdAt`. Only `SUPPORTED` maps to Yes. `NOT_SUPPORTED` and `INSUFFICIENT_EVIDENCE` stay distinct.

Invalid input returns 400; excessive HTTP bodies 413; Gemini failures, blocked/truncated responses or invalid JSON 502; missing Gemini configuration 503; persistence failure 500. No outage is translated into “Justified: No.” The request has a 45-second provider timeout and no automatic retries.

## Checks and implementation notes

```sh
npm run build
npm test
npm run test:integration
```

The integration command needs PostgreSQL and applied migrations. Provider responses are controlled in tests; no key is needed. Tests cover the role handoffs, required human review, stale-result invalidation, Gemini request/response handling and database rollback. GitHub Actions runs the same checks.

- [Technical proposal](docs/technical-proposal.md)
- [Build plan and next steps](docs/build-plan.md)
- [Verification notes and screenshots](docs/verification.md)
- [Prisma schema](apps/api/prisma/schema.prisma)
- [Assessment service](apps/api/src/claims/claims.service.ts)
- [Role-specific views](apps/web/src/RoleViews.jsx) and [workflow rules](apps/web/src/workflow.js)

The root dependency overrides retain patched `multer` and `deepmerge-ts` versions. Recheck those when upgrading NestJS or Prisma. OpenAI is no longer an application dependency.

## Limits

This is an independent technical demo, not an official L’Oréal system. Role switches and frontend gates are not access control. Do not use confidential dossiers before identity, authorization, data handling and retention requirements are agreed. Formula references and studies are synthetic/unverified. Duplicate live submissions can create duplicate records and charges; idempotency remains future work. Confidence is not calibrated and scientific correctness needs expert evaluation. Proceeding in the demo is a business decision, not permission to publish a claim or launch a product.
