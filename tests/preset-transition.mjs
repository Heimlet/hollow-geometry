import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64'),cache=new Map();
globalThis.window=new EventTarget();globalThis.innerWidth=1280;globalThis.innerHeight=800;let now=0;globalThis.performance={now:()=>now};
async function load(name){if(cache.has(name))return cache.get(name);let s=name==='levels'?'':name==='scene'?`
import * as THREE from 'three';import { configureProjection,viewHeight,frameCamera } from './projection.js';
export const scene=new THREE.Scene(),controls=new THREE.EventDispatcher();controls.target=new THREE.Vector3();controls.update=()=>{camera.lookAt(controls.target);camera.updateMatrixWorld(true);};
export let camera=new THREE.OrthographicCamera(),projectionDepth=0;frameCamera(camera,11,1.6);camera.position.set(7,5,9).normalize().multiplyScalar(30);controls.update();
export function getViewHeight(){return viewHeight(camera,controls.target);}export function settleControls(){}
export function setViewHeight(height){if(camera.isPerspectiveCamera){camera.position.sub(controls.target).normalize().multiplyScalar(height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))).add(controls.target);}frameCamera(camera,height,1.6);}
export function setDepth(value,{automatic=false}={}){if(!automatic)window.dispatchEvent(new Event('camera-manual-change'));camera=configureProjection(camera,value?new THREE.PerspectiveCamera():new THREE.OrthographicCamera(),controls.target,value,1.6);projectionDepth=value;}
`:await readFile(new URL('../js/'+name+'.js',import.meta.url),'utf8');s=s.replaceAll("'three'",JSON.stringify(three));for(const match of [...s.matchAll(/'\.\/([\w-]+)\.js'/g)])s=s.replaceAll(match[0],JSON.stringify(await load(match[1])));const value=url(s);cache.set(name,value);return value;}
const {actions}=await import(await load('state')),scene=await import(await load('scene')),presets=await import(await load('presets'));
scene.setDepth(.65);actions.preset('square');assert.equal(scene.projectionDepth,.65);
now=1199;presets.updateCamAnim();assert.equal(scene.projectionDepth,.65);
now=1200;presets.updateCamAnim();const view=scene.camera.position.clone().sub(scene.controls.target).normalize(),height=scene.getViewHeight();assert.ok(view.distanceTo({x:0,y:0,z:1})<1e-8);
now=1650;presets.updateCamAnim();assert.ok(Math.abs(scene.projectionDepth-.325)<1e-9);assert.ok(presets.isCamAnimating());assert.ok(Math.abs(scene.getViewHeight()-height)<1e-8);
now=2100;presets.updateCamAnim();assert.ok(scene.camera.isOrthographicCamera);assert.equal(presets.isCamAnimating(),false);
scene.setDepth(.8);actions.preset('triangle');now+=1400;presets.updateCamAnim();scene.setDepth(.5);now+=5000;presets.updateCamAnim();assert.equal(scene.projectionDepth,.5);assert.equal(presets.isCamAnimating(),false);
actions.preset('star6');scene.controls.dispatchEvent({type:'start'});now+=5000;presets.updateCamAnim();assert.equal(scene.projectionDepth,.5);
console.log('PASS: real preset effects retain depth during flight, flatten without self-cancelling, preserve scale and stop on manual depth/orbit');

// Reproduce the navigation regression with real camera projection math:
// pan/zoom/tilt a Platonic view, explore a compound, then return via a toggle.
const {getState,ALL_IDS}=await import(await load('state'));
function savedView(){return {target:scene.controls.target.clone(),up:scene.camera.up.clone(),direction:scene.camera.position.clone().sub(scene.controls.target).normalize(),height:scene.getViewHeight(),depth:scene.projectionDepth};}
function sameView(expected){const actual=savedView();for(const k of ['target','up','direction'])assert.ok(actual[k].distanceTo(expected[k])<1e-9,k);for(const k of ['height','depth'])assert.ok(Math.abs(actual[k]-expected[k])<1e-9,k);}
actions.focus('platonic');scene.controls.target.set(2,-1,.5);scene.camera.up.set(0,0,1);scene.camera.position.set(9,6,8);scene.setViewHeight(17);scene.camera.zoom=2;scene.controls.update();const platonic=savedView();
actions.preset('cube5-axis-5');sameView(platonic); // No early depth or framing jump.
now+=2500;presets.updateCamAnim();scene.setDepth(.7);scene.controls.target.set(-4,2,1);scene.camera.position.addScalar(3);scene.setViewHeight(31);scene.controls.update();const compound=savedView();
actions.objects(['cube'],{visible:true});assert.equal(getState().viewContext,'platonic');sameView(platonic);assert.equal(presets.isCamAnimating(),false);
actions.focus('cube5');sameView(compound);
actions.lab('collections',{explode:.2},'platonic');sameView(compound);assert.equal(getState().viewContext,'cube5'); // Animation must not steal focus.
actions.objects(ALL_IDS,{visible:false});sameView(compound);assert.equal(getState().viewContext,'cube5');
actions.focus('platonic');sameView(platonic);
scene.setDepth(.6);const perspective=savedView();actions.focus('tetra10');actions.focus('platonic');sameView(perspective);
actions.preset('tetra5-axis-3');now+=300;presets.updateCamAnim();actions.focus('platonic');const interrupted=savedView();now+=5000;presets.updateCamAnim();sameView(interrupted);assert.equal(presets.isCamAnimating(),false);
console.log('PASS: per-section view restores pan, up, orientation, ortho zoom and perspective; presets fly from current view; animations/global toggles do not steal context');

// Inspection flights can target an actual face centre without moving the model.
const {Vector3}=await import(three), target=new Vector3(.8,1.1,2.5);
presets.flyCamera(new Vector3(1,2,3).normalize().multiplyScalar(30),.65,1500,target);
now+=750;presets.updateCamAnim();assert.ok(scene.controls.target.distanceTo(target)>0);
now+=2000;presets.updateCamAnim();assert.ok(scene.controls.target.distanceTo(target)<1e-9);assert.ok(Math.abs(scene.getViewHeight()-.65)<1e-9);assert.equal(scene.projectionDepth,0);
console.log('PASS: animated detail inspection preserves an explicit 3D target and exact final scale');

// A context change is not a manual orbit gesture. Tour pause controllers may
// dispatch in gesture handlers, so programmatic context changes use another event.
let manualDuringTour=0;window.addEventListener('camera-manual-change',()=>{if(getState().tour.id)manualDuringTour++;});
actions.startTour('metatron');assert.equal(manualDuringTour,0);assert.equal(getState().tour.playing,true);
console.log('PASS: programmatic camera context transitions do not dispatch manual tour pauses');
