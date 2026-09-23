import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const three=pathToFileURL(process.argv[2]).href,THREE=await import(three),url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64'),cache=new Map();
async function load(name) {
  if(cache.has(name))return cache.get(name);
  let s=await readFile(new URL(name==='screen-lines'?'../js/screen-lines.js':`../vendor/three/addons/lines/${name}.js`,import.meta.url),'utf8');
  s=s.replaceAll("'three'",JSON.stringify(three));
  for(const m of [...s.matchAll(/'(?:three\/addons\/lines\/|\.\.\/lines\/)(\w+)\.js'/g)])s=s.replaceAll(m[0],JSON.stringify(await load(m[1])));
  const result=url(s);cache.set(name,result);return result;
}
const {createScreenLines}=await import(await load('screen-lines'));
const scene=new THREE.Scene(),parent=new THREE.Group();scene.add(parent);parent.position.set(2,3,4);parent.scale.setScalar(.38);
const source=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry()),new THREE.LineBasicMaterial({transparent:true,opacity:.48}));source.userData.network=true;parent.add(source);
const system=createScreenLines(scene),root=scene.children.find(o=>o!==parent);
source.geometry.setDrawRange(0,8);system.prepare(true);
let stroke=root.children[0];assert.equal(stroke.isLineSegments2,true);assert.equal(stroke.material.linewidth,2.2);assert.equal(stroke.geometry.instanceCount,4);assert.equal(stroke.material.opacity,.48);
assert.deepEqual(stroke.matrix.elements,source.matrixWorld.elements);assert.equal(source.material.visible,false);system.restore();assert.equal(source.material.visible,true);
source.geometry.setDrawRange(0,Infinity);system.prepare();assert.equal(root.children[0],stroke);assert.equal(stroke.geometry.instanceCount,12);assert.equal(stroke.material.linewidth,1.8);system.restore();
let disposed=0;stroke.geometry.addEventListener('dispose',()=>disposed++);stroke.material.addEventListener('dispose',()=>disposed++);
source.geometry.dispose();source.geometry=new THREE.EdgesGeometry(new THREE.TetrahedronGeometry());system.prepare();assert.equal(disposed,2);assert.notEqual(root.children[0],stroke);system.restore();
parent.visible=false;system.prepare();assert.equal(root.children.length,0);system.restore();assert.equal(source.material.visible,true);system.dispose();assert.equal(scene.children.length,1);
console.log('PASS: real pixel-width strokes, timed segment counts, world transforms, opacity, exact source restoration, replaced-buffer disposal and hidden-parent cleanup');
