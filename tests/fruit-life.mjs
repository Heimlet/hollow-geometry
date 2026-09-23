import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {fruitOfLife,fruitCircle,fruitVolume} from '../js/fruit-life.js';
import {TOURS} from '../js/tour-data.js';
import {initialState,reduce} from '../js/state.js';
for(const radius of [.1,.65,3]) {
  const f=fruitOfLife(radius);assert.equal(f.centers.length,13);assert.equal(f.pairs.length,78);assert.equal(f.contacts.length,18);
  for(const [i,p]of f.centers.entries()){
    assert.equal(p[2],0);
    assert.ok(Math.abs(Math.hypot(...p)-(i===0?0:i<7?2:4)*radius)<1e-12);
    const angle=Math.PI/3,rotated=[p[0]*Math.cos(angle)-p[1]*Math.sin(angle),p[0]*Math.sin(angle)+p[1]*Math.cos(angle),0];
    assert.ok(f.centers.some(q=>Math.hypot(...q.map((v,k)=>v-rotated[k]))<1e-10),'60 degree symmetry');
    for(const point of fruitCircle(p,radius).flat())assert.ok(Math.abs(Math.hypot(...point.map((v,k)=>v-p[k]))-radius)<1e-12);
  }
  for(const [a,b]of f.pairs)assert.ok(Math.hypot(...f.centers[a].map((v,k)=>v-f.centers[b][k]))>=2*radius-1e-10,'No circle interiors overlap');
}
assert.deepEqual(Object.keys(TOURS).slice(0,2),['metatron','fruit']);
let state=reduce(initialState(),{type:'tour/start',id:'fruit'});
for(let i=0;i<TOURS.fruit.steps.length;i++) {
  state=reduce(state,{type:'tour/step',index:i});assert.ok(Object.values(state.objects).every(o=>!o.visible),'The dedicated sphere construction never inherits laboratory objects');
}
for(const a of [.1,1,3]) {
  const f=fruitVolume(a),r=f.radius,planar=fruitOfLife(r);
  assert.equal(f.centers.length,14);assert.equal(f.allCenters.length,20);
  assert.equal(f.representatives.length,13);assert.equal(f.groups.filter(g=>g===0).length,2);assert.ok(f.groups.every(g=>g>=0));
  for(const [i,center]of f.centers.entries())assert.ok(Math.hypot(...f.project(center).map((x,k)=>x-planar.centers[f.groups[i]][k]))<1e-12);
  const unique=[];for(const p of f.allCenters.map(f.project))if(!unique.some(q=>Math.hypot(...p.map((v,k)=>v-q[k]))<1e-10))unique.push(p);
  assert.equal(unique.length,19,'Flower has exactly 19 distinct projected circles');
  for(const p of unique){const distances=unique.map(q=>Math.hypot(...p.map((v,k)=>v-q[k]))).filter(d=>d>1e-10);assert.ok(Math.abs(Math.min(...distances)-2*r)<1e-10,'Flower centres lie one enlarged radius apart');}
  assert.equal(f.cubeEdges.length,12);assert.equal(f.octaEdges.length,12);assert.equal(f.pairs.length,78);
  for(const tetra of f.tetrahedra){assert.equal(tetra.length,6);for(const [i,j]of tetra)assert.ok(Math.abs(Math.hypot(...f.centers[i].map((v,k)=>v-f.centers[j][k]))-2*Math.SQRT2*a)<1e-10);}
  for(const corner of f.centers.slice(0,8))assert.ok(Math.abs(corner.reduce((sum,x)=>sum+Math.abs(x/3),0)-a)<1e-10,'Inner cube vertices touch outer octahedron faces');
}
const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const source=(await readFile(new URL('../js/fruit-scene.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(three)).replace("'./fruit-life.js'",JSON.stringify(new URL('../js/fruit-life.js',import.meta.url).href));
const {createFruitScene}=await import(url(source)),{Scene,Vector3}=await import(three),scene=new Scene(),study=createFruitScene(scene),root=scene.children[0];
const snapshot=()=>{const result=[];root.traverse(o=>{if(o.material)result.push({visible:o.visible,opacity:o.material.opacity,range:o.geometry.drawRange.count,scale:o.scale.toArray()});});return {rotation:root.rotation.toArray(),result};};
for(const step of TOURS.fruit.steps){study.update(step.scene.fruit,.8);const end=snapshot();study.update(step.scene.fruit,.2);study.update(step.scene.fruit,.8);assert.deepEqual(snapshot(),end);}
const spheres=root.children.filter(o=>o.isMesh);
study.update('opening',0);const opening=snapshot();
for(const p of [.01,.2,.5,.8,1]){study.update('opening',p);assert.deepEqual(snapshot(),opening,'The first chapter remains a fully drawn, static Flower of Life');}
assert.ok(spheres.every(o=>!o.visible&&o.material.opacity===0),'The first chapter cannot reveal shaded spheres');
const visibleLines=()=>root.children.filter(o=>o.isLineSegments&&o.visible&&o.material.opacity>1e-8);
assert.equal(visibleLines().length,19,'Only the 19 gold circles are visible: no meridians, scaffold or duplicate central contour');
assert.ok(visibleLines().every(o=>o.scale.x===2));
study.update('spheres',0);assert.deepEqual(snapshot(),opening,'The second chapter begins with exactly the same circles');
study.update('spheres',.45,new Vector3(3,1,-1).normalize());
assert.ok(spheres.some(o=>o.visible&&o.material.opacity>0),'Only the second chapter reveals volume');
study.update('spheres',1);assert.equal(spheres.filter(o=>o.visible).length,14);assert.ok(spheres.every(o=>o.scale.x===1));
study.update('opening',.5);assert.deepEqual(snapshot(),opening,'Going back removes every trace of the volume');
study.update('fruit',1);assert.equal(spheres.filter(o=>o.visible).length,14);
study.update('flower',1);assert.equal(spheres.filter(o=>o.visible).length,20);assert.ok(spheres.every(o=>o.scale.x===2));
study.update('network',1);assert.equal(spheres.filter(o=>o.visible).length,14);assert.ok(spheres.every(o=>o.scale.x===1));
study.update('fruit',.8);const before=snapshot();study.update('flower',1);study.update('fruit',.8);assert.deepEqual(snapshot(),before,'Chapter re-entry restores all radii and visibility');
study.update(null,0);assert.equal(root.visible,false);study.dispose();assert.equal(scene.children.length,0);
console.log('PASS: Fruit of Life radii, tangencies, 60° symmetry, 78 pairs, menu order, 14 spheres → 13 circles, Flower of Life with 19 circles, nested cube contact, reversible spatial chapters and cleanup');
