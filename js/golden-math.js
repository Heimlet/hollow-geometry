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
