import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const threeURL=pathToFileURL(process.argv[2]).href,THREE=await import(threeURL);
const source=(await readFile(new URL('../js/tour-transitions.js',import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`);
const {captureVisibleParts,createTourTransition}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const scene=new THREE.Scene(),levels=[{idx:0,objs:{},mc:{vis:false}}];
function solid(id,x) {
  const group=new THREE.Group(),geometry=new THREE.BoxGeometry(2,2,2),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true,opacity:.4})),edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({transparent:true,opacity:.9}));
  group.position.x=x;group.add(mesh,edges);scene.add(group);levels[0].objs[id]={group,mesh,edges};return levels[0].objs[id];
}
const common=solid('common',0),old=solid('old',3),incoming=solid('new',-3);incoming.group.visible=false;
const transition=createTourTransition(scene),frame=(key,playing=true)=>{scene.updateMatrixWorld(true);const blend=transition.apply(key,captureVisibleParts(levels),.05,playing);return blend;};
assert.equal(frame('a'),1);transition.restore();
old.group.visible=false;incoming.group.visible=true;
let blend=frame('b');assert.ok(blend>0&&blend<.1);assert.equal(common.mesh.material.opacity,.4,'Shared figures do not blink');assert.ok(incoming.mesh.material.opacity<.04);
const ghosts=scene.children.filter(o=>o.isMesh||o.isLineSegments);assert.equal(ghosts.length,2);assert.ok(ghosts.every(o=>o.matrix.elements[12]===3),'Disappearing geometry stays in its old world pose');
let disposed=0;for(const ghost of ghosts){ghost.geometry.addEventListener('dispose',()=>disposed++);ghost.material.addEventListener('dispose',()=>disposed++);}
transition.restore();assert.equal(incoming.mesh.material.opacity,.4);assert.equal(incoming.edges.material.opacity,.9,'Temporary opacity never contaminates base materials');
const paused=frame('b',false);assert.equal(paused,blend);transition.restore();
for(let i=0;i<14;i++){blend=frame('b');transition.restore();}
assert.equal(blend,1);assert.equal(disposed,4);assert.equal(scene.children.length,3);assert.equal(common.group.position.x,0);
// A component that really changes place crossfades at its two actual coordinates.
incoming.group.position.set(-7,1,0);frame('c');assert.equal(scene.children.length,5);assert.ok(scene.children.filter(o=>o.isMesh||o.isLineSegments).every(o=>o.matrix.elements[12]===-3));transition.restore();transition.reset();assert.equal(scene.children.length,3);
console.log('PASS: shared bodies stay visible, incoming/outgoing world-space crossfade, changed placement, pause, material restoration and ghost disposal');
