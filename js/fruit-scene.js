import * as THREE from 'three';
import {fruitOfLife,fruitCircle} from './fruit-life.js';
const ease=v=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
const gold=0xf2cc84,cyan=0x94d9ef;
export function createFruitScene(scene) {
  const root=new THREE.Group();root.visible=false;scene.add(root);
  const data=fruitOfLife(),circles=[],marks=[],details=new THREE.Group();root.add(details);
  function stroke(pairs,color,opacity=.9,parent=root){const geometry=new THREE.BufferGeometry().setFromPoints(pairs.flat().map(p=>new THREE.Vector3(...p)));const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity,linewidth:2.2,depthWrite:false}));parent.add(line);return line;}
  function marker(position,size,color,parent=root){const mesh=new THREE.Mesh(new THREE.SphereGeometry(size,10,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}));mesh.position.set(...position);parent.add(mesh);return mesh;}
  data.centers.forEach((center,i)=>{circles.push(stroke(fruitCircle(center,data.radius),i?cyan:gold));marks.push(marker(center,.035,i?cyan:gold));});
  let previous=null;
  function clearDetails(){details.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});details.clear();}
  function update(kind,p) {
    root.visible=!!kind;if(!kind)return;
    if(previous!==kind){clearDetails();previous=kind;
      if(kind==='touch')data.contacts.forEach(([a,b])=>marker(data.centers[a].map((v,k)=>(v+data.centers[b][k])/2),.065,gold,details));
      if(kind==='axes')stroke(Array.from({length:3},(_,i)=>[data.centers[i+7],data.centers[i+10]]),gold,.85,details);
      if(kind==='hexagons')for(const start of [1,7])stroke(Array.from({length:6},(_,i)=>[data.centers[start+i],data.centers[start+(i+1)%6]]),gold,.95,details);
      if(kind==='triangles')for(const parity of [0,1])stroke(Array.from({length:3},(_,i)=>[data.centers[7+parity+2*i],data.centers[7+parity+(2*i+2)%6]]),parity?0xc6adff:gold,.95,details);
      if(kind==='network'||kind==='free')stroke(data.pairs.map(pair=>pair.map(i=>data.centers[i])),gold,.68,details);
    }
    root.rotation.z=kind==='turn'?Math.PI/3*ease((p-.12)/.7):0;
    const fade=ease(p/.04);
    circles.forEach((circle,i)=>{
      let reveal=1;
      if(kind==='center')reveal=i?0:ease(p/.72);
      else if(kind==='six')reveal=i>6?0:i?ease((p-(i-1)*.11)/.2):1;
      else if(kind==='outer')reveal=i<7?1:ease((p-(i-7)*.11)/.2);
      circle.geometry.setDrawRange(0,2*Math.floor(96*reveal));circle.material.opacity=fade*(kind==='network'||kind==='free'?.4:.88);
      marks[i].visible=reveal>=1;marks[i].material.opacity=fade*.85;
    });
    for(const part of details.children){part.material.opacity=fade*(part.isMesh?.95:kind==='network'||kind==='free'?.68:.95);if(part.isLineSegments)part.geometry.setDrawRange(0,2*Math.floor(part.geometry.attributes.position.count/2*ease(p/.75)));else part.scale.setScalar(ease((p-.1)/.3));}
  }
  return {update,dispose(){root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});scene.remove(root);}};
}
