/** Two golden steps from the actual moving vertices, with a fixed resource pool. */
import * as THREE from 'three';
import { hull } from './polyhedra-math.js';
import { ORBIT_SEEDS,spiralGuide,EXPANSION_TARGET_TURNS } from './torus-math.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function createGoldenScaleStep(parent){
  const group=new THREE.Group();group.name='Two golden steps · actual vertex successors';parent.add(group);
  function line(name,count,color,width){
    const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));
    const object=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,linewidth:width,transparent:true,opacity:0,depthWrite:false}));
    object.name=name;object.frustumCulled=false;group.add(object);return object;
  }
  const outline=line('Future golden hull',64,0xffd277,2.3);
  const paths=ORBIT_SEEDS.map((seed,i)=>{
    const featured=i===0||i===7,color=i===7?0xffd277:seed.side>0?0xffa4d7:0x94e6ff;
    const curve=line(`Golden successor path ${i}`,192*2,color,featured?2.8:1.2);
    const markers=[1,EXPANSION_TARGET_TURNS].map(turn=>{
      const point=new THREE.Mesh(new THREE.SphereGeometry(featured?.09:.045,12,8),new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false}));
      point.name=`Vertex ${i} · phi^${turn}`;point.userData.goldenTurn=turn;group.add(point);return point;
    });
    return {curve,markers,featured,side:seed.side};
  });
  return {group,update(active,p,anchors,scale,direction=1){
    group.visible=active;if(!active)return;
    const ink=ease(p/.12)*(1-ease((p-.87)/.13));
    const reveal=ease((p-.08)/.27)+ease((p-.44)/.24),future=[];
    paths.forEach(({curve,markers,featured,side},index)=>{
      const seed={point:anchors[index],side},positions=curve.geometry.attributes.position;
      for(let i=0;i<192;i++)for(let j=0;j<2;j++)positions.setXYZ(i*2+j,...spiralGuide(seed,direction*(i+j)/192*EXPANSION_TARGET_TURNS));
      positions.needsUpdate=true;curve.geometry.setDrawRange(0,2*Math.floor(192*reveal/EXPANSION_TARGET_TURNS));
      curve.material.opacity=ink*(featured?.9:.12);
      markers.forEach((point,i)=>{
        const turn=i?EXPANSION_TARGET_TURNS:1;
        point.position.set(...spiralGuide(seed,direction*turn));point.scale.setScalar(scale);
        point.material.opacity=ink*ease((reveal-turn+.08)/.08)*(featured?1:.45);
      });
      future.push(new THREE.Vector3(...spiralGuide(seed,direction*EXPANSION_TARGET_TURNS)));
    });
    // The next relative revolution returns each tetrahedron's orientation.
    // The hull still follows their real current pose: it is only a cube at symmetry.
    const data=hull(future),points=outline.geometry.attributes.position;
    data.edges.forEach((pair,i)=>pair.forEach((index,j)=>points.setXYZ(i*2+j,...data.vertices[index].toArray())));
    points.needsUpdate=true;outline.geometry.setDrawRange(0,data.edges.length*2);
    outline.material.opacity=ink*.6*ease((p-.59)/.16);
  }};
}
