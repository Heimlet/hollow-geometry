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
