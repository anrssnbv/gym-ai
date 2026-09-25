import type { MuscleHeadId } from "@/lib/catalog";

// Original, hand-authored geometry. Each polygon is the left half of a figure;
// MuscleMap mirrors it around x = 100. No third-party artwork is used.
export type BodyView = "front" | "back";
export type BodyPath = { view: BodyView; d: string };

export const HEAD_PATHS: Record<MuscleHeadId, [BodyPath, ...BodyPath[]]> = {
  "chest-upper": [
    { view: "front", d: "M 100 82 L 76 79 L 63 89 L 68 101 L 100 98 Z" },
  ],
  "chest-middle": [
    { view: "front", d: "M 100 98 L 68 101 L 61 111 L 69 128 L 100 128 Z" },
  ],
  "chest-lower": [
    { view: "front", d: "M 100 128 L 69 128 L 75 140 L 100 142 Z" },
  ],
  "back-lats": [
    { view: "back", d: "M 63 109 L 78 116 L 89 148 L 86 180 L 77 193 L 70 157 Z" },
  ],
  "back-mid": [
    { view: "back", d: "M 100 104 L 78 92 L 63 109 L 78 116 L 89 148 L 100 157 Z" },
  ],
  "back-traps": [
    { view: "front", d: "M 87 61 L 80 71 L 61 79 L 76 79 L 100 82 L 100 76 Z" },
    { view: "back", d: "M 100 60 L 87 61 L 80 71 L 61 79 L 78 92 L 100 104 Z" },
  ],
  "back-lower": [
    { view: "back", d: "M 100 157 L 89 148 L 86 180 L 77 193 L 82 208 L 100 221 Z" },
  ],
  "delts-front": [
    { view: "front", d: "M 61 79 L 76 79 L 63 89 L 61 111 L 53 124 L 45 107 L 49 87 Z" },
  ],
  "delts-side": [
    { view: "front", d: "M 61 79 L 49 87 L 45 107 L 44 127 L 34 119 L 37 96 L 47 83 Z" },
    { view: "back", d: "M 61 79 L 49 87 L 45 107 L 44 127 L 34 119 L 37 96 L 47 83 Z" },
  ],
  "delts-rear": [
    { view: "back", d: "M 61 79 L 78 92 L 63 109 L 53 124 L 45 107 L 49 87 Z" },
  ],
  "biceps-long": [
    { view: "front", d: "M 44 127 L 45 112 L 49 116 L 46 151 L 38 174 L 32 168 L 35 144 Z" },
  ],
  "biceps-short": [
    { view: "front", d: "M 49 116 L 53 124 L 58 128 L 53 149 L 44 173 L 38 174 L 46 151 Z" },
  ],
  brachialis: [
    { view: "front", d: "M 34 119 L 44 127 L 35 144 L 32 168 L 38 174 L 44 173 L 40 185 L 28 182 L 27 169 L 30 144 Z" },
  ],
  "triceps-long": [
    { view: "back", d: "M 53 124 L 58 128 L 54 151 L 45 170 L 38 163 L 44 139 L 45 112 Z" },
  ],
  "triceps-lateral": [
    { view: "back", d: "M 34 119 L 44 127 L 45 112 L 44 139 L 38 163 L 31 175 L 27 169 L 30 144 Z" },
  ],
  "triceps-medial": [
    { view: "back", d: "M 38 163 L 45 170 L 40 185 L 28 182 L 31 175 Z" },
  ],
  "quads-rectus": [
    { view: "front", d: "M 78 232 L 87 239 L 88 269 L 81 304 L 73 300 L 68 264 L 70 242 Z" },
  ],
  "quads-lateral": [
    { view: "front", d: "M 68 222 L 78 232 L 70 242 L 68 264 L 73 300 L 69 316 L 61 307 L 57 274 L 59 246 Z" },
  ],
  "quads-medial": [
    { view: "front", d: "M 89 276 L 94 301 L 91 317 L 82 322 L 75 314 L 81 304 Z" },
  ],
  "hams-outer": [
    { view: "back", d: "M 64 253 L 77 261 L 76 284 L 72 319 L 62 316 L 57 276 L 59 257 Z" },
  ],
  "hams-inner": [
    { view: "back", d: "M 77 261 L 92 254 L 96 273 L 92 306 L 87 322 L 77 318 L 76 284 Z" },
  ],
  "glutes-max": [
    { view: "back", d: "M 100 221 L 82 208 L 70 224 L 59 235 L 59 250 L 67 260 L 84 263 L 100 249 Z" },
  ],
  "glutes-med": [
    { view: "back", d: "M 77 193 L 82 208 L 70 224 L 59 235 L 64 214 L 71 199 Z" },
  ],
  "calves-gastroc": [
    { view: "front", d: "M 64 337 L 69 343 L 66 366 L 60 378 L 56 363 L 58 347 Z" },
    { view: "back", d: "M 64 337 L 72 341 L 75 357 L 70 376 L 62 379 L 58 365 L 58 348 Z" },
    { view: "back", d: "M 77 341 L 85 337 L 90 350 L 89 367 L 82 379 L 75 371 L 75 357 Z" },
  ],
  "calves-soleus": [
    { view: "back", d: "M 58 348 L 58 365 L 62 379 L 70 376 L 75 371 L 82 379 L 89 367 L 90 350 L 93 364 L 88 391 L 82 405 L 68 405 L 61 390 L 54 365 Z" },
  ],
  "abs-rectus": [
    { view: "front", d: "M 100 142 L 84 141 L 84 160 L 100 161 Z" },
    { view: "front", d: "M 100 161 L 84 160 L 84 178 L 100 180 Z" },
    { view: "front", d: "M 100 180 L 84 178 L 86 196 L 100 200 Z" },
    { view: "front", d: "M 100 200 L 86 196 L 89 213 L 100 222 Z" },
  ],
  "abs-obliques": [
    { view: "front", d: "M 69 128 L 75 140 L 84 141 L 84 178 L 86 196 L 89 213 L 74 201 L 77 181 L 73 157 Z" },
  ],
};

