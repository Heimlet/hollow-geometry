/** Convex geometry in double precision; renderer triangulation is an output only. */
import * as THREE from 'three';
export function hull(points) {
  const scale=Math.max(...points.map(p=>p.length()),1e-4),eps=scale*1e-7;
  const vertices=[];for(const p of points)if(!vertices.some(v=>p.distanceTo(v)<eps))vertices.push(p.clone());
  const planes=new Map();
  for(let a=0;a<vertices.length;a++)for(let b=a+1;b<vertices.length;b++)for(let c=b+1;c<vertices.length;c++) {
    const n=vertices[b].clone().sub(vertices[a]).cross(vertices[c].clone().sub(vertices[a]));if(n.length()<eps*eps)continue;n.normalize();
    let d=n.dot(vertices[a]),distances=vertices.map(p=>n.dot(p)-d);
    if(distances.some(x=>x>eps)&&distances.some(x=>x < -eps))continue;
    if(!distances.some(x=>Math.abs(x)>eps))continue; // lower-dimensional hull
    if(distances.some(x=>x>eps)){n.negate();d=-d;distances=distances.map(x=>-x);}
    const indices=distances.map((x,i)=>Math.abs(x)<eps?i:-1).filter(i=>i>=0),key=indices.join(',');if(planes.has(key))continue;
    const center=indices.reduce((v,i)=>v.add(vertices[i]),new THREE.Vector3()).divideScalar(indices.length);
    const u=vertices[indices[0]].clone().sub(center).normalize(),v=n.clone().cross(u);
    indices.sort((a,b)=>Math.atan2(vertices[a].clone().sub(center).dot(v),vertices[a].clone().sub(center).dot(u))-Math.atan2(vertices[b].clone().sub(center).dot(v),vertices[b].clone().sub(center).dot(u)));
    planes.set(key,{normal:n,constant:d,indices});
  }
  const faces=[...planes.values()],edges=new Map(),triangles=[];
  for(const face of faces){const p=face.indices;for(let i=0;i<p.length;i++){const pair=[p[i],p[(i+1)%p.length]].sort((a,b)=>a-b);edges.set(pair.join(':'),pair);}for(let i=1;i<p.length-1;i++)triangles.push(p[0],p[i],p[i+1]);}
  let volume=0;for(let i=0;i<triangles.length;i+=3)volume+=vertices[triangles[i]].dot(vertices[triangles[i+1]].clone().cross(vertices[triangles[i+2]]))/6;
  return {vertices,faces,edges:[...edges.values()],triangles,volume:Math.abs(volume)};
}
export function intersection(a,b) {
  const planes=[...hull(a).faces,...hull(b).faces],points=[];
  const scale=Math.max(...a.concat(b).map(p=>p.length()),1e-4),eps=scale*1e-7;
  for(let i=0;i<planes.length;i++)for(let j=i+1;j<planes.length;j++)for(let k=j+1;k<planes.length;k++) {
    const [p,q,r]=[planes[i],planes[j],planes[k]],cross=q.normal.clone().cross(r.normal),det=p.normal.dot(cross);if(Math.abs(det)<1e-10)continue;
    const point=cross.multiplyScalar(p.constant).add(r.normal.clone().cross(p.normal).multiplyScalar(q.constant)).add(p.normal.clone().cross(q.normal).multiplyScalar(r.constant)).divideScalar(det);
    if(planes.every(plane=>plane.normal.dot(point)<=plane.constant+eps)&&!points.some(v=>v.distanceTo(point)<eps))points.push(point);
  }
  const result=hull(points);result.contact=points.length>0&&result.volume<eps**3;return result;
}
export function packGeometry(data) {
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.triangles.flatMap(i=>data.vertices[i].toArray()),3));geometry.computeVertexNormals();return geometry;
}
export function packEdges(data) {return new THREE.BufferGeometry().setFromPoints(data.edges.flatMap(pair=>pair.map(i=>data.vertices[i])));}
export function compoundCoordinates(radius, phi=(1+Math.sqrt(5))/2) {
  const points=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])points.push(new THREE.Vector3(x,y,z));
  for(const s of [-1,1])for(const t of [-1,1])for(const p of [[0,s/phi,t*phi],[s/phi,t*phi,0],[t*phi,0,s/phi]])points.push(new THREE.Vector3(...p));
  points.forEach(p=>p.multiplyScalar(radius/Math.sqrt(3)));
  const tets=[],eps=radius*radius*1e-7;
  for(let a=0;a<20;a++)for(let b=a+1;b<20;b++)for(let c=b+1;c<20;c++)for(let d=c+1;d<20;d++) {
    const ids=[a,b,c,d],length=points[a].distanceToSquared(points[b]);
    if(ids.every((i,k)=>ids.slice(k+1).every(j=>Math.abs(points[i].distanceToSquared(points[j])-length)<eps)))tets.push(ids);
  }
  const covers=[];
  function cover(chosen,used,start) {
    if(chosen.length===5){covers.push(chosen);return;}
    for(let i=start;i<tets.length;i++)if(tets[i].every(j=>!used.has(j)))cover([...chosen,i],new Set([...used,...tets[i]]),i+1);
  }
  cover([],new Set(),0);
  const cubes=[],seen=new Set();
  for(const tet of tets) {
    const opposite=tet.map(i=>points.findIndex(p=>p.distanceTo(points[i].clone().negate())<radius*1e-7)),ids=[...tet,...opposite].sort((a,b)=>a-b),key=ids.join(',');
    if(!seen.has(key)){seen.add(key);cubes.push(ids);}
  }
  const coords=ids=>ids.map(i=>points[i].clone());
  return {tetra5:covers[0].map(i=>coords(tets[i])),tetra5Mirror:covers[1].map(i=>coords(tets[i])),tetra10:tets.map(coords),cube5:cubes.map(coords),vertices:points};
}
/** Translation never changes orientation and is exactly zero at progress=0. */
export function explodedOffset(index,count,radius,progress) {
  if(!progress||count<2)return new THREE.Vector3();
  const ringRadius=(radius*2+.35)/(2*Math.sin(Math.PI/count));
  const theta=2*Math.PI*index/count;return new THREE.Vector3(Math.cos(theta),Math.sin(theta),0).multiplyScalar(ringRadius*progress);
}

export function convexOutline2D(points){const unique=[...new Map(points.map(p=>[p.x.toFixed(7)+','+p.y.toFixed(7),p])).values()].sort((a,b)=>a.x-b.x||a.y-b.y);const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);const lower=[],upper=[];for(const p of unique){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of [...unique].reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}return lower.slice(0,-1).concat(upper.slice(0,-1));}
