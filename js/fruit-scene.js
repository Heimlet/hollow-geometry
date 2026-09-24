/** Real spheres/cube/octahedron whose [111] orthographic view reveals the circles. */
import * as THREE from 'three';
import {fruitVolume,FRUIT_PLANAR} from './fruit-life.js';
const ease=v=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
const gold=0xf2cc84,cyan=0x94d9ef,violet=0xc6adff;
const axis=new THREE.Vector3(1,1,1).normalize(),u=new THREE.Vector3(1,0,-1).normalize(),v=new THREE.Vector3(-1,2,-1).normalize();
export function createFruitScene(scene) {
  const root=new THREE.Group();root.visible=false;scene.add(root);
  const data=fruitVolume(),r=data.radius,spheres=[],rings=[],meridians=[],centers=[];
  const centerGroup=new THREE.Group();centerGroup.name='Fruit sphere centers';root.add(centerGroup);
  function stroke(points,color,width=1.8,segments=1){
    const vertices=[];for(let i=0;i<points.length;i+=2)for(let j=0;j<segments;j++)vertices.push(points[i].clone().lerp(points[i+1],j/segments),points[i].clone().lerp(points[i+1],(j+1)/segments));
    const g=new THREE.BufferGeometry().setFromPoints(vertices);const line=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:0,linewidth:width,depthWrite:false}));root.add(line);return line;
  }
  function circle(center,basisU,basisV,color,width){const points=[];for(let i=0;i<128;i++)for(const j of [i,i+1])points.push(basisU.clone().multiplyScalar(r*Math.cos(j*Math.PI/64)).addScaledVector(basisV,r*Math.sin(j*Math.PI/64)));const line=stroke(points,color,width);line.position.set(...center);return line;}
  const sphereGeometry=new THREE.SphereGeometry(r,28,20);
  const centerGeometry=new THREE.SphereGeometry(r*.065,12,8);
  data.allCenters.forEach((center,i)=>{
    const sphere=new THREE.Mesh(sphereGeometry,new THREE.MeshPhongMaterial({color:i<14&&data.groups[i]===0?gold:cyan,emissive:0x183442,emissiveIntensity:.5,transparent:true,opacity:0,depthWrite:false,shininess:65}));sphere.position.set(...center);root.add(sphere);spheres.push(sphere);
    const point=new THREE.Mesh(centerGeometry,new THREE.MeshBasicMaterial({color:gold,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));point.position.set(...center);point.visible=false;centerGroup.add(point);centers.push(point);
    rings.push(circle(center,u,v,gold,2.1));
    meridians.push([circle(center,u,axis,cyan,1),circle(center,v,axis,cyan,1)]);
  });
  const links=pairs=>pairs.flatMap(pair=>pair.map(i=>new THREE.Vector3(...data.centers[i])));
  const cube=stroke(links(data.cubeEdges),cyan,2.3,32),inner=stroke(links(data.cubeEdges).map(p=>p.multiplyScalar(1/3)),cyan,2.3);
  const octa=stroke(links(data.octaEdges),gold,2.2),up=stroke(links(data.tetrahedra[0]),0xff8dbb,2.4),down=stroke(links(data.tetrahedra[1]),violet,2.4);
  // The two triangular silhouettes use the same vertices as the later solids.
  // Their central (depth-axis) vertices wait for the spatial reveal.
  const triangles=data.tetrahedra.map((edges,i)=>stroke(links(edges.filter(pair=>pair.every(k=>data.groups[k]!==0))),i?violet:0xff8dbb,2.6,32));
  cube.name='Fruit cube';triangles.forEach((line,i)=>line.name=`Planar star ${i}`);
  const network=stroke(links(data.pairs),gold,1.8);
  network.name='Metatron network';
  const scaffold=[cube,inner,octa,up,down,network,...triangles];
  // Keep the previous scale as a quiet witness. The original network itself grows.
  const reference=new THREE.Group();reference.name='Previous Metatron scale';root.add(reference);reference.visible=false;
  const oldNetwork=network.clone();oldNetwork.material=network.material.clone();oldNetwork.material.color.set(cyan);reference.add(oldNetwork);
  const oldRings=rings.slice(0,14).map(ring=>{const copy=ring.clone();copy.material=ring.material.clone();copy.material.color.set(cyan);reference.add(copy);return copy;});
  const rays=data.representatives.map(index=>{
    const center=new THREE.Vector3(...data.centers[index]);
    const ray=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),center]),new THREE.LineBasicMaterial({color:cyan,transparent:true,opacity:0,linewidth:1.4,depthWrite:false}));
    ray.name='Metatron scale correspondence';ray.position.copy(center);reference.add(ray);return ray;
  });
  function update(kind,p,viewDirection=axis,opacity=1,expansion=0) {
    const growth=kind==='network'?Math.max(0,Math.min(1,expansion)):0,scale=3**growth;
    const aligned=Math.abs(viewDirection.dot(axis)),tilt=Math.sqrt(Math.max(0,1-aligned*aligned));
    root.scale.setScalar(scale);reference.scale.setScalar(1/scale);reference.visible=!!kind&&growth>0;
    const ink=ease(growth/.22);
    oldNetwork.material.opacity=.34*ink;
    oldRings.forEach((ring,i)=>{ring.material.opacity=.42*ink*(i===0?1-aligned**20:1);});
    rays.forEach(ray=>{ray.scale.setScalar(scale-1);ray.material.opacity=.26*ink;});
    root.visible=!!kind;if(!kind)return;
    const flat=FRUIT_PLANAR.includes(kind),unfold=kind==='spheres';
    const flower=flat?1:unfold?1-ease((p-.35)/.4):kind==='flower'?ease(p/.32):kind==='network'?1-ease(p/.2):0;
    const radiusScale=1+flower,extra=flat?1:unfold?flower:kind==='flower'?ease((p-.3)/.3):kind==='network'?1-ease(p/.18):0;
    const volume=flat?0:unfold?ease((p-.08)/.22):1;
    const circleInk=kind==='planar-cube'?1-.76*ease(p/.3):kind==='planar-star'?.24:kind==='return'?.24+.76*ease((p-.12)/.65):1;
    data.allCenters.forEach((_,i)=>{
      const reveal=i<14?1:extra;
      const central=i<14&&data.groups[i]===0;
      spheres[i].scale.setScalar(radiusScale);rings[i].scale.setScalar(radiusScale);meridians[i].forEach(m=>m.scale.setScalar(radiusScale));
      // The same real shells exist from the opening shot. The canonical view
      // keeps the ornament quiet; orbiting immediately reveals their volume.
      const shell=.18+.16*tilt;
      const spatial=unfold?(central?.3:.2):.14+.16*tilt;
      spheres[i].material.opacity=reveal*(shell*(1-volume)+spatial*volume)*(1-.3*flower);
      // Golden great circles coincide with sphere silhouettes only along [111].
      rings[i].material.opacity=reveal*(.25+.7*aligned**10)*(kind==='network'?.5:1)*circleInk;
      if(i===0)rings[i].material.opacity*=1-aligned**20; // coincident back pole in the canonical view
      meridians[i].forEach(m=>m.material.opacity=reveal*(.025*volume+.12*tilt));
      rings[i].visible=reveal>.001;spheres[i].visible=reveal>.001;meridians[i].forEach(m=>m.visible=spheres[i].visible);
      // Reveal actual sphere centres before drawing their connections, keeping
      // the cube's eight corners distinct from the later six face centres.
      let centerInk=0;
      if(kind==='planar-cube'&&i<8)centerInk=ease(p/.12);
      if(kind==='planar-star'&&i<8)centerInk=1;
      if(kind==='return'&&i<8)centerInk=1-ease((p-.08)/.4);
      if(unfold&&i<14)centerInk=ease((p-.5)/.1);
      if(['cube','geometry','free'].includes(kind)&&i<14)centerInk=1;
      if(kind==='fruit'&&i<14)centerInk=1-ease(p/.5);
      if(kind==='flower')centerInk=ease((p-.3)/.15);
      if(kind==='network')centerInk=1;
      centers[i].material.opacity=.95*centerInk*reveal*(i===0?1-aligned**20:1);
      centers[i].visible=centers[i].material.opacity>.001;
    });
    scaffold.forEach(line=>{line.material.opacity=0;line.geometry.setDrawRange(0,Infinity);});
    const reveal=(line,t,alpha=1)=>{line.material.opacity=alpha;line.geometry.setDrawRange(0,2*Math.floor(line.geometry.attributes.position.count/2*ease(t)));};
    if(kind==='planar-cube')reveal(cube,(p-.16)/.64);
    if(kind==='planar-star'){
      cube.material.opacity=1-.82*ease(p/.22);
      reveal(triangles[0],p/.35);reveal(triangles[1],(p-.34)/.36);
    }
    if(kind==='return'){
      const fade=1-ease((p-.08)/.4);cube.material.opacity=.18*fade;
      triangles.forEach(line=>line.material.opacity=fade);
    }
    if(unfold){cube.material.opacity=octa.material.opacity=.18*ease((p-.6)/.3);}
    if(kind==='cube'){reveal(cube,p/.2);reveal(inner,(p-.2)/.2);reveal(octa,(p-.43)/.22);}
    if(kind==='geometry'){cube.material.opacity=.3;inner.material.opacity=.3;octa.material.opacity=.55;reveal(up,p/.25);reveal(down,(p-.28)/.25);}
    if(kind==='fruit'){cube.material.opacity=octa.material.opacity=.12*(1-ease(p/.5));up.material.opacity=down.material.opacity=.15*(1-ease(p/.5));}
    if(kind==='flower'){cube.material.opacity=.09;octa.material.opacity=.07;}
    if(kind==='network'){reveal(network,(p-.2)/.48,.64+.16*growth);}
    if(kind==='free') {
      network.material.opacity=.15;
      cube.material.opacity=inner.material.opacity=.25+.5*Math.sin(Math.PI*p)**2;
      octa.material.opacity=.55;up.material.opacity=down.material.opacity=.2+.55*Math.sin(Math.PI*p*2)**2;
    }
    if(opacity!==1)root.traverse(part=>{if(part.material)part.material.opacity*=opacity;});
  }
  return {update,dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.remove(root);}};
}
