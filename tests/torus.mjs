import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {TORUS,TORUS_OUTER,TORI,TORUS_AXIS,TORUS_CONTACT,ORBIT_SEEDS,orbitPoint,expansionPath,expansionAt,expansionReferences,expansionViewZoom,CUBE_HOLD,cubeWitnessInk,torusPoint,torusCurve,torusBounds} from '../js/torus-math.js';
import {A,R_META} from '../js/constants.js';
import {TOURS,tourDuration} from '../js/tour-data.js';
import {KNOWLEDGE} from '../js/tour-knowledge.js';
import {initialState,reduce} from '../js/state.js';
const phi=(1+Math.sqrt(5))/2,tau=Math.PI*2;
for(const shape of TORI) {
  for(const points of [torusCurve(2,3,768,0,shape),torusCurve(-2,3,768,0,shape),torusCurve(18,18*phi,768,0,shape)])for(const [x,y,z] of points)
    assert.ok(Math.abs(((Math.hypot(x,y)-shape.major)/shape.tube)**2+(z/shape.height)**2-1)<1e-10,'Every trajectory follows its own stretched torus');
  assert.ok(shape.major>shape.tube,'The axial passage remains open');
  assert.ok(shape.height>shape.major+shape.tube,'The whole shell is taller than it is wide');
}

// The new torus is anchored to real vertex paths, not an unrelated decoration.
for(const v of [TORUS_CONTACT,-TORUS_CONTACT])for(let i=0;i<32;i++){
 const point=torusPoint(i*tau/32,v);
 assert.ok(Math.abs(Math.hypot(point[0],point[1])-R_META)<1e-10);
 assert.ok(Math.abs(Math.abs(point[2])-A)<1e-10);
}
for(const seed of ORBIT_SEEDS)for(const angle of [0,.2,1,Math.PI]){
 const point=orbitPoint(seed,angle);
 assert.ok(Math.abs(Math.hypot(point[0],point[1])-R_META)<1e-10);
 assert.equal(point[2],seed.point[2]);
}

const ids=TOURS.torus.steps.map(s=>s.id);
assert.ok(ids.indexOf('torus-hull')<ids.indexOf('torus-orbits'));
assert.ok(ids.indexOf('torus-expansion')<ids.indexOf('torus-orbits'));
assert.ok(ids.indexOf('torus-expansion')<ids.indexOf('torus-birth'));
const expanded=TOURS.torus.steps.find(s=>s.id==='torus-expansion').scene;
assert.equal(expanded.growth,true);assert.equal(expanded.depth,undefined,'The same original pair grows instead of being replaced by recursion copies');
assert.equal(ids[5],'torus-hull');assert.equal(ids[6],'torus-expansion');
assert.equal(ids.at(-1),'torus-cosmos');
let lastExpansion=null,lastChapter=null;
for(const chapter of TOURS.torus.steps.slice(6)){
 const r=chapter.scene,start=expansionAt(r,0),end=expansionAt(r,1);
 assert.ok(start.active&&end.level>start.level,'Every chapter, including the last, continues growth');
 if(lastExpansion){assert.deepEqual(start,lastExpansion,'No growth reset at chapter boundaries');assert.deepEqual(r.camera.path[0].dir,lastChapter.scene.camera.path.at(-1).dir,'Camera has no chapter jump');assert.equal(r.camera.zoom[0][1],lastChapter.scene.camera.zoom.at(-1)[1]);}
 assert.ok(end.scale<=9&&end.scale>=1,'Render coordinates stay bounded');lastExpansion=end;lastChapter=chapter;
}
for(const time of [0,1,20,100,1000,100000]){
 const frame=expansionAt({expansionFrom:time,expansionDuration:10},.5);assert.ok(Number.isFinite(frame.scale)&&frame.scale<=9);
 const refs=expansionReferences(frame.level,frame.scale);assert.equal(refs.length,5);assert.ok(refs.every(x=>x.scale<=81&&x.alpha>=0&&x.alpha<=1));
}
let previousRetreat=-Infinity;
for(let time=0;time<=200;time+=.1){const f=expansionAt({expansionFrom:time,expansionDuration:0},0),zoom=expansionViewZoom(time),retreat=f.level*Math.log(3)-Math.log(zoom);assert.ok(retreat>previousRetreat,'The camera always retreats in the expanding world');assert.ok(zoom>=.52&&zoom<=1.04);previousRetreat=retreat;}
// The two pooled ends are invisible; all surviving contours agree at rebasing.
for(const level of [1,2,20,1000]){
 const before=expansionReferences(level-1e-8,9).filter(x=>x.alpha>1e-5),after=expansionReferences(level+1e-8,9).filter(x=>x.alpha>1e-5);
 assert.equal(before.length,after.length);before.forEach((r,i)=>{assert.ok(Math.abs(r.scale-after[i].scale)<1e-5);assert.ok(Math.abs(r.alpha-after[i].alpha)<1e-5);});
}

