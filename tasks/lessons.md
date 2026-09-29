# Lessons

- When a user asks for anatomical illustrations matching a muscle map, use connected human contours and identifiable muscle shapes. Segmented mannequin or capsule-limb studies are not a substitute; validate a representative sample before producing a catalog. Source: Spec 18 pilot feedback, 2026-09-29.

- When the user replaces a local provider key during deployment work, synchronize the authorized hosted environments, redeploy, and test the authenticated production action. Local API success and a Ready build do not verify production credentials. Source: missed Vercel key update, 2026-09-28.

- Define working-set time, rest, and session overhead before changing a workout generator's volume rules. The exercise countdown is not a session-duration estimate; check the full arithmetic against the user's concrete examples before encouraging the model to fill time.

- When a user reports insufficient workout volume or coverage, preview wording and a stronger prompt do not establish a fix. Translate the desired session into explicit count, set, and coverage criteria; check calibration, experience, and timing rules for conflicts, and verify the resulting selection. Source: full-body target clarification, 2026-09-28.

- When checking whether a secret contains whitespace from a shell command, avoid nested regex escaping. Inspect character codes with a small script and cross-check the file structure before telling the user a value is malformed; never print the secret itself.
- A successful cloud build and signed-out page check do not establish that authenticated core actions work. After deployment, smoke-test one representative action and inspect sanitized runtime logs before reporting the app as working. Never print or persist raw exceptions that may include credentials.
- When a validation ceiling governs different exercises, define limits per exercise and state the weight convention before choosing numbers. Keep UI, server validation, and progression on the same catalog metadata; distinguish app ceilings from individual strength or safety limits. Source: user clarification during the QA fix plan, 2026-09-25.
- Do not treat an issue report as a completed fix. Commit issue-only documentation locally; wait to push, open a PR, or merge until the corresponding fixes are verified, unless the user explicitly requests earlier delivery.
