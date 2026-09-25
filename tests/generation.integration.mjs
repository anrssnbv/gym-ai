// Real PostgreSQL and action code; stub only authentication, cache and the paid AI call.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { actionContext } from './action-context.mjs';
const root = new URL('../', import.meta.url);
const environment = new URL('.env.local', root);
if (existsSync(environment)) process.loadEnvFile(fileURLToPath(environment));
const aiStub = 'data:text/javascript,' + encodeURIComponent(`import { actionContext } from ${JSON.stringify(new URL('./action-context.mjs', import.meta.url).href)}; export async function generatePlan(input) { return actionContext.getStore().generatePlan(input); }`);
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/ai') return { url: aiStub, shortCircuit: true };
  if (specifier === '@/lib/auth' || specifier === 'next/cache') return { url: new URL('./action-context.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith('@/')) return nextResolve(new URL(`${specifier.slice(2)}.ts`, root).href, context);
  return nextResolve(specifier, context);
}});
const { generateWorkout } = await import('../actions/workout.ts');
const { prisma } = await import('../lib/prisma.ts');
const ids = ['barbell-bench-press', 'incline-bench-press', 'machine-chest-press'];
const output = { title: 'Push', summary: 'A balanced session.', exercises: ids.map(exerciseId => ({exerciseId, sets:3, note:'Move with control.'})) };
const limit = {ok:false,error:'Daily limit reached (10 plans). Try again tomorrow.'};
const retry = {ok:false,error:"Couldn't generate a workout. Try again."};
const profile = { goal: "build_muscle", experience: "experienced", daysPerWeek: 4, sessionMinutes: 60, equipment: ["barbell", "dumbbell", "machine", "cable"] };
const users = [];
function asUser(run) {
  const state = {userId:`spec14-generation-${randomUUID()}`, invalidations:[], calls:0, generatePlan:async(input)=>{state.calls++;state.input=input;return structuredClone(output);}};
  users.push(state.userId);
  return actionContext.run(state,async()=>{ await prisma.trainingProfile.create({data:{userId:state.userId,...profile}}); return run(state); });
}
test('generation action guards and quota against PostgreSQL', async(t)=>{
 const originalKey = process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY = 'test-no-network';
 try {
  await t.test('auth precedes input validation',()=>assert.rejects(()=>generateWorkout(null),/Integration action needs a test user/));
  await t.test('invalid duration/focus and missing key do not charge attempts',()=>asUser(async s=>{
   assert.equal((await generateWorkout({durationMin:61,focus:'auto'})).ok,false);
   assert.equal((await generateWorkout({durationMin:60,focus:''})).ok,false);
   delete process.env.OPENAI_API_KEY;
   try { assert.deepEqual(await generateWorkout({durationMin:60,focus:'auto'}),{ok:false,error:'AI coach is not configured.'}); }
   finally { process.env.OPENAI_API_KEY='test-no-network'; }
   assert.equal(await prisma.planGeneration.count({where:{userId:s.userId}}),0);
   assert.equal(s.calls,0);
  }));
  await t.test('auto resolves, attempt is charged, preview never writes a session or invalidates',()=>asUser(async s=>{
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'auto'}),{ok:true,data:{focus:'push',...output}});
   assert.equal(s.input.focus,'push'); assert.equal(s.calls,1);
   assert.equal(await prisma.planGeneration.count({where:{userId:s.userId}}),1);
   assert.equal(await prisma.workoutSession.count({where:{userId:s.userId}}),0);
   assert.deepEqual(s.invalidations,[]);
  }));
  await t.test('failed AI calls remain charged and produce retryable errors',()=>asUser(async s=>{
   s.generatePlan=async()=>{throw new Error('simulated provider failure');};
   const error = t.mock.method(console,'error',()=>{});
   try { assert.deepEqual(await generateWorkout({durationMin:60,focus:'push'}),retry); assert.equal(error.mock.callCount(),1); }
   finally {error.mock.restore();}
   assert.equal(await prisma.planGeneration.count({where:{userId:s.userId}}),1);
  }));
  await t.test('duplicates below three, off-focus plans, and too many new exercises fail',()=>asUser(async s=>{
   s.generatePlan=async()=>({...output,exercises:[output.exercises[0],output.exercises[0],output.exercises[1]]});
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'push'}),retry);
   s.generatePlan=async()=>output;
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'pull'}),retry);
   s.generatePlan=async()=>({...output,exercises:[...output.exercises,{exerciseId:'incline-dumbbell-press',sets:3,note:'Control.'}]});
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'push'}),retry);
  }));
  await t.test('a 32-minute plan fails a 30-minute request; exact-fit, shorter and deduplicated plans pass',()=>asUser(async s=>{
   const long = {...output,exercises:output.exercises.map(e=>({...e,sets:5}))};
   s.generatePlan=async()=>long;
   assert.deepEqual(await generateWorkout({durationMin:30,focus:'push'}),retry);
   const exact = {...long,exercises:long.exercises.map((e,i)=>({...e,sets:i===0?4:5}))};
   s.generatePlan=async()=>exact;
   assert.deepEqual(await generateWorkout({durationMin:30,focus:'push'}),{ok:true,data:{focus:'push',...exact}});
   s.generatePlan=async()=>({...exact,exercises:[...exact.exercises,exact.exercises[0]]});
   assert.deepEqual(await generateWorkout({durationMin:30,focus:'push'}),{ok:true,data:{focus:'push',...exact}});
   s.generatePlan=async()=>output;
   assert.deepEqual(await generateWorkout({durationMin:30,focus:'push'}),{ok:true,data:{focus:'push',...output}});
   assert.equal(await prisma.planGeneration.count({where:{userId:s.userId}}),4);
   assert.equal(await prisma.workoutSession.count({where:{userId:s.userId}}),0);
  }));
  await t.test('missing or malformed profiles and insufficient candidates consume no attempts',()=>asUser(async s=>{
   await prisma.trainingProfile.delete({where:{userId:s.userId}});
   const missing={ok:false,error:'Complete your Training preferences before generating a workout.'};
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'auto'}),missing);
   await prisma.trainingProfile.create({data:{userId:s.userId,...profile,daysPerWeek:0}});
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'auto'}),missing);
   await prisma.trainingProfile.update({where:{userId:s.userId},data:{daysPerWeek:4,equipment:['barbell']}});
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'pull'}),{ok:false,error:'Not enough exercises for this focus and equipment. Choose another focus or update Training preferences.'});
   assert.equal(s.calls,0);
   assert.equal(await prisma.planGeneration.count({where:{userId:s.userId}}),0);
  }));
  await t.test('beginner output limits and equipment are enforced even for a mocked provider',()=>asUser(async s=>{
   const {candidateExercises}=await import('../lib/plan.ts');
   await prisma.trainingProfile.update({where:{userId:s.userId},data:{experience:'beginner',daysPerWeek:3,sessionMinutes:90,equipment:['dumbbell']}});
   const candidates=candidateExercises('full_body',['dumbbell']);
   const valid={...output,exercises:candidates.slice(0,3).map(e=>({exerciseId:e.id,sets:3,note:'Control.'}))};
   await prisma.exerciseProgress.createMany({data:['barbell-bench-press','lat-pulldown'].map(exerciseId=>({userId:s.userId,exerciseId,weightKg:10,startWeightKg:10,stepKg:2.5}))});
   s.generatePlan=async input=>{s.input=input;return valid;};
   assert.deepEqual(await generateWorkout({durationMin:30,focus:'auto'}),{ok:true,data:{...valid,focus:'full_body'}});
   assert.equal(s.input.durationMin,30);
   s.generatePlan=async()=>({...valid,exercises:valid.exercises.map(e=>({...e,sets:4}))});
   assert.deepEqual(await generateWorkout({durationMin:90,focus:'auto'}),retry);
   await prisma.exerciseProgress.createMany({data:candidates.slice(0,5).map(e=>({userId:s.userId,exerciseId:e.id,weightKg:10,startWeightKg:10,stepKg:2.5}))});
   s.generatePlan=async()=>({...valid,exercises:candidates.slice(0,5).map(e=>({exerciseId:e.id,sets:1,note:'Control.'}))});
   assert.deepEqual(await generateWorkout({durationMin:90,focus:'auto'}),retry);
   s.generatePlan=async()=>output;
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'push'}),retry);
  }));
  await t.test('rolling limit ignores old attempts and isolates other users; concurrent last slot admits one',()=>asUser(async s=>{
   await prisma.planGeneration.createMany({data:[...Array.from({length:9},()=>({userId:s.userId})),{userId:s.userId,createdAt:new Date(Date.now()-24*60*60*1000-1000)},...Array.from({length:10},()=>({userId:users[0]}))]});
   const results=await Promise.all([generateWorkout({durationMin:60,focus:'push'}),generateWorkout({durationMin:60,focus:'push'})]);
   assert.equal(results.filter(r=>r.ok).length,1);
   assert.deepEqual(results.find(r=>!r.ok),limit);
   assert.equal(s.calls,1);
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'push'}),limit);
   assert.equal(await prisma.planGeneration.count({where:{userId:s.userId}}),11);
  }));
 } finally {
  if(originalKey===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=originalKey;
  await prisma.planGeneration.deleteMany({where:{userId:{in:users}}});
  await prisma.trainingProfile.deleteMany({where:{userId:{in:users}}});
  await prisma.exerciseProgress.deleteMany({where:{userId:{in:users}}});
  await prisma.$disconnect();
 }
});
