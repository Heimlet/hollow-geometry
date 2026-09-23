/** Decorative sky at a constant screen density in both camera projections. */
import * as THREE from 'three';
import { scene, camera, controls, getViewHeight } from './scene.js';
import { getState } from './state.js';
const sky=new THREE.Group();scene.add(sky);
const sprite=document.createElement('canvas');sprite.width=sprite.height=32;
const ctx=sprite.getContext('2d'), glow=ctx.createRadialGradient(16,16,0,16,16,16);
glow.addColorStop(0,'#fff');glow.addColorStop(.3,'#fff');glow.addColorStop(1,'#fff0');
ctx.fillStyle=glow;ctx.fillRect(0,0,32,32);
const map=new THREE.CanvasTexture(sprite);
let seed=43193;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const layers=[{max:7200,size:1.9,opacity:.52},{max:800,size:3.3,opacity:.82}].map(config=>{
  const positions=[],colors=[];
  for(let i=0;i<config.max;i++) {
    positions.push(random()-.5,random()-.5,0);
    const tone=random(),brightness=.55+.45*random();
    colors.push(...(tone<.16?[1,.78,.55]:tone<.5?[.64,.79,1]:[.9,.94,1]).map(v=>v*brightness));
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const points=new THREE.Points(geometry,new THREE.PointsMaterial({map,size:config.size,opacity:config.opacity,transparent:true,
    vertexColors:true,sizeAttenuation:false,depthWrite:false,toneMapped:false}));
  points.frustumCulled=false;sky.add(points);return points;
});
const direction=new THREE.Vector3();
export function updateStarfield() {
  const settings=getState().display;sky.visible=settings.stars;if(!sky.visible)return;
  const distance=camera.position.distanceTo(controls.target), behind=100;
  direction.copy(camera.position).sub(controls.target).normalize();
  sky.position.copy(controls.target).addScaledVector(direction,-behind);sky.quaternion.copy(camera.quaternion);
  const height=getViewHeight()*(camera.isPerspectiveCamera?(distance+behind)/distance:1);
  sky.scale.set(height*innerWidth/innerHeight,height,1);
  const bright=Math.round(settings.starCount*.1);
  layers[0].geometry.setDrawRange(0,settings.starCount-bright);layers[1].geometry.setDrawRange(0,bright);
}
