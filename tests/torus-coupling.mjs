import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {initialState,reduce} from '../js/state.js';
import {TOURS,tourStep} from '../js/tour-data.js';
import {expansionAt,expansionZoom,spiralGuide,torusFrameFromAnchors,TORUS,ORBIT_SEEDS,EXPANSION_TARGET_SCALE} from '../js/torus-math.js';
import {PHI,CR,A} from '../js/constants.js';
import {tetraWitnessAppearance} from '../js/tour-effects.js';
const near=(a,b,message,epsilon=1e-9)=>assert.ok(Math.abs(a-b)<epsilon,`${message}: ${a} vs ${b}`);
const frame=state=>expansionAt(tourStep(state).scene,state.tour.elapsed/tourStep(state).seconds,state.tour.motion);
const index=TOURS.torus.steps.findIndex(step=>step.id==='torus-golden');
assert.equal(TOURS.torus.steps[index].scene.expansionRatio,PHI);
assert.equal(TOURS.torus.steps[index-1].scene.expansionRatio,PHI);
let state=reduce(initialState(),{type:'tour/start',id:'torus',index}),start=state;
assert.equal(state.objects.dodecahedron.visible,true);
const a=frame(state);
state=reduce(state,{type:'tour/tick',seconds:10});const b=frame(state);
near(state.lab.rotation.up-start.lab.rotation.up,90,'One quarter turn');
near(Math.exp(b.logScale-a.logScale),PHI,'A quarter turn is exactly a golden scale step');
const reversed=reduce(state,{type:'tour/reverse'}),same=frame(reversed);
assert.deepEqual(same,b,'Reversal cannot jump any vertex, torus dimension or reference frame');
assert.deepEqual(reversed.lab,state.lab);near(expansionZoom(same),expansionZoom(b),'Camera does not jump on reversal');
state=reduce(reversed,{type:'tour/tick',seconds:10});const c=frame(state);
near(c.logScale,a.logScale,'Reverse returns to the same physical scale');near(c.turns,a.turns,'Reverse returns to the same angle');near(c.scale,a.scale,'Render units are reversible');
near(state.lab.rotation.up,start.lab.rotation.up,'Tetrahedron pose is reversible');near(expansionZoom(c),expansionZoom(a),'Camera retraces magnification');
const paused=reduce(state,{type:'tour/control',patch:{playing:false}});
assert.equal(reduce(paused,{type:'tour/tick',seconds:3}),paused,'Pause freezes the whole coupled system');
const read=reduce(reversed,{type:'knowledge/open',topic:'coupling',history:false});
assert.equal(reduce(read,{type:'tour/tick',seconds:3}),read);assert.equal(reduce(read,{type:'knowledge/close',resume:true,history:false}).tour.motion.direction,-1);
const seek=reduce(state,{type:'tour/seek',elapsed:2}),fresh=reduce(start,{type:'tour/seek',elapsed:2});assert.deepEqual(seek.lab,fresh.lab);assert.deepEqual(seek.tour.motion,fresh.tour.motion,'Seeking is a deterministic script position');
assert.throws(()=>reduce(initialState(),{type:'tour/reverse'}));

// Automatic chapter changes carry the signed motion, not a second clock.
state=reduce(initialState(),{type:'tour/start',id:'torus',index:index-1});
state=reduce(state,{type:'tour/seek',elapsed:tourStep(state).seconds-.01});
state=reduce(state,{type:'tour/control',patch:{playing:true}});state=reduce(state,{type:'tour/reverse'});
const before=frame(state);state=reduce(state,{type:'tour/tick',seconds:.01});
assert.equal(state.tour.index,index);assert.equal(state.tour.motion.direction,-1);assert.equal(state.objects.dodecahedron.visible,true);
near(frame(state).turns,before.turns-.001,'Reversal survives the chapter boundary');
near(frame(state).logScale,before.logScale-.001*Math.log(PHI),'No scale reset between chapters');
const boundary=frame(state);state=reduce(state,{type:'tour/tick',seconds:1});
near(frame(state).logScale-boundary.logScale,-.1*Math.log(PHI),'The next movement retains the golden law');

const tetraFocus=tetraWitnessAppearance(.5);assert.ok(tetraFocus.edges>.9&&tetraFocus.coreFaces<.04&&tetraFocus.coreEdges<.2,'Sixth chapter emphasises the original tetrahedra');
near(tetraWitnessAppearance(1).edges,.2,'The pair hands over smoothly to the green core in chapter seven');

