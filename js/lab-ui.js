import * as THREE from 'three';
import { COMPOUNDS } from './compound-data.js';
import { CR } from './constants.js';
import { getState,actions,groupVisibility } from './state.js';
import { el,button,check,slider,select,bind } from './lab-controls.js';
import { registerSetting,settingLink } from './settings-links.js';
import { flyCamera } from './presets.js';
import { fitVisible, setLabStatus } from './lab.js';
import { compoundCoordinates,hull } from './polyhedra-math.js';
const axisOptions=[['x','X'],['y','Y'],['z','Z'],['diagonal','Диагональ [1,1,1]'],['custom','Свой вектор']];
function section(parent,title,key) {const d=el('details',null,'lab-section');d.append(el('summary',title));parent.append(d);if(key)registerSetting(key,d,title);return d;}
function showMembers(pack) {actions.objects(pack.members,{visible:true});}
function view(pack,order) {
  showMembers(pack);let dir;
  if(pack.id==='merkaba')dir=order===3?new THREE.Vector3(1,1,1):new THREE.Vector3(0,0,1);
  else {const {vertices}=compoundCoordinates(1),poly=hull(vertices);dir=order===3?vertices[0].clone():order===5?poly.faces[0].normal.clone():vertices[poly.edges[0][0]].clone().add(vertices[poly.edges[0][1]]);}
  actions.display({autoRotate:false});flyCamera(dir.normalize().multiplyScalar(30),CR*2.7/Math.min(1,innerWidth/innerHeight));
}
export function initLabUI(groups) {
  const explode=section(document.getElementById('setting-display').querySelector('.grp-body'),'Взрывная схема · Explode','lab.explode');
  select(explode,'Область разнесения',[['scene','Фигуры и уровни'],['components','Компоненты соединений']],()=>getState().lab.explode.scope,scope=>actions.lab('explode',{scope,direction:0}));
  slider(explode,'Explode',0,1,.001,()=>getState().lab.explode.value,value=>actions.lab('explode',{value,direction:0,scope:'scene'}),v=>`${Math.round(v*100)}%`);
  const row=el('div',null,'lab-buttons');explode.append(row);
  button(row,'Разнести всё',()=>actions.lab('explode',{scope:'scene',direction:1}));button(row,'Собрать всё',()=>actions.lab('explode',{scope:'scene',direction:-1}));button(row,'Пауза разнесения',()=>actions.lab('explode',{direction:0}));button(row,'Вместить',fitVisible);
  check(explode,'Линии связи',()=>getState().lab.explode.links,links=>actions.lab('explode',{links}));
  explode.append(el('p','0% — общий центр. Для больших схем нажмите «Вместить». Разнесение переносит тела, сохраняя их ориентацию.','camera-hint'));
  for(const pack of COMPOUNDS) {
    const host=document.querySelector(`[data-compound="${pack.id}"] > .grp-body`);
    const assembly=section(host,'Сборка и ракурсы',`compound.${pack.id}`);
    const rows=el('div',null,'lab-buttons');assembly.append(rows);
    for(const order of pack.id==='merkaba'?[2,3]:[2,3,5])button(rows,`Ось ${order} · ${pack.id==='merkaba'?'Меркаба':pack.name}`,()=>view(pack,order));
    slider(assembly,`Разборка · ${pack.name}`,0,1,.001,()=>getState().lab.collections[pack.id].explode,explode=>{actions.lab('explode',{scope:'components',direction:0});actions.lab('collections',{explode,direction:0},pack.id);},v=>`${Math.round(v*100)}%`);
    const buttons=el('div',null,'lab-buttons');assembly.append(buttons);
    button(buttons,'Разобрать',()=>{showMembers(pack);actions.lab('explode',{scope:'components',direction:0});actions.lab('collections',{direction:1},pack.id);});
    button(buttons,'Собрать',()=>{actions.lab('explode',{scope:'components',direction:0});actions.lab('collections',{direction:-1},pack.id);});
    button(buttons,'Пауза сборки',()=>actions.lab('collections',{direction:0},pack.id));
    button(buttons,'Сброс сборки',()=>actions.lab('collections',{explode:0,direction:0},pack.id));
    button(buttons,'Вместить',fitVisible);
    if(pack.id==='tetra5')check(assembly,'Зеркальная пятёрка тетраэдров',()=>getState().lab.collections.tetra5.mirror,mirror=>actions.lab('collections',{mirror},pack.id));
    const componentChoice=el('select');componentChoice.setAttribute('aria-label',`Один компонент · ${pack.name}`);pack.members.forEach((id,i)=>{const option=el('option',`Компонент ${i+1}`);option.value=id;componentChoice.append(option);});assembly.append(componentChoice);
    button(assembly,'Только выбранный',()=>actions.solo(pack.id,componentChoice.value));
    const restore=button(assembly,'Вернуть выбор',()=>actions.restore(pack.id));bind(()=>restore.disabled=!getState().lab.collections[pack.id].restore);
    if(pack.id==='merkaba')initMerkaba(host);
  }
}
function initMerkaba(host) {
  const research=section(host,'Исследовать Меркабу','lab.merkaba');
  research.append(el('p','Слои комбинируются. «Исходные тетраэдры» управляют только их отображением; оболочка и пересечение всегда вычисляются по обоим телам.','camera-hint'));
  for(const [key,title] of [['hull','Выпуклая оболочка'],['intersection','Пересечение'],['projection','2D-панель Меркабы'],['source','Исходные тетраэдры']])check(research,title,()=>getState().lab.layers[key],v=>actions.lab('layers',{[key]:v}));
  const status=el('p',null,'lab-topology');research.append(status);setLabStatus(status);
  const spin=section(research,'Вращение тел','lab.rotation');
  select(spin,'Режим вращения',[['whole','Вся Меркаба'],['up','Тетраэдр ▲'],['down','Тетраэдр ▼'],['counter','Встречное'],['independent','Независимое']],()=>getState().lab.rotation.mode,mode=>actions.lab('rotation',{mode}));
  check(spin,'Вращать Меркабу',()=>getState().lab.rotation.running,running=>actions.lab('rotation',{running}));
  select(spin,'Общая ось',axisOptions,()=>getState().lab.rotation.axis,axis=>actions.lab('rotation',{axis,...(getState().lab.rotation.mode==='independent'?{}:{upAxis:axis,downAxis:axis})}));
  select(spin,'Направление вращения',[['1','Положительное'],['-1','Отрицательное']],()=>String(getState().lab.rotation.direction),value=>actions.lab('rotation',{direction:+value}));
  slider(spin,'Скорость вращения',0,180,1,()=>getState().lab.rotation.speed,speed=>actions.lab('rotation',{speed}),v=>`${v}°/с`);
  slider(spin,'Угол всей Меркабы',-180,180,.1,()=>getState().lab.rotation.angle,angle=>actions.lab('rotation',{angle,running:false}),v=>`${v.toFixed(1)}°`);
  for(const [key,title]of[['up','▲'],['down','▼']]) {
    const d=section(spin,`Тетраэдр ${title}`);
    select(d,`Ось ${title}`,axisOptions,()=>getState().lab.rotation[key+'Axis'],axis=>actions.lab('rotation',{[key+'Axis']:axis}));
    slider(d,`Угол ${title}`,-180,180,.1,()=>getState().lab.rotation[key],v=>actions.lab('rotation',{[key]:v,running:false}),v=>`${v.toFixed(1)}°`);
    slider(d,`Скорость ${title}`,0,180,1,()=>getState().lab.rotation[key+'Speed'],v=>actions.lab('rotation',{[key+'Speed']:v}),v=>`${v}°/с`);
    select(d,`Направление ${title}`,[['1','Положительное'],['-1','Отрицательное']],()=>String(getState().lab.rotation[key+'Direction']),v=>actions.lab('rotation',{[key+'Direction']:+v}));
  }
  const vector=el('div',null,'lab-vector');vector.append(el('span','Свой вектор оси (общий набор координат)'));const inputs=[];
  for(let i=0;i<3;i++){const input=el('input');input.type='number';input.step='.1';input.value=i===1?1:0;input.setAttribute('aria-label',`Вектор оси ${'XYZ'[i]}`);inputs.push(input);vector.append(input);}
  button(vector,'Применить вектор',()=>{const value=inputs.map(i=>+i.value);if(value.every(Number.isFinite)&&Math.hypot(...value)>1e-8){actions.lab('rotation',{vector:value});error.textContent='';}else error.textContent='Укажите ненулевой вектор.';});const error=el('p',null,'camera-hint');vector.append(error);spin.append(vector);
  spin.append(el('p','Оси компонентов заданы внутри Меркабы. Скорость и направление ▲/▼ используются в независимом режиме. Общий поворот не меняет их взаимное положение.','camera-hint'));
  button(spin,'Reset · каноническая Меркаба',()=>actions.lab('rotation',{angle:0,up:0,down:0,running:false}));
  for(const [kind,title]of[['hull','Оформление оболочки'],['intersection','Оформление пересечения']]){
    const d=section(research,title,`lab.${kind}`);
    check(d,`${title}: грани`,()=>getState().lab.layers[kind+'Faces'],v=>actions.lab('layers',{[kind+'Faces']:v}));
    check(d,`${title}: рёбра`,()=>getState().lab.layers[kind+'Edges'],v=>actions.lab('layers',{[kind+'Edges']:v}));
    slider(d,`${title}: прозрачность`,0,1,.01,()=>getState().lab.layers[kind+'Opacity'],v=>actions.lab('layers',{[kind+'Opacity']:v}),v=>`${Math.round(v*100)}%`);
    if(kind==='intersection')button(d,'Только пересечение',()=>actions.lab('layers',{intersection:true,hull:false,source:false}));
  }
  const projection=section(research,'Ракурсы проекции','lab.projection');
  select(projection,'Проекция Меркабы',[['star','Гексаграмма · рёбра'],['hexagon','Шестиугольник · оболочка'],['square','Квадрат'],['triangles','Треугольники ▲ / ▼'],['free','Текущий ракурс']],()=>getState().lab.layers.axis,axis=>actions.lab('layers',{axis,projection:true}));
  button(projection,'Камера по оси проекции',()=>view(COMPOUNDS[0],getState().lab.layers.axis==='square'?2:3));
  projection.append(el('p','Правильные фигуры проявляются в каноническом положении при Explode = 0. После относительного поворота контуры закономерно меняются.','camera-hint'));
}
