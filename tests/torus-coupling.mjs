import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {initialState,reduce} from '../js/state.js';
import {TOURS,tourStep} from '../js/tour-data.js';
import {expansionAt,expansionZoom,spiralGuide,torusFrameFromAnchors,TORUS,ORBIT_SEEDS,EXPANSION_TARGET_SCALE} from '../js/torus-math.js';
import {PHI,CR,A} from '../js/constants.js';
import {tetraWitnessAppearance,torusSourceMix} from '../js/tour-effects.js';
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
const THREE=await import(three),{tetraVerts,mkGeom}=await import(await load('geometry')),{merkabaAnchors,cubeHalfHeight,dodecahedronWitness,createTorusWitness}=await import(await load('torus-witness')),{createTorusScene}=await import(await load('torus-scene'));
const parent=new THREE.Group(),level={objs:{}};
for(const [id,inverted]of [['merkaba_up',false],['merkaba_down',true]]){
 const mesh=new THREE.Mesh(mkGeom(tetraVerts(CR,inverted)),new THREE.MeshBasicMaterial());parent.add(mesh);level.objs[id]={mesh};
}
const cube=new THREE.Mesh(new THREE.BoxGeometry(2*A,2*A,2*A));parent.add(cube);level.objs.cube={mesh:cube};
const scene=new THREE.Scene(),torus=createTorusScene(scene),root=scene.children[0];
for(const scale of [.23,1,3.14,8.8])for(const angle of [-12.7,-1.3,0,.4,Math.PI/2,6.8]){
 parent.scale.setScalar(scale);level.objs.merkaba_up.mesh.rotation.y=angle;level.objs.merkaba_down.mesh.rotation.y=-angle;parent.updateMatrixWorld(true);
 const anchors=merkabaAnchors(level),f=torusFrameFromAnchors(anchors,cubeHalfHeight(level)),shape=f.shape;
 near(shape.height,cubeHalfHeight(level),'Torus top/bottom coincide with the current cube faces');
 near(shape.major,Math.SQRT2*A*scale,'Meridian centre lies at the actual vertex orbit radius',2e-6);
 for(const [x,y,z]of anchors)near(((Math.hypot(x,y)-shape.major)/shape.tube)**2+(z/shape.height)**2,1,'Actual source vertices lie on the analytic torus',1e-12);
 // Deliberately provide a wrong animation scale: the torus must measure sources.
 torus.update('whole',.5,5,{rotation:angle,scale:1,anchors,cubeHalfHeight:cubeHalfHeight(level)});root.updateMatrixWorld(true);
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
const heightGuide=root.getObjectByName('Torus height · current cube');
assert.equal(heightGuide.visible,true);
near(heightGuide.children[0].geometry.attributes.position.getZ(0)*heightGuide.scale.z,-future.scale.z*A,'Lower torus guide meets the current cube plane',1e-6);
torus.update('whole',.3,0);assert.equal(heightGuide.visible,false,'Temporary height construction clears after the reveal');

torus.update('inscription',.5,0,{rotation:0});
const inscription=root.getObjectByName('Cube octahedron cube · exact factor three');assert.equal(inscription.visible,true);near(inscription.children[0].scale.x,3,'The old exact cube construction is retained');
const faceMesh=inscription.children[1].children.find(o=>o.isMesh),facePositions=faceMesh.geometry.attributes.position;
for(let i=0;i<facePositions.count;i+=3){const centroid=new THREE.Vector3();for(let j=0;j<3;j++)centroid.add(new THREE.Vector3().fromBufferAttribute(facePositions,i+j));centroid.multiplyScalar(inscription.children[1].scale.x/3);centroid.toArray().forEach(x=>near(Math.abs(x),A,'Actual face centroid is a small cube vertex',1e-6));}
for(const seed of ORBIT_SEEDS)near(seed.point.reduce((sum,x)=>sum+Math.abs(x),0),3*A,'Current cube corners are on the outer octahedron faces');
torus.update('spiral',.5,0);assert.equal(inscription.visible,false);
const dodeca=new THREE.DodecahedronGeometry(CR),proof=dodecahedronWitness(dodeca);
near(proof.diagonal[0].distanceTo(proof.diagonal[1])/proof.edge[0].distanceTo(proof.edge[1]),PHI,'Phi is measured on the rendered dodecahedron',1e-6);

// Cube and live intersection have the SAME vertical extent at every angle.
const {intersection}=await import(await load('polyhedra-math'));
for(let degree=0;degree<=360;degree+=2){
 const q=sign=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),sign*degree*Math.PI/180);
 const points=sign=>tetraVerts(CR,sign<0).map(p=>new THREE.Vector3(...p).applyQuaternion(q(sign)));
 const core=intersection(points(1),points(-1)),height=core.vertices.map(p=>p.y);
 near(Math.max(...height),A,'Live intersection retains the upper cube-face centre');
 near(Math.min(...height),-A,'Live intersection retains the lower cube-face centre');
}
// The teaching octahedra use six genuine edge crossings / cube face centres.
torus.update('mechanism',.23,0,{intersectionWitness:true});root.updateMatrixWorld(true);
const intersectionProof=root.getObjectByName('Octahedron from six edge crossings');assert.equal(intersectionProof.visible,true);
const canonical=intersection(tetraVerts(CR,false).map(p=>new THREE.Vector3(...p)),tetraVerts(CR,true).map(p=>new THREE.Vector3(...p)));
for(const crossing of intersectionProof.children.filter(o=>o.isGroup)){
 const dot=crossing.children.find(o=>o.isMesh),world=dot.getWorldPosition(new THREE.Vector3());
 assert.ok(canonical.vertices.some(p=>p.distanceTo(world)<1e-6),'Every teaching point is a computed intersection vertex');
 assert.equal(crossing.children.filter(o=>o.isLineSegments).length,2);
 for(const line of crossing.children.filter(o=>o.isLineSegments)){
  const attr=line.geometry.attributes.position,mid=new THREE.Vector3().fromBufferAttribute(attr,0).lerp(new THREE.Vector3().fromBufferAttribute(attr,1),.5).applyMatrix4(line.matrixWorld);
  near(mid.distanceTo(world),0,'The two original tetrahedron edges meet at their midpoint',1e-6);
 }
}
torus.update('inscription',.55,0);root.updateMatrixWorld(true);
const faceProof=root.getObjectByName('Six cube faces to octahedron vertices');assert.equal(faceProof.visible,true);
for(const face of faceProof.children){const dot=face.children.find(o=>o.geometry.type==='SphereGeometry'),p=dot.position.toArray();assert.equal(p.filter(x=>x!==0).length,1);near(Math.hypot(...p),3*A,'The external octahedron vertex is a current outer-cube face centre');}

