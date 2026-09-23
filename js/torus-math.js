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
// One clock from chapter seven to the end. Logarithmic units keep indefinitely
// repeated growth numerically small; every visible layer shares this frame.
// The pooled reference shells retain their exact relative sizes when units change.
export function expansionAt(recipe={},p=0){
  if(recipe.expansionFrom===undefined)return {active:false,time:0,level:0,scale:recipe.worldScale||1};
  const time=recipe.expansionFrom+Math.max(0,Math.min(1,p))*recipe.expansionDuration;
  const level=time<2?time*time/40:(time-1)/10;
  return {active:true,time,level,scale:3**Math.min(level,2)};
}
export function expansionReferences(level,scale){
  const phase=level-Math.floor(level);
  return [-2,-1,0,1,2].map(offset=>{
    const relative=3**(offset-phase);
    return {scale:scale*relative,alpha:ease((relative-.12)/.18)*(1-ease((relative-2)/1))};
  });
}
// Let growth lead the framing slightly, then let the camera catch up. In the
// unnormalised scene its retreat remains monotonic; the torus stays in view.
export const expansionViewZoom=time=>.96+.12*(1-Math.cos(time*Math.PI/6))/2;
// A deliberate still moment at the exact canonical cube, with zero angular
// velocity on either side of the hold and the usual 8°/s at chapter boundaries.
export const CUBE_HOLD={from:.36,to:.62};
export function cubeWitnessPhase(p,slope){
  const {from,to}=CUBE_HOLD;
  const hermite=(t,a,b,va,vb)=>a+(b-a)*ease(t)+va*(t**3-2*t*t+t)+vb*(t**3-t*t);
  if(p<from)return hermite(p/from,0,.5,slope*from,0);
  if(p<=to)return .5;
  return hermite((p-to)/(1-to),.5,1,0,slope*(1-to));
}
export const cubeWitnessInk=p=>ease((p-.23)/.13)*(1-ease((p-.62)/.1));
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
