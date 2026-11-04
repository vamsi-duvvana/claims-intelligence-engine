# Build plan and handoff

## Scope

One claim, one formula-version reference and one pasted study text per request. Complete the request-to-database-to-screen flow. Keep the broader business workflow in the roadmap.

## One-day sequence

| Time | Work | Done when |
|---|---|---|
| Hour 1 | Agree input/output contract and assessment rubric | Supported, unsupported and insufficient examples are defined |
| Hour 2 | Prisma schema, migration and PostgreSQL setup | Related records can be created together |
| Hours 3–4 | NestJS endpoint and provider integration | Validated output is saved before returning; failure paths work |
| Hour 5 | React submission and result screen | Loading, success, editing and errors behave correctly |
| Hour 6 | HTTP, UI and database tests | Tests verify the behavior that could mislead a reviewer or lose consistency |
| Hour 7 | Synthetic cases and manual walkthrough | Timing/endpoint/formula mismatches are reviewed |
| Hour 8 | README, proposal and demo rehearsal | Another developer can run the project and explain the tradeoffs |

## Acceptance checks

- Valid input calls the provider, saves both records and returns the saved result.
- Invalid input does not call the model or write to the database.
- Unsupported and insufficient outcomes retain their distinction while displaying No.
- Refusal, incomplete output and provider errors never become a negative assessment.
- Database failure returns no success and leaves no orphan claim.
- An edited claim cannot retain a stale assessment on screen.
- API keys and study text are absent from committed configuration and application logs.

## Five-minute walkthrough

1. Explain where the evaluator fits in the business handoff.
2. Open the Prisma schema and show the one-to-many relationship.
3. Trace the service from validation through provider output to the nested write.
4. Run a synthetic example with an approved provider configuration.
5. Show a timing mismatch and a missing-evidence case.
6. Explain confidence, human review and the next investments.

Without a provider key, demonstrate the UI and automated tests, and state that the live model call has not been run. Do not present test fixtures as AI-generated results.

## Next decisions

Ask the evaluator which numerical wording and study-quality policy they expect; clarify acceptable population and use conditions. Confirm real report formats, identity/role requirements, approved model/data region and retention policy before a pilot.

Add idempotency before automatic retries, verified formula linkage before trusting submitted identities, and source references before reviewers rely on long-report summaries.
