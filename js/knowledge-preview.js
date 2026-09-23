/** One reusable, independent 3D miniature for reading cards. The miniature owns its geometry snapshots. */
import * as THREE from 'three';
import {fruitOfLife,fruitCircle} from './fruit-life.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { levels } from './levels.js';
import { COLORS } from './constants.js';
import { COMPOUNDS } from './compound-data.js';
import { PLATONIC_TYPES } from './mirror-data.js';
const figures={tetrahedron:['tetrahedron'],cube:['cube'],octahedron:['octahedron'],dodecahedron:['dodecahedron'],icosahedron:['icosahedron'],cuboctahedron:['cuboctahedron'],merkaba:['merkaba_up','merkaba_down'],platonic:PLATONIC_TYPES,compounds:COMPOUNDS.find(c=>c.id==='tetra5').members,projection:['cube'],metatron:['_metatron_']};
figures.fruit=['_fruit_'];
figures.pentagram=['_pentagram_'];
let renderer,scene,camera,controls,group,container,active=false,radius=1,width=0,height=0;
function init() {
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);
  renderer.domElement.tabIndex=0;
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,1000);group=new THREE.Group();scene.add(group);
  scene.add(new THREE.AmbientLight(0xcbdaf3,2));const light=new THREE.DirectionalLight(0xffedc7,2.2);light.position.set(4,6,5);scene.add(light);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.1;controls.rotateSpeed=.6;controls.enablePan=false;controls.enableZoom=false;
  renderer.domElement.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    const axis=event.key==='ArrowLeft'||event.key==='ArrowRight'?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
    camera.position.applyAxisAngle(axis,(event.key==='ArrowLeft'||event.key==='ArrowUp'?1:-1)*Math.PI/18);controls.update();
  });
}
function clear() {
  if(!group)return;
  for(const child of [...group.children]){group.remove(child);child.geometry.dispose();child.material.dispose();}
  // Snapshot buffers never share draw ranges or lifetime with the main scene.
  group.position.set(0,0,0);
}
function solid(source,id) {
  const color=COLORS[id]??source.color;
  const mesh=new THREE.Mesh(source.mesh.geometry.clone(),new THREE.MeshPhongMaterial({color,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false,shininess:35}));
  const edges=new THREE.LineSegments(source.edges.geometry.clone(),new THREE.LineBasicMaterial({color,transparent:true,opacity:.95,toneMapped:false}));
  mesh.geometry.setDrawRange(0,Infinity);edges.geometry.setDrawRange(0,Infinity);group.add(mesh,edges);
}
export function hideKnowledgePreview(){active=false;controls&&(controls.enabled=false);clear();}
export function mountKnowledgePreview(parent,topic,title) {
  hideKnowledgePreview();const ids=figures[topic];if(!ids||!levels[0])return;
  if(!renderer)init();
  container=document.createElement('figure');container.className='knowledge-preview';
  const caption=document.createElement('figcaption');caption.textContent='Поверните миниатюру · перетаскивание или стрелки';
  renderer.domElement.setAttribute('aria-label',`Объёмная миниатюра: ${title}. Вращение перетаскиванием или клавишами со стрелками.`);
  container.append(renderer.domElement,caption);parent.append(container);
  for(const id of ids) {
    if(id==='_fruit_') {
      const f=fruitOfLife();
      f.centers.forEach((center,i)=>{const geometry=new THREE.BufferGeometry().setFromPoints(fruitCircle(center,f.radius).flat().map(p=>new THREE.Vector3(...p)));group.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:i?0x9bd9ef:0xf2cc84,toneMapped:false})));});
      caption.textContent='13 равных кругов · один, шесть, ещё шесть. Плоское построение.';
    } else if(id==='_pentagram_') {
      for(let level=0;level<3;level++) {
        const r=((1+Math.sqrt(5))/2)**(-2*level),points=Array.from({length:5},(_,i)=>new THREE.Vector3(r*Math.cos(Math.PI/2+i*Math.PI*2/5+level*Math.PI/5),r*Math.sin(Math.PI/2+i*Math.PI*2/5+level*Math.PI/5),0));
        const geometry=new THREE.BufferGeometry().setFromPoints(points.flatMap((p,i)=>[p,points[(i+2)%5]]));
        group.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:level?0x9bd9ef:0xf2cc84,toneMapped:false})));
      }
    } else if(id==='_metatron_') {
      const meta=levels[0].mc;
      group.add(new THREE.LineSegments(meta.lines.geometry.clone(),new THREE.LineBasicMaterial({color:0xa8cbea,transparent:true,opacity:.3,toneMapped:false})));
      for(const [index,source]of meta.nodes.entries()){const node=new THREE.Mesh(source.geometry.clone(),new THREE.MeshPhongMaterial({color:0xb9d6fa,shininess:40}));node.position.copy(source.position);group.add(node);}
    } else solid(levels[0].objs[id],id);
  }
  for(const child of group.children)child.geometry.setDrawRange(0,Infinity);
  group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(group),center=box.getCenter(new THREE.Vector3());radius=box.getBoundingSphere(new THREE.Sphere()).radius;
  group.position.copy(center).negate();camera.zoom=1;camera.up.set(0,1,0);camera.position.set(1,1,1).normalize().multiplyScalar(radius*5);controls.target.set(0,0,0);
  if(topic==='pentagram'||topic==='fruit')camera.position.set(0,0,radius*5);
  controls.enableDamping=false;controls.update();controls.enableDamping=true;controls.enabled=true;active=true;width=height=0;
}
export function updateKnowledgePreview() {
  if(!active||!container?.isConnected)return;
  const bounds=container.getBoundingClientRect(),w=Math.round(bounds.width),h=innerWidth<=700?180:210;if(!w)return;
  if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);const half=radius*1.04/Math.min(1,w/h);camera.top=half;camera.bottom=-half;camera.right=half*w/h;camera.left=-camera.right;camera.updateProjectionMatrix();}
  controls.update();renderer.render(scene,camera);
}
