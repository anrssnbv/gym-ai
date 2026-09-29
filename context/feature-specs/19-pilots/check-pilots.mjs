import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {pilotRegions} from './regions.mjs';

assert.deepEqual(Object.keys(pilotRegions).sort(), ['back-traps','back-mid','back-lats','back-lower','chest-upper','chest-middle','chest-lower','delts-front','delts-side','delts-rear'].sort());
for(const paths of Object.values(pilotRegions)) for(const {view,d} of paths){
  assert.ok(view==='front'||view==='back');
  assert.match(d,/^M .* Z$/);
  const coordinates=d.match(/\d+/g).map(Number);
  assert.equal(coordinates.length%2,0);
  coordinates.forEach((n,i)=>assert.ok(n>=0&&n<=(i%2?1920:960)));
}
for(const view of ['front','back']){
  const file=new URL(`../../../public/muscle-maps/${view}.webp`,import.meta.url);
  const {width,height,format}=await sharp(fileURLToPath(file)).metadata();
  assert.deepEqual([width,height,format],[960,1920,'webp']);
  assert.ok((await stat(file)).size<=160*1024);
}
console.log('Both anatomy assets and all 10 pilot muscle-head registrations pass.');
