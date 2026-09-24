import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64'),cache=new Map();
globalThis.innerWidth=1280;globalThis.innerHeight=800;
const stubs={
scene:`import * as THREE from 'three';import {frameCamera,configureProjection,viewHeight} from './projection.js';
export const controls={target:new THREE.Vector3(),enabled:true,enablePan:true,autoRotate:false,update(){camera.lookAt(this.target);camera.updateMatrixWorld(true);}};
export let camera=new THREE.OrthographicCamera(),projectionDepth=0;camera.position.set(7,5,9);frameCamera(camera,11,1.6);controls.update();
export const settleControls=()=>{};export const getViewHeight=()=>viewHeight(camera,controls.target);
export function setViewHeight(h){if(camera.isPerspectiveCamera)camera.position.sub(controls.target).normalize().multiplyScalar(h/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))).add(controls.target);frameCamera(camera,h,innerWidth/innerHeight);}
export function setDepth(d){const oldView=camera.view;camera=configureProjection(camera,d?new THREE.PerspectiveCamera():new THREE.OrthographicCamera(),controls.target,d,innerWidth/innerHeight);projectionDepth=d;if(oldView?.enabled)camera.setViewOffset(oldView.fullWidth,oldView.fullHeight,oldView.offsetX,oldView.offsetY,oldView.width,oldView.height);}
export function setCameraFrameOffset(y=0,x=0){if(x||y)camera.setViewOffset(innerWidth,innerHeight,x,y,innerWidth,innerHeight);else camera.clearViewOffset();}`,
levels:`import * as THREE from 'three';const group=new THREE.Group();group.updateMatrixWorld(true);export const levels=[{idx:0,objs:{cube:{group,edges:{geometry:new THREE.EdgesGeometry(new THREE.BoxGeometry(4,4,4))}}},mc:{vis:false}}];`,
lab:`export const derivedObjects=[],traditionalFields=[];`,
presets:`export function cancelCameraAnimation(){}`,
'golden-scenes':`import * as THREE from 'three';export function goldenSceneView(){return {direction:new THREE.Vector3(3,2,4).normalize(),target:new THREE.Vector3()};}`,
};
async function load(name){if(cache.has(name))return cache.get(name);let s=stubs[name]??await readFile(new URL('../js/'+name+'.js',import.meta.url),'utf8');s=s.replaceAll("'three'",JSON.stringify(three));for(const m of [...s.matchAll(/'\.\/([\w-]+)\.js'/g)])s=s.replaceAll(m[0],JSON.stringify(await load(m[1])));const result=url(s);cache.set(name,result);return result;}
const rig=await import(await load('tour-camera')),scene=await import(await load('scene')),{actions,getState}=await import(await load('state')),{Vector3}=await import(three);
const frame=()=>{if(!rig.tourCameraBusy())actions.tickTour(.025);rig.updateTourCamera(.025,330,440);};
actions.startTour('fruit');rig.queueTourShot();actions.tourControl({playing:false});rig.cancelTourShot();
assert.doesNotThrow(()=>rig.updateTourCamera(.025,330,440),'Immediate pause before first render still initializes the chapter');
assert.ok(scene.camera.position.clone().sub(scene.controls.target).normalize().distanceTo(new Vector3(1,1,1).normalize())<1e-10);
assert.equal(getState().tour.elapsed,0);assert.equal(scene.controls.enabled,true);
actions.startTour('duality');actions.tourStep(8);rig.queueTourShot();for(let i=0;i<60;i++)frame();
assert.equal(rig.tourCameraStatus().locked,false);assert.equal(scene.controls.enabled,true);
scene.camera.position.copy(scene.controls.target).add(new Vector3(-20,10,5));scene.controls.update();const freeDirection=scene.camera.position.clone().sub(scene.controls.target).normalize(),elapsed=getState().tour.elapsed;
for(let i=0;i<20;i++)frame();assert.ok(getState().tour.elapsed>elapsed);assert.equal(getState().tour.playing,true);assert.ok(scene.camera.position.clone().sub(scene.controls.target).normalize().distanceTo(freeDirection)<1e-10,'Free orbit is not overwritten');
rig.queueTourShot({holdTimeline:false});assert.equal(rig.tourCameraBusy(),false,'Return flight must not freeze the chapter clock');const beforeReturn=getState().tour.elapsed;
for(let i=0;i<60;i++){frame();if(!rig.tourCameraStatus().locked)break;}
assert.ok(getState().tour.elapsed>beforeReturn+1);assert.equal(getState().tour.playing,true);
const {shotAt}=await import(await load('tour-camera-math')),{tourStep}=await import(await load('tour-data')),{tourProgress}=await import(await load('tour-state'));
const planned=shotAt(tourStep(getState()).scene,new Vector3(3,2,4).normalize(),tourProgress(getState()));
assert.ok(scene.camera.position.clone().sub(scene.controls.target).normalize().distanceTo(planned.direction)<1e-8);
actions.readTopic('cube');rig.cancelTourShot();rig.updateTourCamera(.025,330,440);assert.equal(scene.controls.enabled,false);const readingTime=getState().tour.elapsed;for(let i=0;i<20;i++)frame();assert.equal(getState().tour.elapsed,readingTime);
actions.closeTopic(true);rig.queueTourShot();for(let i=0;i<60;i++)frame();assert.equal(scene.controls.enabled,true);
actions.startTour('platonic');actions.tourStep(11);rig.queueTourShot();for(let i=0;i<60;i++)frame();assert.equal(scene.controls.enabled,false);
actions.seekTour(100);rig.cancelTourShot();rig.updateTourCamera(.025,330,440);assert.ok(scene.camera.position.clone().sub(scene.controls.target).normalize().distanceTo(new Vector3(1,1,1).normalize())<1e-8);assert.equal(scene.projectionDepth,0);assert.equal(scene.camera.isOrthographicCamera,true);
actions.stopTour();rig.updateTourCamera(.025,330,440);assert.equal(scene.controls.enabled,true);assert.equal(scene.controls.enablePan,true);assert.equal(scene.camera.view.enabled,false);

