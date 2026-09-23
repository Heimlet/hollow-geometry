/** Real spheres/cube/octahedron whose [111] orthographic view reveals the circles. */
import * as THREE from 'three';
import {fruitVolume,FRUIT_PLANAR} from './fruit-life.js';
const ease=v=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
const gold=0xf2cc84,cyan=0x94d9ef,violet=0xc6adff;
const axis=new THREE.Vector3(1,1,1).normalize(),u=new THREE.Vector3(1,0,-1).normalize(),v=new THREE.Vector3(-1,2,-1).normalize();
export function createFruitScene(scene) {
  const root=new THREE.Group();root.visible=false;scene.add(root);
  const data=fruitVolume(),r=data.radius,spheres=[],rings=[],meridians=[];
  function stroke(points,color,width=1.8,segments=1){
    const vertices=[];for(let i=0;i<points.length;i+=2)for(let j=0;j<segments;j++)vertices.push(points[i].clone().lerp(points[i+1],j/segments),points[i].clone().lerp(points[i+1],(j+1)/segments));
    const g=new THREE.BufferGeometry().setFromPoints(vertices);const line=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:0,linewidth:width,depthWrite:false}));root.add(line);return line;
  }
  function circle(center,basisU,basisV,color,width){const points=[];for(let i=0;i<128;i++)for(const j of [i,i+1])points.push(basisU.clone().multiplyScalar(r*Math.cos(j*Math.PI/64)).addScaledVector(basisV,r*Math.sin(j*Math.PI/64)));const line=stroke(points,color,width);line.position.set(...center);return line;}
  const sphereGeometry=new THREE.SphereGeometry(r,28,20);
  data.allCenters.forEach((center,i)=>{
    const sphere=new THREE.Mesh(sphereGeometry,new THREE.MeshPhongMaterial({color:i<14&&data.groups[i]===0?gold:cyan,transparent:true,opacity:0,depthWrite:false,shininess:65}));sphere.position.set(...center);root.add(sphere);spheres.push(sphere);
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
  const scaffold=[cube,inner,octa,up,down,network,...triangles];
  function update(kind,p,viewDirection=axis) {
    root.visible=!!kind;if(!kind)return;
    const aligned=Math.abs(viewDirection.dot(axis)),tilt=Math.sqrt(Math.max(0,1-aligned*aligned));
    const flat=FRUIT_PLANAR.includes(kind),unfold=kind==='spheres';
    const flower=flat?1:unfold?1-ease((p-.35)/.4):kind==='flower'?ease(p/.32):kind==='network'?1-ease(p/.2):0;
    const radiusScale=1+flower,extra=flat?1:unfold?flower:kind==='flower'?ease((p-.3)/.3):kind==='network'?1-ease(p/.18):0;
    const volume=flat?0:unfold?ease((p-.08)/.22):1;
    const circleInk=kind==='planar-cube'?1-.76*ease(p/.3):kind==='planar-star'?.24:kind==='return'?.24+.76*ease((p-.12)/.65):1;
    data.allCenters.forEach((_,i)=>{
      const reveal=i<14?1:extra;
      const central=i<14&&data.groups[i]===0;
      spheres[i].scale.setScalar(radiusScale);rings[i].scale.setScalar(radiusScale);meridians[i].forEach(m=>m.scale.setScalar(radiusScale));
      spheres[i].material.opacity=volume*reveal*(unfold?(central?.32:.12):.025+.08*tilt)*(1-.4*flower);
      // Golden great circles coincide with sphere silhouettes only along [111].
      rings[i].material.opacity=reveal*(.25+.7*aligned**10)*(kind==='network'?.5:1)*circleInk;
      if(i===0)rings[i].material.opacity*=1-aligned**20; // coincident back pole in the canonical view
      meridians[i].forEach(m=>m.material.opacity=volume*reveal*(.025+.28*tilt));
      rings[i].visible=reveal>.001;spheres[i].visible=reveal*volume>.001;meridians[i].forEach(m=>m.visible=spheres[i].visible);
    });
    scaffold.forEach(line=>{line.material.opacity=0;line.geometry.setDrawRange(0,Infinity);});
    const reveal=(line,t,alpha=1)=>{line.material.opacity=alpha;line.geometry.setDrawRange(0,2*Math.floor(line.geometry.attributes.position.count/2*ease(t)));};
    if(kind==='planar-cube')reveal(cube,(p-.1)/.64);
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
    if(kind==='network'){reveal(network,(p-.2)/.48,.64);}
    if(kind==='free') {
      network.material.opacity=.15;
      cube.material.opacity=inner.material.opacity=.25+.5*Math.sin(Math.PI*p)**2;
      octa.material.opacity=.55;up.material.opacity=down.material.opacity=.2+.55*Math.sin(Math.PI*p*2)**2;
    }
  }
  return {update,dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.remove(root);}};
}