assert.deepEqual(TORUS_AXIS,[0,1,0]);
assert.ok((TORUS_OUTER.major+TORUS_OUTER.tube)/(TORUS.major+TORUS.tube)<1.1,'Two shells stay close');
assert.ok(TORUS_OUTER.tube>TORUS.tube&&TORUS_OUTER.height>TORUS.height);
const knot=torusCurve(2,3);assert.ok(Math.hypot(...knot[0].map((v,i)=>v-knot.at(-1)[i]))<1e-10);
for(let i=1;i<=18;i++)assert.ok(Math.hypot(...torusPoint(i*tau,i*tau*phi).map((v,k)=>v-torusPoint(0,0)[k]))>1e-3,'Phi winding has no return after a whole large turn');
assert.equal(Object.keys(TOURS).at(-1),'torus');
assert.ok(tourDuration('torus')>=90&&tourDuration('torus')<=240,'Finale stays short');
assert.equal(TOURS.torus.steps[0].scene.fruit,'network');
const rectangleIndex=TOURS.torus.steps.findIndex(s=>s.id==='torus-rectangles');
const depthIndex=TOURS.torus.steps.findIndex(s=>s.id==='torus-rectangle-depth');
const axisIndex=TOURS.torus.steps.findIndex(s=>s.scene.axisGuide);
assert.ok(rectangleIndex>=0&&depthIndex===rectangleIndex+1&&axisIndex>depthIndex,'Golden subdivision and its continuation precede the vertical axis');
for(const index of [rectangleIndex,depthIndex]) {
  const chapter=TOURS.torus.steps[index];
  const initial=reduce(initialState(),{type:'tour/start',id:'torus',index});
  const halfway=reduce(initial,{type:'tour/seek',elapsed:chapter.seconds*.5});
  assert.equal(initial.goldenScene.id,'division');assert.equal(initial.objects.icosahedron.visible,true);
  assert.equal(initial.lab.layers.intersection,false);assert.equal(initial.lab.layers.hull,false);
  assert.equal(chapter.scene.axisGuide,undefined);
  assert.ok(halfway.goldenScene.progress>initial.goldenScene.progress,'Rectangles and spirals draw during the chapter');
  const axisState=reduce(halfway,{type:'tour/step',index:axisIndex});
  assert.equal(axisState.goldenScene.id,'none');assert.equal(axisState.objects.icosahedron.visible,false,'The golden source leaves with its overlay');
  const returned=reduce(axisState,{type:'tour/step',index});
  assert.deepEqual(returned.goldenScene,initial.goldenScene,'Returning starts the construction again');
}
assert.equal(TOURS.torus.steps[depthIndex].scene.divisionFrom,TOURS.torus.steps[rectangleIndex].scene.divisionTo??6,'The close-up continues the existing subdivisions');
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
const witnessIndex=ids.indexOf('torus-hull'),witnessStep=TOURS.torus.steps[witnessIndex];
const witnessStart=reduce(initialState(),{type:'tour/start',id:'torus',index:witnessIndex});
for(const p of [CUBE_HOLD.from,.4,.5,.6,CUBE_HOLD.to]){
 const held=reduce(witnessStart,{type:'tour/seek',elapsed:p*witnessStep.seconds});
 assert.equal(held.lab.rotation.up,270,'Cube reveal holds the exact canonical rotation for several seconds');
 study.update('cage',p,p*witnessStep.seconds,{rotation:held.lab.rotation.up*Math.PI/180});
 const inner=root.children.find(o=>o.name==='Future cube · next scale');assert.equal(inner.visible,true);assert.equal(inner.scale.x,3);
 // Current corners are the centroids of the larger octahedron faces.
 for(const seed of ORBIT_SEEDS)assert.ok(Math.abs(seed.point.reduce((sum,x)=>sum+Math.abs(x),0)-3*A)<1e-12);
}
assert.ok((CUBE_HOLD.to-CUBE_HOLD.from)*witnessStep.seconds>=5,'The viewer gets a real reading hold');
assert.equal(cubeWitnessInk(.8),0,'The scale explanation leaves before eight-vertex motion resumes');

