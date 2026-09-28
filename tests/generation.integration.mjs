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
const ids = ['machine-chest-press', 'machine-shoulder-press', 'cable-pushdown', 'cable-lateral-raise', 'pec-deck'];
const output = { title: 'Push', summary: 'A balanced session.', exercises: ids.map(exerciseId => ({exerciseId, sets:2, note:'Move with control.'})) };
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
  await t.test('invalid duration/focus and missing or malformed key do not charge attempts',()=>asUser(async s=>{
   for (const durationMin of [30,45,61]) assert.deepEqual(await generateWorkout({durationMin,focus:'auto'}),{ok:false,error:'Invalid input'});
   assert.equal((await generateWorkout({durationMin:60,focus:''})).ok,false);
   delete process.env.OPENAI_API_KEY;
   try { assert.deepEqual(await generateWorkout({durationMin:60,focus:'auto'}),{ok:false,error:'AI coach is not configured.'}); }
   finally { process.env.OPENAI_API_KEY='test-no-network'; }
   const malformedKeys=['fake-secret-value\nNEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/','fake-secret-value\u007f'];
   const logs=[];
   const log=t.mock.method(console,'error',(...args)=>logs.push(args));
   try { for(const key of malformedKeys) { process.env.OPENAI_API_KEY=key; assert.deepEqual(await generateWorkout({durationMin:60,focus:'auto'}),{ok:false,error:'AI coach is not configured.'}); } }
   finally { log.mock.restore(); process.env.OPENAI_API_KEY='test-no-network'; }
   assert.deepEqual(logs,[]);
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
   const fakeSecret='fake-provider-secret';
   s.generatePlan=async()=>{throw new Error(`Bearer ${fakeSecret}`);};
   const logs=[];
   const error = t.mock.method(console,'error',(...args)=>logs.push(args));
   try { assert.deepEqual(await generateWorkout({durationMin:60,focus:'push'}),retry); assert.equal(error.mock.callCount(),1); }
   finally {error.mock.restore();}
   assert.deepEqual(logs,[["Workout generation failed",{stage:"provider"}]]);
   assert.equal(JSON.stringify(logs).includes(fakeSecret),false);
   assert.equal(await prisma.planGeneration.count({where:{userId:s.userId}}),1);
  }));
  await t.test('duplicates, off-focus selections and missing muscle coverage fail',()=>asUser(async s=>{
   s.generatePlan=async()=>({...output,exercises:[...output.exercises.slice(0,4),output.exercises[0]]});
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'push'}),retry);
   s.generatePlan=async()=>output;
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'pull'}),retry);
   s.generatePlan=async()=>({...output,exercises:['machine-chest-press','pec-deck','incline-bench-press','cable-crossover'].map(exerciseId=>({exerciseId,sets:2,note:'Control.'}))});
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'push'}),retry);
  }));
  await t.test('set-and-rest timing rejects overflow, accepts exact fits, and leaves longer splits unpadded',()=>asUser(async s=>{
   const long = {...output,exercises:output.exercises.map(e=>({...e,sets:3}))}; // 81 minutes.
   s.generatePlan=async()=>long;
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'push'}),retry);
   const exact = {...output,exercises:output.exercises.map((e,i)=>({...e,sets:i===0?3:2}))}; // 60 minutes.
   s.generatePlan=async()=>exact;
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'push'}),{ok:true,data:{focus:'push',...exact}});
   s.generatePlan=async()=>output;
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'push'}),{ok:true,data:{focus:'push',...output}});
   assert.deepEqual(await generateWorkout({durationMin:90,focus:'push'}),retry); // Longer splits require three sets each.
   s.generatePlan=async()=>long;
   for(const durationMin of [90,120]) assert.deepEqual(await generateWorkout({durationMin,focus:'push'}),{ok:true,data:{focus:'push',...long}});
   s.generatePlan=async()=>({...long,exercises:long.exercises.map(e=>({...e,sets:4}))});
   assert.deepEqual(await generateWorkout({durationMin:120,focus:'push'}),retry);
   assert.equal(await prisma.planGeneration.count({where:{userId:s.userId}}),7);
   assert.equal(await prisma.workoutSession.count({where:{userId:s.userId}}),0);
  }));
  await t.test('missing or malformed profiles and insufficient candidates consume no attempts',()=>asUser(async s=>{
   await prisma.trainingProfile.delete({where:{userId:s.userId}});
   const missing={ok:false,error:'Complete your Training preferences before generating a workout.'};
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'auto'}),missing);
   await prisma.trainingProfile.create({data:{userId:s.userId,...profile,daysPerWeek:0}});
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'auto'}),missing);
   await prisma.trainingProfile.update({where:{userId:s.userId},data:{daysPerWeek:4,equipment:['barbell']}});
   const unavailable={ok:false,error:'Not enough exercises for this focus and equipment. Choose another focus or update Training preferences.'};
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'pull'}),unavailable);
   for (const equipment of [['dumbbell'],['cable'],['machine']]) {
    await prisma.trainingProfile.update({where:{userId:s.userId},data:{equipment}});
    const focus=equipment[0]==='dumbbell'?'push':'full_body';
    assert.deepEqual(await generateWorkout({durationMin:60,focus}),unavailable);
   }
   assert.equal(s.calls,0);
   assert.equal(await prisma.planGeneration.count({where:{userId:s.userId}}),0);
  }));
  await t.test('a beginner with no calibration gets full coverage; old counts, excess sets and unavailable equipment fail',()=>asUser(async s=>{
   await prisma.trainingProfile.update({where:{userId:s.userId},data:{experience:'beginner',daysPerWeek:3,sessionMinutes:45,equipment:['dumbbell']}});
   const exerciseIds=['incline-dumbbell-press','one-arm-dumbbell-row','dumbbell-shoulder-press','dumbbell-lateral-raise','incline-dumbbell-curl','hammer-curl','bulgarian-split-squat','dumbbell-romanian-deadlift'];
   const valid={...output,exercises:exerciseIds.map((exerciseId,i)=>({exerciseId,sets:i===4?2:1,note:'Control.'}))};
   assert.equal(await prisma.exerciseProgress.count({where:{userId:s.userId}}),0);
   s.generatePlan=async input=>{s.input=input;return valid;};
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'auto'}),{ok:true,data:{...valid,focus:'full_body'}});
   assert.equal(s.input.durationMin,60);
   assert.equal(s.input.context.profile.sessionMinutes,60); // Legacy saved preference is normalized.
   s.generatePlan=async()=>({...valid,exercises:valid.exercises.slice(0,3)});
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'auto'}),retry);
   s.generatePlan=async()=>({...valid,exercises:valid.exercises.map(e=>({...e,sets:3}))});
   assert.deepEqual(await generateWorkout({durationMin:120,focus:'auto'}),retry);
   s.generatePlan=async()=>({...valid,exercises:valid.exercises.map((e,i)=>i===0?{...e,exerciseId:'barbell-bench-press'}:e)});
   assert.deepEqual(await generateWorkout({durationMin:60,focus:'auto'}),retry);
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
