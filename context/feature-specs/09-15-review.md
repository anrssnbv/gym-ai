# Review of Specs 09–15

Reviewed 2026-09-25 against the files on disk and the supplied review summary. This records dispositions of that summary, not an independent reproduction of its exact 1-major/14-minor count; the original detailed findings were not provided.

## Result

The summary was partly out of date: spec 09 already contained several fixes. The remaining cross-spec gaps are now revised. This is a specification review only; specs 09–15 are not implemented or runtime-verified.

| Finding | Evidence and disposition |
| --- | --- |
| Shared open-session lookup | Already in 09 as `findOpenSession`; made its use explicit in 15 and transactional Finish. |
| Stale flag | Already in 09. Spec 10 now checks `res.stale`, clears the obsolete round, shows the error, and refreshes. |
| Shared result type | Already in 09. Aligned code standards and client call sites with `ActionResult<T>`. |
| Network failures (major) | `callAction` already catches rejection in 09; 10, 11, and 15 now explicitly require it for every action, inline retry errors, preserved inputs/rounds, and cleared pending guards. No duplicated per-button catch implementation is required. |
| User ownership | Removed 09’s contradictory instruction to inspect another user’s duplicate row. Every lookup/filter, nested read, and raw SQL predicate remains scoped. |
| Round retry ID | Already present in 09 but missing from 10. Added creation/lifetime, same-payload replay, sessionId response, mismatch rejection, and concurrent duplicate recovery after rollback. |
| Empty session end | Reuse `sessionEndAt` with `startedAt` fallback; stale empty duration is zero, explicit Finish uses now, all empty sessions excluded from stats. |
| Banner expiry | Spec 11 rechecks staleness while mounted and on visibility changes; exactly 3 hours remains active. |
| Heat map type and label | Spec 12 narrows intensity to 1/2/3, omits zero, and adds an optional accessible-label override describing actual activity/counts. Existing exercise labels remain the default. |
| Toggle deselection | Spec 13 ignores empty change values and preserves a valid selected duration/focus. |
| New-user planning | Spec 14 allows enough new exercises to reach three when fewer than two eligible calibrated exercises exist; validates this against focus candidates. |
| Duplicate focus storage | Removed planned Prisma enum/column; focus lives only in validated plan JSON. Updated 13–15, architecture, and tracker. No existing migration changed. |
| Progress prop shape | Spec 15 uses `progress: Record<string, { level: number; weightKg: number }>` consistently in the sheet and preview. |
| Outdated type sentence | Spec 13 retains the client-safe WorkoutPlan interface; spec 14 checks the server schema against it instead of replacing it. |
| AI text-length limits | Not confirmed as a blanket incompatibility. Official docs restrict these keywords for fine-tuned models. Retain local/schema limits and test the selected standard model before changing them. |

## Additional consistency fixes

- Restrict Zod input parsing/catalog-ID rules to actions that actually accept those inputs; `finishWorkout()` is parameterless.
- Align the exact three-hour boundary across architecture and specs.
- Define serializable session mutations with bounded conflict retries: concurrent first sets or Start requests must not create separate active sessions.
- Replay success revalidates saved state after a lost response.

## Verification

- Cross-read all seven specs and their action, session, plan, and storage contracts.
- Independent read-only review of 09–11 identified the scoped replay/concurrent retry issues; those are reflected above.
- `git diff --check` passes. No application tests run because no executable application code changed.
- Future spec acceptance checks now include offline/replay behavior, empty sessions, banner expiry, heat accessibility, toggle reselection, and new-user planning.

## Source

[OpenAI Structured Outputs — supported schemas](https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas), checked 2026-09-25. The fine-tuned-model limitations include string length and several numeric/array keywords. This does not establish that standard models reject those keywords. The spec 14 smoke test remains required.