for(const id of ['torus-intersection','torus-hull']) {
  const index=TOURS.torus.steps.findIndex(s=>s.id===id),step=TOURS.torus.steps[index];
  const start=reduce(initialState(),{type:'tour/start',id:'torus',index});
  const middle=reduce(start,{type:'tour/seek',elapsed:step.seconds*.2});
  const end=reduce(start,{type:'tour/seek',elapsed:step.seconds});
  assert.ok(middle.lab.rotation.up>step.scene.rotationFrom&&middle.lab.rotation.up<step.scene.rotationTo);assert.equal(middle.lab.rotation.down,-middle.lab.rotation.up);
  assert.equal(middle.lab.rotation.upAxis,'y');assert.equal(middle.lab.rotation.downAxis,'y');
  assert.equal(middle.lab.layers.intersection,true);assert.equal(middle.lab.layers.hull,id==='torus-hull');
  const shape=s=>{const q=new THREE.Quaternion().setFromAxisAngle(axis,s.lab.rotation.down*Math.PI/180),qUp=new THREE.Quaternion().setFromAxisAngle(axis,s.lab.rotation.up*Math.PI/180),a=up.map(v=>v.clone().applyQuaternion(qUp)),b=down.map(v=>v.clone().applyQuaternion(q));return {inner:intersection(a,b),outer:hull([...a,...b])};};
  const a=shape(start),b=shape(middle),c=shape(end);
  assert.ok(Math.abs(a.inner.volume-b.inner.volume)>1e-3,'The actual intersection changes under relative rotation');
  assert.ok(Math.abs(a.outer.volume-b.outer.volume)>1e-3,'The actual hull changes under relative rotation');
  assert.equal(c.inner.vertices.length,6);assert.equal(c.outer.vertices.length,8);
  assert.ok(Math.abs(c.inner.volume-a.inner.volume)<1e-10);assert.ok(Math.abs(c.outer.volume-a.outer.volume)<1e-10);
  assert.deepEqual(reduce(end,{type:'tour/seek',elapsed:step.seconds*.2}).lab,middle.lab,'Seeking restores exact relative rotation and layers');
}
const snapshot=()=>{const result=[];root.traverse(o=>{if(o.material)result.push({visible:o.visible,opacity:o.material.opacity,range:o.geometry.drawRange.count,rotation:o.rotation.toArray(),position:o.position.toArray(),scale:o.scale.toArray(),uniforms:Object.entries(o.material.uniforms||{}).map(([k,v])=>[k,v.value]),points:o.isPoints?Array.from(o.geometry.attributes.position.array):null});});return result;};
let previousMotion=null;
for(const step of TOURS.torus.steps.filter(s=>s.scene.continuousMotion)){
 if(previousMotion)assert.equal(step.scene.rotationFrom,previousMotion.rotationTo,'No rotation phase jump between chapters');
 const conf=step.scene,index=TOURS.torus.steps.indexOf(step),first=reduce(initialState(),{type:'tour/start',id:'torus',index});
 const mid=reduce(first,{type:'tour/seek',elapsed:step.seconds/2});
 assert.equal(mid.lab.rotation.up,conf.expansionFrom===undefined?(conf.rotationFrom+conf.rotationTo)/2:conf.expansionAngle+90*expansionAt(conf,.5).level,'Rotation follows the growth phase');
 const eps=1e-5,startNext=reduce(first,{type:'tour/seek',elapsed:eps});
 const last=reduce(first,{type:'tour/seek',elapsed:step.seconds}),beforeLast=reduce(first,{type:'tour/seek',elapsed:step.seconds-eps});
 assert.ok(Math.abs((startNext.lab.rotation.up-first.lab.rotation.up)/eps-(conf.expansionFrom>0?9:8))<.001,'Entry speed is shared by adjacent moving chapters');
 assert.ok(Math.abs((last.lab.rotation.up-beforeLast.lab.rotation.up)/eps-(conf.expansionFrom===undefined?8:9))<.001,'Exit speed matches without a stop');

 previousMotion=conf;
}
const count=root.children.length;assert.equal(root.children.filter(o=>o.name.includes('torus ·')).length,2,'Both torus shells are rendered');
for(const kind of ['growth','traces']){
 const e=expansionAt(expanded,.6);study.update(kind,.6,e.time,{scale:e.scale,expansion:e});
 assert.ok(root.children.filter(o=>o.name.includes('torus ·')||o.name.startsWith('Torus scale echo')).every(o=>!o.visible),'No premature torus: only rotation and its vertex traces');
}
assert.ok(Math.abs(expansionViewZoom(9.6)/expansionViewZoom(0)-2)<1e-12,'Growth must double the screen size instead of being cancelled by camera fitting');
// At every next scale the moving originals really occupy the next cube corners.
for(const integer of [1,2,3,10]){
 const time=(integer+1/90)*10,e=expansionAt({expansionFrom:time,expansionDuration:0},0);
 assert.ok(Math.abs(e.level-integer)<1e-12);
 for(const seed of ORBIT_SEEDS){const point=orbitPoint(seed,(expanded.expansionAngle+90*e.level)*Math.PI/180);assert.ok(point.every(v=>Math.abs(Math.abs(v)-A)<1e-11),'Every original vertex reaches a canonical cube corner at the next scale');}
}
for(const seed of ORBIT_SEEDS){
 const path=expansionPath(seed);assert.deepEqual(path[0],seed.point);
 assert.ok(path.at(-1).every(v=>Math.abs(Math.abs(v)-3*A)<1e-12),'The preview joins an existing vertex to its future corner');
}
const previewFrame=expansionAt(expanded,.3);
study.update('growth',.3,previewFrame.time,{rotation:(expanded.expansionAngle+90*previewFrame.level)*Math.PI/180,scale:previewFrame.scale,expansion:previewFrame});root.updateMatrixWorld(true);
const previews=root.children.filter(o=>o.name==='Vertex to next cube');assert.equal(previews.length,8);
const futureHalfSide=A*previewFrame.scale*3**(1-previewFrame.level%1);
for(const g of previews){assert.equal(g.visible,true);const marker=g.children.find(o=>o.isMesh),point=marker.getWorldPosition(new THREE.Vector3());assert.ok(point.toArray().every(v=>Math.abs(Math.abs(v)-futureHalfSide)<1e-10),'Colour-matched target markers coincide with the coming cube');assert.equal(g.children.find(o=>o.isLineSegments).geometry.drawRange.start,0,'Animation only changes draw count, keeping thick-line buffers reusable');}


