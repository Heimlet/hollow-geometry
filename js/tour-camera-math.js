/** Pure cinematography: a real orbit target and a shifted projection for subtitles. */
import * as THREE from 'three';
import { MAX_FOV } from './projection.js';
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function curveAt(keys,p) {
  if(p<=keys[0][0])return keys[0][1];
  for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){const [a,b]=[keys[i-1],keys[i]];return THREE.MathUtils.lerp(a[1],b[1],ease((p-a[0])/(b[0]-a[0])));}
  return keys.at(-1)[1];
}
export function directionAt(keys,p,base) {
  const value=node=>{const v=Array.isArray(node.dir)?new THREE.Vector3(...node.dir).normalize():base.clone();return v.applyAxisAngle(new THREE.Vector3(0,1,0),node.yaw||0);};
  if(p<=keys[0].at)return value(keys[0]);
  for(let i=1;i<keys.length;i++)if(p<=keys[i].at){const a=value(keys[i-1]),b=value(keys[i]),t=ease((p-keys[i-1].at)/(keys[i].at-keys[i-1].at));return a.clone().applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(a,b),t));}
  return value(keys.at(-1));
}
export function shotAt(recipe,baseDirection,p) {
  const plan=recipe.camera||{},direction=baseDirection.clone().normalize();
  if(plan.path)direction.copy(directionAt(plan.path,p,baseDirection));
  else if(plan.to){const to=new THREE.Vector3(...plan.to).normalize();direction.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(direction,to).slerp(new THREE.Quaternion(),1-ease(p)));}
  else if(recipe.orbit){const spherical=new THREE.Spherical().setFromVector3(direction);spherical.theta+=(plan.arc??1.05)*ease(p);spherical.phi+=.1*Math.sin(Math.PI*p);direction.setFromSpherical(spherical);}
  const depth=curveAt(plan.depth||[[0,0],[1,0]],p);
  return {direction,depth,locked:plan.mode!=='free'&&p<(plan.releaseAt??1),symbol:plan.symbol&&p>=plan.symbol.from&&p<=plan.symbol.to?plan.symbol.label:null};
}
export function stageViewport(width,height,panelHeight,panelWidth=440) {
  const top=76,side=width>=1100&&height>=600;
  const bottom=side?32:Math.min(panelHeight+38,Math.max(0,height-top-90));
  const usableHeight=Math.max(90,height-top-bottom);
  const usableWidth=Math.max(120,width-(side?panelWidth+80:48));
  const centerX=side?24+usableWidth/2:width/2,centerY=top+usableHeight/2;
  return {width,height,usableWidth,usableHeight,centerX,centerY,offsetX:width/2-centerX,offsetY:height/2-centerY};
}
export function fitTourFrame(points,direction,viewport,depth=0,focus=null) {
  const center=focus?.clone()||new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
  if(right.lengthSq()<.1)right.set(1,0,0);
  const up=new THREE.Vector3().crossVectors(direction,right).normalize();
  const tangent=depth*Math.tan(THREE.MathUtils.degToRad(MAX_FOV/2));
  let height=.1;
  for(const point of points){const p=point.clone().sub(center),z=p.dot(direction);
    height=Math.max(height,2*1.14*Math.abs(p.dot(up))*viewport.height/viewport.usableHeight+2*tangent*z,
      2*1.14*Math.abs(p.dot(right))*viewport.height/viewport.usableWidth+2*tangent*z,2*tangent*(z+.1));}
  return {center,height,offsetX:viewport.offsetX,offsetY:viewport.offsetY};
}
