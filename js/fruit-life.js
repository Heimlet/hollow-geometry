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

/** A spatial lift of the 13-circle picture: eight cube corners + six face centres.
 * Along [1,1,1], two opposite corners share the central circle. The other
 * projections have radii 2r and 4r, where sphere radius r=a/√6.
 */
export function fruitVolume(halfSide=3/Math.SQRT2) {
  const a=halfSide,radius=a/Math.sqrt(6),centers=[];
  for(const x of [-a,a])for(const y of [-a,a])for(const z of [-a,a])centers.push([x,y,z]);
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const p=[0,0,0];p[axis]=a*sign;centers.push(p);}
  const planar=fruitOfLife(radius),project=p=>[(p[0]-p[2])/Math.SQRT2,(-p[0]+2*p[1]-p[2])/Math.sqrt(6),0];
  const groups=centers.map(p=>planar.centers.findIndex(q=>Math.hypot(...project(p).map((v,i)=>v-q[i]))<a*1e-8));
  const representatives=planar.centers.map((_,group)=>centers.map((p,i)=>({i,z:p.reduce((s,v)=>s+v,0)})).filter(o=>groups[o.i]===group).sort((x,y)=>y.z-x.z)[0].i);
  const allPairs=ids=>ids.flatMap((a,i)=>ids.slice(i+1).map(b=>[a,b]));
  const distance=([i,j])=>Math.hypot(...centers[i].map((v,k)=>v-centers[j][k]));
  const cubes=Array.from({length:8},(_,i)=>i),octa=Array.from({length:6},(_,i)=>i+8);
  const cubeEdges=allPairs(cubes).filter(pair=>Math.abs(distance(pair)-2*a)<1e-8*a);
  const octaEdges=allPairs(octa).filter(pair=>Math.abs(distance(pair)-Math.SQRT2*a)<1e-8*a);
  const tetrahedra=[-1,1].map(sign=>allPairs(cubes.filter(i=>Math.sign(centers[i].reduce((s,v)=>s*v,1))===sign)));
  const flowerCenters=[];
  for(let zero=0;zero<3;zero++)for(const sign of [-1,1]){const p=[0,0,0],axes=[0,1,2].filter(i=>i!==zero);p[axes[0]]=sign*a;p[axes[1]]=-sign*a;flowerCenters.push(p);}
  const allCenters=[...centers,...flowerCenters];
  const sphereBounds=(points,r)=>points.flatMap(p=>[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[p[0]+x*r,p[1]+y*r,p[2]+z*r]))));
  return {halfSide:a,radius,centers,flowerCenters,allCenters,groups,representatives,cubeEdges,octaEdges,tetrahedra,bounds:sphereBounds(centers,radius),flowerBounds:sphereBounds(allCenters,2*radius),
    pairs:planar.pairs.map(pair=>pair.map(i=>representatives[i])),project};
}
