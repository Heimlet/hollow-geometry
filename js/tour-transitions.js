/** Short crossfades in world space; stable shared geometry remains untouched. */
import * as THREE from 'three';
const samePose=(a,b)=>a.elements.every((v,i)=>Math.abs(v-b.elements[i])<1e-5);
export function captureVisibleParts(levels,derived=[],traditional=[]) {
  const parts=new Map();
  const add=(key,object)=>{if(!object.visible)return;parts.set(key,{object,geometry:object.geometry,matrix:object.matrixWorld.clone(),opacity:object.material.opacity,color:object.material.color.clone(),drawRange:{...object.geometry.drawRange}});};
  const solid=(key,object)=>{if(!object.group.visible)return;add(`${key}:faces`,object.mesh);add(`${key}:edges`,object.edges);};
  for(const level of levels) {
    for(const [id,object]of Object.entries(level.objs))solid(`${level.idx}:${id}`,object);
    if(level.mc.vis){add(`${level.idx}:network`,level.mc.lines);level.mc.nodes.forEach((node,i)=>add(`${level.idx}:node:${i}`,node));}
  }
  for(const owner of derived)solid(`derived:${owner.key}`,owner.object);
  for(const field of traditional)if(field.group.visible)field.group.children.forEach((part,i)=>add(`traditional:${field.level}:${field.key}:${i}`,part));
  return parts;
}
export function createTourTransition(scene) {
  let key=null,last=new Map(),incoming=new Set(),ghosts=[],elapsed=1,restores=[];
  const duration=.65;
  const clearGhosts=()=>{for(const ghost of ghosts){scene.remove(ghost.object);ghost.object.geometry.dispose();ghost.object.material.dispose();}ghosts=[];};
  function restore(){for(const [material,opacity]of restores)material.opacity=opacity;restores=[];}
  function reset(){restore();clearGhosts();key=null;last.clear();incoming.clear();elapsed=1;}
  function apply(nextKey,parts,dt,playing=true) {
    restore();
    if(!nextKey){reset();return 1;}
    if(nextKey!==key) {
      clearGhosts();incoming=new Set();
      for(const [id,part]of parts)if(!last.has(id)||!samePose(part.matrix,last.get(id).matrix))incoming.add(id);
      for(const [id,part]of last)if(!parts.has(id)||incoming.has(id)) {
        const object=part.object.clone();object.geometry=part.geometry.clone();object.geometry.setDrawRange(part.drawRange.start,part.drawRange.count);
        object.material=part.object.material.clone();object.material.color.copy(part.color);object.material.opacity=part.opacity;object.material.transparent=true;object.material.depthWrite=false;
        object.matrixAutoUpdate=false;object.matrix.copy(part.matrix);object.visible=true;scene.add(object);ghosts.push({object,opacity:part.opacity});
      }
      key=nextKey;elapsed=last.size?0:duration;
    }
    if(playing)elapsed=Math.min(duration,elapsed+Math.min(dt,.05));
    const p=Math.min(1,elapsed/duration),blend=p*p*(3-2*p);
    for(const ghost of ghosts)ghost.object.material.opacity=ghost.opacity*(1-blend);
    for(const [id,part]of parts)if(incoming.has(id)&&blend<1){restores.push([part.object.material,part.object.material.opacity]);part.object.material.opacity*=blend;part.opacity=part.object.material.opacity;}
    last=parts;
    if(blend===1){clearGhosts();incoming.clear();}
    return blend;
  }
  return {apply,restore,reset};
}