for(const step of TOURS.torus.steps.filter(s=>s.scene.axisGuide)){
 const conf=step.scene;assert.equal(conf.rotationAxis,'y');
 for(const key of conf.camera.path)assert.ok(Math.abs(key.dir[1]/Math.hypot(...key.dir))<.3,'Camera sees horizontal rotation from the side');
 if(conf.torus){assert.equal(conf.intersection,true);assert.equal(conf.hull,true);}
}
for(const kind of ['cage','traces','growth','birth','weave','golden','whole','cosmos'])for(const p of [0,.1,.5,1]) {
  study.update(kind,p,p*17);const expected=snapshot();study.update('golden',.7,9);study.update(kind,p,p*17);assert.deepEqual(snapshot(),expected,'Backward navigation restores every visible layer');assert.equal(root.children.length,count);
}
root.updateMatrixWorld(true);assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(root.quaternion).distanceTo(new THREE.Vector3(...TORUS_AXIS))<1e-12);
const traces=root.children.find(o=>o.name==='Actual tetrahedron vertex orbits');
study.update('growth',.5,7,{rotation:.8,scale:3});root.updateMatrixWorld(true);
const heads=traces.children.filter(o=>o.isMesh);
for(let i=0;i<8;i++){
 const seed=ORBIT_SEEDS[i],local=orbitPoint(seed,.8),world=heads[i].getWorldPosition(new THREE.Vector3());
 assert.ok(world.distanceTo(new THREE.Vector3(local[0],local[2],-local[1]).multiplyScalar(3))<1e-10,'Trace heads follow scaled rotating vertices in world space');
}
study.update('birth',0);assert.equal(traces.scale.x,1,'The expansion transform is reset on chapter changes');
const resources=()=>{const set=new Set();root.traverse(o=>{if(o.geometry)set.add(o.geometry);if(o.material)set.add(o.material);});return set;};
const originalResources=resources();
for(let time=0;time<2000;time+=7){
 const frame=expansionAt({expansionFrom:time,expansionDuration:1},.5);
 study.update('whole',.5,frame.time,{scale:frame.scale,expansion:frame});
 for(const shell of root.children.filter(o=>o.name.includes('torus ·')))assert.equal(shell.scale.x,frame.scale,'Both existing tori share the original bodies’ frame');
}
assert.deepEqual(resources(),originalResources,'Long expansion reuses geometry and materials');
assert.equal(root.children.length,count,'Repeated growth never accumulates scene objects');
const late=expansionAt(TOURS.torus.steps.at(-1).scene,.8);
study.update('cosmos',.8,late.time,{scale:late.scale,expansion:late});const lateSnapshot=snapshot();
study.update('growth',0,0,{expansion:expansionAt(expanded,0)});
study.update('cosmos',.8,late.time,{scale:late.scale,expansion:late});assert.deepEqual(snapshot(),lateSnapshot,'Seeking restores the same pooled expansion frame');

const dots=root.children.find(o=>o.isPoints);study.update('weave',.5,7);const first=Array.from(dots.geometry.attributes.position.array);study.update('weave',.5,7);assert.deepEqual(Array.from(dots.geometry.attributes.position.array),first,'Pause freezes particles');study.update('weave',.51,7.1);assert.notDeepEqual(Array.from(dots.geometry.attributes.position.array),first);
study.update(null,0,0,{axis:true});assert.equal(root.visible,true);assert.ok(root.children.filter(o=>o.isGroup).every(o=>!o.visible));
study.update(null,0);assert.equal(root.visible,false);study.dispose();assert.equal(scene.children.length,0);
console.log('PASS: exact torus trajectories, closed trefoil, non-closing phi sample, short finale order, sourced reading, deterministic pause/seek, world alignment and cleanup');
