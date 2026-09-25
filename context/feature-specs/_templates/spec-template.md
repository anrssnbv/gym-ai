<!--
Template for a gym-ai feature spec, in the same shape as the ghost-ai specs:
short intro → implementation sections → dependencies → scope limits → check when done.
Copy it to `context/feature-specs/NN-kebab-name.md`, fill it in, and delete this comment
and any section that doesn't apply.
-->

<One or two sentences: what this unit builds, which earlier unit it builds on, and what it explicitly does not do.>

## <Part — a component, route, Server Action or model>

Create `path/to/file.ts`.

- requirement: exact names, inputs and outputs
- auth and ownership rule (for anything that touches data)
- loading, empty and error states (for UI)

## <Next part>

- ...

## Dependencies

- Already installed: ...
- Install: `package@major`
- Env vars: names only, never values

## Scope Limits

- don't ...
- don't modify `components/ui/*`

## Check When Done

- observable success check
- failure check: signed-out user, another user's data, invalid input
- `npm run lint` and `npm run build` pass (`npm test` too if tests exist)
- `progress-tracker.md` updated