// Completing the narration never freezes the finale. Pause, reading, inverse
// motion and restart remain explicit actions; no new chapter or object is added.
let endless=reduce(initialState(),{type:'tour/start',id:'torus',index:TOURS.torus.steps.length-1});
endless=reduce(endless,{type:'tour/tick',seconds:tourStep(endless).seconds});
assert.equal(endless.tour.phase,'complete');assert.equal(endless.tour.playing,true);
const endFrame=frame(endless),endIndex=endless.tour.index;
for(let i=0;i<600;i++)endless=reduce(endless,{type:'tour/tick',seconds:10});
assert.equal(endless.tour.index,endIndex);assert.equal(endless.tour.elapsed,tourStep(endless).seconds);
near(frame(endless).logScale-endFrame.logScale,600*Math.log(PHI),'Long finale continues the same golden law',1e-8);
assert.ok(frame(endless).scale>=1&&frame(endless).scale<9);
const last=frame(endless);endless=reduce(endless,{type:'tour/reverse'});endless=reduce(endless,{type:'tour/tick',seconds:10});
near(frame(endless).logScale,last.logScale-Math.log(PHI),'Finale remains reversible',1e-8);
endless=reduce(endless,{type:'knowledge/open',topic:'coupling',history:false});assert.equal(reduce(endless,{type:'tour/tick',seconds:10}),endless);
endless=reduce(endless,{type:'knowledge/close',resume:true,history:false});assert.equal(endless.tour.index,endIndex);assert.equal(endless.tour.playing,true);
endless=reduce(endless,{type:'tour/control',patch:{playing:false}});assert.equal(reduce(endless,{type:'tour/tick',seconds:10}),endless);
endless=reduce(endless,{type:'tour/control',patch:{playing:true}});assert.equal(endless.tour.index,endIndex);
endless=reduce(endless,{type:'tour/restart'});endless=reduce(endless,{type:'tour/tick',seconds:3});assert.equal(endless.tour.index,0);

// Full turns need an unwrapped angle: same orientation, different size.
for(const ratio of [3,PHI])for(const seed of ORBIT_SEEDS)for(const turn of [-8,-1.25,0,.3,7]){
 const p=spiralGuide(seed,turn,ratio),q=spiralGuide(seed,turn+1,ratio),r=spiralGuide(seed,turn+4,ratio);
 near(Math.hypot(q[0],q[1])/Math.hypot(p[0],p[1]),ratio,'Mirrored guides have the same radial growth');
 near(q[2]/p[2],ratio,'Height shares the same similarity');
 r.forEach((v,i)=>near(v/(ratio**4),p[i],'A full turn preserves direction and changes scale',1e-7));
}

// Load the real source-mesh/renderer code, not an independent mathematical mock.
const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64'),cache=new Map();
async function load(name){if(cache.has(name))return cache.get(name);let source=await readFile(new URL('../js/'+name+'.js',import.meta.url),'utf8');source=source.replaceAll("'three'",JSON.stringify(three));for(const m of [...source.matchAll(/'\.\/([\w-]+)\.js'/g)])source=source.replaceAll(m[0],JSON.stringify(await load(m[1])));const result=url(source);cache.set(name,result);return result;}
const THREE=await import(three),{tetraVerts,mkGeom}=await import(await load('geometry')),{merkabaAnchors,dodecahedronWitness}=await import(await load('torus-witness')),{createTorusScene}=await import(await load('torus-scene'));
const parent=new THREE.Group(),level={objs:{}};
for(const [id,inverted]of [['merkaba_up',false],['merkaba_down',true]]){
 const mesh=new THREE.Mesh(mkGeom(tetraVerts(CR,inverted)),new THREE.MeshBasicMaterial());parent.add(mesh);level.objs[id]={mesh};
}
const scene=new THREE.Scene(),torus=createTorusScene(scene),root=scene.children[0];
for(const scale of [.23,1,3.14,8.8])for(const angle of [-12.7,-1.3,0,.4,Math.PI/2,6.8]){
 parent.scale.setScalar(scale);level.objs.merkaba_up.mesh.rotation.y=angle;level.objs.merkaba_down.mesh.rotation.y=-angle;parent.updateMatrixWorld(true);
 const anchors=merkabaAnchors(level),f=torusFrameFromAnchors(anchors),shape=f.shape;
 near(shape.height,Math.abs(anchors[0][2])*PHI**2,'Torus top/bottom coincide with the future cube faces');
 near(shape.major,A*scale,'Meridian centre uses the current cube inradius',1e-6);
 for(const [x,y,z]of anchors)near(((Math.hypot(x,y)-shape.major)/shape.tube)**2+(z/shape.height)**2,1,'Actual source vertices lie on the analytic torus',1e-12);
 // Deliberately provide a wrong animation scale: the torus must measure sources.
 torus.update('whole',.5,5,{rotation:angle,scale:1,anchors});root.updateMatrixWorld(true);
 const inner=root.getObjectByName('Inner torus · intersection'),heads=root.getObjectByName('Actual tetrahedron vertex orbits').children.filter(o=>o.isMesh);
 near(inner.scale.x,f.radialScale,'Shell radius is measured from the source mesh');near(inner.scale.z,f.axialScale,'Shell height is measured from the source mesh');
 const surface=inner.children.find(o=>o.isMesh),inverse=surface.matrixWorld.clone().invert();
 anchors.forEach((p,i)=>{
  const world=new THREE.Vector3(p[0],p[2],-p[1]);near(heads[i].getWorldPosition(new THREE.Vector3()).distanceTo(world),0,'Picking/visible anchor follows actual mesh');
  const local=world.clone().applyMatrix4(inverse);near(((Math.hypot(local.x,local.y)-TORUS.major)/TORUS.tube)**2+(local.z/TORUS.height)**2,1,'Rendered torus shares the measured surface');
 });
}
// The explanation draws actual paths before any external cube edge appears.
const future=root.getObjectByName('Future cube · next scale'),paths=root.children.filter(o=>o.name==='Vertex to next cube'),core=root.getObjectByName('Octahedron linking the two cube scales');
torus.update('cage',.3,0,{rotation:Math.PI*1.5});
assert.ok(paths.some(g=>g.children[1].geometry.drawRange.count>0));
assert.ok(future.children.every(edge=>edge.material.opacity===0),'The cube cannot appear before its eight endpoints');
torus.update('cage',.49,0,{rotation:Math.PI*1.5});
assert.ok(future.children.some(edge=>edge.material.opacity>0)&&future.children.some(edge=>edge.material.opacity===0),'Edges reveal progressively');
assert.ok(core.children.every(part=>part.material.opacity===0),'The future core follows the edges');
torus.update('cage',.65,0,{rotation:Math.PI*1.5});
assert.ok(future.children.every(edge=>edge.material.opacity>0));assert.ok(core.children.every(part=>part.material.opacity>0));
for(const sign of [1,-1]){
 const e=expansionAt({expansionFrom:5,expansionDuration:0},0),phase=e.turns%2;
 torus.update('growth',.4,5,{scale:e.scale,expansion:e,direction:sign,rotation:e.turns*Math.PI/2});
 near(future.scale.x,e.scale*PHI**((sign>0?2:0)-phase),'Reverse previews the smaller destination');
 for(const path of paths){assert.equal(path.children[0].visible,sign>0);assert.equal(path.children[1].visible,sign<0);}
}
torus.update('birth',.35,0,{scale:2});
const heightGuide=root.getObjectByName('Torus height · next cube');
assert.equal(heightGuide.visible,true);
near(heightGuide.children[0].geometry.attributes.position.getZ(0)*heightGuide.scale.z,-future.scale.z*A,'Lower torus guide meets the future cube plane',1e-6);
torus.update('whole',.3,0);assert.equal(heightGuide.visible,false,'Temporary height construction clears after the reveal');