// Body-colored connective areas sit behind the muscle polygons. The untracked
// inner thigh and anterior shin retain a complete silhouette without pretending
// to be a head in the catalog.
export const BODY_PATHS: Record<BodyView, string[]> = {
  front: [
    "M 100 12 L 89 14 L 82 23 L 81 40 L 87 54 L 100 61 Z",
    "M 87 54 L 87 61 L 80 71 L 100 82 L 100 61 Z",
    "M 61 79 L 76 79 L 100 82 L 100 238 L 96 256 L 89 240 L 68 222 L 74 201 L 77 181 L 70 146 L 61 111 Z",
    "M 28 182 L 40 185 L 35 207 L 24 236 L 14 232 L 18 207 Z",
    "M 14 232 L 24 236 L 27 247 L 23 252 L 21 246 L 18 263 L 12 268 L 6 260 L 7 247 Z",
    "M 78 232 L 89 240 L 96 256 L 96 281 L 91 317 L 82 322 L 69 316 L 61 307 L 57 274 L 59 246 L 68 222 Z",
    "M 69 316 L 82 322 L 91 317 L 88 336 L 79 342 L 64 337 L 62 326 Z",
    "M 64 337 L 79 342 L 88 336 L 92 361 L 86 387 L 82 409 L 68 409 L 63 388 L 56 363 L 58 347 Z",
    "M 68 409 L 82 409 L 84 424 L 81 430 L 58 430 L 57 423 Z",
  ],
  back: [
    "M 100 12 L 89 14 L 82 23 L 81 40 L 87 54 L 100 61 Z",
    "M 87 54 L 87 61 L 80 71 L 100 82 L 100 61 Z",
    "M 61 79 L 78 92 L 100 104 L 100 249 L 92 254 L 67 260 L 59 250 L 59 235 L 64 214 L 71 199 L 77 181 L 70 146 L 61 111 Z",
    "M 28 182 L 40 185 L 35 207 L 24 236 L 14 232 L 18 207 Z",
    "M 14 232 L 24 236 L 27 247 L 23 252 L 21 246 L 18 263 L 12 268 L 6 260 L 7 247 Z",
    "M 64 253 L 77 261 L 92 254 L 96 273 L 92 306 L 87 322 L 77 318 L 72 319 L 62 316 L 57 276 L 59 257 Z",
    "M 62 316 L 72 319 L 77 318 L 87 322 L 88 336 L 77 341 L 72 341 L 64 337 L 62 326 Z",
    "M 64 337 L 77 341 L 85 337 L 90 350 L 93 364 L 88 391 L 82 409 L 68 409 L 61 390 L 54 365 L 58 348 Z",
    "M 68 409 L 82 409 L 84 424 L 81 430 L 58 430 L 57 423 Z",
  ],
};