// Static introduction must be exact from its first rendered frame, even after
// an arbitrary laboratory viewpoint. Volume starts only on the next chapter.
scene.camera.position.set(-20,7,3);scene.controls.target.set(2,3,1);scene.controls.update();scene.setDepth(.6);
actions.startTour('fruit');rig.queueTourShot();rig.updateTourCamera(.025,330,440);
const initialPose={position:scene.camera.position.clone(),target:scene.controls.target.clone(),projection:scene.camera.projectionMatrix.clone()};
assert.ok(scene.camera.position.clone().sub(scene.controls.target).normalize().distanceTo(new Vector3(1,1,1).normalize())<1e-10);
assert.equal(scene.projectionDepth,0);assert.equal(rig.tourCameraBusy(),false,'No entry fly-through exposes the spatial construction');
for(let i=0;i<120;i++)frame();
assert.ok(scene.camera.position.distanceTo(initialPose.position)<1e-10);assert.ok(scene.controls.target.distanceTo(initialPose.target)<1e-10);
assert.deepEqual(scene.camera.projectionMatrix.elements,initialPose.projection.elements,'Static chapter never drifts or zooms');
assert.equal(scene.controls.enabled,false);
const {TOURS:fruitScripts}=await import('../js/tour-data.js');
for(const index of [1,2,3]){
 actions.tourStep(index);rig.queueTourShot();actions.seekTour(fruitScripts.fruit.steps[index].seconds*.55);for(let i=0;i<65;i++)rig.updateTourCamera(.025,330,440);
 assert.ok(scene.camera.position.clone().sub(scene.controls.target).normalize().distanceTo(new Vector3(1,1,1).normalize())<1e-10,'Cube and star stay in the same flat projection');assert.equal(scene.projectionDepth,0);
}
actions.tourStep(fruitScripts.fruit.steps.findIndex(s=>s.id==='circles-depth'));rig.queueTourShot();for(let i=0;i<60;i++)frame();
assert.ok(scene.camera.position.clone().sub(scene.controls.target).normalize().distanceTo(new Vector3(1,1,1).normalize())<1e-10,'Volume chapter starts on the restored circle axis');
actions.tickTour(8);rig.updateTourCamera(.025,330,440);
assert.ok(scene.camera.position.clone().sub(scene.controls.target).normalize().distanceTo(new Vector3(1,1,1).normalize())>.2,'The volume chapter gradually leaves the flat viewpoint');
console.log('PASS: static Flower of Life from the first render, fixed orthographic framing, flat cube/star, return to circles and subsequent depth reveal');
console.log('PASS: free orbit keeps time running, return flight preserves playback and restores scripted direction, reading freezes, guided camera locks, exact finale and clean exit');
// The expanded finale must also fit in depth, not only in the screen rectangle.
const {TOURS}=await import(await load('tour-data')),{torusBounds,expansionAt}=await import(await load('torus-math'));
actions.startTour('torus');const finalIndex=TOURS.torus.steps.findIndex(s=>s.id==='torus-cosmos');actions.tourStep(finalIndex);rig.queueTourShot();
actions.seekTour(TOURS.torus.steps[finalIndex].seconds);for(let i=0;i<65;i++)rig.updateTourCamera(.025,330,440);
assert.equal(scene.projectionDepth,0);
for(const [x,y,z] of torusBounds()){
 const projected=new Vector3(x,z,-y).multiplyScalar(expansionAt(TOURS.torus.steps[finalIndex].scene,1).scale).project(scene.camera);
 assert.ok(projected.z>=-1&&projected.z<=1,'Expanded torus remains between the orthographic clipping planes');
}
console.log('PASS: ninefold enlarged finale remains fully visible after perspective flattens');

