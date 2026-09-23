import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {TORUS,TORUS_AXIS,torusPoint,torusCurve,torusBounds} from '../js/torus-math.js';
import {TOURS,tourDuration} from '../js/tour-data.js';
import {KNOWLEDGE} from '../js/tour-knowledge.js';
import {initialState,reduce} from '../js/state.js';
const phi=(1+Math.sqrt(5))/2,tau=Math.PI*2;
for(const points of [torusBounds(),torusCurve(2,3),torusCurve(-2,3),torusCurve(18,18*phi)])for(const [x,y,z] of points)
  assert.ok(Math.abs((Math.hypot(x,y)-TORUS.major)**2+z*z-TORUS.tube**2)<1e-10,'Every trajectory is on the exact torus');
assert.ok(TORUS.major>TORUS.tube);assert.ok(Math.abs(Math.hypot(...TORUS_AXIS)-1)<1e-12);
const knot=torusCurve(2,3);assert.ok(Math.hypot(...knot[0].map((v,i)=>v-knot.at(-1)[i]))<1e-10);
for(let i=1;i<=18;i++)assert.ok(Math.hypot(...torusPoint(i*tau,i*tau*phi).map((v,k)=>v-torusPoint(0,0)[k]))>1e-3,'Phi winding has no return after a whole large turn');
assert.equal(Object.keys(TOURS).at(-1),'torus');assert.equal(TOURS.torus.steps.length,9);
assert.ok(tourDuration('torus')>=90&&tourDuration('torus')<=150,'Finale stays short');
assert.equal(TOURS.torus.steps[0].scene.fruit,'network');assert.equal(TOURS.torus.steps[2].scene.golden,'spiral');
for(const topic of ['torus','vortex'])for(const [,text,refs=[]]of KNOWLEDGE[topic].sections){assert.ok(text.length>30);for(const ref of refs)assert.match(KNOWLEDGE[topic].sources[ref][1],/^https:\/\//);}
assert.equal(KNOWLEDGE.vortex.sections.filter(s=>s[3]).length,4,'Vorticity has its own short, sourced formula card');
for(const id of ['torus-birth','torus-weave'])assert.equal(TOURS.torus.steps.find(s=>s.id===id).scene.reading,'vortex');
assert.equal(KNOWLEDGE.torus.setting,null,'The article must not link to unrelated laboratory controls');
let state=reduce(initialState(),{type:'tour/start',id:'torus',index:4});state=reduce(state,{type:'tour/seek',elapsed:5});
const paused=reduce(state,{type:'knowledge/open',topic:'torus'});assert.equal(paused.tour.elapsed,5);assert.equal(paused.tour.playing,false);
assert.deepEqual(paused.objects,state.objects);assert.equal(reduce(paused,{type:'tour/tick',seconds:2}),paused);
const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
let source=await readFile(new URL('../js/torus-scene.js',import.meta.url),'utf8');
source=source.replace("'three'",JSON.stringify(three)).replace("'./torus-math.js'",JSON.stringify(new URL('../js/torus-math.js',import.meta.url).href));
const {createTorusScene}=await import(url(source)),THREE=await import(three),scene=new THREE.Scene(),study=createTorusScene(scene),root=scene.children[0];
const mathSource=(await readFile(new URL('../js/polyhedra-math.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(three));
const {hull,intersection}=await import(url(mathSource));
const up=[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(v=>new THREE.Vector3(...v));
const down=up.map(v=>v.clone().negate()),axis=new THREE.Vector3(...TORUS_AXIS);
for(const id of ['torus-intersection','torus-hull']) {
  const index=TOURS.torus.steps.findIndex(s=>s.id===id),step=TOURS.torus.steps[index];
  const start=reduce(initialState(),{type:'tour/start',id:'torus',index});
  const middle=reduce(start,{type:'tour/seek',elapsed:step.seconds*.4});
  const end=reduce(start,{type:'tour/seek',elapsed:step.seconds});
  assert.equal(middle.lab.rotation.up,0);assert.ok(middle.lab.rotation.down>0&&middle.lab.rotation.down<120);
  assert.equal(middle.lab.layers.intersection,true);assert.equal(middle.lab.layers.hull,id==='torus-hull');
  const shape=s=>{const q=new THREE.Quaternion().setFromAxisAngle(axis,s.lab.rotation.down*Math.PI/180),b=down.map(v=>v.clone().applyQuaternion(q));return {inner:intersection(up,b),outer:hull([...up,...b])};};
  const a=shape(start),b=shape(middle),c=shape(end);
  assert.ok(Math.abs(a.inner.volume-b.inner.volume)>1e-3,'The actual intersection changes under relative rotation');
  assert.ok(Math.abs(a.outer.volume-b.outer.volume)>1e-3,'The actual hull changes under relative rotation');
  assert.equal(c.inner.vertices.length,6);assert.equal(c.outer.vertices.length,8);
  assert.ok(Math.abs(c.inner.volume-a.inner.volume)<1e-10);assert.ok(Math.abs(c.outer.volume-a.outer.volume)<1e-10);
  assert.deepEqual(reduce(end,{type:'tour/seek',elapsed:step.seconds*.4}).lab,middle.lab,'Seeking restores exact relative rotation and layers');
}
const snapshot=()=>{const result=[];root.traverse(o=>{if(o.material)result.push({visible:o.visible,opacity:o.material.opacity,range:o.geometry.drawRange.count,rotation:o.rotation.toArray(),uniforms:Object.entries(o.material.uniforms||{}).map(([k,v])=>[k,v.value]),points:o.isPoints?Array.from(o.geometry.attributes.position.array):null});});return result;};
const count=root.children.length;
for(const kind of ['birth','weave','golden','whole'])for(const p of [0,.1,.5,1]) {
  study.update(kind,p,p*17);const expected=snapshot();study.update('golden',.7,9);study.update(kind,p,p*17);assert.deepEqual(snapshot(),expected,'Backward navigation restores every visible layer');assert.equal(root.children.length,count);
}
root.updateMatrixWorld(true);assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(root.quaternion).distanceTo(new THREE.Vector3(...TORUS_AXIS))<1e-12);
const dots=root.children.find(o=>o.isPoints);study.update('weave',.5,7);const first=Array.from(dots.geometry.attributes.position.array);study.update('weave',.5,7);assert.deepEqual(Array.from(dots.geometry.attributes.position.array),first,'Pause freezes particles');study.update('weave',.51,7.1);assert.notDeepEqual(Array.from(dots.geometry.attributes.position.array),first);
study.update(null,0);assert.equal(root.visible,false);study.dispose();assert.equal(scene.children.length,0);
console.log('PASS: exact torus trajectories, closed trefoil, non-closing phi sample, short finale order, sourced reading, deterministic pause/seek, world alignment and cleanup');
