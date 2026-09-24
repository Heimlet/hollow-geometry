/** Read the rendered source meshes; all teaching marks share their transforms. */
import * as THREE from 'three';
import { ORBIT_SEEDS } from './torus-math.js';
import { verticesOf,pentagonalFaces } from './golden-math.js';
const vertexCache=new WeakMap();
export function cubeHalfHeight(level){
  const mesh=level?.objs.cube?.mesh;if(!mesh)return null;
  const points=mesh.geometry.attributes.position,p=new THREE.Vector3();let low=Infinity,high=-Infinity;
  for(let i=0;i<points.count;i++){p.fromBufferAttribute(points,i).applyMatrix4(mesh.matrixWorld);low=Math.min(low,p.y);high=Math.max(high,p.y);}
  return (high-low)/2;
}
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
  const group=new THREE.Group();group.name='Dodecahedron · measured golden ratio';group.matrixAutoUpdate=false;group.visible=false;
  const labels=['ребро a','диагональ φ · a','Грань додекаэдра'].map((text,i)=>{const node=document.createElement('span');node.className=`torus-measure ${i?'gold':'cyan'}`;node.textContent=text;node.hidden=true;node.setAttribute('aria-hidden','true');document.body.append(node);return node;});
  let sourceGeometry,data,lines=[],surface,markers=[];
  function clear(){for(const object of group.children){object.geometry.dispose();object.material.dispose();}group.clear();lines=[];}
  function build(geometry){
    clear();sourceGeometry=geometry;data=dodecahedronWitness(geometry);
    const points=data.face.points,triangles=[1,2,3].flatMap(i=>[points[0],points[i],points[i+1]]);
    surface=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(triangles),new THREE.MeshBasicMaterial({color:0xffd277,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false}));group.add(surface);
    for(const [vertices,color,width]of [[points.flatMap((p,i)=>[p,points[(i+1)%5]]),0xffd277,1.6],[data.edge,0x80dfff,3.3],[data.diagonal,0xffd277,3.3]]){
      const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(vertices),new THREE.LineBasicMaterial({color,transparent:true,opacity:1,linewidth:width,depthWrite:false}));line.renderOrder=12;group.add(line);lines.push(line);
    }
    markers=points.map(p=>{const marker=new THREE.Mesh(new THREE.SphereGeometry(data.face.short*.027,10,8),new THREE.MeshBasicMaterial({color:0xffe5b0,transparent:true,depthWrite:false}));marker.position.copy(p);marker.renderOrder=13;group.add(marker);return marker;});
  }
  return {update(source,p,camera,{carry=false}={}){
    const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    const ink=source?(carry?.2:ease(p/.14)*(1-.8*ease((p-.5)/.3))):0;
    group.visible=ink>0;labels.forEach(label=>label.hidden=true);if(!source)return;
    if(sourceGeometry!==source.mesh.geometry)build(source.mesh.geometry);
    // Share the source parent instead of maintaining a separate world transform.
    // A paused orbit, a growing parent and render-unit rebasing all remain exact.
    if(group.parent!==source.group)source.group.add(group);
    group.matrix.copy(source.mesh.matrix);group.updateWorldMatrix(true,true);
    surface.material.opacity=.14*ink;lines.forEach(line=>line.material.opacity=ink);markers.forEach(marker=>marker.material.opacity=ink);
    const bottom=data.face.points.reduce((a,b)=>a.y<b.y?a:b);
    const placed=[];
    [data.edge,data.diagonal,[bottom,bottom]].forEach((pair,i)=>{
      const point=pair[0].clone().lerp(pair[1],.55).applyMatrix4(group.matrixWorld).project(camera),label=labels[i];
      label.hidden=ink<.1||point.z<-1||point.z>1||Math.abs(point.x)>.94||Math.abs(point.y)>.85;
      const width=label.textContent.length*8+16,height=28,x=Math.min(innerWidth-width-8,Math.max(8,(point.x+1)*innerWidth/2+9));
      let y=(1-point.y)*innerHeight/2+(i===2?20:i?-23:9);
      for(const other of placed)if(x<other.x+other.width+6&&x+width+6>other.x&&y<other.y+height+6&&y+height+6>other.y)y=other.y-height-8;
      placed.push({x,y,width});label.style.left=`${x}px`;label.style.top=`${Math.max(8,y)}px`;label.style.opacity=ink;
    });
  },bounds(){return labels.filter(label=>!label.hidden).map(label=>label.getBoundingClientRect());},dispose(){clear();group.removeFromParent();labels.forEach(label=>label.remove());}};
}
