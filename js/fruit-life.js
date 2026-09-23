/** The planar Fruit of Life: 13 equal, tangent circles on six radial rays. */
export function fruitOfLife(radius=.65) {
  const centers=[[0,0,0]];
  for(const ring of [1,2])for(let i=0;i<6;i++) {
    const angle=Math.PI/2+i*Math.PI/3;
    centers.push([2*radius*ring*Math.cos(angle),2*radius*ring*Math.sin(angle),0]);
  }
  const pairs=[],contacts=[];
  for(let i=0;i<13;i++)for(let j=i+1;j<13;j++) {
    pairs.push([i,j]);
    if(Math.abs(Math.hypot(...centers[i].map((v,k)=>v-centers[j][k]))-2*radius)<radius*1e-8)contacts.push([i,j]);
  }
  return {radius,centers,pairs,contacts};
}
export function fruitCircle(center,radius,segments=96) {
  return Array.from({length:segments},(_,i)=>[i,i+1].map(j=>[center[0]+radius*Math.cos(j*2*Math.PI/segments),center[1]+radius*Math.sin(j*2*Math.PI/segments),center[2]]));
}
