import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const three=pathToFileURL(process.argv[2]).href,THREE=await import(three),source=(await readFile(new URL('../js/polyhedra-math.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(three));
const {hull,intersection,compoundCoordinates,explodedOffset,convexOutline2D}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const up=[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(v=>new THREE.Vector3(...v)),down=up.map(p=>p.clone().negate());
let h=hull([...up,...down]),i=intersection(up,down);assert.equal(h.vertices.length,8);assert.equal(h.edges.length,12);assert.equal(h.faces.length,6);assert.equal(h.volume,8);assert.equal(i.vertices.length,6);assert.equal(i.edges.length,12);assert.equal(i.faces.length,8);assert.ok(Math.abs(i.volume-4/3)<1e-12);
for(let angle=0;angle<6.3;angle+=.17){const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,2,3).normalize(),angle),rotated=down.map(p=>p.clone().applyQuaternion(q)),shape=intersection(up,rotated);assert.ok(shape.volume>0);const planes=[...hull(up).faces,...hull(rotated).faces];assert.ok(shape.vertices.every(p=>planes.every(f=>f.normal.dot(p)<=f.constant+1e-6)));assert.ok(Math.abs(shape.volume-intersection(rotated,up).volume)<1e-7);}
assert.equal(intersection(up,down.map(p=>p.clone().addScalar(10))).volume,0);
for(const radius of [1,.35,3.674]){const data=compoundCoordinates(radius);for(const [key,count,faces,edges]of[['tetra5',5,4,6],['tetra5Mirror',5,4,6],['tetra10',10,4,6],['cube5',5,6,12]]){assert.equal(data[key].length,count);for(const points of data[key]){const shape=hull(points);assert.equal(shape.faces.length,faces);assert.equal(shape.edges.length,edges);const lengths=shape.edges.map(([a,b])=>points[a].distanceTo(points[b]));assert.ok(Math.max(...lengths)-Math.min(...lengths)<1e-6);}}}
for(const n of [2,5,10,29])for(let a=0;a<n;a++){assert.equal(explodedOffset(a,n,4,0).length(),0);for(let b=a+1;b<n;b++)assert.ok(explodedOffset(a,n,4,1).distanceTo(explodedOffset(b,n,4,1))>8);}
console.log('PASS: cube hull, octahedron intersection, 38 rotations, empty intersection, regular 5/10 tetrahedra and 5 cubes at three scales, disjoint explode endpoint');

const view = new THREE.Camera();view.position.set(1,1,1);view.lookAt(0,0,0);const inverse=view.quaternion.clone().invert();
const project=points=>points.map(p=>p.clone().applyQuaternion(inverse));
assert.equal(convexOutline2D(project(up)).length,3);assert.equal(convexOutline2D(project(down)).length,3);
const hexagon=convexOutline2D(project([...up,...down]));assert.equal(hexagon.length,6);const lengths=hexagon.map((p,i)=>Math.hypot(p.x-hexagon[(i+1)%6].x,p.y-hexagon[(i+1)%6].y));assert.ok(Math.max(...lengths)-Math.min(...lengths)<1e-10);
assert.equal(convexOutline2D([...up,...down]).length,4);
const data=compoundCoordinates(1),poly=hull(data.vertices);
for(const [order,axis] of [[3,data.vertices[0]],[5,poly.faces[0].normal],[2,data.vertices[poly.edges[0][0]].clone().add(data.vertices[poly.edges[0][1]])]]) {
 const q=new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(),2*Math.PI/order);
 for(const name of ['tetra5','tetra5Mirror','cube5','tetra10'])for(const body of data[name]) {
  const transformed=body.map(p=>p.clone().applyQuaternion(q));
  assert.ok(data[name].some(other=>transformed.every(p=>other.some(v=>p.distanceTo(v)<1e-6))),`${name}: ${order}-fold symmetry`);
 }
}
console.log('PASS: exact triangle/square/regular hexagon projections; 2-, 3-, 5-fold compound symmetries');
