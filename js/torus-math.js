/** Coaxial, vertically elongated tori. Local Z maps to the world's vertical Y. */
export const TORUS={major:1.8,tube:1.5,height:4.08};
export const TORUS_OUTER={major:1.8,tube:1.67,height:4.32};
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
