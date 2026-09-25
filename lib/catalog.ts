export const MUSCLE_GROUPS = [
  { id: "chest", name: "Chest", heads: ["chest-upper", "chest-middle", "chest-lower"] },
  { id: "back", name: "Back", heads: ["back-lats", "back-mid", "back-traps", "back-lower"] },
  { id: "shoulders", name: "Shoulders", heads: ["delts-front", "delts-side", "delts-rear"] },
  { id: "biceps", name: "Biceps", heads: ["biceps-long", "biceps-short", "brachialis"] },
  { id: "triceps", name: "Triceps", heads: ["triceps-long", "triceps-lateral", "triceps-medial"] },
  { id: "quads", name: "Quads", heads: ["quads-rectus", "quads-lateral", "quads-medial"] },
  { id: "hamstrings", name: "Hamstrings", heads: ["hams-outer", "hams-inner"] },
  { id: "glutes", name: "Glutes", heads: ["glutes-max", "glutes-med"] },
  { id: "calves", name: "Calves", heads: ["calves-gastroc", "calves-soleus"] },
  { id: "abs", name: "Abs", heads: ["abs-rectus", "abs-obliques"] },
] as const;

export type MuscleGroupId = (typeof MUSCLE_GROUPS)[number]["id"];
export type MuscleHeadId = (typeof MUSCLE_GROUPS)[number]["heads"][number];

export const MUSCLE_HEADS: Record<MuscleHeadId, { name: string; anatomy: string }> = {
  "chest-upper": { name: "Upper chest", anatomy: "Clavicular head of pectoralis major" },
  "chest-middle": { name: "Mid chest", anatomy: "Sternal head of pectoralis major" },
  "chest-lower": { name: "Lower chest", anatomy: "Costal (lower) fibers of pectoralis major" },
  "back-lats": { name: "Lats", anatomy: "Latissimus dorsi" },
  "back-mid": { name: "Mid back", anatomy: "Rhomboids and middle trapezius" },
  "back-traps": { name: "Upper traps", anatomy: "Upper trapezius" },
  "back-lower": { name: "Lower back", anatomy: "Erector spinae" },
  "delts-front": { name: "Front delt", anatomy: "Anterior deltoid" },
  "delts-side": { name: "Side delt", anatomy: "Lateral deltoid" },
  "delts-rear": { name: "Rear delt", anatomy: "Posterior deltoid" },
  "biceps-long": { name: "Biceps long head", anatomy: "Outer head of biceps brachii" },
  "biceps-short": { name: "Biceps short head", anatomy: "Inner head of biceps brachii" },
  brachialis: { name: "Brachialis", anatomy: "Elbow flexor under the biceps" },
  "triceps-long": { name: "Triceps long head", anatomy: "Inner/back head, crosses the shoulder" },
  "triceps-lateral": { name: "Triceps lateral head", anatomy: 'Outer head (the "horseshoe")' },
  "triceps-medial": { name: "Triceps medial head", anatomy: "Deep head near the elbow" },
  "quads-rectus": { name: "Rectus femoris", anatomy: "Middle of the thigh, crosses the hip" },
  "quads-lateral": { name: "Outer quad", anatomy: "Vastus lateralis" },
  "quads-medial": { name: "Teardrop", anatomy: "Vastus medialis" },
  "hams-outer": { name: "Outer hamstring", anatomy: "Biceps femoris" },
  "hams-inner": { name: "Inner hamstring", anatomy: "Semitendinosus and semimembranosus" },
  "glutes-max": { name: "Glute max", anatomy: "Gluteus maximus" },
  "glutes-med": { name: "Glute med", anatomy: "Gluteus medius" },
  "calves-gastroc": { name: "Gastrocnemius", anatomy: "Upper calf, two heads" },
  "calves-soleus": { name: "Soleus", anatomy: "Deep lower calf" },
  "abs-rectus": { name: "Abs", anatomy: "Rectus abdominis" },
  "abs-obliques": { name: "Obliques", anatomy: "External obliques" },
};

export type Equipment = "barbell" | "dumbbell" | "machine" | "cable";
export type Pattern = "push" | "pull" | "legs" | "core";

type ExerciseShape = {
  id: string;
  name: string;
  groupId: MuscleGroupId;
  equipment: Equipment;
  pattern: Pattern;
  compound: boolean;
  maxWeightKg: number;
  primary: readonly MuscleHeadId[];
  secondary: readonly MuscleHeadId[];
};

