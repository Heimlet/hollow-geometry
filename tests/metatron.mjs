import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {recursionMoment} from '../js/tour-effects.js';
import {metatronNodeOwner,uniqueHits} from '../js/pick-targets.js';
import {topicFor} from '../js/tour-knowledge.js';
import {TOURS} from '../js/tour-data.js';
import {initialState,reduce} from '../js/state.js';
import {metatronRelations} from '../js/metatron-relations.js';
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const three=pathToFileURL(process.argv[2]).href,{Vector3}=await import(three);
const constants=url((await readFile(new URL('../js/constants.js',import.meta.url),'utf8')).replace("'./compound-data.js'",JSON.stringify(new URL('../js/compound-data.js',import.meta.url).href)));
const source=(await readFile(new URL('../js/geometry.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(three)).replace("'./constants.js'",JSON.stringify(constants));
const {MCube}=await import(url(source));
for(const scale of [1,.38,.38**2]) {
  const meta=new MCube(3*scale,0xffffff,0),points=meta.pos.map(p=>new Vector3(...p));
  assert.equal(points.length,13);assert.equal(points[0].length(),0);
  assert.equal(meta.lines.geometry.attributes.position.count/2,78);
  let neighbours=0,opposites=0;
  for(const p of points.slice(1)) {
    assert.ok(Math.abs(p.length()-meta.R)<1e-10);
    assert.equal(points.slice(1).filter(q=>Math.abs(p.distanceTo(q)-meta.R)<1e-10).length,4);
    neighbours+=4;opposites+=points.slice(1).filter(q=>p.clone().add(q).length()<1e-10).length;
  }
  assert.equal(neighbours/2,24);assert.equal(opposites/2,6);
  const relations=metatronRelations(meta.pos,meta.R);assert.equal(relations.neighbours.length,24);assert.equal(relations.opposites.length,6);
  for(const [a,b]of relations.neighbours){assert.ok(Math.abs(points[a].distanceTo(points[b])-meta.R)<1e-10);assert.ok(Math.abs(points[a].length()-points[b].length())<1e-10);}
  for(const [axis,plane]of relations.planes.entries()) {
    assert.equal(plane.length,4);
    for(let i=0;i<4;i++){assert.equal(points[plane[i]].getComponent(axis),0);assert.ok(Math.abs(points[plane[i]].distanceTo(points[plane[(i+1)%4]])-meta.R*Math.SQRT2)<1e-10);assert.ok(Math.abs(points[plane[i]].distanceTo(points[plane[(i+2)%4]])-meta.R*2)<1e-10);}
  }
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok(points[i].distanceTo(points[j])>=meta.R-1e-10,'Balls of radius R/2 cannot overlap');
  const centre=metatronNodeOwner(meta,0,0),outer=metatronNodeOwner(meta,1,0);
  const owners=new Map([[meta.nodes[0],centre],[meta.nodes[1],outer]]);
  assert.deepEqual(uniqueHits([{object:meta.nodes[0]},{object:meta.nodes[0]},{object:meta.nodes[1]}],owners),[centre],'All nodes open one shared reading card');
  assert.equal(centre.id,'metatron','Knowledge topics must retain the existing visibility owner');
  assert.equal(topicFor('detail._metatron_.nodes'),centre.topic);
}
const recipe=TOURS.metatron.steps[8].scene;
assert.equal(recipe.effect,'recursion');
for(let level=0;level<3;level++) {
  let previous=recursionMoment(0,level,recipe.scale);
  for(let i=1;i<=1000;i++) {
    const current=recursionMoment(i/1000,level,recipe.scale);
    assert.ok(current.alpha>=0&&current.alpha<=1);
    assert.ok(Math.abs(current.scale-previous.scale)<.011);
    assert.ok(Math.abs(current.alpha-previous.alpha)<.016);
    previous=current;
  }
  assert.deepEqual(recursionMoment(1,level,recipe.scale),{scale:1,alpha:1},'Every copy returns to its exact model at the endpoint');
}
assert.equal(recursionMoment(.05,1).alpha,0);assert.equal(recursionMoment(.3,2).alpha,0);
assert.ok(recursionMoment(.7,0).alpha<.2);assert.equal(recursionMoment(.7,2).alpha,1);
let state=reduce(initialState(),{type:'tour/start',id:'metatron'});state=reduce(state,{type:'tour/step',index:8});
const paused=reduce(state,{type:'tour/control',patch:{playing:false}});
assert.equal(reduce(paused,{type:'tour/tick',seconds:1}),paused);
console.log('PASS: actual 13-node geometry, radius=edge, 24 nearest edges, six opposite pairs, distinct node inspection, continuous self-similar reveal and exact endpoint');

const studySource=(await readFile(new URL('../js/metatron-study.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(three)).replace("'./metatron-relations.js'",JSON.stringify(new URL('../js/metatron-relations.js',import.meta.url).href));
const {createMetatronStudy}=await import(url(studySource)),{Scene}=await import(three);
const scene=new Scene(),meta=new MCube(3,0xffffff,0);scene.add(meta.group);const study=createMetatronStudy(scene);
const root=scene.children.find(o=>o!==meta.group);
for(const kind of ['radii','neighbours','triangle','opposites','planes','packing']) {
  study.update(meta,kind,.8);const before=root.children.map(o=>({position:o.position.toArray(),opacity:o.material.opacity,scale:o.scale.toArray()}));
  study.update(meta,kind,.3);study.update(meta,kind,.8);
  assert.deepEqual(root.children.map(o=>({position:o.position.toArray(),opacity:o.material.opacity,scale:o.scale.toArray()})),before,'Scrubbing cannot accumulate opacity or transforms');
  if(kind==='packing') {assert.equal(root.children.length,13);root.children.forEach(o=>assert.equal(o.geometry.parameters.radius,1.5));}
}
study.update(meta,undefined,0);assert.equal(root.children.length,0);study.dispose();assert.equal(scene.children.length,1);
console.log('PASS: measured square sections and nonoverlapping contact spheres, six reversible teaching animations, complete layer cleanup');