torus.update('inscription',.5,0,{rotation:0});
const inscription=root.getObjectByName('Cube octahedron cube · exact factor three');assert.equal(inscription.visible,true);near(inscription.children[0].scale.x,3,'The old exact cube construction is retained');
const faceMesh=inscription.children[1].children.find(o=>o.isMesh),facePositions=faceMesh.geometry.attributes.position;
for(let i=0;i<facePositions.count;i+=3){const centroid=new THREE.Vector3();for(let j=0;j<3;j++)centroid.add(new THREE.Vector3().fromBufferAttribute(facePositions,i+j));centroid.multiplyScalar(inscription.children[1].scale.x/3);centroid.toArray().forEach(x=>near(Math.abs(x),A,'Actual face centroid is a small cube vertex',1e-6));}
for(const seed of ORBIT_SEEDS)near(seed.point.reduce((sum,x)=>sum+Math.abs(x),0),3*A,'Current cube corners are on the outer octahedron faces');
torus.update('spiral',.5,0);assert.equal(inscription.visible,false);
const dodeca=new THREE.DodecahedronGeometry(CR),proof=dodecahedronWitness(dodeca);
near(proof.diagonal[0].distanceTo(proof.diagonal[1])/proof.edge[0].distanceTo(proof.edge[1]),PHI,'Phi is measured on the rendered dodecahedron',1e-6);
// Five equal edges and planarity establish that the highlighted diagonal
// belongs to a real pentagonal face, not a camera-space decoration.
const points=proof.face.points,normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
for(let i=0;i<5;i++){near(points[i].distanceTo(points[(i+1)%5]),proof.face.short,'Regular pentagon edges',1e-6);near(points[i].clone().sub(points[0]).dot(normal),0,'Face is planar',1e-6);}
for(const turn of [-100000,-20,-2,0,2,20,100000]){
 const f=expansionAt({expansionFrom:2,expansionDuration:0},0,{turnOffset:turn,logOffset:turn*Math.log(PHI)});
 assert.ok(f.scale>=1&&f.scale<=9&&Number.isFinite(f.scale));near(f.logScale,Math.log(f.scale)+f.units*2*Math.log(3),'Rebasing retains the full physical scale',1e-9);
}
torus.dispose();dodeca.dispose();for(const object of Object.values(level.objs)){object.mesh.geometry.dispose();object.mesh.material.dispose();}
assert.equal(scene.children.length,0);
console.log('PASS: reversible golden coupling and cube-defined torus height, continuous chapters, source-measured torus contacts, real dodecahedron ratio, pause/seek and bounded reversible units');
