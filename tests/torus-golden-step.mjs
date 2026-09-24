import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {PHI,GOLDEN_CYCLE_SCALE} from '../js/constants.js';
import {TOURS} from '../js/tour-data.js';
const three=pathToFileURL(process.argv[2]).href,cache=new Map();
async function load(name){
 if(cache.has(name))return cache.get(name);
 let s=(await readFile(new URL(`../js/${name}.js`,import.meta.url),'utf8')).replaceAll("'three'",JSON.stringify(three));
 for(const m of [...s.matchAll(/'\.\/([\w-]+)\.js'/g)])s=s.replaceAll(m[0],JSON.stringify(await load(m[1])));
 const url='data:text/javascript;base64,'+Buffer.from(s).toString('base64');cache.set(name,url);return url;
}
const THREE=await import(three),{createGoldenScaleStep}=await import(await load('torus-golden-step'));
const {ORBIT_SEEDS,orbitPoint,spiralGuide,expansionAt}=await import(await load('torus-math'));
const parent=new THREE.Group(),step=createGoldenScaleStep(parent),root=step.group;
const near=(a,b,m,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${m}: ${a} / ${b}`);
const buffers=[];root.traverse(o=>{if(o.geometry)buffers.push(o.geometry);});
const count=root.children.length,axis=new THREE.Vector3(0,0,1);
for(const direction of [-1,1])for(const scale of [.2,1,PHI**4-.01])for(const angle of [0,.23,Math.PI/4,Math.PI/2,2.76]){
 const anchors=ORBIT_SEEDS.map(s=>orbitPoint(s,angle).map(x=>x*scale));
 step.update(true,.8,anchors,scale,direction);
 for(let i=0;i<8;i++)for(const turn of [1,2]){
  const source=new THREE.Vector3(...anchors[i]),marker=root.getObjectByName(`Vertex ${i} · phi^${turn}`);
  const expected=source.clone().applyAxisAngle(axis,direction*turn*Math.PI/2*ORBIT_SEEDS[i].side).multiplyScalar(PHI**(direction*turn));
  near(marker.position.distanceTo(expected),0,'Golden marks are actual future supports');
  near(marker.position.length()/source.length(),PHI**(direction*turn),'Each step has the exact golden ratio');
  const curve=root.getObjectByName(`Golden successor path ${i}`).geometry.attributes.position;
  near(new THREE.Vector3().fromBufferAttribute(curve,turn===1?191:383).distanceTo(marker.position),0,'Highlighted vertex lies on its displayed spiral');
  near(new THREE.Vector3().fromBufferAttribute(curve,0).distanceTo(source),0,'Path starts on the source vertex');
 }
 const outline=root.getObjectByName('Future golden hull'),points=outline.geometry.attributes.position;
 for(const source of anchors){
  const destination=new THREE.Vector3(...source).multiplyScalar(GOLDEN_CYCLE_SCALE**direction);
  const distances=Array.from({length:outline.geometry.drawRange.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(points,i).distanceTo(destination));
  near(Math.min(...distances),0,'Every source extreme has its golden counterpart on the future contour');
 }
 if(angle===0||angle===Math.PI/2)assert.equal(outline.geometry.drawRange.count,24,'Canonical successor has exactly twelve cube edges');
 const angleOffset=.31,scaleOffset=PHI**(.31/(Math.PI/2));
 const transformed=anchors.map((point,i)=>new THREE.Vector3(...point).applyAxisAngle(axis,ORBIT_SEEDS[i].side*angleOffset).multiplyScalar(scaleOffset).toArray());
 const before=root.getObjectByName('Vertex 7 · phi^2').position.clone();
 step.update(true,.8,transformed,scale*scaleOffset,direction);
 near(root.getObjectByName('Vertex 7 · phi^2').position.distanceTo(before.applyAxisAngle(axis,angleOffset).multiplyScalar(scaleOffset)),0,'The target follows the same ongoing growth and rotation');
}
assert.equal(root.children.length,count);const after=[];root.traverse(o=>{if(o.geometry)after.push(o.geometry);});assert.deepEqual(after,buffers,'Geometry buffers are bounded and reused');
for(const p of [0,1]){step.update(true,p,ORBIT_SEEDS.map(s=>s.point),1);root.traverse(o=>{if(o.material)assert.equal(o.material.opacity,0,'Chapter boundaries fade without a jump');});}
step.update(false,.5,[],1);assert.equal(root.visible,false);
const recipe=TOURS.torus.steps.find(s=>s.id==='torus-inscription').scene;assert.equal(recipe.torus,'golden-step');
for(const chapter of TOURS.torus.steps)if(chapter.scene.expansionFrom!==undefined)assert.equal(chapter.scene.expansionRatio,PHI);
for(const chapter of TOURS.merkaba.steps)if(chapter.scene.depth===2)near(chapter.scene.scale,1/GOLDEN_CYCLE_SCALE,'Nested Merkaba uses golden cycles');
for(const time of [-100,0,19,40,87,10000]){
 const f=expansionAt({expansionFrom:time,expansionDuration:0},0);
 assert.ok(f.scale>=1&&f.scale<PHI**4+1e-8);
 near(f.logScale,Math.log(f.scale)+f.units*Math.log(PHI**4),'Infinite growth rebases only in golden units');
}
console.log('PASS: phi and phi² supports on the actual spirals, enclosing successor hull, canonical cube, continuous motion, bounded buffers and golden recursion/rebasing');
