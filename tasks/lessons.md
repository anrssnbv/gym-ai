# Lessons

- When checking whether a secret contains whitespace from a shell command, avoid nested regex escaping. Inspect character codes with a small script and cross-check the file structure before telling the user a value is malformed; never print the secret itself.
- A successful cloud build and signed-out page check do not establish that authenticated core actions work. After deployment, smoke-test one representative action and inspect sanitized runtime logs before reporting the app as working. Never print or persist raw exceptions that may include credentials.
- When a validation ceiling governs different exercises, define limits per exercise and state the weight convention before choosing numbers. Keep UI, server validation, and progression on the same catalog metadata; distinguish app ceilings from individual strength or safety limits. Source: user clarification during the QA fix plan, 2026-09-25.
