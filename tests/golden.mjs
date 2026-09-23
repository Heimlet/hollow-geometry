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
  const faces=math.pentagonalFaces(dod,dv);assert.equal(faces.length,12);faces.forEach(check);
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
