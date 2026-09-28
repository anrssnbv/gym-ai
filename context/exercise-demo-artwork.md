# Exercise movement artwork inventory

Spec 17. Each asset is original artwork generated for Gym AI with the built-in OpenAI image generator, reviewed, and encoded as a local 960 × 1200 WebP. No third-party artwork was copied or hotlinked; the external-license column is therefore not applicable. Review covers exercise-specific equipment, anatomy, contact points, both positions, motion arrows, and label legibility. Source PNGs remain in the local Codex generated-images directory; the WebP files in `public/exercise-demos/` are the shipped assets.

Prompt set: one scientific-educational mobile poster per catalog ID, specifying that exercise's equipment, grip/contact points, body orientation, labelled Start and exercise-specific second position, motion/return arrows, plausible anatomy, a dark navy background, high-contrast figure, lime accents, and no logos or unrelated text. Individual prompts described the ID's movement and machine or free-weight setup; uncertain first passes were regenerated.

| ID | Source/creator | External license/permission | Content review |
| --- | --- | --- | --- |
| barbell-bench-press | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: flat bench, feet planted, barbell over chest then lowered with bent elbows. |
| incline-bench-press | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: incline bench and straight barbell at extended and lowered positions. |
| incline-dumbbell-press | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: incline bench, two separate dumbbells, extended and lowered positions. |
| machine-chest-press | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: seated chest press machine, back support, horizontal handle press. |
| wide-chest-press | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: wide-spaced machine handles beside chest then pressed forward. |
| pec-deck | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: seated pec deck with padded levers open then closed. |
| cable-crossover | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: two high cable towers; hands sweep inward and downward. |
| lat-pulldown | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: high cable bar and thigh restraint; bar moves to upper chest. |
| seated-cable-row | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: low cable, seated feet braced, handle pulled to torso. |
| barbell-row | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: standing hip hinge retained as barbell moves from hang to lower ribs. |
| one-arm-dumbbell-row | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: one hand and knee supported on bench, single dumbbell rows toward hip. |
| straight-arm-pulldown | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: high cable straight bar sweeps from shoulder height to thighs with straight arms. |
| dumbbell-shrug | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: two dumbbells stay by long arms while shoulders rise. |
| back-extension | Built-in OpenAI image generator; original for this app; revised after review | N/A — no external image | Pass after revision: 45-degree bench, ankles braced, neutral back hinged down then aligned with legs. |
| overhead-press | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: standing barbell at upper chest then pressed overhead. |
| dumbbell-shoulder-press | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: seated upright bench, two dumbbells at shoulders then overhead. |
| machine-shoulder-press | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: seated shoulder press machine, handles move vertically overhead. |
| dumbbell-lateral-raise | Original OpenAI imagegen artwork | None; no external source | Pass: two dumbbells, lateral arm raise to shoulder height, upward arrows. |
| cable-lateral-raise | Original OpenAI imagegen artwork | None; no external source | Pass: one handle on low pulley, arm moves sideways to shoulder height. |
| reverse-pec-deck | Original OpenAI imagegen artwork | None; no external source | Pass: seated facing machine support, handles open outward. |
| face-pull | Original OpenAI imagegen artwork | None; no external source | Pass: high cable and rope pulled toward face with outward elbows. |
| barbell-curl | Original OpenAI imagegen artwork | None; no external source | Pass: one plated straight bar, elbows flex to raise bar. |
| incline-dumbbell-curl | Original OpenAI imagegen artwork | None; no external source | Pass: back against incline bench, two dumbbells curled to shoulders. |
| preacher-curl | Original OpenAI imagegen artwork | None; no external source | Pass: upper arms on selectorized preacher-curl machine pad, integrated pivot handles raised by elbow flexion. |
| hammer-curl | Original OpenAI imagegen artwork | None; no external source | Pass: neutral-grip dumbbells curled to shoulders. |
| cable-curl | Original OpenAI imagegen artwork | None; no external source | Pass: straight handle on low cable, elbows flex to raise handle. |
| cable-pushdown | Original OpenAI imagegen artwork | None; no external source | Pass: high cable and short bar, elbows extend downward. |
| overhead-cable-extension | Original OpenAI imagegen artwork | None; no external source | Pass: low cable behind body, rope moves overhead through elbow extension. |
| ez-bar-skull-crusher | Original OpenAI imagegen artwork | None; no external source | Pass: lying on bench, EZ bar moves from near forehead to above chest. |
| close-grip-bench-press | Original OpenAI imagegen artwork | None; no external source | Pass: narrower barbell grip on flat bench, bar pressed vertically. |
| seated-dip-machine | Original OpenAI imagegen artwork | None; no external source | Pass: seated machine handles move downward through elbow extension. |
| barbell-back-squat | Original OpenAI imagegen artwork | None; no external source | Pass: bar rests on upper back in upright and lowered squat positions. |
| leg-press | Original OpenAI imagegen artwork | None; no external source | Pass: reclined 45-degree sled machine, feet on platform, sled pressed along rails. |
| hack-squat | Built-in OpenAI image generator; original for this app | N/A — no external image | Pass: plate-loaded hack squat sled, back and shoulder pads, feet on platform in standing and lowered positions; descending and return arrows. |
| leg-extension | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: seated leg-extension machine; shin roller rises as knees extend. |
| bulgarian-split-squat | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: rear foot on bench, dumbbells at sides, front leg lowers. |
| romanian-deadlift | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: barbell stays close as hips hinge with soft knees. |
| dumbbell-romanian-deadlift | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: two dumbbells stay near legs in standing and hinged positions. |
| lying-leg-curl | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: prone on machine; ankle roller rises toward glutes. |
| seated-leg-curl | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: thigh restraint and ankle roller shown; knees flex to pull roller down. |
| barbell-hip-thrust | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: shoulders on bench, bar across hips, feet planted as hips rise. |
| dumbbell-walking-lunge | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: dumbbells at sides; step forward to lowered lunge and rise forward. |
| cable-glute-kickback | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: ankle cuff connected to low pulley; leg moves backward. |
| hip-abduction-machine | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: seated machine thigh pads move outward with knees. |
| standing-calf-raise | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: shoulder-pad machine, toes on platform, heels rise. |
| seated-calf-raise | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: seated thigh-pad machine; heels move from lowered to raised. |
| leg-press-calf-raise | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: incline leg-press sled; balls of feet on lower plate, ankle motion without knee press. |
| cable-crunch | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: kneeling at high pulley with rope by head; torso curls. |
| machine-crunch | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: seated crunch machine; chest lever and torso curl together. |
| cable-woodchopper | OpenAI image_gen, original for Gym AI | N/A; no external source | Pass: high pulley cable and both hands move diagonally across torso. |
