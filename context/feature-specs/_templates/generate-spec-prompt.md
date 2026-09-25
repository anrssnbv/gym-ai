# Prompt: Write The Next Feature Spec

Read `AGENTS.md`, every file in `context/`, the existing specs in `context/feature-specs/`, and the code as it is now. Then write only the next unit from the Roadmap in `progress-tracker.md`, as `context/feature-specs/NN-kebab-name.md`, using `_templates/spec-template.md`.

The spec must state: what already exists, the one new result, the exact files, components and Server Actions, their inputs and outputs, auth and ownership rules, loading/empty/error states, what is out of scope, and observable checks.

Rules:

- Don't change the behavior of completed units unless the Roadmap says so.
- Don't invent product behavior (game rules, stats, AI inputs). If something is undecided, add it to Open Questions in the tracker and mark the dependent part of the spec as blocked.
- Keep it one unit. If it mixes UI work with data work and isn't a "wire" spec, split it.
- Reuse the names and contracts from earlier specs and from the code as built.
- Leave no template text in the result.
- Writing the spec does not authorize writing code or installing packages.
