import * as THREE from 'three';
import { metatronRelations } from './metatron-relations.js';
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function createMetatronStudy(scene) {
  const root=new THREE.Group();root.matrixAutoUpdate=false;scene.add(root);
  let owner=null,mode=null,strokes=null,panels=[],balls=[],triangle=null,baseOpacities=new Map();
  function clear(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});root.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());baseOpacities.clear();panels=[];balls=[];triangle=strokes=null;}
  function lines(meta,pairs,color=0xf2cc84,opacity=.9){const g=new THREE.BufferGeometry().setFromPoints(pairs.flatMap(pair=>pair.map(i=>new THREE.Vector3(...meta.pos[i]))));const line=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,transparent:true,opacity,linewidth:2.3,depthWrite:false}));root.add(line);return line;}
  function face(meta,indices,color) {const positions=indices.flatMap(i=>meta.pos[i]),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false}));root.add(mesh);return mesh;}
  function update(meta,kind,p) {
    if(meta!==owner||kind!==mode) {
      clear();owner=meta;mode=kind;
      if(meta&&kind) {
        const relations=metatronRelations(meta.pos,meta.R);
        if(['radii','neighbours','opposites'].includes(kind))strokes=lines(meta,relations[kind]);
        if(kind==='triangle'){lines(meta,relations.neighbours,0x9ddbee,.3);triangle=face(meta,[0,...relations.neighbours[0]],0xf2cc84);strokes=lines(meta,[[0,1],[1,2],[2,0]]);}
        if(kind==='planes')relations.planes.forEach((q,i)=>{const color=[0xf2cc84,0x9ddbee,0xc2a4ee][i];panels.push(face(meta,[q[0],q[1],q[2],q[0],q[2],q[3]],color));lines(meta,q.map((a,j)=>[a,q[(j+1)%4]]),color);});
        if(kind==='packing') {
          const geometry=new THREE.SphereGeometry(meta.R/2,24,16);
          meta.pos.forEach((position,i)=>{const material=new THREE.MeshPhongMaterial({color:i?0x8bcee8:0xf2cc84,transparent:true,opacity:i?.19:.72,depthWrite:false,shininess:55});const ball=new THREE.Mesh(geometry,material);ball.position.set(...position);root.add(ball);balls.push(ball);});
        }
        for(const child of root.children)baseOpacities.set(child.material,child.material.opacity);
      }
    }
    root.visible=!!(meta&&kind);if(!root.visible)return;
    for(const [material,opacity]of baseOpacities)material.opacity=opacity;
    meta.group.updateWorldMatrix(true,false);root.matrix.copy(meta.group.matrixWorld);
    if(strokes&&kind!=='triangle')strokes.geometry.setDrawRange(0,2*Math.floor(strokes.geometry.attributes.position.count/2*ease(p/.65)));
    panels.forEach((panel,i)=>panel.material.opacity=.25*ease((p-i*.16)/.24));
    balls.forEach(ball=>ball.scale.setScalar(Math.max(.001,ease(p/.6))));
    if(triangle) {
      const pairs=metatronRelations(meta.pos,meta.R).neighbours,index=Math.min(pairs.length-1,Math.floor(p*pairs.length)),[a,b]=pairs[index];
      if(triangle.userData.index!==index){triangle.userData.index=index;
      triangle.geometry.attributes.position.copyArray([0,0,0,...meta.pos[a],...meta.pos[b]]);triangle.geometry.attributes.position.needsUpdate=true;
      triangle.frustumCulled=false;
      strokes.geometry.attributes.position.copyArray([0,0,0,...meta.pos[a],...meta.pos[a],...meta.pos[b],...meta.pos[b],0,0,0]);strokes.geometry.attributes.position.needsUpdate=true;
      }
      triangle.material.opacity=.28;
    }
    const fade=ease(p/.04)*(1-ease((p-.93)/.07));
    for(const child of root.children)child.material.opacity*=fade;
  }
  return {update,dispose(){clear();scene.remove(root);}};
}
