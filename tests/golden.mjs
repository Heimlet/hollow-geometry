// node tests/golden.mjs /absolute/path/to/three.module.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const threeURL=pathToFileURL(process.argv[2]).href, THREE=await import(threeURL);
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const constantsURL=url((await readFile(new URL('../js/constants.js',import.meta.url),'utf8')).replace("'./compound-data.js'",JSON.stringify(new URL('../js/compound-data.js',import.meta.url).href)));
const {PHI,IR,CR,A}=await import(constantsURL);
const math=await import(url((await readFile(new URL('../js/golden-math.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(threeURL)).replace("'./constants.js'",JSON.stringify(constantsURL))));
const check=f=>assert.ok(Math.abs(f.long/f.short-PHI)<2e-5);
for(const scale of [1,.35,.0225]) {
  const ico=new THREE.IcosahedronGeometry(IR*scale),dod=new THREE.DodecahedronGeometry(CR*scale);
  const iv=math.verticesOf(ico),dv=math.verticesOf(dod);
  assert.equal(iv.length,12);assert.equal(dv.length,20);
  const rectangles=math.goldenRectangles(iv); assert.equal(rectangles.length,15);rectangles.forEach(check);
  for(const {points:p} of rectangles){
    assert.ok(p[0].clone().add(p[2]).distanceTo(p[1].clone().add(p[3]))<scale*1e-5);
    assert.ok(Math.abs(p[1].clone().sub(p[0]).dot(p[3].clone().sub(p[0])))<scale*scale*1e-5);
  }
  const triple=math.orthogonalGoldenRectangles(iv);assert.equal(triple.length,3);triple.forEach(check);
  const normals=triple.map(r=>r.points[1].clone().sub(r.points[0]).cross(r.points[3].clone().sub(r.points[0])).normalize());
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(Math.abs(normals[i].dot(normals[j]))<1e-5);
  for(const vertex of iv)assert.equal(triple.flatMap(r=>r.points).filter(p=>p.distanceTo(vertex)<scale*1e-5).length,1);
  for(const [index,rectangle] of triple.entries()) {
    const origin=rectangle.points[0].clone().add(rectangle.points[2]).multiplyScalar(.5);
    for(const theta of [-6*Math.PI,-3.2,-Math.PI/2]) {
      const a=math.rectangleSpiral(rectangle,theta).sub(origin),b=math.rectangleSpiral(rectangle,theta+Math.PI/2).sub(origin);
      assert.ok(Math.abs(a.dot(normals[index]))<scale*1e-6);
      assert.ok(Math.abs(b.length()/a.length()-PHI)<1e-10);
    }
  }
  const faces=math.pentagonalFaces(dod,dv);assert.equal(faces.length,12);faces.forEach(check);
  for(const face of faces){
    const nested=math.nestedFaceStars(face.points,6),center=face.points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(5);
    const normal=face.points[1].clone().sub(face.points[0]).cross(face.points[2].clone().sub(face.points[0])).normalize();
    for(let n=0;n<nested.length;n++) {
      const edge=nested[n][0].distanceTo(nested[n][1]);
      assert.ok(Math.abs(nested[n][0].distanceTo(nested[n][2])/edge-PHI)<2e-5);
      for(const p of nested[n])assert.ok(Math.abs(p.clone().sub(center).dot(normal))<scale*1e-5);
      if(n)assert.ok(Math.abs(nested[n-1][0].distanceTo(center)/nested[n][0].distanceTo(center)-PHI**2)<2e-5);
    }
  }
  const centers=faces.map(face=>face.points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(5));
  const dualRectangles=math.goldenRectangles(centers);assert.equal(dualRectangles.length,15);dualRectangles.forEach(check);
  faces.forEach(face=>{const division=math.pentagramDivision(face.points);assert.ok(division);check(division);});
  const octaEdges=new THREE.EdgesGeometry(new THREE.OctahedronGeometry(A*scale));
  const divisions=math.edgeDivisions(iv,octaEdges);assert.equal(divisions.length,12);divisions.forEach(check);
  // Detection is geometric, not tied to axes or hardcoded vertex indices.
  const transform=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.32,.79,-.25));
  ico.applyMatrix4(transform);dod.applyMatrix4(transform);
  assert.equal(math.goldenRectangles(math.verticesOf(ico)).length,15);
  assert.equal(math.pentagonalFaces(dod).length,12);
  assert.equal(math.goldenRectangles(math.verticesOf(new THREE.BoxGeometry(scale,scale,scale))).length,0);
  console.log(`scale ${scale}: 15 rectangles, 12 pentagons, 12 pentagram divisions, 12 octahedron edge divisions; dodecahedron rectangles ${math.goldenRectangles(dv).length}`);
}
console.log('PASS: measured φ, coplanarity, right angles, recursion scaling, rotation invariance, negative cube control');
// Square removal preserves exact similarity in an arbitrary 3D plane.
const original=math.orthogonalGoldenRectangles(math.verticesOf(new THREE.IcosahedronGeometry(IR)))[0];
for(const rectangle of [original,{...original,points:original.points.map(p=>p.clone().applyAxisAngle(new THREE.Vector3(1,2,3).normalize(),.79).add(new THREE.Vector3(3,-2,1)))}]) {
  const snapshot=rectangle.points.map(p=>p.toArray()),layers=math.rectangleSubdivision(rectangle,6);
  const u=layers[0].points[1].clone().sub(layers[0].points[0]).normalize(),v=layers[0].points[3].clone().sub(layers[0].points[0]).normalize(),normal=u.clone().cross(v);
  for(const [i,r]of layers.entries()) {
    assert.ok(Math.abs(r.long/r.short-PHI)<1e-12);
    for(const point of [...r.points,...r.square,...r.cut]) {
      const relative=point.clone().sub(layers[0].points[0]);
      assert.ok(Math.abs(relative.dot(normal))<1e-10);
      assert.ok(relative.dot(u)>=-1e-8&&relative.dot(u)<=layers[0].long+1e-8);
      assert.ok(relative.dot(v)>=-1e-8&&relative.dot(v)<=layers[0].short+1e-8);
    }
    if(i<layers.length-1)assert.ok(Math.abs(r.long*r.short-r.short**2-layers[i+1].long*layers[i+1].short)<1e-10,'Square plus remainder exactly covers its parent');
    const c=r.points[0].clone().lerp(r.points[2],.5);
    for(const theta of [-4*Math.PI,-3,-Math.PI/2])assert.ok(Math.abs(math.rectangleSpiral(r,theta+Math.PI/2).distanceTo(c)/math.rectangleSpiral(r,theta).distanceTo(c)-PHI)<1e-9);
  }
  assert.deepEqual(rectangle.points.map(p=>p.toArray()),snapshot);
}
console.log('PASS: six coplanar golden remainders, square/area conservation, rotated input, exact logarithmic growth in each remainder');
// The continuous curve and rectangle removal must share one similarity/pole.
for(const rectangle of math.orthogonalGoldenRectangles(math.verticesOf(new THREE.IcosahedronGeometry(IR)))) {
  const spiral=math.subdivisionSpiral(rectangle),layers=math.rectangleSubdivision(rectangle,15);
  for(let level=0;level<14;level++) {
    const r=layers[level],u=r.points[1].clone().sub(r.points[0]).normalize(),v=r.points[3].clone().sub(r.points[0]).normalize();
    for(let j=0;j<=100;j++) {
      const point=spiral.pointAt(level+j/100),relative=point.clone().sub(r.points[0]);
      assert.ok(relative.dot(u)>=-1e-9&&relative.dot(u)<=r.long+1e-9,'Arc belongs to its own remaining rectangle horizontally');
      assert.ok(relative.dot(v)>=-1e-9&&relative.dot(v)<=r.short+1e-9,'Arc belongs to its own remaining rectangle vertically');
      const a=point.clone().sub(spiral.pole),b=spiral.pointAt(level+j/100+1).sub(spiral.pole);
      assert.ok(Math.abs(a.length()/b.length()-PHI)<1e-9);assert.ok(Math.abs(a.dot(b))<1e-10);
    }
    const local=spiral.pole.clone().sub(r.points[0]);assert.ok(local.dot(u)>=0&&local.dot(u)<=r.long);assert.ok(local.dot(v)>=0&&local.dot(v)<=r.short);
  }
}
console.log('PASS: one continuous spiral per plane, fixed point shared by all remainders, each quarter-turn inside its matching rectangle, exact φ contraction and 90° rotation');
