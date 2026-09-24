/** One fixed set of points: a line, a plane and a volume become visible in it. */
import * as THREE from 'three';
import { A,GOLDEN_CYCLE_SCALE } from './constants.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function dimensionSequence(p,until=1){
  const build=Math.min(1,p/until),expansion=until<1?ease((p-until)/((1-until)*.8)):0,scale=GOLDEN_CYCLE_SCALE**expansion;
  return {build,expansion,scale,framingScale:scale/(1+.35*expansion)};
}
export const dimensionFrame=p=>({line:ease((p-.08)/.16),plane:ease((p-.27)/.18),volume:ease((p-.49)/.2),network:ease((p-.75)/.2),ink:1-ease((p-.83)/.17)});
export function createDimensionScene(scene) {
  const root=new THREE.Group();root.name='Dimensions unfolding';root.visible=false;scene.add(root);
  const gold=0xedc780,blue=0x91cfe6,positions=[];
  for(let x=-4;x<=4;x++)for(let y=-4;y<=4;y++)for(let z=-4;z<=4;z++)positions.push(x*A/4,y*A/4,z*A/4);
  const cloud=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)),new THREE.PointsMaterial({color:blue,size:.032,transparent:true,opacity:.12,depthWrite:false}));root.add(cloud);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.055,16,12),new THREE.MeshBasicMaterial({color:gold,transparent:true}));root.add(dot);
  const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-A,0,0),new THREE.Vector3(A,0,0)]),new THREE.LineBasicMaterial({color:gold,transparent:true,linewidth:2.8,depthWrite:false}));root.add(line);
  const plane=new THREE.Group();root.add(plane);
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(2*A,2*A),new THREE.MeshBasicMaterial({color:gold,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}));plane.add(surface);
  const rows=[];
  for(let y=-4;y<=4;y++){
    const row=line.clone();row.material=line.material.clone();row.position.y=y*A/4;plane.add(row);rows.push(row);
  }
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(surface.geometry),new THREE.LineBasicMaterial({color:gold,transparent:true,linewidth:2.3,depthWrite:false}));plane.add(outline);
  const sheets=[];
  for(let z=-4;z<=4;z++)if(z){const sheet=surface.clone();sheet.material=surface.material.clone();root.add(sheet);sheets.push({sheet,z:z*A/4});}
  const cube=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2*A,2*A,2*A)),new THREE.LineBasicMaterial({color:blue,transparent:true,linewidth:2.4,depthWrite:false}));root.add(cube);
  function update(active,p=0){
    root.visible=active;if(!active)return;
    const f=dimensionFrame(p);
    cloud.material.opacity=(.1+.13*f.volume)*f.ink;
    dot.material.opacity=(1-.65*f.line)*f.ink;
    line.scale.x=Math.max(.0001,f.line);line.material.opacity=f.line*(1-.75*f.plane)*f.ink;
    plane.scale.y=Math.max(.0001,f.plane);plane.visible=f.plane>0;
    surface.material.opacity=.12*f.plane*(1-.7*f.volume)*f.ink;
    outline.material.opacity=f.plane*(1-.65*f.volume)*f.ink;
    rows.forEach(row=>row.material.opacity=.32*f.plane*(1-.6*f.volume)*f.ink);
    // Move copies of the existing square outwards; all geometry buffers stay fixed.
    sheets.forEach(({sheet,z})=>{sheet.visible=f.volume>0;sheet.position.z=z*f.volume;sheet.material.opacity=.045*f.volume*f.ink;});
    cube.visible=f.volume>0;cube.scale.z=Math.max(.0001,f.volume);cube.material.opacity=f.volume*f.ink;
  }
  return {update,dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.remove(root);}};
}