// The tour opener approaches from afar; ordinary transitions do not replay it.
actions.startTour('platonic');rig.queueTourShot({entrance:true});rig.updateTourCamera(0,330,440);
const farHeight=scene.getViewHeight();let height=farHeight;
for(let i=0;i<50;i++){rig.updateTourCamera(.025,330,440);assert.ok(scene.getViewHeight()<=height+1e-8);height=scene.getViewHeight();}
assert.ok(Math.abs(farHeight/height-64)<1e-8,'The opening begins at 1/64 of its normal screen size');
rig.queueTourShot({holdTimeline:false});rig.updateTourCamera(0,330,440);assert.ok(Math.abs(scene.getViewHeight()-height)<1e-8,'Return keeps the current scale instead of jumping far away');
actions.startTour('fruit');rig.queueTourShot({entrance:true});rig.updateTourCamera(0,330,440);
assert.equal(scene.projectionDepth,0);assert.ok(scene.camera.position.clone().sub(scene.controls.target).normalize().distanceTo(new Vector3(1,1,1).normalize())<1e-10,'Entry zoom preserves the Flower’s exact 2D axis');

actions.startTour('torus',finalIndex);actions.seekTour(TOURS.torus.steps[finalIndex].seconds);rig.queueTourShot();for(let i=0;i<65;i++)rig.updateTourCamera(.025,330,440);
const restartHeight=scene.getViewHeight(),restartTarget=scene.controls.target.clone();
actions.restartTour();rig.updateTourCamera(0,330,440);assert.equal(scene.getViewHeight(),restartHeight);assert.equal(scene.controls.enabled,false);
height=restartHeight;
for(let i=0;i<40;i++){frame();assert.ok(scene.getViewHeight()>height);height=scene.getViewHeight();assert.equal(getState().tour.index,finalIndex);}
actions.tourControl({playing:false});const held=getState().tour.restartElapsed;for(let i=0;i<10;i++)frame();
assert.equal(getState().tour.restartElapsed,held);assert.ok(Math.abs(scene.getViewHeight()-height)<1e-8,'Pause freezes the retreat');
actions.tourControl({playing:true});for(let i=0;i<54;i++)frame();
assert.ok(scene.getViewHeight()/restartHeight>500,'The real construction shrinks to a point before restart');
assert.ok(scene.controls.target.distanceTo(restartTarget)<1e-10,'Retreat preserves the object centre');
assert.equal(getState().tour.index,finalIndex);
for(let i=0;i<3;i++)frame();assert.equal(getState().tour.index,0);assert.equal(getState().tour.phase,'watch');
assert.equal(getState().tour.restartElapsed,undefined);assert.equal(getState().tour.playing,true);
console.log('PASS: fast distant entry, exact flat axes, ordinary return scale, paused point collapse and automatic replay');
