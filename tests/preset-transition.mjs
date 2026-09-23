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
