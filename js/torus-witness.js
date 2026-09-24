/** Read the rendered source meshes; all teaching marks share their transforms. */
import * as THREE from 'three';
import { ORBIT_SEEDS } from './torus-math.js';
import { verticesOf,pentagonalFaces } from './golden-math.js';
const vertexCache=new WeakMap();
export function merkabaAnchors(level){
  if(!level)return null;
  return ORBIT_SEEDS.map(seed=>{
    const source=level.objs[seed.side>0?'merkaba_up':'merkaba_down'].mesh,geometry=source.geometry;
    if(!vertexCache.has(geometry))vertexCache.set(geometry,verticesOf(geometry));
    const expected=new THREE.Vector3(seed.point[0],seed.point[2],-seed.point[1]);
    const vertex=vertexCache.get(geometry).reduce((a,b)=>a.distanceToSquared(expected)<b.distanceToSquared(expected)?a:b).clone().applyMatrix4(source.matrixWorld);
    return [vertex.x,-vertex.z,vertex.y];
  });
}
export function dodecahedronWitness(geometry){
  const facing=new THREE.Vector3(3,1.1,6).normalize();
  const center=points=>points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(5);
  const face=pentagonalFaces(geometry).sort((a,b)=>center(b.points).normalize().dot(facing)-center(a.points).normalize().dot(facing))[0];
  return {face,edge:[face.points[0],face.points[1]],diagonal:[face.points[0],face.points[2]]};
}
export function createTorusWitness(scene){
  const group=new THREE.Group();group.name='Dodecahedron · measured golden ratio';group.matrixAutoUpdate=false;group.visible=false;scene.add(group);
  const labels=['a','φ · a'].map((text,i)=>{const node=document.createElement('span');node.className=`torus-measure ${i?'gold':'cyan'}`;node.textContent=text;node.hidden=true;node.setAttribute('aria-hidden','true');document.body.append(node);return node;});
  let sourceGeometry,data,lines=[],surface;
  function clear(){for(const object of group.children){object.geometry.dispose();object.material.dispose();}group.clear();lines=[];}
  function build(geometry){
    clear();sourceGeometry=geometry;data=dodecahedronWitness(geometry);
    const points=data.face.points,triangles=[1,2,3].flatMap(i=>[points[0],points[i],points[i+1]]);
    surface=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(triangles),new THREE.MeshBasicMaterial({color:0xffd277,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false}));group.add(surface);
    for(const [vertices,color,width]of [[points.flatMap((p,i)=>[p,points[(i+1)%5]]),0xffd277,1.6],[data.edge,0x80dfff,3.3],[data.diagonal,0xffd277,3.3]]){
      const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(vertices),new THREE.LineBasicMaterial({color,transparent:true,opacity:1,linewidth:width,depthWrite:false}));line.renderOrder=12;group.add(line);lines.push(line);
    }
  }
  return {update(source,p,camera){
    const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    const ink=source?ease(p/.14)*(1-.8*ease((p-.5)/.3)):0;
    group.visible=ink>0;labels.forEach(label=>label.hidden=true);if(!source)return;
    if(sourceGeometry!==source.mesh.geometry)build(source.mesh.geometry);
    group.matrix.copy(source.mesh.matrixWorld);group.updateMatrixWorld(true);
    surface.material.opacity=.12*ink;lines.forEach(line=>line.material.opacity=ink);
    [data.edge,data.diagonal].forEach((pair,i)=>{
      const point=pair[0].clone().lerp(pair[1],.55).applyMatrix4(group.matrixWorld).project(camera),label=labels[i];
      label.hidden=ink<.1||point.z<-1||point.z>1||Math.abs(point.x)>.94||Math.abs(point.y)>.85;
      label.style.left=`${(point.x+1)*innerWidth/2+9}px`;label.style.top=`${(1-point.y)*innerHeight/2+(i?-23:9)}px`;label.style.opacity=ink;
    });
  },dispose(){clear();scene.remove(group);labels.forEach(label=>label.remove());}};
}
