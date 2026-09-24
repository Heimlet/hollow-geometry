import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64'),cache=new Map();
async function load(name){
 if(cache.has(name))return cache.get(name);
 let s=name==='scene'?`import * as THREE from 'three';export const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),controls={target:new THREE.Vector3(),update(){}};export function setViewHeight(){}`:await readFile(new URL(`../js/${name}.js`,import.meta.url),'utf8');
 s=s.replaceAll("'three'",JSON.stringify(three));
 for(const m of [...s.matchAll(/'\.\/([\w-]+)\.js'/g)])s=s.replaceAll(m[0],JSON.stringify(await load(m[1])));
 const result=url(s);cache.set(name,result);return result;
}
const THREE=await import(three),{actions,getState,reduce,initialState}=await import(await load('state'));
const {TOURS,tourStep}=await import(await load('tour-data')),{tourProgress}=await import(await load('tour-state'));
const {levels}=await import(await load('levels')),{updateLab,derivedObjects}=await import(await load('lab'));
const {applyTourReference}=await import(await load('tour-reference'));
const {torusReferenceYaw,expansionAt,TORUS}=await import(await load('torus-math'));
const {merkabaAnchors,cubeHalfHeight}=await import(await load('torus-witness')),{createTorusScene}=await import(await load('torus-scene'));
const near=(a,b,message,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${message}: ${a} vs ${b}`);
const vertical=new THREE.Vector3(0,1,0),frame=state=>torusReferenceYaw(tourStep(state).scene,tourProgress(state),state.lab.rotation.up);
const index=TOURS.torus.steps.findIndex(s=>s.id==='torus-pair'),recipe=TOURS.torus.steps[index].scene;
const capture=t=>torusReferenceYaw(recipe,t/recipe.expansionDuration,recipe.referenceFrame.start+9*t);
near(capture(0),0,'Observer starts at the old orientation');
near(capture(.0001)/.0001,0,'Observer starts without an angular-velocity jump');
near((capture(4.0001)-capture(4))/ .0001,Math.PI/20,'Capture joins the original angular velocity');
near((capture(4)-capture(3.9999))/ .0001,Math.PI/20,'Capture ends smoothly');
const fixedBlue=new THREE.Quaternion().setFromAxisAngle(vertical,-recipe.referenceFrame.anchor*Math.PI/180);
const testScene=new THREE.Scene(),torus=createTorusScene(testScene),root=testScene.children[0];
const sourcePoints=o=>{const attr=o.geometry.attributes.position;return Array.from({length:Math.min(attr.count,24)},(_,i)=>new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld));};
const overlayMatrices=()=>{root.updateMatrixWorld(true);const result=new Map();root.traverse(o=>{if(o.geometry)result.set(o,o.matrixWorld.clone());});return result;};
let tested=0;
for(let chapter=index;chapter<TOURS.torus.steps.length;chapter++)for(const progress of [0,.05,.25,.27,.5,.64,.75,.99,1]){
 actions.startTour('torus',chapter);actions.seekTour(tourStep(getState()).seconds*progress);
 const state=getState(),r=tourStep(state).scene,e=expansionAt(r,tourProgress(state),state.tour.motion),yaw=frame(state),q=new THREE.Quaternion().setFromAxisAngle(vertical,yaw),matrix=new THREE.Matrix4().makeRotationFromQuaternion(q);
 applyTourReference(levels,derivedObjects,0,true);updateLab(0);
 for(const level of levels){level.group.scale.setScalar(e.scale);level.group.updateMatrixWorld(true);}
 for(const owner of derivedObjects){owner.object.group.scale.setScalar(e.scale);owner.object.group.updateMatrixWorld(true);}
 const objects=[...Object.values(levels[0].objs).map(o=>o.mesh),...derivedObjects.filter(o=>o.object.vis).map(o=>o.object.mesh)];
 const original=new Map(objects.map(o=>[o,sourcePoints(o)])),source=derivedObjects.find(o=>o.kind==='intersection'&&o.level===0).object;
 const options={rotation:state.lab.rotation.up*Math.PI/180,startRotation:r.rotationFrom*Math.PI/180,scale:e.scale,expansion:e,anchors:merkabaAnchors(levels[0]),cubeHalfHeight:cubeHalfHeight(levels[0]),intersectionSource:source};
 torus.update(r.torus,progress,0,options);const originalOverlay=overlayMatrices();
 applyTourReference(levels,derivedObjects,yaw,true);
 for(const o of objects)sourcePoints(o).forEach((p,i)=>near(p.distanceTo(original.get(o)[i].clone().applyQuaternion(q)),0,'Source and derived meshes share exactly one rigid frame change'));
 if(!r.referenceFrame.enter||r.expansionDuration*progress>=4)near(levels[0].objs.merkaba_down.group.getWorldQuaternion(new THREE.Quaternion()).angleTo(fixedBlue),0,'Blue orientation is constant, including across chapters');
 const anchors=merkabaAnchors(levels[0]);
 if(r.hullOutline){
  const outline=derivedObjects.find(o=>o.kind==='hull'&&o.level===0),inverse=outline.object.group.matrixWorld.clone().invert();
  assert.equal(state.objects.cube.visible,false,'The misleading independent cube is absent in close views');
  for(const p of anchors){
   const local=new THREE.Vector3(p[0],p[2],-p[1]).applyMatrix4(inverse);
   const distances=outline.data.faces.map(face=>face.normal.dot(local)-face.constant);
   assert.ok(distances.every(d=>d<1e-5),'Every real source vertex lies inside the displayed hull, including after observer capture');
   near(Math.min(...distances.map(Math.abs)),0,'Every support touches the enclosing contour',1e-5);
  }
  near(Math.max(...anchors.map(p=>p[2]))-Math.min(...anchors.map(p=>p[2])),2*cubeHalfHeight(levels[0]),'The corrected contour preserves the cube-defined height used by the torus',1e-5);
  if(Math.abs(Math.sin(2*state.lab.rotation.up*Math.PI/180))<1e-8){
   assert.equal(outline.data.vertices.length,8,'At alignment all eight cube corners are present');
   assert.equal(outline.data.faces.length,6,'At alignment the hull is a cube with six square faces');
   assert.ok(outline.data.faces.every(f=>f.indices.length===4));
  }
 }
 torus.update(r.torus,progress,0,{...options,anchors,referenceYaw:yaw});root.updateMatrixWorld(true);
 for(const [o,m]of originalOverlay){const expected=matrix.clone().multiply(m);o.matrixWorld.elements.forEach((x,i)=>near(x,expected.elements[i],'Spirals, construction cubes, surfaces and marks keep the same relative transforms',2e-5));}
 const surface=root.getObjectByName('Inner torus · intersection').children.find(o=>o.isMesh),inverse=surface.matrixWorld.clone().invert();
 const heads=root.getObjectByName('Actual tetrahedron vertex orbits').children.filter(o=>o.isMesh);
 for(const [i,p]of anchors.entries()){
  const world=new THREE.Vector3(p[0],p[2],-p[1]),local=world.clone().applyMatrix4(inverse);
  near(heads[i].getWorldPosition(new THREE.Vector3()).distanceTo(world),0,'Visible support stays on the actual transformed tetrahedron vertex');
  near(((Math.hypot(local.x,local.y)-TORUS.major)/TORUS.tube)**2+(local.z/TORUS.height)**2,1,'Vertex remains on the rendered torus');
 }
 tested++;
}
// Reversal, pause, automatic handoffs and long-running render-unit changes must
// leave blue fixed. Growth is still phi per half-turn between the two bodies.
let state=reduce(initialState(),{type:'tour/start',id:'torus',index:index+1});
const blue=s=>new THREE.Quaternion().setFromAxisAngle(vertical,s.lab.rotation.down*Math.PI/180+frame(s));
const before=state,e0=expansionAt(tourStep(state).scene,tourProgress(state),state.tour.motion);
state=reduce(state,{type:'tour/tick',seconds:10});const e1=expansionAt(tourStep(state).scene,tourProgress(state),state.tour.motion);
near((state.lab.rotation.up-before.lab.rotation.up)*Math.PI/180+frame(state)-frame(before),Math.PI,'Pink moves half a turn relative to blue');
near(Math.exp(e1.logScale-e0.logScale),(1+Math.sqrt(5))/2,'The original golden growth rate stays intact');
state=reduce(state,{type:'tour/reverse'});near(frame(state),frame(reduce(state,{type:'tour/reverse'})),'Reversal changes velocity only');
state=reduce(state,{type:'tour/tick',seconds:10});near(frame(state),frame(before),'Reverse retraces the same observer pose');
for(let tick=0;tick<240;tick++){state=reduce(state,{type:'tour/tick',seconds:10});near(blue(state).angleTo(fixedBlue),0,'Blue stays fixed through reverse, chapter boundaries and endless unit rebasing');}
const paused=reduce(state,{type:'tour/control',patch:{playing:false}});assert.equal(reduce(paused,{type:'tour/tick',seconds:10}),paused);
// Both Merkaba rotation chapters use the same vertical observer frame, without the finale's scale
// growth. Check real source meshes and recalculated layers, including seeking.
const merkabaChapter=TOURS.merkaba.steps[7];
near(merkabaChapter.seconds*2*merkabaChapter.scene.counterSpeed,360,'The relative turn ends exactly at the canonical pair');
for(const chapter of [7,8])for(const elapsed of [0,1,5,10,15,19.99,20,5]){
 actions.startTour('merkaba',chapter);actions.seekTour(elapsed);
 const s=getState();assert.equal(s.lab.rotation.upAxis,'y');assert.equal(s.lab.rotation.downAxis,'y');
 applyTourReference(levels,derivedObjects,0,true);
 for(const level of levels){level.group.scale.setScalar(1);level.group.updateMatrixWorld(true);}
 for(const owner of derivedObjects){owner.object.group.scale.setScalar(1);owner.object.group.updateMatrixWorld(true);}
 updateLab(0);
 const objects=[levels[0].objs.merkaba_up.mesh,levels[0].objs.merkaba_down.mesh,...derivedObjects.filter(o=>o.object.vis).map(o=>o.object.mesh)];
 const before=new Map(objects.map(o=>[o,sourcePoints(o)])),yaw=frame(s),q=new THREE.Quaternion().setFromAxisAngle(vertical,yaw);
 applyTourReference(levels,derivedObjects,yaw,!!tourStep(s).scene.referenceFrame);
 near(levels[0].objs.merkaba_down.group.getWorldQuaternion(new THREE.Quaternion()).angleTo(new THREE.Quaternion()),0,'Merkaba chapter keeps blue fixed');
 near(levels[0].objs.merkaba_up.group.getWorldQuaternion(new THREE.Quaternion()).angleTo(new THREE.Quaternion().setFromAxisAngle(vertical,elapsed*18*Math.PI/180)),0,'Pink turns at the same relative speed and around the same axis as the torus finale');
 for(const o of objects)sourcePoints(o).forEach((p,i)=>near(p.distanceTo(before.get(o)[i].clone().applyQuaternion(q)),0,'Merkaba hull and intersection follow the same frame as both source bodies'));
 near(cubeHalfHeight(levels[0]),TORUS.height,'Observer motion does not introduce scale growth');
 if(elapsed===20){
  assert.equal(derivedObjects.find(o=>o.level===0&&o.kind==='hull').data.vertices.length,8);
  assert.equal(derivedObjects.find(o=>o.level===0&&o.kind==='intersection').data.vertices.length,6);
 }
 const frozen=reduce(s,{type:'tour/control',patch:{playing:false}});assert.equal(reduce(frozen,{type:'tour/tick',seconds:2}),frozen);
}
let boundary=reduce(initialState(),{type:'tour/start',id:'merkaba',index:7});
boundary=reduce(boundary,{type:'tour/tick',seconds:merkabaChapter.seconds});
assert.equal(boundary.tour.index,8);near(boundary.lab.rotation.up,0,'Next chapter starts at the same canonical pose');near(boundary.lab.rotation.down,0,'Blue remains canonical at the next chapter');near(frame(boundary),0,'Observer frame clears after the full relative turn');
boundary=reduce(boundary,{type:'tour/tick',seconds:TOURS.merkaba.steps[8].seconds});assert.equal(boundary.tour.index,9);near(boundary.lab.rotation.up,0,'Second full turn hands off to the canonical chapter');near(frame(boundary),0,'Canonical chapter clears the observer frame');
const {shotAt}=await import(await load('tour-camera-math'));
const firstShot=shotAt(TOURS.merkaba.steps[7].scene,new THREE.Vector3(...TOURS.merkaba.steps[7].scene.dir),1);
const aboveRecipe=TOURS.merkaba.steps[8].scene,aboveStart=shotAt(aboveRecipe,new THREE.Vector3(...aboveRecipe.dir),0),aboveMiddle=shotAt(aboveRecipe,new THREE.Vector3(...aboveRecipe.dir),.5),aboveEnd=shotAt(aboveRecipe,new THREE.Vector3(...aboveRecipe.dir),1);
near(firstShot.direction.distanceTo(aboveStart.direction),0,'Camera handoff begins at the exact previous angle');assert.ok(aboveMiddle.direction.y>.98,'The extra chapter shows the turn from above');near(aboveEnd.direction.distanceTo(new THREE.Vector3(1,1,1).normalize()),0,'Overhead chapter returns to the canonical diagonal');
// Reset the rendering frame on exit; source laboratory rotation is untouched.
actions.stopTour();updateLab(0);const localRotation=levels[0].objs.merkaba_down.group.quaternion.clone();applyTourReference(levels,derivedObjects,0);
near(levels[0].group.quaternion.angleTo(new THREE.Quaternion()),0,'Leaving the tour clears the observer frame');
near(levels[0].objs.merkaba_down.group.quaternion.angleTo(localRotation),0,'Laboratory keeps its own rotation');
torus.dispose();assert.equal(testScene.children.length,0);
console.log(`PASS: blue observer capture, ${tested} real rendered poses, common source/derived/guide transforms, torus contacts, relative golden law, reverse, endless rebasing and two Merkaba rotation chapters with a continuous overhead shot`);
