/** Coaxial tori. Local Z maps to the world's vertical Y. */
import { A,R_META,PHI } from './constants.js';
export const SPIRAL_RATIO=PHI;
export const EXPANSION_TARGET_TURNS=2;
export const EXPANSION_TARGET_SCALE=PHI**EXPANSION_TARGET_TURNS;
// Choose a circular meridian whose diameter joins the two vertex-orbit planes.
// Its radius a is also the canonical intersection octahedron's polar radius.
// R = sqrt(2)a puts the top/bottom circles through the actual cube vertices.
// Circularity is an explicit construction condition, not a consequence of spin.
export function torusFromCube(halfSide){
  return {major:Math.SQRT2*halfSide,tube:halfSide,height:halfSide};
}
export const TORUS=torusFromCube(A);
// The second shell is a visual radial echo, not a second geometric deduction.
// Both shells have the SAME cube-defined top and bottom planes.
export const TORUS_OUTER={major:TORUS.major*1.06,tube:TORUS.tube*1.06,height:TORUS.height};
export const TORUS_CONTACT=Math.PI/2;
/** Read actual source vertices. They have equal orbit radii and absolute heights
 * under the supported counterrotation + uniform scaling, including reverse.
 */
export function torusFrameFromAnchors(anchors,cubeHalfHeight=null){
  const radialScale=anchors.reduce((sum,p)=>sum+Math.hypot(p[0],p[1]),0)/anchors.length/R_META;
  const axialScale=(cubeHalfHeight??anchors.reduce((sum,p)=>sum+Math.abs(p[2]),0)/anchors.length)/A;
  return {radialScale,axialScale,shape:{major:TORUS.major*radialScale,tube:TORUS.tube*radialScale,height:TORUS.height*axialScale}};
}
export const ORBIT_SEEDS=Array.from({length:8},(_,i)=>{const p=[i&1?A:-A,i&2?A:-A,i&4?A:-A];return {point:[p[0],-p[2],p[1]],side:Math.sign(p[0]*p[1]*p[2])};});
export function orbitPoint(seed,angle){const [x,y,z]=seed.point,a=angle*seed.side;return [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a),z];}
export const expansionPath=(seed,segments=192)=>Array.from({length:segments+1},(_,i)=>spiralGuide(seed,EXPANSION_TARGET_TURNS*i/segments));
// Mirrored spatial logarithmic spirals. Scaling Z as well keeps every anchor
// on the same similar torus, rather than sliding it off the contact meridian.
export function spiralGuide(seed,turns,ratio=SPIRAL_RATIO){return orbitPoint(seed,turns*Math.PI/2).map(x=>x*ratio**turns);}
// A fixed window travels with the current supports. Its inward end is below
// a pixel; its outward end is hundreds of body sizes beyond the camera frame.
// Similarity maps this window onto the SAME infinite curve as the body grows.
export const SPIRAL_WINDOW={from:-20,to:12,segments:2048};
export const spiralGuideRadius=(scale=1)=>Math.sqrt(3)*A*SPIRAL_RATIO**SPIRAL_WINDOW.to*scale;
export const spiralGuidePath=(seed,ratio=SPIRAL_RATIO,segments=SPIRAL_WINDOW.segments)=>Array.from({length:segments+1},(_,i)=>spiralGuide(seed,SPIRAL_WINDOW.from+(SPIRAL_WINDOW.to-SPIRAL_WINDOW.from)*i/segments,ratio));
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function expansionLevel(time){
  const t=Math.min(2,time);
  return time/10-(1/90)*(t-t**3/4+t**4/16);
}
// One clock from the start of expansion to the end. Logarithmic units keep indefinitely
// repeated growth numerically small; every visible layer shares this frame.
// The pooled reference shells retain their exact relative sizes when units change.
export function expansionAt(recipe={},p=0,motion={}){
  if(recipe.expansionFrom===undefined)return {active:false,time:0,level:0,scale:recipe.worldScale||1};
  const time=recipe.expansionFrom+Math.max(0,Math.min(1,p))*recipe.expansionDuration,ratio=recipe.expansionRatio||SPIRAL_RATIO;
  const nominalTurns=expansionLevel(time),turns=nominalTurns+(motion.turnOffset||0);
  const logScale=(recipe.expansionLogFrom??expansionLevel(recipe.expansionFrom)*Math.log(ratio))
    +(nominalTurns-expansionLevel(recipe.expansionFrom))*Math.log(ratio)+(motion.logOffset||0);
  const level=logScale/Math.log(3),units=Math.floor(level/2),scale=3**(level-2*units);
  return {active:true,time,turns,logScale,ratio,level,units,scale};
}
export const initialExpansionMotion=()=>({direction:1,turnOffset:0,logOffset:0});
// Reversing changes velocity only. It never changes the current pose, scale,
// or camera magnification, even after render units have been rebased.
export function reverseExpansion(recipe,p,motion=initialExpansionMotion()){
  return {...motion,direction:-motion.direction};
}
export function advanceExpansion(recipe,from,to,motion){
  if(!motion||recipe.expansionFrom===undefined)return motion;
  const a=expansionAt(recipe,from),b=expansionAt(recipe,to),sign=motion.direction-1;
  return {...motion,turnOffset:motion.turnOffset+sign*(b.turns-a.turns),logOffset:motion.logOffset+sign*(b.logScale-a.logScale)};
}
export function expansionReferences(level,scale){
  const phase=level-Math.floor(level);
  return [-4,-3,-2,-1,0,1,2,3].map(offset=>{
    const relative=SPIRAL_RATIO**(offset-phase);
    return {scale:scale*relative,alpha:ease((relative-.18)/.18)*(1-ease((relative-1.8)/.8))};
  });
}
// Let the visible body double before the camera catches up for the next cycle.
// Its world-space retreat remains monotonic even during the growing close-up.
export function expansionViewZoom(time){
  const phase=(time/12)-Math.floor(time/12);
  return .52*2**(phase<.8?ease(phase/.8):1-ease((phase-.8)/.2));
}
export function expansionZoom(frame){
  // Follow logarithmic scale, including reversed travel.
  // The slower golden expansion must not be cancelled by a faster camera beat.
  const turns=frame.level;
  let time=turns<0?turns*90/8:10*(turns+1/90);
  if(turns>=0&&turns<expansionLevel(2)){
    let low=0,high=2;
    for(let i=0;i<40;i++){const middle=(low+high)/2;if(expansionLevel(middle)<turns)low=middle;else high=middle;}
    time=(low+high)/2;
  }
  return expansionViewZoom(time);
}
// A deliberate still moment at the exact canonical cube, with zero angular
// velocity on either side of the hold and the usual 8°/s at chapter boundaries.
export const CUBE_HOLD={from:.36,to:.74};
export function cubeWitnessPhase(p,slope){
  const {from,to}=CUBE_HOLD;
  const hermite=(t,a,b,va,vb)=>a+(b-a)*ease(t)+va*(t**3-2*t*t+t)+vb*(t**3-t*t);
  if(p<from)return hermite(p/from,0,.5,slope*from,0);
  if(p<=to)return .5;
  return hermite((p-to)/(1-to),.5,1,0,slope*(1-to));
}
/** Carry the complete spiral view into the gradual orbit construction. */
export const traceEntrance=p=>ease(p/.18);
export const torusMacroFocus=p=>ease((p-.06)/.16)*(1-ease((p-.72)/.18));
export const cubeWitnessInk=p=>ease((p-.14)/.16)*(1-ease((p-.74)/.12));
// The enlarged pair is already visible in the preceding chapter.
export const cubeWitnessView=()=>EXPANSION_TARGET_SCALE;
export const TORI=[TORUS,TORUS_OUTER];
export const TORUS_AXIS=[0,1,0];
export const TORUS_POLE=TORUS.height*1.1;
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

/** Establish the real intersection at rest, then depart with the next chapter's speed. */
export function intersectionWitnessPhase(p,slope){
  const q=Math.max(0,(p-.3)/.7);
  return ease(q)+slope*.7*(q*q*q-q*q);
}

/** Observer frame follows the blue tetrahedron after a four-second capture.
 * Angles stay unwrapped. The ramp integrates smooth angular velocity, rather
 * than making the blue body turn back to its initial orientation. */
export function torusReferenceYaw(recipe={},p=0,angleDegrees=0){
  const ref=recipe.referenceFrame;if(!ref)return 0;
  const elapsed=recipe.expansionDuration*Math.max(0,Math.min(1,p));
  if(!ref.enter||elapsed>=ref.seconds)return (angleDegrees-ref.anchor)*Math.PI/180;
  const t=elapsed/ref.seconds,w=ease(t),nominal=ref.start+ref.speed*elapsed;
  const integrated=ref.speed*ref.seconds*(t*t*t-.5*t*t*t*t);
  return (integrated+(angleDegrees-nominal)*w)*Math.PI/180;
}