// A chapter boundary must agree in every actually drawn overlay, not only angle.
function drawn(){const parts=[];root.updateMatrixWorld(true);root.traverseVisible(o=>{if(!o.material||o.material.opacity<1e-8||o.geometry.drawRange.count===0)return;parts.push({id:o.uuid,opacity:o.material.opacity,matrix:o.matrixWorld.elements.slice(),range:o.geometry.drawRange.count});});return parts;}
torus.update('cage',1,0,{rotation:2*Math.PI});const lastSix=drawn();
torus.update('growth',0,0,{rotation:2*Math.PI,expansion:expansionAt({expansionFrom:0,expansionDuration:1},0)});const firstSeven=drawn();
assert.equal(lastSix.length,firstSeven.length,'No contours pop in at 6 → 7');
lastSix.forEach((part,i)=>{const next=firstSeven[i];assert.equal(part.id,next.id);near(part.opacity,next.opacity,'Opacity is continuous');part.matrix.forEach((v,k)=>near(v,next.matrix[k],'World transform is continuous'));assert.equal(part.range,next.range);});
for(const i of [13,14,15]){
 const s=reduce(initialState(),{type:'tour/start',id:'torus',index:i}),recipe=TOURS.torus.steps[i].scene;
 for(const id of ['merkaba_up','merkaba_down']){assert.equal(s.objects[id].faces,true);assert.equal(s.objects[id].opacity,initialState().objects[id].opacity,'Use the laboratory default face transparency');}
 assert.equal(s.objects.cube.visible,true);assert.equal(s.objects.dodecahedron.visible,true);
 near(torusSourceMix(recipe,1),1,'The end of each final chapter contains source surfaces');
 if(i>13){assert.equal(s.lab.layers.intersection,false);assert.equal(s.lab.layers.hull,false);}
 torus.update(recipe.torus,1,0);assert.ok(root.children.filter(o=>o.name.startsWith('Intersection scale echo')).every(o=>!o.visible),'No green pooled cores after the surface exchange');
}
near(torusSourceMix(TOURS.torus.steps[13].scene,0),0,'Chapter 14 begins on the previous core');

