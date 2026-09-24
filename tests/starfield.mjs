import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64'),cache=new Map();
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};globalThis.innerWidth=1280;globalThis.innerHeight=800;
async function load(name){if(cache.has(name))return cache.get(name);let s=name==='scene'?`import * as THREE from 'three';export const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),controls={target:new THREE.Vector3()},calls=[];camera.position.set(1,1,1).normalize().multiplyScalar(30);camera.lookAt(controls.target);export const renderer={setClearColor(){},clear(){calls.push('clear');},clearDepth(){calls.push('depth');},render(scene,camera){calls.push({scene,camera});}};`:await readFile(new URL('../js/'+name+'.js',import.meta.url),'utf8');s=s.replaceAll("'three'",JSON.stringify(three));for(const m of [...s.matchAll(/'\.\/([\w-]+)\.js'/g)])s=s.replaceAll(m[0],JSON.stringify(await load(m[1])));const result=url(s);cache.set(name,result);return result;}
const scene=await import(await load('scene')),{actions,getState}=await import(await load('state')),{updateStarfield,renderStarfield}=await import(await load('starfield'));
updateStarfield();renderStarfield();assert.equal(scene.calls[0],'clear');assert.equal(scene.calls[2],'depth');const sky=scene.calls[1];assert.ok(sky.camera.isPerspectiveCamera);assert.equal(sky.camera.quaternion.equals(scene.camera.quaternion),true);assert.ok(Math.abs(sky.camera.position.length()-4)<1e-9);assert.equal(sky.scene.children.length,2);
for(const points of sky.scene.children){assert.equal(points.material.sizeAttenuation,true);const positions=points.geometry.attributes.position,radii=new Set();for(let i=0;i<positions.count;i++){const radius=Math.hypot(positions.getX(i),positions.getY(i),positions.getZ(i));assert.ok(radius>=29.99&&radius<=115.01);radii.add(Math.round(radius));}assert.ok(radii.size>75);}
const original=sky.camera.position.clone();scene.camera.position.multiplyScalar(100);updateStarfield();assert.ok(sky.camera.position.distanceTo(original)<1e-9,'FOV compensation must not move sky out of the sphere');
scene.camera.position.set(-30,10,40);scene.camera.lookAt(scene.controls.target);updateStarfield();assert.equal(sky.camera.quaternion.equals(scene.camera.quaternion),true,'Sky rotation must follow orbit exactly');
scene.camera.setViewOffset(1280,800,230,-22,1280,800);updateStarfield();assert.equal(sky.camera.view.offsetX,230);assert.equal(sky.camera.view.offsetY,-22);scene.camera.clearViewOffset();updateStarfield();assert.equal(sky.camera.view.enabled,false);
actions.display({starCount:8000});updateStarfield();assert.equal(sky.scene.children.reduce((sum,p)=>sum+p.geometry.drawRange.count,0),8000);
// Density belongs to the tour clock; individual stars fade in without moving or reallocating.
const {ShaderLib}=await import(three),{TOURS}=await import(await load('tour-data'));
const resources=sky.scene.children.map(points=>({geometry:points.geometry,material:points.material,positions:points.geometry.attributes.position}));
const shaders=sky.scene.children.map(points=>{
  const shader={uniforms:{},vertexShader:ShaderLib.points.vertexShader,fragmentShader:ShaderLib.points.fragmentShader};
  points.material.onBeforeCompile(shader);
  assert.ok(shader.vertexShader.includes('starVisibility = starIndex < baseCount'));
  assert.ok(shader.fragmentShader.includes('diffuseColor.a *= starVisibility;'));
  return shader;
});
const density=()=>{updateStarfield();return sky.scene.children.reduce((sum,p)=>sum+p.geometry.drawRange.count,0);};
const births=()=>shaders.map(s=>s.uniforms.birthCount.value);
actions.display({stars:true,starCount:2400});actions.startTour('torus',5);
assert.equal(density(),2400,'The cube witness still uses the ordinary sky');
let previous=[2160,240];
for(let index=6;index<=9;index++) {
  actions.tourStep(index);density();assert.deepEqual(births(),previous,'Chapter boundaries must preserve the star ramp');
  for(const p of [.25,.5,.75,1]) {
    actions.seekTour(TOURS.torus.steps[index].seconds*p);density();
    const current=births();current.forEach((value,i)=>assert.ok(value>previous[i]));previous=current;
    assert.equal(getState().display.starCount,2400,'Tour effects must not change the saved setting');
  }
}
assert.equal(density(),12000,'The finale has 50% more stars at the end of chapter ten');
sky.scene.children.forEach((points,i)=>assert.ok(births()[i]-(points.geometry.attributes.position.count-1)>=64,'Even the last star has finished fading in'));
for(let index=10;index<TOURS.torus.steps.length;index++){actions.tourStep(index);assert.equal(density(),12000);}
actions.tourStep(7);actions.seekTour(4);density();const paused=births();
actions.tickTour(5);density();assert.deepEqual(births(),paused,'Pause freezes the sky choreography');
actions.seekTour(10);density();actions.seekTour(4);density();assert.deepEqual(births(),paused,'Backward seek exactly restores brightness');
sky.scene.children.forEach((points,i)=>{assert.equal(points.geometry,resources[i].geometry);assert.equal(points.material,resources[i].material);assert.equal(points.geometry.attributes.position,resources[i].positions);});
actions.stopTour();assert.equal(density(),2400,'Exit restores the chosen density');
actions.startTour('golden');assert.equal(density(),2400,'Other tours retain the chosen density');
actions.startTour('torus',12);actions.restartTour();actions.tickTour(1.2);
assert.ok(density()>2400&&density()<12000,'Restart returns extra stars to the ordinary sky gradually');
actions.tickTour(1.3);assert.equal(getState().tour.index,0);assert.equal(density(),2400);
actions.startTour('torus',9);actions.seekTour(TOURS.torus.steps[9].seconds);
actions.display({stars:false});scene.calls.length=0;renderStarfield();assert.deepEqual(scene.calls,['clear','depth']);
console.log('PASS: spatial stars, exact orbit, stable FOV framing, smooth chapter 7–10 ramp, pause/seek/exit, fixed buffers and disabled rendering');
