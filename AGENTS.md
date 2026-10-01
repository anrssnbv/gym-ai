<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git workflow

- Keep only `main` and `development` branches locally and on GitHub. Make all project changes directly on `development`; do not create other branches.
- After changes are fixed and verified: commit on `development` → push `development` to GitHub → open a pull request from `development` to `main` → wait for required checks and merge → switch to local `main` and run `git pull --ff-only origin main`.
- Switch back to `development`, fast-forward it to local `main`, and push `development` so both branches start the next change at the merged commit. Follow this workflow without asking again unless the user gives a different instruction.
