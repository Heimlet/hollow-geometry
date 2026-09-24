/** A real 3D sky. Its camera shares the viewing orientation of the object camera. */
import * as THREE from 'three';
import { scene, camera, controls, renderer } from './scene.js';
import { getState } from './state.js';
import { tourStep } from './tour-data.js';
import { tourStarProgress } from './tour-effects.js';
const sky=new THREE.Scene(),skyCamera=new THREE.PerspectiveCamera(65,1,.1,400);
scene.background=null;renderer.setClearColor(0x04040f);renderer.autoClear=false;
const sprite=document.createElement('canvas');sprite.width=sprite.height=32;
const ctx=sprite.getContext('2d'),glow=ctx.createRadialGradient(16,16,0,16,16,16);
glow.addColorStop(0,'#fff');glow.addColorStop(.22,'#fff');glow.addColorStop(1,'#fff0');ctx.fillStyle=glow;ctx.fillRect(0,0,32,32);
const map=new THREE.CanvasTexture(sprite);
let seed=43193;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const layers=[{max:7200,size:.23,opacity:.8},{max:800,size:.44,opacity:1}].map(config=>{
  const positions=[],colors=[];
  for(let i=0;i<config.max;i++) {
    const radius=30+random()*85,azimuth=random()*Math.PI*2,z=random()*2-1,r=Math.sqrt(1-z*z);
    positions.push(radius*r*Math.cos(azimuth),radius*z,radius*r*Math.sin(azimuth));
    const tone=random(),brightness=.65+.35*random();colors.push(...(tone<.15?[1,.82,.61]:tone<.45?[.68,.82,1]:[.94,.96,1]).map(v=>v*brightness));
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('starIndex',new THREE.Float32BufferAttribute(Array.from({length:config.max},(_,i)=>i),1));
  const points=new THREE.Points(geometry,new THREE.PointsMaterial({map,size:config.size,opacity:config.opacity,transparent:true,vertexColors:true,sizeAttenuation:true,depthWrite:false,toneMapped:false}));
  const baseCount={value:0},birthCount={value:0};
  points.material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{baseCount,birthCount});
    shader.vertexShader='attribute float starIndex;\nuniform float baseCount;\nuniform float birthCount;\nvarying float starVisibility;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstarVisibility = starIndex < baseCount ? 1.0 : smoothstep(0.0, 64.0, birthCount - starIndex);');
    shader.fragmentShader='varying float starVisibility;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= starVisibility;');
  };
  points.material.customProgramCacheKey=()=> 'hollow-star-birth-v1';
  sky.add(points);return {points,baseCount,birthCount,max:config.max};
});
export function updateStarfield() {
  const state=getState(),count=state.display.starCount,bright=Math.round(count*.1),progress=tourStarProgress(tourStep(state)?.scene,state.tour.elapsed);
  layers.forEach((layer,i)=>{
    const base=i?bright:count-bright,birth=base+(layer.max-base+64)*progress;
    layer.baseCount.value=base;layer.birthCount.value=birth;
    layer.points.geometry.setDrawRange(0,Math.min(layer.max,Math.ceil(birth)));
  });
  // Focal-length compensation of the mathematical object camera must not throw
  // the observer outside the sky. A small physical orbit retains depth parallax.
  skyCamera.position.copy(camera.position).sub(controls.target).normalize().multiplyScalar(4).addScaledVector(controls.target,.02);
  skyCamera.quaternion.copy(camera.quaternion);
  const view=camera.view;
  if(view?.enabled)skyCamera.setViewOffset(innerWidth,innerHeight,view.offsetX,view.offsetY,innerWidth,innerHeight);
  else if(skyCamera.view?.enabled)skyCamera.clearViewOffset();
  if(skyCamera.aspect!==innerWidth/innerHeight){skyCamera.aspect=innerWidth/innerHeight;skyCamera.updateProjectionMatrix();}
}
export function renderStarfield() {
  renderer.clear();
  if(getState().display.stars)renderer.render(sky,skyCamera);
  renderer.clearDepth();
}
