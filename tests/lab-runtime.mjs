import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const three=pathToFileURL(process.argv[2]).href,url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64'),cache=new Map();
async function load(name){if(cache.has(name))return cache.get(name);let s=name==='scene'?`import * as THREE from 'three';export const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),controls={target:new THREE.Vector3(),update(){}};export function setViewHeight(){}`:await readFile(new URL(`../js/${name}.js`,import.meta.url),'utf8');s=s.replaceAll("'three'",JSON.stringify(three));for(const match of [...s.matchAll(/'\.\/([\w-]+)\.js'/g)])s=s.replaceAll(match[0],JSON.stringify(await load(match[1])));const value=url(s);cache.set(name,value);return value;}
const {getState,actions,ALL_IDS}=await import(await load('state')),{levels}=await import(await load('levels')),{updateLab,derivedObjects}=await import(await load('lab'));
actions.lab('layers',{hull:true,intersection:true,projection:true});updateLab(0);assert.equal(levels[0].objs.merkaba_up.vis,true);assert.equal(derivedObjects[0].data.faces.length,6);assert.equal(derivedObjects[1].data.faces.length,8);
actions.lab('rotation',{mode:'independent',upAxis:'x',downAxis:'z',running:true});actions.recursion({depth:3});
const start=performance.now();for(let frame=0;frame<180;frame++)updateLab(1/60);console.log(`Transform + hull/intersection CPU: ${((performance.now()-start)/180).toFixed(2)} ms/frame at 3 levels`);
assert.ok(derivedObjects.every(o=>o.data.volume>0));assert.notEqual(getState().lab.rotation.up,0);
actions.lab('rotation',{angle:0,up:0,down:0,running:false});updateLab(0);assert.equal(derivedObjects[0].data.faces.length,6);assert.equal(derivedObjects[1].data.faces.length,8);
actions.lab('explode',{scope:'components'});actions.lab('collections',{explode:1},'merkaba');updateLab(0);assert.equal(derivedObjects[1].data.volume,0);
actions.lab('collections',{explode:0},'merkaba');updateLab(0);assert.equal(derivedObjects[1].data.faces.length,8);assert.equal(levels[0].objs.merkaba_up.group.position.length(),0);
actions.lab('layers',{source:false});actions.objects(['merkaba_up','merkaba_down'],{visible:false});assert.equal(getState().lab.layers.hull,false);assert.equal(getState().lab.layers.hullFaces,false);assert.equal(getState().lab.rotation.running,false);
actions.objects(['merkaba_up','merkaba_down'],{visible:true});updateLab(0);assert.equal(levels[0].objs.merkaba_up.group.visible,true);
actions.lab('layers',{hullFaces:true});updateLab(0);assert.equal(getState().lab.layers.hull,true);
actions.objects(ALL_IDS,{visible:false});updateLab(0);assert.ok(derivedObjects.every(o=>!o.object.vis));
actions.objects(['cube5_1','cube5_3'],{visible:true});const previous=getState().objects;actions.solo('cube5','cube5_4');actions.restore('cube5');for(const id of ['cube5_0','cube5_1','cube5_2','cube5_3','cube5_4'])assert.deepEqual(getState().objects[id],previous[id]);
console.log('PASS: live layers synchronized, recursion, reset, separation/assembly, parent cascade, source recovery, solo/restore');
// A visibility change while exploded must not rearrange already placed bodies.
actions.objects(ALL_IDS,{visible:false});actions.objects(['cube','tetrahedron','octahedron'],{visible:true});updateLab(0);actions.lab('explode',{scope:'scene',value:1});updateLab(0);
const cubePosition=levels[0].objs.cube.group.position.clone();actions.objects(['tetrahedron'],{visible:false});updateLab(0);assert.ok(levels[0].objs.cube.group.position.distanceTo(cubePosition)<1e-12);
actions.lab('explode',{value:0});updateLab(0);assert.ok(levels.every(level=>Object.values(level.objs).every(o=>o.group.position.length()===0)));
// Replaced derived buffers and obsolete recursion instances must be disposed.
actions.lab('layers',{hull:true,intersection:true});updateLab(0);let disposed=0;for(const owner of derivedObjects)owner.edges.geometry.addEventListener('dispose',()=>disposed++);
actions.lab('rotation',{up:23});updateLab(0);assert.equal(disposed,6);
let materialDisposed=false;derivedObjects[0].object.fMat.addEventListener('dispose',()=>materialDisposed=true);actions.recursion({depth:1});updateLab(0);assert.equal(materialDisposed,true);assert.equal(derivedObjects.length,2);
console.log('PASS: stable explode layout, exact restoration, disposed replaced buffers/materials');
actions.objects(ALL_IDS,{visible:false});let commits=0;const {subscribe}=await import(await load('state'));const unsubscribe=subscribe(()=>commits++);
actions.assembly('tetra5',{explode:.7});assert.equal(commits,1);assert.equal(getState().objects.tetra5_0.visible,true);assert.equal(getState().lab.collections.tetra5.explode,.7);
actions.lab('explode',{scope:'scene',value:.4});assert.equal(getState().lab.collections.tetra5.explode,0);
actions.assembly('cube5',{explode:.3});assert.equal(getState().lab.explode.value,0);unsubscribe();
console.log('PASS: atomic assembly reveals members and mutually exclusive explode scopes reset inactive offsets');
