/** Angles are independent: u goes around the hole, v around the tube. */
export const TORUS={major:4.6,tube:1.45};
export const TORUS_AXIS=[1/Math.sqrt(3),1/Math.sqrt(3),1/Math.sqrt(3)];
export function torusPoint(u,v,major=TORUS.major,tube=TORUS.tube) {
  const radius=major+tube*Math.cos(v);
  return [radius*Math.cos(u),radius*Math.sin(u),tube*Math.sin(v)];
}
export function torusCurve(turnsU,turnsV,segments=768,phase=0) {
  return Array.from({length:segments+1},(_,i)=>torusPoint(i/segments*Math.PI*2*turnsU,i/segments*Math.PI*2*turnsV+phase));
}
export function torusBounds() {
  const points=[];
  for(let u=0;u<96;u++)for(let v=0;v<24;v++)points.push(torusPoint(u/96*Math.PI*2,v/24*Math.PI*2));
  return points;
}
