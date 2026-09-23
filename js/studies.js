import * as THREE from 'three';
import { PHI } from './constants.js';
import { scene, camera, controls, setDepth, setViewHeight, settleControls, getViewHeight } from './scene.js';
import { getState, actions, subscribe } from './state.js';
import { getGoldenFinding } from './golden.js';
import { spiralPoint, rectangleSquares, nestedStars } from './studies-math.js';
import { el, button, check, slider, select, bind, disposeGroup } from './lab-controls.js';
import { registerSetting, settingLink } from './settings-links.js';
const group=new THREE.Group();scene.add(group);
const gold=0xffd166,cyan=0x66d9ff;
let cached='',curves=[],radii,marker,measure,notice, badge;
const names={spiral:'Золотая спираль',rectangle:'Деление прямоугольника',pentagram:'Вложенные пентаграммы'};
const explanations={spiral:'r(θ) = r₀ · φ^(2θ/π). При повороте на 90° радиус увеличивается ровно в φ раз. Кривая вычислена по формуле; дуги окружностей были бы лишь приближением.',rectangle:'От золотого прямоугольника отсекаем квадрат. У оставшегося прямоугольника отношение длинной стороны к короткой снова равно φ. Стороны последовательных квадратов уменьшаются в φ раз.',pentagram:'Пересечения диагоналей правильного пятиугольника образуют следующий правильный пятиугольник. Большая часть диагонали / меньшая = φ. Радиусы соседних вложенных звёзд отличаются в φ² ≈ 2,618 раза.'};
function line(points,color=gold,closed=false) {
  const geometry=new THREE.BufferGeometry().setFromPoints(closed?[...points,points[0]]:points);
  const object=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:1,depthTest:false}));object.renderOrder=40;group.add(object);return object;
}
function explain() {
  const mode=getState().study.mode;if(mode==='none')return;
  const info=document.getElementById('info');info.replaceChildren();
  button(info,'×',()=>info.classList.remove('vis')).className='xbtn';
  info.append(el('h2',names[mode]),el('p',explanations[mode],'desc'),el('p',measure?.textContent,'golden-measurements'),settingLink('Настройки построения','golden.studies'));
  info.classList.add('vis');window.dispatchEvent(new Event('golden-inspect'));
}
function frame() {
  const {attached,mode}=getState().study, finding=getGoldenFinding();
  group.position.set(0,0,0);group.quaternion.identity();group.scale.setScalar(1);
  const valid=attached && finding && ((mode==='pentagram' && ['face','star'].includes(finding.kind)) || (mode!=='pentagram' && finding.kind==='rectangle'));
  if(valid) {
    const p=finding.points,center=p.reduce((s,v)=>s.add(v),new THREE.Vector3()).divideScalar(p.length);
    const u=p[1].clone().sub(p[0]).normalize(),normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize(),v=normal.clone().cross(u);
    group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u,v,normal));group.position.copy(center);
    group.scale.setScalar(mode==='pentagram'?p[0].distanceTo(center)/2.5:finding.short/3);
  }
  if(notice)notice.textContent=attached ? valid ? 'Построение в плоскости выбранного элемента φ.' : 'Выберите подходящий прямоугольник или пятиугольную грань в отношениях φ. Пока показана отдельная плоскость.' : 'Самостоятельное построение. Все длины измеряются в плоскости фигуры.';
}
function rebuild() {
  const s=getState().study,key=`${s.mode}:${s.steps}`;if(cached===key)return;cached=key;
  disposeGroup(group);curves=[];radii=null;marker=null;
  if(s.mode==='spiral') {
    const count=1024,points=Array.from({length:count+1},(_,i)=>spiralPoint(-6*Math.PI+i/count*6*Math.PI,2.5));curves=[line(points)];
    radii=[line([new THREE.Vector3(),new THREE.Vector3()],cyan),line([new THREE.Vector3(),new THREE.Vector3()],gold)];
    marker=new THREE.Mesh(new THREE.SphereGeometry(.04,12,8),new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false}));marker.renderOrder=41;group.add(marker);
  } else if(s.mode==='rectangle') {
    line([new THREE.Vector3(-PHI*1.5,-1.5,0),new THREE.Vector3(PHI*1.5,-1.5,0),new THREE.Vector3(PHI*1.5,1.5,0),new THREE.Vector3(-PHI*1.5,1.5,0)],0x7b879d,true);
    curves=rectangleSquares(s.steps).map((square,i)=>line(square.points,i%2?cyan:gold,true));
  } else if(s.mode==='pentagram') {
    curves=nestedStars(s.steps).map((points,i)=>line([0,2,4,1,3,0].map(j=>points[j]),i%2?cyan:gold));
  }
}
export function initStudiesUI(parent) {
  const box=el('details',null,'lab-section');box.append(el('summary','Построения φ · три способа'));parent.append(box);
  registerSetting('golden.studies',box,'Построения золотого сечения');
  select(box,'Построение φ',[['none','Выключено'],...Object.entries(names)],()=>getState().study.mode,mode=>actions.study({mode,progress:mode==='spiral'?1:0,running:false}));
  check(box,'В плоскости выбранного элемента φ',()=>getState().study.attached,attached=>actions.study({attached}));
  notice=el('p',null,'camera-hint');box.append(notice);
  slider(box,'Прогресс φ',0,1,.001,()=>getState().study.progress,progress=>actions.study({progress,running:false}),v=>`${Math.round(v*100)}%`);
  slider(box,'Шаги φ',1,8,1,()=>getState().study.steps,steps=>actions.study({steps}));
  slider(box,'Скорость φ',.01,.5,.01,()=>getState().study.speed,speed=>actions.study({speed}),v=>`${v.toFixed(2)} цикла/с`);
  const row=el('div',null,'lab-buttons');box.append(row);
  const play=button(row,'▶ Запуск',()=>actions.study({running:!getState().study.running,progress:getState().study.progress>=1?0:getState().study.progress}));
  button(row,'← Шаг',()=>actions.study({progress:Math.max(0,getState().study.progress-1/getState().study.steps),running:false}));
  button(row,'Шаг →',()=>actions.study({progress:Math.min(1,getState().study.progress+1/getState().study.steps),running:false}));
  button(row,'Сброс φ',()=>actions.study({progress:0,running:false}));
  button(row,'Ракурс построения',()=>{
    actions.clearPreset();actions.display({autoRotate:false});frame();setDepth(0);settleControls();controls.target.copy(group.position);
    camera.up.set(0,1,0).applyQuaternion(group.quaternion);camera.position.copy(group.position).add(new THREE.Vector3(0,0,30).applyQuaternion(group.quaternion));setViewHeight(7*group.scale.x/Math.min(1,innerWidth/innerHeight));controls.update();
  });
  button(row,'Объяснить построение',explain);measure=el('p',null,'golden-measurements');box.append(measure);
  badge=button(document.body,'φ · Построение',explain);badge.className='study-badge';badge.hidden=true;
  bind(()=>{play.textContent=getState().study.running?'Ⅱ Пауза':'▶ Запуск';play.disabled=getState().study.mode==='none';});
}
export function updateStudies(dt) {
  let s=getState().study;
  if(s.running){const progress=s.progress+Math.min(dt,.05)*s.speed;actions.study({progress:Math.min(1,progress),running:progress<1});s=getState().study;}
  rebuild();group.visible=s.mode!=='none';if(badge)badge.hidden=!group.visible;if(!group.visible)return;
  frame();
  if(s.mode==='spiral') {
    const theta=-5.5*Math.PI+s.progress*5.5*Math.PI,a=spiralPoint(theta-Math.PI/2,2.5),b=spiralPoint(theta,2.5);
    curves[0].geometry.setDrawRange(0,Math.floor((theta+6*Math.PI)/(6*Math.PI)*1024)+1);
    for(const [i,p] of [a,b].entries()){radii[i].geometry.attributes.position.setXYZ(1,p.x,p.y,0);radii[i].geometry.attributes.position.needsUpdate=true;radii[i].geometry.computeBoundingSphere();}
    marker.position.copy(b);measure.textContent=`r₁ = ${(a.length()*group.scale.x).toFixed(5)} · r₂ = ${(b.length()*group.scale.x).toFixed(5)}\nr₂ / r₁ = φ ≈ ${PHI.toFixed(5)} · Δθ = 90°`;
  } else {
    const step=Math.min(s.steps-1,Math.floor(s.progress*s.steps));curves.forEach((curve,i)=>{curve.visible=i<=step;curve.material.opacity=i===step?1:.32;});
    measure.textContent=s.mode==='rectangle'?`Шаг ${step+1}: сторона квадрата = ${(3/PHI**step*group.scale.x).toFixed(5)}\nПрямоугольник: длинная / короткая = φ`:`Звезда ${step+1}: радиус = ${(2.5/PHI**(2*step)*group.scale.x).toFixed(5)}\nМасштаб соседних звёзд = 1/φ² ≈ ${(1/PHI**2).toFixed(5)}`;
  }
  group.updateMatrixWorld(true);
}
export function inspectStudyAt(x,y) {
  if(!group.visible)return false;
  const ray=new THREE.Raycaster();ray.params.Line.threshold=getViewHeight()/innerHeight*6;ray.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,1-y/innerHeight*2),camera);
  if(!ray.intersectObjects(group.children.filter(o=>o.visible),false).length)return false;explain();return true;
}
