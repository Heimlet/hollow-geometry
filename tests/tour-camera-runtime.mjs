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
console.log('PASS: free orbit keeps time running, return flight preserves playback and restores scripted direction, reading freezes, guided camera locks, exact finale and clean exit');
