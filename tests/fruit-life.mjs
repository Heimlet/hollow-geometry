import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {fruitOfLife,fruitCircle} from '../js/fruit-life.js';
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
  state=reduce(state,{type:'tour/step',index:i});assert.ok(Object.values(state.objects).every(o=>!o.visible),'The planar Fruit never inherits the 3D node constellation');
}
const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const source=(await readFile(new URL('../js/fruit-scene.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(three)).replace("'./fruit-life.js'",JSON.stringify(new URL('../js/fruit-life.js',import.meta.url).href));
const {createFruitScene}=await import(url(source)),{Scene}=await import(three),scene=new Scene(),study=createFruitScene(scene),root=scene.children[0];
const snapshot=()=>{const result=[];root.traverse(o=>{if(o.material)result.push({visible:o.visible,opacity:o.material.opacity,range:o.geometry.drawRange.count,scale:o.scale.toArray()});});return {rotation:root.rotation.toArray(),result};};
for(const step of TOURS.fruit.steps){study.update(step.scene.fruit,.8);const end=snapshot();study.update(step.scene.fruit,.2);study.update(step.scene.fruit,.8);assert.deepEqual(snapshot(),end);}
study.update(null,0);assert.equal(root.visible,false);study.dispose();assert.equal(scene.children.length,0);
console.log('PASS: Fruit of Life radii, tangencies, 60° symmetry, 78 pairs, menu order, isolated planar scene, reversible ten-chapter rendering and cleanup');
