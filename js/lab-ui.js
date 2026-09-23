import { ASSEMBLIES } from './exploration-data.js';
import { INFO } from './constants.js';
import { getState,actions } from './state.js';
import { el,button,check,slider,select,bind } from './lab-controls.js';
import { registerSetting } from './settings-links.js';
import { fitVisible, setLabStatus } from './lab.js';
const axisOptions=[['x','X'],['y','Y'],['z','Z'],['diagonal','Диагональ [1,1,1]'],['custom','Свой вектор']];
function section(parent,title,key) {const d=el('details',null,'lab-section');d.append(el('summary',title));parent.append(d);if(key)registerSetting(key,d,title);return d;}
function view(pack,order) {actions.preset(`${pack.id}-axis-${order}`);}

export function initLabUI(groups) {
  const explode=section(document.getElementById('setting-display').querySelector('.grp-body'),'Взрывная схема · Explode','lab.explode');
  select(explode,'Область разнесения',[['scene','Вся сцена и уровни'],['components','Тела внутри коллекций']],()=>getState().lab.explode.scope,scope=>actions.lab('explode',{scope,direction:0}));
  slider(explode,'Explode',0,1,.001,()=>getState().lab.explode.value,value=>actions.lab('explode',{value,direction:0,scope:'scene'}),v=>`${Math.round(v*100)}%`);
  const row=el('div',null,'lab-buttons');explode.append(row);
  button(row,'Разнести всё',()=>actions.lab('explode',{scope:'scene',direction:1}));button(row,'Собрать всё',()=>actions.lab('explode',{scope:'scene',direction:-1}));button(row,'Пауза разнесения',()=>actions.lab('explode',{direction:0}));button(row,'Вместить',fitVisible);
  check(explode,'Линии связи',()=>getState().lab.explode.links,links=>actions.lab('explode',{links}));
  explode.append(el('p','0% — общий центр. Для больших схем нажмите «Вместить». Разнесение переносит тела, сохраняя их ориентацию. Смена области сбрасывает разнесение предыдущей области.','camera-hint'));
  for(const pack of ASSEMBLIES) {
    const host=document.getElementById(`setting-group-${pack.id}`).querySelector(':scope > .grp-body');
    const appearance=section(host,'Отображение всех тел',`compound.${pack.id}.appearance`);
    for(const [key,title]of [['edges','Все рёбра'],['faces','Все грани']])check(appearance,`${title} · ${pack.name}`,()=>{const values=pack.members.map(id=>getState().objects[id][key]);return values.every(Boolean)?true:values.some(Boolean)?'mixed':false;},value=>actions.objects(pack.members,{[key]:value}));
    slider(appearance,`Прозрачность всех тел · ${pack.name}`,0,1,.01,()=>pack.members.reduce((sum,id)=>sum+getState().objects[id].opacity,0)/pack.members.length,opacity=>actions.objects(pack.members,{opacity}),v=>`${Math.round(v*100)}% в среднем`);
    const assembly=section(host,'Сборка и разборка',`compound.${pack.id}`);assembly.open=true;host.prepend(assembly);
    const rows=el('div',null,'lab-buttons');assembly.append(rows);
    for(const order of pack.id==='platonic'?[]:pack.id==='merkaba'?[2,3]:[2,3,5]){const b=button(rows,`Ось ${order}`,()=>view(pack,order));b.setAttribute('aria-label',`Ось ${order} · ${pack.name}`);b.className='preset-btn lab-axis';b.dataset.pid=`${pack.id}-axis-${order}`;}
    slider(assembly,`Разборка · ${pack.name}`,0,1,.001,()=>getState().lab.collections[pack.id].explode,explode=>actions.assembly(pack.id,{explode,direction:0}),v=>`${Math.round(v*100)}%`);
    const buttons=el('div',null,'lab-buttons');assembly.append(buttons);
    button(buttons,'Разобрать',()=>actions.assembly(pack.id,{direction:1}));
    button(buttons,'Собрать',()=>actions.assembly(pack.id,{direction:-1}));
    button(buttons,'Пауза сборки',()=>actions.lab('collections',{direction:0},pack.id));
    button(buttons,'Сброс сборки',()=>actions.lab('collections',{explode:0,direction:0},pack.id));
    button(buttons,'Вместить',()=>fitVisible(pack.members));
    assembly.append(el('p','Раздвигает включённые тела. Если все скрыты — включает коллекцию. 0% точно возвращает тела в общий центр.','camera-hint'));
    if(pack.id==='tetra5')check(assembly,'Зеркальная пятёрка тетраэдров',()=>getState().lab.collections.tetra5.mirror,mirror=>actions.lab('collections',{mirror},pack.id));
    const solo=section(host,'Выделить одно тело');
    const componentChoice=el('select');componentChoice.setAttribute('aria-label',`Одно тело · ${pack.name}`);pack.members.forEach((id,i)=>{const option=el('option',pack.id==='platonic'?INFO[id].name:`${pack.kind==='cube'?'Куб':'Тетраэдр'} ${i+1}`);option.value=id;componentChoice.append(option);});solo.append(componentChoice);
    button(solo,'Только выбранный',()=>actions.solo(pack.id,componentChoice.value));
    const restore=button(solo,'Вернуть выбор',()=>actions.restore(pack.id));bind(()=>restore.disabled=!getState().lab.collections[pack.id].restore);
    if(pack.id==='merkaba')initMerkaba(host);
  }
}
function initMerkaba(host) {
  const research=section(host,'Исследовать Меркабу','lab.merkaba');
  research.append(el('p','Слои комбинируются. «Исходные тетраэдры» управляют только их отображением; оболочка и пересечение всегда вычисляются по обоим телам.','camera-hint'));
  for(const [key,title] of [['hull','Выпуклая оболочка'],['intersection','Пересечение'],['projection','2D-панель Меркабы'],['source','Исходные тетраэдры']]){const input=check(research,title,()=>getState().lab.layers[key],v=>actions.lab('layers',{[key]:v}));if(key==='source')registerSetting('lab.source',input.parentElement,title);}
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
  button(projection,'Камера по оси проекции',()=>{const axis=getState().lab.layers.axis;if(axis!=='free')actions.preset(axis==='star'?'star6':`merkaba-${axis}`);});
  projection.append(el('p','Правильные фигуры проявляются в каноническом положении при Explode = 0. После относительного поворота контуры закономерно меняются.','camera-hint'));
}
