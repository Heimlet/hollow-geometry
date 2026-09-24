// Run: node tests/projection.mjs /absolute/path/to/three.module.mjs
// Use the exact three@0.167.0 module from index.html; no build or npm required.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const threeURL = pathToFileURL(process.argv[2]).href;
const THREE = await import(threeURL);
const source = (await readFile(new URL('../js/projection.js', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${threeURL}'`);
const { frameCamera, configureProjection, viewHeight, withOrthographicDepth } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-8, `${message}: ${a} vs ${b}`);
const target = new THREE.Vector3(2, -1, 3);
let camera = new THREE.OrthographicCamera();
frameCamera(camera, 12, 1.6);
camera.position.copy(target).add(new THREE.Vector3(7, 5, 9).normalize().multiplyScalar(30));
camera.lookAt(target); camera.zoom = 1.7; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
const height = viewHeight(camera, target), orientation = camera.quaternion.clone();
const worldPoint = new THREE.Vector3(1, 0.5, 0).applyQuaternion(orientation).add(target);
const baseline = worldPoint.clone().project(camera);
for (const depth of [0.01, 0.2, 1, 0.5, 0, 1, 0]) {
  camera = configureProjection(camera, depth ? new THREE.PerspectiveCamera() : new THREE.OrthographicCamera(), target, depth, 1.6);
  near(viewHeight(camera, target), height, 'scale preserved');
  near(Math.abs(camera.quaternion.dot(orientation)), 1, 'orientation preserved');
  const projected = worldPoint.clone().project(camera);
  near(projected.x, baseline.x, 'target-plane X'); near(projected.y, baseline.y, 'target-plane Y');
  if (depth) assert.ok(camera.fov <= 25.000001);
  else {
    const a = new THREE.Vector3(1, 0.5, -3).applyQuaternion(orientation).add(target).project(camera);
    const b = new THREE.Vector3(1, 0.5, 3).applyQuaternion(orientation).add(target).project(camera);
    near(a.x, b.x, 'orthographic depth-independent X'); near(a.y, b.y, 'orthographic depth-independent Y');
  }
}
// Reconfiguring the SAME perspective camera must also preserve zoom/scale.
camera = configureProjection(camera, new THREE.PerspectiveCamera(), target, 0.4, 1.6);
camera.zoom = 1.3; camera.updateProjectionMatrix();
const zoomHeight = viewHeight(camera, target);
configureProjection(camera, camera, target, 0.9, 1.6);
near(viewHeight(camera, target), zoomHeight, 'same-camera FOV compensation');
console.log('PASS: orthographic depth invariance, narrow FOV, target-plane scale, orientation, repeated switches and zoom compensation');
// The dodecahedron's 5-fold axis must be a face normal for Three.js's vertex layout.
const phi = (1 + Math.sqrt(5)) / 2;
const positions = new THREE.DodecahedronGeometry(1).attributes.position;
const axis = new THREE.Vector3(0, phi, 1).normalize();
const vertices = new Map();
for (let i = 0; i < positions.count; i++) {
  const vertex = new THREE.Vector3().fromBufferAttribute(positions, i);
  vertices.set(vertex.toArray().join(','), vertex.dot(axis));
}
const maxDot = Math.max(...vertices.values());
assert.equal([...vertices.values()].filter(dot => Math.abs(dot - maxDot) < 1e-6).length, 5);
console.log('PASS: dodecahedron five-fold projection axis');

// Long spirals must not be sliced by depth planes in an otherwise exact 2D view.
const {spiralGuidePath,spiralGuideRadius,ORBIT_SEEDS}=await import('../js/torus-math.js');
const orient=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(0,1,0));
for(const scale of [1,8.99])for(const dir of [[0,1,.025],[3,1,6],[-2,-4,1]]){
 const c=new THREE.OrthographicCamera(-12,12,8,-8,.01,500);c.position.set(...dir).normalize().multiplyScalar(30);c.lookAt(0,0,0);c.updateMatrixWorld(true);
 const points=[0,7].flatMap(index=>spiralGuidePath(ORBIT_SEEDS[index]).map(p=>new THREE.Vector3(...p).multiplyScalar(scale).applyQuaternion(orient)));
 const before=points.map(p=>p.clone().project(c)),position=c.position.clone(),projection=c.projectionMatrix.clone();
 let clipped=0;withOrthographicDepth(c,spiralGuideRadius(scale),()=>points.forEach((p,i)=>{
  const q=p.clone().project(c);near(q.x,before[i].x,'Extended depth preserves screen X');near(q.y,before[i].y,'Extended depth preserves screen Y');
  assert.ok(q.z>=-1&&q.z<=1,'No upper/lower coil is lost to near/far clipping');if(before[i].z<-1||before[i].z>1)clipped++;
 }));
 assert.ok(clipped>0,'The fixture reproduces the original clipped coils');
 assert.deepEqual(c.position,position);assert.deepEqual(c.projectionMatrix,projection);
 assert.throws(()=>withOrthographicDepth(c,spiralGuideRadius(scale),()=>{throw new Error('render failed');}));
 assert.deepEqual(c.position,position);assert.deepEqual(c.projectionMatrix,projection);
}
console.log('PASS: long orthographic spirals retain all depth, identical screen coordinates and restored interactive cameras');
