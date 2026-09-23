import * as THREE from 'three';
import { PHI } from './constants.js';
export const spiralPoint = (theta, radius=1) => new THREE.Vector3(Math.cos(theta),Math.sin(theta),0).multiplyScalar(radius*PHI**(2*theta/Math.PI));
export function rectangleSquares(count, short=3) {
  let origin=new THREE.Vector3(-PHI*short/2,-short/2,0), u=new THREE.Vector3(1,0,0), v=new THREE.Vector3(0,1,0), side=short;
  const squares=[];
  for(let i=0;i<count;i++) {
    const p=[origin.clone(),origin.clone().addScaledVector(u,side),origin.clone().addScaledVector(u,side).addScaledVector(v,side),origin.clone().addScaledVector(v,side)];
    squares.push({points:p,side});
    origin=origin.clone().addScaledVector(u,PHI*side);const old=u;u=v;v=old.clone().negate();side/=PHI;
  }
  return squares;
}
export function nestedStars(count, radius=2.5) {
  let points=Array.from({length:5},(_,i)=>new THREE.Vector3(Math.cos(Math.PI/2+2*Math.PI*i/5),Math.sin(Math.PI/2+2*Math.PI*i/5),0).multiplyScalar(radius));
  const stars=[];
  for(let level=0;level<count;level++) {
    stars.push(points);
    const inner=points.map((a,i)=>{
      const b=points[(i+2)%5],c=points[(i+1)%5],d=points[(i+3)%5];
      const u=b.clone().sub(a),v=d.clone().sub(c),w=c.clone().sub(a);
      const t=(w.x*v.y-w.y*v.x)/(u.x*v.y-u.y*v.x);return a.clone().addScaledVector(u,t);
    });
    inner.sort((a,b)=>Math.atan2(a.y,a.x)-Math.atan2(b.y,b.x));points=inner;
  }
  return stars;
}
