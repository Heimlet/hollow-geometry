/** Relations measured from the actual node coordinates, not decorative guides. */
export function metatronRelations(points,radius) {
  const distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
  const near=value=>Math.abs(value)<radius*1e-7;
  const neighbours=[],opposites=[];
  for(let i=1;i<points.length;i++)for(let j=i+1;j<points.length;j++) {
    if(near(distance(points[i],points[j])-radius))neighbours.push([i,j]);
    if(points[i].every((v,k)=>near(v+points[j][k])))opposites.push([i,j]);
  }
  const planes=[0,1,2].map(axis=>{
    const axes=[0,1,2].filter(k=>k!==axis);
    return points.map((_,i)=>i).filter(i=>i&&near(points[i][axis])).sort((a,b)=>Math.atan2(points[a][axes[1]],points[a][axes[0]])-Math.atan2(points[b][axes[1]],points[b][axes[0]]));
  });
  return {neighbours,opposites,planes,radii:points.slice(1).map((_,i)=>[0,i+1])};
}
