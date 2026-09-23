import { getPreset } from './preset-data.js';
/** All transform consumers read these same per-frame results. */
import * as THREE from 'three';
import { COMPOUNDS, compoundOf } from './compound-data.js';
import { CR, INFO } from './constants.js';
import { getState, actions } from './state.js';
import { levels } from './levels.js';
import { scene, camera, controls, setViewHeight } from './scene.js';
import { SObj, tetraVerts } from './geometry.js';
import { hull, intersection, packGeometry, packEdges, explodedOffset } from './polyhedra-math.js';
export const derivedObjects=[];
let generation=null;
const links=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x7a90ad,transparent:true,opacity:.3}));scene.add(links);
let linkSignature='', sceneLayout=new Map(), scenePlane=new THREE.Quaternion(), componentPlanes=new Map(), statusNode;
export function setLabStatus(node){statusNode=node;}
function axis(name,vector) {return new THREE.Vector3(...({x:[1,0,0],y:[0,1,0],z:[0,0,1],diagonal:[1,1,1],custom:vector}[name])).normalize();}
const rotation=(name,angle,vector)=>new THREE.Quaternion().setFromAxisAngle(axis(name,vector),THREE.MathUtils.degToRad(angle));
function createDerived(level,kind) {
  const id=`merkaba_${kind}`,name=kind==='hull'?'Оболочка Меркабы':'Пересечение Меркабы';
  INFO[id]={name,nameEn:kind==='hull'?'Convex Hull':'Intersection',desc:kind==='hull'?'Минимальная выпуклая оболочка по вершинам двух тетраэдров. При канонической сборке это куб.':'Общий объём двух тетраэдров. При канонической сборке это правильный октаэдр.',sym:'Зависит от поворота',dual:'—',element:'Геометрическое построение'};
  const object=new SObj(id,new THREE.BufferGeometry(),new THREE.BufferGeometry(),kind==='hull'?0xb7a3ff:0x76ffc2,.15);scene.add(object.group);
  return {id,kind,object,level:level.idx,key:`${id}:${level.idx}`,edges:object.edges,signature:'',data:null};
}
function dropDerived() {for(const owner of derivedObjects){scene.remove(owner.object.group);owner.object.mesh.geometry.dispose();owner.edges.geometry.dispose();owner.object.fMat.dispose();owner.object.eMat.dispose();}derivedObjects.length=0;}
export function updateLab(dt) {
  let state=getState(),lab=state.lab,rot=lab.rotation;
  const elapsed=Math.min(dt,.05),wrap=v=>((v+180)%360+360)%360-180;
  const active=state.objects.merkaba_up.visible||state.objects.merkaba_down.visible;
  if(rot.running&&active) {
    const patch={};if(rot.mode==='whole')patch.angle=wrap(rot.angle+elapsed*rot.speed*rot.direction);
    if(['up','counter','independent'].includes(rot.mode))patch.up=wrap(rot.up+elapsed*(rot.mode==='independent'?rot.upSpeed*rot.upDirection:rot.speed*rot.direction));
    if(['down','counter','independent'].includes(rot.mode))patch.down=wrap(rot.down+elapsed*(rot.mode==='independent'?rot.downSpeed*rot.downDirection:rot.speed*rot.direction*(rot.mode==='counter'?-1:1)));
    actions.lab('rotation',patch);
  }
  if(lab.explode.direction) {const value=THREE.MathUtils.clamp(lab.explode.value+elapsed*lab.explode.direction/1.5,0,1);actions.lab('explode',{value,direction:value===0||value===1?0:lab.explode.direction});}
  for(const c of COMPOUNDS){const conf=lab.collections[c.id];if(conf.direction){const explode=THREE.MathUtils.clamp(conf.explode+elapsed*conf.direction/1.5,0,1);actions.lab('collections',{explode,direction:explode===0||explode===1?0:conf.direction},c.id);}}
  state=getState();lab=state.lab;rot=lab.rotation;
  if(generation!==levels[0]){dropDerived();generation=levels[0];for(const level of levels)for(const kind of ['hull','intersection'])derivedObjects.push(createDerived(level,kind));}
  const whole=rotation(rot.axis,rot.angle,rot.vector),qUp=rotation(rot.upAxis,rot.up,rot.vector),qDown=rotation(rot.downAxis,rot.down,rot.vector);
  const visible=[];for(const level of levels)for(const [id,o]of [...Object.entries(level.objs),['_metatron_',level.mc]])if(o.vis)visible.push({id,level,object:o});
  const positions=[];
  if(lab.explode.value===0){sceneLayout.clear();scenePlane.copy(camera.quaternion);}
  for(const pack of COMPOUNDS){if(lab.collections[pack.id].explode===0)componentPlanes.delete(pack.id);else if(!componentPlanes.has(pack.id))componentPlanes.set(pack.id,(pack.id==='merkaba'?whole.clone().invert():new THREE.Quaternion()).multiply(camera.quaternion));}
  if(lab.explode.scope==='scene'&&lab.explode.value>0) {
    if(!sceneLayout.size)visible.forEach((v,i)=>sceneLayout.set(`${v.id}:${v.level.idx}`,explodedOffset(i,visible.length,CR,1)));
    for(const entry of visible) {
      const key=`${entry.id}:${entry.level.idx}`;if(sceneLayout.has(key))continue;
      let p=new THREE.Vector3(),radius=CR*2+.35;const theta=sceneLayout.size*2.399963229728653;
      do {p.set(Math.cos(theta)*radius,Math.sin(theta)*radius,0);radius+=CR*2+.35;} while([...sceneLayout.values()].some(other=>p.distanceTo(other)<CR*2+.35));
      sceneLayout.set(key,p);
    }
  }
  for(const level of levels)for(const [id,object] of [...Object.entries(level.objs),['_metatron_',level.mc]]) {
    const pack=compoundOf(id),conf=pack&&lab.collections[pack.id],key=`${id}:${level.idx}`;
    let offset=new THREE.Vector3();
    if(lab.explode.scope==='scene'&&object.vis)offset=(sceneLayout.get(key)||new THREE.Vector3()).clone().multiplyScalar(lab.explode.value).applyQuaternion(scenePlane);
    else if(pack&&object.vis)offset=explodedOffset(pack.members.indexOf(id),pack.members.length,CR*level.scale,conf.explode).applyQuaternion(componentPlanes.get(pack.id)||new THREE.Quaternion());
    const merkaba=pack?.id==='merkaba';object.group.position.copy(merkaba&&lab.explode.scope==='components'?offset.clone().applyQuaternion(whole):offset);
    object.group.quaternion.copy(merkaba?whole.clone().multiply(id==='merkaba_up'?qUp:qDown):new THREE.Quaternion());
    object.group.visible=object.vis&&(!merkaba||lab.layers.source);
    if(object.vis && offset.lengthSq()>0)positions.push(new THREE.Vector3(),object.group.position.clone());
    object.group.updateMatrixWorld(true);
  }
  links.visible=lab.explode.links&&positions.length>0;
  const signature=positions.map(p=>p.toArray().join(',')).join('|');if(signature!==linkSignature){linkSignature=signature;links.geometry.dispose();links.geometry=new THREE.BufferGeometry().setFromPoints(positions);}
  for(const owner of derivedObjects) {
    const level=levels[owner.level],visibleLayer=active&&lab.layers[owner.kind];owner.object.vis=visibleLayer;if(!visibleLayer)continue;
    const up=level.objs.merkaba_up,down=level.objs.merkaba_down,inv=whole.clone().invert();
    const upOffset=up.group.position.clone().applyQuaternion(inv),downOffset=down.group.position.clone().applyQuaternion(inv);
    const signature=[rot.up,rot.down,rot.upAxis,rot.downAxis,rot.vector.join(','),upOffset.toArray(),downOffset.toArray()].join('|');
    if(signature!==owner.signature) {
      owner.signature=signature;
      const a=tetraVerts(CR*level.scale,false).map(p=>new THREE.Vector3(...p).applyQuaternion(qUp).add(upOffset)),b=tetraVerts(CR*level.scale,true).map(p=>new THREE.Vector3(...p).applyQuaternion(qDown).add(downOffset));
      const data=owner.kind==='hull'?hull([...a,...b]):intersection(a,b);owner.data=data;
      owner.object.mesh.geometry.dispose();owner.edges.geometry.dispose();owner.object.mesh.geometry=packGeometry(data);owner.edges.geometry=packEdges(data);
      INFO[owner.id]={...INFO[owner.id],V:data.vertices.length,E:data.edges.length,F:data.faces.length,faceType:owner.kind==='intersection'&&!data.volume?(data.contact?'Касание · объём 0':'Нет общего объёма'):'Выпуклые многоугольники'};
    }
    owner.object.group.quaternion.copy(whole);owner.object.group.updateMatrixWorld(true);
    owner.object.fVis=lab.layers[owner.kind+'Faces'];owner.object.eVis=lab.layers[owner.kind+'Edges'];owner.object.op=lab.layers[owner.kind+'Opacity'];
    const preset=getPreset(state.presetId),dim=preset&&!preset.obj.includes('merkaba_up');owner.object.fMat.opacity=owner.object.op*(dim ? .08 : 1);owner.object.eMat.opacity=dim ? .04 : .85;
  }
  if(statusNode){const owners=derivedObjects.filter(o=>o.level===0&&o.object.vis), text=owners.map(o=>`${o.kind==='hull'?'Оболочка':'Пересечение'}: ${o.data?.vertices.length||0} вершин · ${o.data?.faces.length||0} граней${!o.data?.volume?(o.data?.contact?' · касание, объём 0':' · нет общего объёма'):''}`).join('\n');if(statusNode.textContent!==text)statusNode.textContent=text;}
}
export function fitVisible() {
  const box=new THREE.Box3();for(const level of levels){for(const o of Object.values(level.objs))if(o.group.visible)box.expandByObject(o.group);if(level.mc.vis)box.expandByObject(level.mc.group);}
  for(const owner of derivedObjects)if(owner.object.vis)box.expandByObject(owner.object.group);
  if(box.isEmpty())return;
  window.dispatchEvent(new Event('camera-manual-change'));
  const sidebar=document.getElementById('sidebar');
  if(innerWidth<=700)sidebar.classList.add('hidden');
  const panelWidth=sidebar.classList.contains('hidden')?0:sidebar.getBoundingClientRect().width;
  const height=box.getSize(new THREE.Vector3()).length()*1.15/Math.min(1,(innerWidth-panelWidth)/innerHeight);
  const center=box.getCenter(new THREE.Vector3()),direction=camera.position.clone().sub(controls.target).normalize(),right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
  controls.target.copy(center).addScaledVector(right,-panelWidth*height/innerHeight/2);camera.position.copy(controls.target).addScaledVector(direction,30);setViewHeight(height);controls.update();
}
