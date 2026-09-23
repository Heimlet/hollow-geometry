/** Discover φ relationships from mesh coordinates, independently of camera/rendering. */
import * as THREE from 'three';
import { PHI } from './constants.js';
const ratioIsPhi = (a, b) => Math.abs(Math.max(a, b) / Math.min(a, b) - PHI) < 2e-5;
export function verticesOf(geometry) {
  const result = [], positions = geometry.attributes.position;
  const tolerance = Math.max(...Array.from({ length: positions.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(positions, i).length())) * 1e-5;
  for (let i = 0; i < positions.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(positions, i);
    if (!result.some(other => other.distanceTo(vertex) < tolerance)) result.push(vertex);
  }
  return result;
}
export function goldenRectangles(vertices) {
  const results = [], eps = vertices[0].length() * 1e-5;
  for (let a = 0; a < vertices.length; a++) for (let b = a + 1; b < vertices.length; b++)
    for (let c = b + 1; c < vertices.length; c++) for (let d = c + 1; d < vertices.length; d++) {
      for (const indices of [[a,b,c,d],[a,c,b,d],[a,b,d,c]]) {
        const [p,q,r,s] = indices.map(i => vertices[i]);
        if (p.clone().add(r).distanceTo(q.clone().add(s)) > eps) continue;
        const u = q.clone().sub(p), v = s.clone().sub(p);
        if (Math.abs(u.dot(v)) > eps * Math.max(u.length(), v.length())) continue;
        if (!ratioIsPhi(u.length(), v.length())) continue;
        results.push({ points: [p,q,r,s], short: Math.min(u.length(),v.length()), long: Math.max(u.length(),v.length()) });
        break;
      }
    }
  return results;
}
export function pentagonalFaces(geometry, vertices = verticesOf(geometry)) {
  const positions = geometry.attributes.position, index = geometry.index;
  const count = index ? index.count : positions.count, faces = new Map();
  const eps = vertices[0].length() * 1e-5;
  for (let i = 0; i < count; i += 3) {
    const [a,b,c] = [0,1,2].map(k => new THREE.Vector3().fromBufferAttribute(positions, index ? index.getX(i+k) : i+k));
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const members = vertices.map((v, j) => Math.abs(v.clone().sub(a).dot(normal)) < eps ? j : -1).filter(j => j >= 0);
    if (members.length !== 5) continue;
    const key = members.join(','); if (faces.has(key)) continue;
    const center = members.reduce((sum, j) => sum.add(vertices[j]), new THREE.Vector3()).divideScalar(5);
    const u = vertices[members[0]].clone().sub(center).normalize(), v = normal.clone().cross(u);
    members.sort((j,k) => Math.atan2(vertices[j].clone().sub(center).dot(v),vertices[j].clone().sub(center).dot(u)) - Math.atan2(vertices[k].clone().sub(center).dot(v),vertices[k].clone().sub(center).dot(u)));
    const points = members.map(j => vertices[j]);
    const short = points[0].distanceTo(points[1]), long = points[0].distanceTo(points[2]);
    if (ratioIsPhi(short, long)) faces.set(key, { points, short, long });
  }
  return [...faces.values()];
}
export function pentagramDivision(points) {
  const [a,b,c,d] = points, u = c.clone().sub(a), v = d.clone().sub(b), w = b.clone().sub(a);
  const normal = u.clone().cross(v);
  const t = w.clone().cross(v).dot(normal) / normal.lengthSq();
  const cross = a.clone().addScaledVector(u, t);
  const first = cross.distanceTo(a), second = cross.distanceTo(c);
  if (t <= 0 || t >= 1 || !ratioIsPhi(first, second)) return null;
  return { cross, short: Math.min(first,second), long: Math.max(first,second) };
}
export function edgeDivisions(points, edgeGeometry) {
  const positions = edgeGeometry.attributes.position, results = [], eps = points[0].length() * 1e-5;
  for (const point of points) for (let i = 0; i < positions.count; i += 2) {
    const a = new THREE.Vector3().fromBufferAttribute(positions,i), b = new THREE.Vector3().fromBufferAttribute(positions,i+1);
    const first = point.distanceTo(a), second = point.distanceTo(b);
    if (Math.abs(first + second - a.distanceTo(b)) < eps && ratioIsPhi(first, second)) results.push({ points: [a,point,b], short: Math.min(first,second), long: Math.max(first,second) });
  }
  return results;
}

/** Choose a complete orthogonal triple, not three arbitrary golden rectangles. */
export function orthogonalGoldenRectangles(vertices) {
  const rectangles=goldenRectangles(vertices);
  const normal=r=>r.points[1].clone().sub(r.points[0]).cross(r.points[3].clone().sub(r.points[0])).normalize();
  const normals=rectangles.map(normal), eps=vertices[0].length()*1e-5;
  for(let a=0;a<rectangles.length;a++)for(let b=a+1;b<rectangles.length;b++)for(let c=b+1;c<rectangles.length;c++) {
    if([normals[a].dot(normals[b]),normals[a].dot(normals[c]),normals[b].dot(normals[c])].some(dot=>Math.abs(dot)>1e-5))continue;
    const triple=[rectangles[a],rectangles[b],rectangles[c]],points=triple.flatMap(r=>r.points);
    if(vertices.every(v=>points.filter(p=>v.distanceTo(p)<eps).length===1))return triple;
  }
  return [];
}

/** Every inner pentagon is computed by intersecting actual 3D diagonals. */
export function nestedFaceStars(face, count=6) {
  let points=face.map(p=>p.clone());
  const center=points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(5);
  const u=points[0].clone().sub(center).normalize(),normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize(),v=normal.clone().cross(u);
  const layers=[];
  for(let level=0;level<count;level++) {
    layers.push(points);
    const inner=points.map((a,i)=>{
      const b=points[(i+2)%5],c=points[(i+1)%5],d=points[(i+3)%5];
      const edge=b.clone().sub(a),other=d.clone().sub(c),delta=c.clone().sub(a),cross=edge.clone().cross(other);
      return a.clone().addScaledVector(edge,delta.cross(other).dot(cross)/cross.lengthSq());
    });
    inner.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(v),a.clone().sub(center).dot(u))-Math.atan2(b.clone().sub(center).dot(v),b.clone().sub(center).dot(u)));
    points=inner;
  }
  return layers;
}

