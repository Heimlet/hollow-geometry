import { convexOutline2D as outline } from './polyhedra-math.js';
/** Orthographic drawing uses current world coordinates, never perspective division. */
import * as THREE from 'three';
import { getState,actions } from './state.js';
import { levels } from './levels.js';
import { camera } from './scene.js';
import { derivedObjects } from './lab.js';
import { el,button } from './lab-controls.js';
import { settingLink } from './settings-links.js';
const panel=el('section',null,'lab-projection');panel.hidden=true;
const heading=el('div',null,'lab-projection-heading');heading.append(settingLink('2D · Меркаба','lab.projection'));button(heading,'×',()=>actions.lab('layers',{projection:false})).setAttribute('aria-label','Закрыть 2D-панель');
const canvas=el('canvas');canvas.width=600;canvas.height=420;canvas.setAttribute('aria-label','Ортографическая проекция текущей Меркабы');
const caption=el('p',null,'camera-hint');panel.append(heading,canvas,caption);document.body.append(panel);const ctx=canvas.getContext('2d');

export function drawLabProjection(){
  const layers=getState().lab.layers;panel.hidden=!layers.projection;if(panel.hidden)return;
  const reference=new THREE.Camera();if(layers.axis==='free')reference.quaternion.copy(camera.quaternion);else{reference.position.set(...(layers.axis==='square'?[0,0,1]:[1,1,1]));reference.lookAt(0,0,0);}const inverse=reference.quaternion.clone().invert();
  const paths=[];
  for(const level of levels){const source=[];for(const id of ['merkaba_up','merkaba_down']){const o=level.objs[id];const attr=o.edges.geometry.attributes.position,p=[];for(let i=0;i<attr.count;i++)p.push(new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(o.edges.matrixWorld).applyQuaternion(inverse));source.push(...p);if(layers.axis!=='hexagon'&&layers.source&&o.vis)paths.push({p:layers.axis==='triangles'?outline(p).flatMap((v,i,a)=>[v,a[(i+1)%a.length]]):p,color:id==='merkaba_up'?'#ff88c2':'#78dbff'});}
    if(layers.axis==='hexagon'){const p=outline(source);paths.push({p:p.flatMap((v,i)=>[v,p[(i+1)%p.length]]),color:'#c6b2ff'});}
    for(const owner of derivedObjects.filter(d=>d.level===level.idx&&d.object.vis)){const attr=owner.edges.geometry.attributes.position,p=[];for(let i=0;i<attr.count;i++)p.push(new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(owner.edges.matrixWorld).applyQuaternion(inverse));paths.push({p,color:owner.kind==='hull'?'#c6b2ff':'#76ffc2'});}
  }
  const points=paths.flatMap(path=>path.p);ctx.clearRect(0,0,600,420);if(!points.length){caption.textContent='Включите исходные тетраэдры, оболочку или пересечение.';return;}
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
  const scale=Math.min(550/Math.max(maxX-minX,1e-5),370/Math.max(maxY-minY,1e-5)),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  ctx.lineWidth=2;for(const path of paths){ctx.strokeStyle=path.color;ctx.beginPath();path.p.forEach((p,i)=>ctx[i%2?'lineTo':'moveTo'](300+(p.x-cx)*scale,210-(p.y-cy)*scale));ctx.stroke();}
  caption.textContent=({star:'Рёбра · ось [1,1,1]',hexagon:'Внешний контур оболочки · ось [1,1,1]',square:'Ось [0,0,1]',triangles:'Треугольники ▲ / ▼ · ось [1,1,1]',free:'Текущий ракурс без перспективы'}[layers.axis])+' · текущая геометрия';
}
