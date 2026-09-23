/** Execute the actual frame loop against real camera matrices. Renderer normally
 * updates matrixWorld only after the canvas overlays have already drawn. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const sceneURL=url(`import * as THREE from '${three}';
export const scene=new THREE.Scene(),canvas={};
export let camera=new THREE.OrthographicCamera(-5,5,4,-4,.01,500);
camera.position.set(3,2,12);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
export const points=[new THREE.Vector3(1,2,3),new THREE.Vector3(-2,1,-1),new THREE.Vector3()];
export const input={yaw:.03,zoom:1},frames=[],overlays=[];
export const controls={autoRotate:false,autoRotateSpeed:0,update(){camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),input.yaw);camera.lookAt(0,0,0);camera.zoom=input.zoom;camera.updateProjectionMatrix();}};
export const renderer={render(){camera.updateMatrixWorld(true);frames.push(points.map(p=>p.clone().project(camera).toArray()));},setSize(){}};
export function perspective(){const c=new THREE.PerspectiveCamera(20,1.5,.01,500);c.position.copy(camera.position);c.lookAt(0,0,0);c.updateMatrixWorld(true);camera=c;}
export const setDepth=()=>{},setViewHeight=()=>{},resizeCamera=()=>{};
`);
const stubs={
  'knowledge-preview': 'export const updateKnowledgePreview=()=>{};',
  'screen-lines': 'export const createScreenLines=()=>({prepare(){},restore(){}});',
  'tour-reading': 'export const openTourReading=()=>{};',
  tours:'export const initTours=()=>{},updateTours=()=>{},applyTourEffects=()=>{},applyTourTransition=()=>{},restoreTourMaterials=()=>{},updateTourStage=()=>{},resetTourCamera=()=>{};',
  lab:'export const updateLab=()=>{};',
  'lab-projection':'export const drawLabProjection=()=>{};',
  state:"export const ALL_IDS=[],actions={},getState=()=>({tour:{id:null},display:{autoRotate:false,speed:0},ui:{mode:'advanced'}});",
  levels:'export const levels=[];',
  presets:'export const updateCamAnim=()=>{},isCamAnimating=()=>false,deactivatePreset=()=>{},isPresetActive=()=>false,cancelCameraAnimation=()=>{},flyCamera=()=>{};',
  ui:'export const initUI=()=>{},showInfo=()=>{};',
  guide:'export const drawProjectionGuide=()=>{};',
  studies:'export const updateStudies=()=>{};',
  golden:'export const updateGolden=()=>{};',
  picking:'export const initPicking=()=>()=>{};',
  shortcuts:'export const initShortcuts=()=>{};',
  starfield:'export const updateStarfield=()=>{},renderStarfield=()=>{};',
  'golden-scenes':`import {camera,points,overlays} from '${sceneURL}';export function updateGoldenScenes(){overlays.push(points.map(p=>p.clone().project(camera).toArray()));}`,
};
let tick;globalThis.requestAnimationFrame=fn=>{tick=fn;};globalThis.window={};globalThis.document={querySelectorAll:()=>[]};globalThis.addEventListener=()=>{};
let source=await readFile(new URL('../js/main.js',import.meta.url),'utf8');
source=source.replace(/from '([^']+)'/g,(match,path)=>{
 if(path==='three')return `from '${three}'`;
 const name=path.replace('./','').replace('.js','');
 if(name==='scene')return `from '${sceneURL}'`;
 assert.ok(stubs[name],name);return `from '${url(stubs[name])}'`;
});
const rig=await import(sceneURL);await import(url(source));
for(const perspective of [false,true]) {
 if(perspective)rig.perspective();
 for(let i=0;i<60;i++) {
  rig.input.yaw=i<30?.07:-.09;rig.input.zoom=.8+i/100;tick();
  assert.deepEqual(rig.overlays.at(-1),rig.frames.at(-1),'Canvas spiral and WebGL geometry must project identical points in the same frame while dragging/zooming');
 }
}
console.log('PASS: actual animation loop keeps canvas overlays and WebGL geometry in the same frame through 120 orbit/zoom changes in both cameras');
// Negative control: the previous frame order really reproduces the reported drift.
await import(url(source.replace('  camera.updateMatrixWorld(true);','')));
assert.notDeepEqual(rig.overlays.at(-1),rig.frames.at(-1),'Without synchronization this fixture must reproduce the one-frame mismatch');
console.log('PASS: negative control reproduces the former orbit drift');
