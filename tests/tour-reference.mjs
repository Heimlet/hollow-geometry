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
for(let chapter=index;chapter<TOURS.torus.steps.length;chapter++)for(const progress of [.05,.27,.64,.99]){
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
// Reset the rendering frame on exit; source laboratory rotation is untouched.
actions.stopTour();updateLab(0);const localRotation=levels[0].objs.merkaba_down.group.quaternion.clone();applyTourReference(levels,derivedObjects,0);
near(levels[0].group.quaternion.angleTo(new THREE.Quaternion()),0,'Leaving the tour clears the observer frame');
near(levels[0].objs.merkaba_down.group.quaternion.angleTo(localRotation),0,'Laboratory keeps its own rotation');
torus.dispose();assert.equal(testScene.children.length,0);
console.log(`PASS: blue observer capture, ${tested} real rendered poses, common source/derived/guide transforms, torus contacts, relative golden law, reverse and endless rebasing`);
