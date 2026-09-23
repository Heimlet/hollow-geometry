/** Animated proofs drawn from the actual source meshes, in their world coordinates. */
import * as THREE from 'three';
import { PHI } from './constants.js';
import { GOLDEN_SCENES } from './golden-scene-data.js';
import { getState, actions, subscribe } from './state.js';
import { levels } from './levels.js';
import { camera, controls } from './scene.js';
import { flyCamera, isCamAnimating, cancelCameraAnimation } from './presets.js';
import { verticesOf, pentagonalFaces, edgeDivisions, orthogonalGoldenRectangles, nestedFaceStars } from './golden-math.js';
import { el, button, slider, bind } from './lab-controls.js';
import { registerSetting, settingLink, linkText } from './settings-links.js';

const ink=el('canvas',null,'golden-scene-ink');ink.hidden=true;ink.setAttribute('aria-hidden','true');document.body.append(ink);
const ctx=ink.getContext('2d'), gold='#ffd166', cyan='#66d9ff', violet='#c6adff';
const clamp=t=>Math.max(0,Math.min(1,t)), ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const center=points=>points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(points.length);
let data, generation, currentId, card, heading, stage, formula, note, status, labels=[];
const measure=n=>n.toLocaleString('ru',{maximumFractionDigits:4});
function linkedCopy(node,text) {
  if(node.dataset.copy===text)return;
  node.dataset.copy=text;node.textContent=text;linkText(node);
}
function segments(geometry) {
  const p=geometry.attributes.position;
  return Array.from({length:p.count/2},(_,i)=>[new THREE.Vector3().fromBufferAttribute(p,2*i),new THREE.Vector3().fromBufferAttribute(p,2*i+1)]);
}
function build() {
  const objects=levels[0].objs, ico=verticesOf(objects.icosahedron.mesh.geometry);
  const faces=pentagonalFaces(objects.dodecahedron.mesh.geometry);
  // Fixed face, independent of incidental camera position or a history restore.
  const direction=new THREE.Vector3(.4,.65,1).normalize();
  const face=faces.sort((a,b)=>center(b.points).normalize().dot(direction)-center(a.points).normalize().dot(direction))[0];
  data={rectangles:orthogonalGoldenRectangles(ico),divisions:edgeDivisions(ico,objects.octahedron.edges.geometry),face,
    stars:nestedFaceStars(face.points,6),icoEdges:segments(objects.icosahedron.edges.geometry),octaEdges:segments(objects.octahedron.edges.geometry)};
  generation=levels[0];
}
function cameraFor(id) {
  if(!data||generation!==levels[0])build();
  const direction=id==='pentagon'?center(data.face.points).normalize():new THREE.Vector3(3,2,4).normalize();
  flyCamera(direction.multiplyScalar(30),(id==='pentagon'?9.5:id==='bridge'?6.3:5.1)/Math.min(1,innerWidth/innerHeight));
}
subscribe((state,previous,action)=>{
  if(!state.presetId && ((previous.goldenScene.id!=='none'&&state.goldenScene.id==='none')||action.type.startsWith('history/')))cancelCameraAnimation();
  if(action.type==='golden-scene/start') {
    build();cameraFor(state.goldenScene.id);
    if(innerWidth<=700)document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('info').classList.remove('vis');
  }
});
function project(point) {
  const p=point.clone().project(camera);
  return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,visible:p.z>=-1&&p.z<=1};
}
function line(a,b,color,progress=1,alpha=1,width=2) {
  if(progress<=0)return;const p=project(a),q=project(a.clone().lerp(b,clamp(progress)));if(!p.visible||!q.visible)return;
  ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
}
function dot(point,color,alpha=1,radius=3.4) {
  const p=project(point);if(!p.visible)return;ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
}
function polygon(points,color,alpha) {
  const p=points.map(project);if(p.some(v=>!v.visible))return;
  ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.fill();
}
function annotate(index,point,text,role='short') {
  const label=labels[index],p=project(point);label.hidden=!p.visible||p.x<0||p.x>innerWidth||p.y<56||p.y>innerHeight;
  label.textContent=text;label.className=`golden-scene-length ${role}`;
  label.style.left=`${Math.max(16,Math.min(innerWidth-130,p.x+10))}px`;
  label.style.top=`${Math.max(65,Math.min(innerHeight-45,p.y+10))}px`;
}
function ratioLabels(a,b,c,d,short,long) {
  annotate(0,a.clone().lerp(b,.5),`a = ${measure(short)}`);
  annotate(1,c.clone().lerp(d,.5),`φa = ${measure(long)}`,'long');
}
function drawRectangles(p) {
  data.rectangles.forEach((r,index)=>{
    const t=ease((p-index*.25)/.22);if(!t)return;
    polygon(r.points,[gold,cyan,violet][index],.055*t);
    r.points.forEach((a,i)=>{
      const b=r.points[(i+1)%4];line(a,b,Math.abs(a.distanceTo(b)-r.short)<r.short*1e-4?cyan:gold,clamp(t*4-i));dot(a,[gold,cyan,violet][index],t);
    });
  });
  const t=ease((p-.75)/.24);data.icoEdges.forEach(([a,b])=>line(a,b,'#e9f3ff',t,.6,1.3));
  const r=data.rectangles[0],pairs=r.points.map((a,i)=>[a,r.points[(i+1)%4]]);
  const short=pairs.find(([a,b])=>Math.abs(a.distanceTo(b)-r.short)<r.short*1e-4),long=pairs.find(([a,b])=>Math.abs(a.distanceTo(b)-r.long)<r.long*1e-4);
  if(p>.22)ratioLabels(...short,...long,r.short,r.long);
  formula.textContent=`${measure(r.long)} / ${measure(r.short)} = φ ≈ ${measure(PHI)}`;
  linkedCopy(note,'Голубая сторона — a. Золотая — φa. Вращайте фигуру: все три плоскости пересекаются под углом 90°.');
}
function drawBridge(p) {
  data.octaEdges.forEach(([a,b])=>line(a,b,'#859dbf',ease(p/.18),.7,1.4));
  const moving=ease((p-.25)/.23);
  if(p>.25)data.divisions.forEach(({points:[a,point,b],short})=>{
    const current=a.clone().lerp(point,moving),firstLong=a.distanceTo(point)>short*1.001;
    line(a,current,firstLong?gold:cyan,1,.85);line(current,b,firstLong?cyan:gold,1,.65);dot(current,'#fff3c9');
  });
  const t=ease((p-.75)/.24);data.icoEdges.forEach(([a,b])=>line(a,b,'#f4f8ff',t,.95,2));
  // Label a front-facing edge to keep the two measured pieces legible.
  const view=camera.position.clone().sub(controls.target).normalize();
  const r=[...data.divisions].sort((a,b)=>b.points[1].dot(view)-a.points[1].dot(view))[0];
  const [a,q,b]=r.points,firstLong=a.distanceTo(q)>r.short*1.001;
  if(p>=.48)ratioLabels(...(firstLong?[q,b,a,q]:[a,q,q,b]),r.short,r.long);
  formula.textContent=p<.48?'12 рёбер → 12 точек золотого деления':`${measure(r.long)} / ${measure(r.short)} = φ ≈ ${measure(PHI)}`;
  linkedCopy(note,p<.48?'Точки движутся по рёбрам к точному золотому делению.':'Каждая отмеченная точка — вершина икосаэдра и одновременно точка золотого деления ребра октаэдра.');
}
function drawPentagon(p) {
  const face=data.face.points;
  polygon(face,gold,.04);face.forEach((a,i)=>line(a,face[(i+1)%5],cyan,1,.9));
  line(face[0],face[2],gold,ease(p/.22));
  let layer=0;
  data.stars.forEach((points,index)=>{
    const start=index===0?.25:.5+(index-1)*.09,t=ease((p-start)/(index===0?.23:.085));if(!t)return;layer=index;
    const alpha=index===0?.9:1;
    for(let i=0;i<5;i++)line(points[(2*i)%5],points[(2*i+2)%5],index%2?cyan:gold,clamp(t*5-i),alpha,index>3?1:2);
  });
  // Measure the currently legible level, including after zooming into recursion.
  let readable=0,best=Infinity;
  for(let i=0;i<=layer;i++) {
    const c=project(center(data.stars[i])),v=project(data.stars[i][0]),size=Math.hypot(c.x-v.x,c.y-v.y),score=Math.abs(Math.log(Math.max(size,.001)/150));
    if(score<best){best=score;readable=i;}
  }
  const visible=data.stars[readable];
  if(p>.22)ratioLabels(visible[0],visible[1],visible[0],visible[2],visible[0].distanceTo(visible[1]),visible[0].distanceTo(visible[2]));
  const scale=PHI**(-2*layer);
  formula.textContent=`Диагональ / ребро = φ · rₙ₊₁ / rₙ = 1/φ²`;
  linkedCopy(note,`Рекурсия на грани: ${layer+1} из 6 уровней · масштаб ${measure(scale)}. Кнопка «В центр звезды» позволяет рассмотреть внутренние уровни.`);
}
function explain() {
  const demo=GOLDEN_SCENES[getState().goldenScene.id];if(!demo)return;
  const info=document.getElementById('info');info.replaceChildren();
  button(info,'×',()=>info.classList.remove('vis')).className='xbtn';
  info.append(el('h2',demo.title,'golden-scene-explanation'),el('p',demo.explanation,'desc'),el('p',formula.textContent,'golden-measurements'),settingLink('Управление сценарием φ','golden.scenes'));
  linkText(info);info.classList.add('vis');window.dispatchEvent(new Event('golden-inspect'));
}
export function initGoldenScenesUI(parent) {
  const section=el('section',null,'golden-scenes');registerSetting('golden.scenes',section,'Связи φ в фигурах');
  section.append(el('h3','Увидеть связь φ'),el('p','Запустите построение: фигуры и ракурс настроятся автоматически.','camera-hint'));
  for(const [id,demo]of Object.entries(GOLDEN_SCENES)) {
    const b=button(section,'',()=>actions.startGoldenScene(id));b.className='golden-scene-launch';b.dataset.scene=id;
    b.append(el('strong',demo.title),el('span',demo.subtitle));
    bind(()=>b.setAttribute('aria-pressed',String(getState().goldenScene.id===id)));
  }
  status=el('p',null,'camera-hint');section.append(status);parent.prepend(section);
  card=el('section',null,'golden-story');card.hidden=true;card.setAttribute('aria-label','Анимация золотого сечения');
  const top=el('div',null,'golden-story-heading');heading=el('h2');top.append(heading);
  const close=button(top,'×',()=>actions.goldenScene({id:'none',running:false}));close.setAttribute('aria-label','Завершить сценарий φ');
  stage=el('p',null,'golden-story-stage');formula=el('p',null,'golden-story-formula');note=el('p',null,'golden-story-note');
  card.append(top,stage,formula,note);
  slider(card,'Ход построения φ',0,1,.001,()=>getState().goldenScene.progress,progress=>actions.goldenScene({progress,running:false}),v=>`${Math.round(v*100)}%`);
  const buttons=el('div',null,'lab-buttons');card.append(buttons);
  const play=button(buttons,'Ⅱ Пауза',()=>{const s=getState().goldenScene;if(s.progress>=1)actions.startGoldenScene(s.id);else actions.goldenScene({running:!s.running});});
  const step=delta=>{const s=getState().goldenScene;actions.goldenScene({progress:clamp((delta>0?Math.floor(s.progress*4+.001)+1:Math.ceil(s.progress*4-.001)-1)/4),running:false});};
  const back=button(buttons,'←',()=>step(-1));back.setAttribute('aria-label','Предыдущий шаг φ');
  const next=button(buttons,'→',()=>step(1));next.setAttribute('aria-label','Следующий шаг φ');
  button(buttons,'↻',()=>actions.startGoldenScene(getState().goldenScene.id)).setAttribute('aria-label','Повторить сценарий φ');
  button(buttons,'Почему φ?',explain);
  const zoom=button(card,'В центр звезды',()=>{
    const target=center(data.face.points),direction=target.clone().normalize().multiplyScalar(30);
    flyCamera(direction,.65/Math.min(1,innerWidth/innerHeight),1500,target);
  });zoom.className='golden-recursion-zoom';
  const overview=button(card,'Вся фигура',()=>cameraFor(getState().goldenScene.id));overview.className='golden-recursion-zoom';
  document.body.append(card);
  labels=[0,1].map(()=>{const label=button(document.body,'',explain);label.className='golden-scene-length';label.hidden=true;label.title='Объяснить отношение длин';return label;});
  bind(()=>{
    const s=getState().goldenScene,demo=GOLDEN_SCENES[s.id];card.hidden=!demo;
    zoom.hidden=overview.hidden=s.id!=='pentagon';zoom.disabled=s.progress<.5;
    if(!demo){status.textContent='Три геометрические связи, полученные из координат моделей.';return;}
    linkedCopy(heading,demo.title);play.textContent=s.running?'Ⅱ Пауза':s.progress>=1?'▶ Ещё раз':'▶ Продолжить';
    back.disabled=s.progress===0;next.disabled=s.progress===1;
    const index=Math.min(3,Math.floor(s.progress*4));linkedCopy(stage,`${index+1} / 4 · ${demo.steps[index]}`);
    status.textContent=`${demo.title} · ${Math.round(s.progress*100)}%`;
  });
}
export function updateGoldenScenes(dt) {
  let s=getState().goldenScene;
  ink.hidden=s.id==='none';labels.forEach(label=>label.hidden=true);
  if(s.id==='none'){
    if(currentId&&document.querySelector('#info .golden-scene-explanation'))document.getElementById('info').classList.remove('vis');
    currentId=null;return;
  }
  if(!data||generation!==levels[0])build();currentId=s.id;
  if(s.running&&!isCamAnimating()) {
    const progress=Math.min(1,s.progress+Math.min(dt,.05)/GOLDEN_SCENES[s.id].duration);
    actions.tickGoldenScene({progress,running:progress<1});s=getState().goldenScene;
  }
  const dpr=Math.min(devicePixelRatio,2);
  if(ink.width!==Math.round(innerWidth*dpr)||ink.height!==Math.round(innerHeight*dpr)){ink.width=Math.round(innerWidth*dpr);ink.height=Math.round(innerHeight*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);ctx.lineCap='round';ctx.lineJoin='round';
  if(s.id==='rectangles')drawRectangles(s.progress);else if(s.id==='bridge')drawBridge(s.progress);else drawPentagon(s.progress);
  if(labels.every(label=>!label.hidden)) {
    const a=labels[0].getBoundingClientRect(),b=labels[1].getBoundingClientRect();
    if(a.left<b.right+6&&a.right+6>b.left&&a.top<b.bottom+6&&a.bottom+6>b.top)
      labels[1].style.top=`${a.bottom+b.height+6<innerHeight?a.bottom+6:a.top-b.height-6}px`;
  }
  ctx.globalAlpha=1;
}