export const EXERCISES = [
  { id: "barbell-bench-press", name: "Barbell Bench Press", groupId: "chest", equipment: "barbell", pattern: "push", compound: true, maxWeightKg: 200, primary: ["chest-middle"], secondary: ["chest-upper", "delts-front", "triceps-lateral"] },
  { id: "incline-bench-press", name: "Incline Barbell Bench Press", groupId: "chest", equipment: "barbell", pattern: "push", compound: true, maxWeightKg: 160, primary: ["chest-upper"], secondary: ["chest-middle", "delts-front", "triceps-lateral"] },
  { id: "incline-dumbbell-press", name: "Incline Dumbbell Press", groupId: "chest", equipment: "dumbbell", pattern: "push", compound: true, maxWeightKg: 60, primary: ["chest-upper"], secondary: ["chest-middle", "delts-front"] },
  { id: "machine-chest-press", name: "Chest Press", groupId: "chest", equipment: "machine", pattern: "push", compound: true, maxWeightKg: 200, primary: ["chest-middle"], secondary: ["chest-lower", "delts-front", "triceps-lateral"] },
  { id: "wide-chest-press", name: "Wide Chest Press", groupId: "chest", equipment: "machine", pattern: "push", compound: true, maxWeightKg: 200, primary: ["chest-middle", "chest-lower"], secondary: ["delts-front"] },
  { id: "pec-deck", name: "Pec Deck Fly", groupId: "chest", equipment: "machine", pattern: "push", compound: false, maxWeightKg: 120, primary: ["chest-middle"], secondary: ["chest-upper", "chest-lower"] },
  { id: "cable-crossover", name: "Cable Crossover (High to Low)", groupId: "chest", equipment: "cable", pattern: "push", compound: false, maxWeightKg: 50, primary: ["chest-lower"], secondary: ["chest-middle"] },

  { id: "lat-pulldown", name: "Lat Pulldown", groupId: "back", equipment: "cable", pattern: "pull", compound: true, maxWeightKg: 150, primary: ["back-lats"], secondary: ["back-mid", "biceps-short"] },
  { id: "seated-cable-row", name: "Seated Cable Row", groupId: "back", equipment: "cable", pattern: "pull", compound: true, maxWeightKg: 150, primary: ["back-mid"], secondary: ["back-lats", "delts-rear", "biceps-long"] },
  { id: "barbell-row", name: "Barbell Row", groupId: "back", equipment: "barbell", pattern: "pull", compound: true, maxWeightKg: 160, primary: ["back-mid", "back-lats"], secondary: ["delts-rear", "back-lower"] },
  { id: "one-arm-dumbbell-row", name: "One-Arm Dumbbell Row", groupId: "back", equipment: "dumbbell", pattern: "pull", compound: true, maxWeightKg: 80, primary: ["back-lats"], secondary: ["back-mid", "delts-rear"] },
  { id: "straight-arm-pulldown", name: "Straight-Arm Pulldown", groupId: "back", equipment: "cable", pattern: "pull", compound: false, maxWeightKg: 60, primary: ["back-lats"], secondary: ["triceps-long"] },
  { id: "dumbbell-shrug", name: "Dumbbell Shrug", groupId: "back", equipment: "dumbbell", pattern: "pull", compound: false, maxWeightKg: 80, primary: ["back-traps"], secondary: [] },
  { id: "back-extension", name: "Back Extension", groupId: "back", equipment: "machine", pattern: "pull", compound: false, maxWeightKg: 120, primary: ["back-lower"], secondary: ["glutes-max", "hams-inner"] },

  { id: "overhead-press", name: "Barbell Overhead Press", groupId: "shoulders", equipment: "barbell", pattern: "push", compound: true, maxWeightKg: 120, primary: ["delts-front"], secondary: ["delts-side", "triceps-lateral"] },
  { id: "dumbbell-shoulder-press", name: "Seated Dumbbell Shoulder Press", groupId: "shoulders", equipment: "dumbbell", pattern: "push", compound: true, maxWeightKg: 50, primary: ["delts-front"], secondary: ["delts-side", "triceps-lateral"] },
  { id: "machine-shoulder-press", name: "Shoulder Press", groupId: "shoulders", equipment: "machine", pattern: "push", compound: true, maxWeightKg: 150, primary: ["delts-front"], secondary: ["delts-side", "triceps-medial"] },
  { id: "dumbbell-lateral-raise", name: "Dumbbell Lateral Raise", groupId: "shoulders", equipment: "dumbbell", pattern: "push", compound: false, maxWeightKg: 25, primary: ["delts-side"], secondary: ["back-traps"] },
  { id: "cable-lateral-raise", name: "Cable Lateral Raise", groupId: "shoulders", equipment: "cable", pattern: "push", compound: false, maxWeightKg: 25, primary: ["delts-side"], secondary: [] },
  { id: "reverse-pec-deck", name: "Reverse Pec Deck", groupId: "shoulders", equipment: "machine", pattern: "pull", compound: false, maxWeightKg: 80, primary: ["delts-rear"], secondary: ["back-mid"] },
  { id: "face-pull", name: "Face Pull", groupId: "shoulders", equipment: "cable", pattern: "pull", compound: false, maxWeightKg: 60, primary: ["delts-rear"], secondary: ["back-mid", "back-traps"] },

  { id: "barbell-curl", name: "Barbell Curl", groupId: "biceps", equipment: "barbell", pattern: "pull", compound: false, maxWeightKg: 80, primary: ["biceps-long", "biceps-short"], secondary: ["brachialis"] },
  { id: "incline-dumbbell-curl", name: "Incline Dumbbell Curl", groupId: "biceps", equipment: "dumbbell", pattern: "pull", compound: false, maxWeightKg: 30, primary: ["biceps-long"], secondary: ["biceps-short"] },
  { id: "preacher-curl", name: "Preacher Curl", groupId: "biceps", equipment: "machine", pattern: "pull", compound: false, maxWeightKg: 80, primary: ["biceps-short"], secondary: ["brachialis"] },
  { id: "hammer-curl", name: "Hammer Curl", groupId: "biceps", equipment: "dumbbell", pattern: "pull", compound: false, maxWeightKg: 40, primary: ["brachialis"], secondary: ["biceps-long"] },
  { id: "cable-curl", name: "Cable Curl", groupId: "biceps", equipment: "cable", pattern: "pull", compound: false, maxWeightKg: 80, primary: ["biceps-short", "biceps-long"], secondary: ["brachialis"] },

  { id: "cable-pushdown", name: "Cable Pushdown", groupId: "triceps", equipment: "cable", pattern: "push", compound: false, maxWeightKg: 100, primary: ["triceps-lateral", "triceps-medial"], secondary: [] },
  { id: "overhead-cable-extension", name: "Overhead Cable Extension", groupId: "triceps", equipment: "cable", pattern: "push", compound: false, maxWeightKg: 80, primary: ["triceps-long"], secondary: ["triceps-medial"] },
  { id: "ez-bar-skull-crusher", name: "EZ-Bar Skull Crusher", groupId: "triceps", equipment: "barbell", pattern: "push", compound: false, maxWeightKg: 80, primary: ["triceps-long", "triceps-medial"], secondary: ["triceps-lateral"] },
  { id: "close-grip-bench-press", name: "Close-Grip Bench Press", groupId: "triceps", equipment: "barbell", pattern: "push", compound: true, maxWeightKg: 180, primary: ["triceps-lateral", "triceps-medial"], secondary: ["chest-middle", "delts-front"] },
  { id: "seated-dip-machine", name: "Seated Dip", groupId: "triceps", equipment: "machine", pattern: "push", compound: true, maxWeightKg: 200, primary: ["triceps-lateral", "triceps-medial"], secondary: ["triceps-long", "chest-lower"] },

  { id: "barbell-back-squat", name: "Barbell Back Squat", groupId: "quads", equipment: "barbell", pattern: "legs", compound: true, maxWeightKg: 250, primary: ["quads-lateral", "quads-medial"], secondary: ["quads-rectus", "glutes-max", "back-lower"] },
  { id: "leg-press", name: "Leg Press", groupId: "quads", equipment: "machine", pattern: "legs", compound: true, maxWeightKg: 600, primary: ["quads-lateral", "quads-medial"], secondary: ["glutes-max"] },
  { id: "hack-squat", name: "Hack Squat", groupId: "quads", equipment: "machine", pattern: "legs", compound: true, maxWeightKg: 300, primary: ["quads-lateral", "quads-medial"], secondary: ["quads-rectus", "glutes-max"] },
  { id: "leg-extension", name: "Leg Extension", groupId: "quads", equipment: "machine", pattern: "legs", compound: false, maxWeightKg: 150, primary: ["quads-rectus"], secondary: ["quads-lateral", "quads-medial"] },
  { id: "bulgarian-split-squat", name: "Dumbbell Bulgarian Split Squat", groupId: "quads", equipment: "dumbbell", pattern: "legs", compound: true, maxWeightKg: 60, primary: ["quads-medial", "glutes-max"], secondary: ["quads-lateral", "glutes-med"] },

  { id: "romanian-deadlift", name: "Romanian Deadlift", groupId: "hamstrings", equipment: "barbell", pattern: "legs", compound: true, maxWeightKg: 250, primary: ["hams-outer", "hams-inner"], secondary: ["glutes-max", "back-lower"] },
  { id: "dumbbell-romanian-deadlift", name: "Dumbbell Romanian Deadlift", groupId: "hamstrings", equipment: "dumbbell", pattern: "legs", compound: true, maxWeightKg: 80, primary: ["hams-outer", "hams-inner"], secondary: ["glutes-max"] },
  { id: "lying-leg-curl", name: "Lying Leg Curl", groupId: "hamstrings", equipment: "machine", pattern: "legs", compound: false, maxWeightKg: 100, primary: ["hams-outer"], secondary: ["hams-inner", "calves-gastroc"] },
  { id: "seated-leg-curl", name: "Seated Leg Curl", groupId: "hamstrings", equipment: "machine", pattern: "legs", compound: false, maxWeightKg: 120, primary: ["hams-inner"], secondary: ["hams-outer"] },

  { id: "barbell-hip-thrust", name: "Barbell Hip Thrust", groupId: "glutes", equipment: "barbell", pattern: "legs", compound: true, maxWeightKg: 350, primary: ["glutes-max"], secondary: ["hams-outer", "glutes-med"] },
  { id: "dumbbell-walking-lunge", name: "Dumbbell Walking Lunge", groupId: "glutes", equipment: "dumbbell", pattern: "legs", compound: true, maxWeightKg: 50, primary: ["glutes-max"], secondary: ["quads-lateral", "quads-medial", "hams-inner"] },
  { id: "cable-glute-kickback", name: "Cable Glute Kickback", groupId: "glutes", equipment: "cable", pattern: "legs", compound: false, maxWeightKg: 60, primary: ["glutes-max"], secondary: ["glutes-med", "hams-outer"] },
  { id: "hip-abduction-machine", name: "Hip Abduction", groupId: "glutes", equipment: "machine", pattern: "legs", compound: false, maxWeightKg: 150, primary: ["glutes-med"], secondary: [] },

  { id: "standing-calf-raise", name: "Standing Calf Raise", groupId: "calves", equipment: "machine", pattern: "legs", compound: false, maxWeightKg: 250, primary: ["calves-gastroc"], secondary: ["calves-soleus"] },
  { id: "seated-calf-raise", name: "Seated Calf Raise", groupId: "calves", equipment: "machine", pattern: "legs", compound: false, maxWeightKg: 150, primary: ["calves-soleus"], secondary: ["calves-gastroc"] },
  { id: "leg-press-calf-raise", name: "Leg Press Calf Raise", groupId: "calves", equipment: "machine", pattern: "legs", compound: false, maxWeightKg: 400, primary: ["calves-gastroc"], secondary: ["calves-soleus"] },

  { id: "cable-crunch", name: "Cable Crunch", groupId: "abs", equipment: "cable", pattern: "core", compound: false, maxWeightKg: 100, primary: ["abs-rectus"], secondary: ["abs-obliques"] },
  { id: "machine-crunch", name: "Ab Crunch Machine", groupId: "abs", equipment: "machine", pattern: "core", compound: false, maxWeightKg: 120, primary: ["abs-rectus"], secondary: [] },
  { id: "cable-woodchopper", name: "Cable Woodchopper", groupId: "abs", equipment: "cable", pattern: "core", compound: false, maxWeightKg: 60, primary: ["abs-obliques"], secondary: ["abs-rectus"] },
] as const satisfies readonly ExerciseShape[];

export type Exercise = (typeof EXERCISES)[number];
export type ExerciseId = Exercise["id"];

export const DEFAULT_STEP_KG: Record<Equipment, number> = {
  barbell: 2.5,
  dumbbell: 2,
  machine: 5,
  cable: 2.5,
};

export function getGroup(id: string) {
  return MUSCLE_GROUPS.find((group) => group.id === id);
}

export function getExercise(id: string) {
  return EXERCISES.find((exercise) => exercise.id === id);
}

export function getExercisesByGroup(groupId: MuscleGroupId): Exercise[];
export function getExercisesByGroup(groupId: string): Exercise[] | undefined;
export function getExercisesByGroup(groupId: string) {
  if (!getGroup(groupId)) return undefined;
  return EXERCISES.filter((exercise) => exercise.groupId === groupId);
}