export function rectangleSpiral(rectangle,theta) {
  const p=rectangle.points,origin=p[0].clone().lerp(p[2],.5);
  const longEdge=p[0].distanceTo(p[1])>p[0].distanceTo(p[3])?p[1]:p[3];
  const u=longEdge.clone().sub(p[0]).normalize(),normal=p[1].clone().sub(p[0]).cross(p[3].clone().sub(p[0])).normalize(),v=normal.cross(u);
  const radius=rectangle.short*.47*PHI**(2*theta/Math.PI);
  return origin.addScaledVector(u,radius*Math.cos(theta)).addScaledVector(v,radius*Math.sin(theta));
}

/** Successive square removals, in the rectangle's own plane and orientation. */
export function rectangleSubdivision(rectangle,count=6) {
  const p=rectangle.points,longFirst=p[0].distanceTo(p[1])>p[0].distanceTo(p[3]);
  let u=(longFirst?p[1]:p[3]).clone().sub(p[0]).normalize();
  let v=(longFirst?p[3]:p[1]).clone().sub(p[0]).normalize();
  let origin=p[0].clone(),side=rectangle.short;const layers=[];
  for(let i=0;i<count;i++) {
    const corner=(x,y)=>origin.clone().addScaledVector(u,x).addScaledVector(v,y);
    const points=[corner(0,0),corner(PHI*side,0),corner(PHI*side,side),corner(0,side)];
    layers.push({points,short:side,long:PHI*side,square:[corner(0,0),corner(side,0),corner(side,side),corner(0,side)],cut:[corner(side,0),corner(side,side)]});
    origin=corner(PHI*side,0);const oldU=u;u=v;v=oldU.clone().negate();side/=PHI;
  }
  return layers;
}

/** A single true logarithmic spiral shares the subdivision's fixed point.
 * T(x,y)=(φs-y/φ,x/φ) maps each rectangle to its remainder. A quarter
 * turn of this curve is exactly T. Its scale is derived from the extrema
 * of the first arc, so the whole curve stays inside the nested rectangles.
 */
export function subdivisionSpiral(rectangle) {
  const r=rectangleSubdivision(rectangle,1)[0],p=r.points,s=r.short;
  const u=p[1].clone().sub(p[0]).normalize(),v=p[3].clone().sub(p[0]).normalize();
  const cx=PHI*s/(1+1/PHI**2),cy=cx/PHI,wx=-cx,wy=s-cy,k=2*Math.log(PHI)/Math.PI;
  const candidates=[0,Math.PI/2];
  for(const [a,b]of [[-k*wx-wy,k*wy-wx],[wx-k*wy,-wy-k*wx]]) {
    const root=Math.atan2(-a,b);
    for(let n=-1;n<=1;n++){const theta=root+n*Math.PI;if(theta>0&&theta<Math.PI/2)candidates.push(theta);}
  }
  let scale=1;
  for(const theta of candidates) {
    const decay=Math.exp(-k*theta),x=decay*(wx*Math.cos(theta)-wy*Math.sin(theta)),y=decay*(wx*Math.sin(theta)+wy*Math.cos(theta));
    if(Math.abs(x)>1e-14)scale=Math.min(scale,(x>0?PHI*s-cx:-cx)/x);
    if(Math.abs(y)>1e-14)scale=Math.min(scale,(y>0?s-cy:-cy)/y);
  }
  const pole=p[0].clone().addScaledVector(u,cx).addScaledVector(v,cy);
  return {pole,pointAt(quarters) {
    const theta=quarters*Math.PI/2,decay=scale*PHI**(-quarters);
    return pole.clone().addScaledVector(u,decay*(wx*Math.cos(theta)-wy*Math.sin(theta))).addScaledVector(v,decay*(wx*Math.sin(theta)+wy*Math.cos(theta)));
  }};
}