// Five equal edges and planarity establish that the highlighted diagonal
// belongs to a real pentagonal face, not a camera-space decoration.
const points=proof.face.points,normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
for(let i=0;i<5;i++){near(points[i].distanceTo(points[(i+1)%5]),proof.face.short,'Regular pentagon edges',1e-6);near(points[i].clone().sub(points[0]).dot(normal),0,'Face is planar',1e-6);}

// Verify the actual annotation geometry against actual rendered source edges,
// including parent scaling, rotation, translation and camera changes.
globalThis.innerWidth=1280;globalThis.innerHeight=800;
globalThis.document={createElement:()=>({style:{},setAttribute(){},remove(){}}),body:{append(){}}};
const {SObj}=await import(await load('geometry')),source=new SObj('dodecahedron',dodeca.clone(),null,0xff00ff,.08);
scene.add(parent);parent.add(source.group);const witness=createTorusWitness(scene),camera=new THREE.OrthographicCamera(-20,20,12,-12,.01,500);
camera.position.set(15,8,25);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
for(const scale of [.3,2.7,8.9,1.01]){
 parent.scale.setScalar(scale);source.group.rotation.set(.3,scale/3,-.1);source.group.position.set(.7,-.3,1.2);scene.updateMatrixWorld(true);
 witness.update(source,.35,camera);
 const highlight=source.group.getObjectByName('Dodecahedron · measured golden ratio');assert.ok(highlight,'Annotations inherit the source transform');
 const outline=highlight.children.find(o=>o.isLineSegments),p=outline.geometry.attributes.position,e=source.edges.geometry.attributes.position;
 for(let i=0;i<p.count;i+=2){const a=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(outline.matrixWorld),b=new THREE.Vector3().fromBufferAttribute(p,i+1).applyMatrix4(outline.matrixWorld);
  let error=Infinity;for(let j=0;j<e.count;j+=2){const x=new THREE.Vector3().fromBufferAttribute(e,j).applyMatrix4(source.edges.matrixWorld),y=new THREE.Vector3().fromBufferAttribute(e,j+1).applyMatrix4(source.edges.matrixWorld);error=Math.min(error,a.distanceTo(x)+b.distanceTo(y),a.distanceTo(y)+b.distanceTo(x));}
  near(error,0,'Every highlighted side is an actual rendered edge',2e-5);
 }
}
witness.dispose();source.mesh.geometry.dispose();source.edges.geometry.dispose();source.fMat.dispose();source.eMat.dispose();scene.remove(parent);

for(const turn of [-100000,-20,-2,0,2,20,100000]){
 const f=expansionAt({expansionFrom:2,expansionDuration:0},0,{turnOffset:turn,logOffset:turn*Math.log(PHI)});
 assert.ok(f.scale>=1&&f.scale<=9&&Number.isFinite(f.scale));near(f.logScale,Math.log(f.scale)+f.units*2*Math.log(3),'Rebasing retains the full physical scale',1e-9);
}
torus.dispose();dodeca.dispose();for(const object of Object.values(level.objs)){object.mesh.geometry.dispose();object.mesh.material.dispose();}
assert.equal(scene.children.length,0);
console.log('PASS: reversible golden coupling and cube-defined torus height, continuous chapters, source-measured torus contacts, real dodecahedron ratio, pause/seek and bounded reversible units');
