/** Coaxial, vertically elongated tori. Local Z maps to the world's vertical Y. */
import { A,R_META } from './constants.js';
// Choose a tall meridian through the actual vertex orbits (radius R_META, y=±A).
// Height and centre are compositional choices; the two contact circles are exact.
const height=4.08,major=1.8;
export const TORUS={major,tube:(R_META-major)/Math.sqrt(1-(A/height)**2),height};
export const TORUS_OUTER=Object.fromEntries(Object.entries(TORUS).map(([key,value])=>[key,value*4.32/height]));
export const TORUS_CONTACT=Math.asin(A/height);
export const ORBIT_SEEDS=Array.from({length:8},(_,i)=>{const p=[i&1?A:-A,i&2?A:-A,i&4?A:-A];return {point:[p[0],-p[2],p[1]],side:Math.sign(p[0]*p[1]*p[2])};});
export function orbitPoint(seed,angle){const [x,y,z]=seed.point,a=angle*seed.side;return [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a),z];}
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Homothetic handoff through the exact dual-cube scale ratio, in two passes.
export function growthScale(p){return 3**(2*ease(p));}
export function growthFrame(p){return 9/growthScale(p)*(1+.1*Math.sin(Math.PI*p));}
export const TORI=[TORUS,TORUS_OUTER];
export const TORUS_AXIS=[0,1,0];
export const TORUS_POLE=4.75;
export function torusPoint(u,v,shape=TORUS) {
  const radius=shape.major+shape.tube*Math.cos(v);
  return [radius*Math.cos(u),radius*Math.sin(u),shape.height*Math.sin(v)];
}
export function torusCurve(turnsU,turnsV,segments=768,phase=0,shape=TORUS) {
  return Array.from({length:segments+1},(_,i)=>torusPoint(i/segments*Math.PI*2*turnsU,i/segments*Math.PI*2*turnsV+phase,shape));
}
export function torusBounds() {
  const points=[[0,0,-TORUS_POLE],[0,0,TORUS_POLE]];
  for(const shape of TORI)for(let u=0;u<64;u++)for(let v=0;v<32;v++)points.push(torusPoint(u/64*Math.PI*2,v/32*Math.PI*2,shape));
  return points;
}
