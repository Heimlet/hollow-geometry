/** Film controller: pure timeline in tour-state, transient drawing here. */
import * as THREE from 'three';
import { getState, actions, subscribe } from './state.js';
import { TOURS, tourDuration, tourStep } from './tour-data.js';
import { tourProgress, smooth } from './tour-state.js';
import { levels, refreshLevelAppearance } from './levels.js';
import { camera, controls, setViewHeight } from './scene.js';
import { flyCamera, isCamAnimating, cancelCameraAnimation } from './presets.js';
import { goldenSceneView } from './golden-scenes.js';
import { el, button } from './lab-controls.js';
import { linkText } from './settings-links.js';
let player, cameraHandedOff=false, resumeFlight=false, effectActive=false, view;
const minutes=id=>`${Math.ceil(tourDuration(id)/60)} мин`;
function pose(recipe) {
  const base=recipe.golden?goldenSceneView(recipe.golden,recipe.detail):{direction:new THREE.Vector3(3,2,4).normalize(),height:recipe.height||11,target:new THREE.Vector3()};
  return {...base,direction:recipe.dir?new THREE.Vector3(...recipe.dir).normalize():base.direction,height:recipe.height||base.height};
}
function frame(height,direction=view.direction) {
  const bottom=player?.getBoundingClientRect().height||200,top=72;
  const plotHeight=Math.max(100,innerHeight-top-bottom-46);
  const framedHeight=height*innerHeight/plotHeight/Math.min(1,(innerWidth-40)/plotHeight);
  const up=new THREE.Vector3(0,1,0).addScaledVector(direction,-direction.y).normalize();
  const target=view.target.clone().addScaledVector(up,((top+plotHeight/2)-innerHeight/2)/innerHeight*framedHeight);
  return {height:framedHeight,target};
}
function beginShot(recipe) {
  view=pose(recipe);cameraHandedOff=false;
  const shot=frame(view.height);flyCamera(view.direction.clone().multiplyScalar(30),shot.height,1600,shot.target);
}
function clearEffects() {
  if(!effectActive)return;
  for(const level of levels) {
    level.mc.nodes.forEach(n=>{n.visible=level.mc.nVis;n.material.opacity=1;});
    level.mc.lines.geometry.setDrawRange(0,Infinity);
    for(const object of Object.values(level.objs)) {object.edges.geometry.setDrawRange(0,Infinity);object.fMat.opacity=object.op;}
  }
  refreshLevelAppearance();effectActive=false;
}
export function resetTourCamera() {
  if(!getState().tour.id)return false;
  cameraHandedOff=true;resumeFlight=false;
  if(getState().tour.playing)actions.tourControl({playing:false});
  camera.up.set(0,1,0);
  view={direction:new THREE.Vector3(1,1,1).normalize(),height:11,target:new THREE.Vector3()};
  const shot=frame(view.height);flyCamera(view.direction.clone().multiplyScalar(30),shot.height,1400,shot.target);
  return true;
}
export function updateTours(dt) {
  const state=getState();
  if(state.tour.playing&&!document.hidden&&!isCamAnimating())actions.tickTour(Math.min(dt,.05));
  const current=getState(),recipe=tourStep(current)?.scene;
  if(recipe?.finalHeight && !cameraHandedOff && !isCamAnimating()) {
    const p=smooth(tourProgress(current)),direction=camera.position.clone().sub(controls.target).normalize();
    const shot=frame(THREE.MathUtils.lerp(view.height,recipe.finalHeight,p),direction);
    const offset=camera.position.clone().sub(controls.target);controls.target.copy(shot.target);camera.position.copy(shot.target).add(offset);setViewHeight(shot.height);controls.update();
  }
}
export function tourOrbit() {return !!(getState().tour.playing && tourStep(getState())?.scene.orbit);}
export function applyTourEffects() {
  const state=getState(),recipe=tourStep(state)?.scene;if(!recipe)return;
  const p=tourProgress(state),reveal=smooth(Math.min(1,p/.8));effectActive=true;
  for(const level of levels) {
    if(recipe.effect==='nodes')level.mc.nodes.forEach((node,i)=>{node.visible=level.mc.nVis&&p*14>=i;node.material.opacity=Math.min(1,Math.max(0,p*14-i));});
    if(recipe.effect==='network')level.mc.lines.geometry.setDrawRange(0,Math.floor(78*reveal)*2);
    for(const object of Object.values(level.objs)) {
      if(!object.vis)continue;
      if(recipe.effect==='edges')object.edges.geometry.setDrawRange(0,Math.floor(object.edges.geometry.attributes.position.count*reveal/2)*2);
      if(recipe.effect==='faces')object.fMat.opacity=object.op*(.1+.9*Math.sin(Math.PI*p)**2);
    }
  }
}
export function initTours() {
  const mode=el('nav',null,'experience-mode');mode.setAttribute('aria-label','Режим интерфейса');
  mode.append(el('span','Hollow Geometry','experience-brand'));
  const toursButton=button(mode,'Туры',()=>actions.interface('simple'));
  const advanced=button(mode,'Лаборатория',()=>actions.interface('advanced'));
  const gentle=button(mode,'≈ Мягко',()=>actions.display({gentleOrbit:!getState().display.gentleOrbit}));
  gentle.title='Мягкое вращение камеры';gentle.setAttribute('aria-label',gentle.title);
  document.body.append(mode);
  const reset=button(document.body,'⟲',()=>window.resetCamera());reset.className='fbtn tour-reset';
  reset.title='Вид по диагонали куба';reset.setAttribute('aria-label',reset.title);
  const welcome=el('main',null,'tour-menu');welcome.setAttribute('aria-label','Выбор путешествия');
  const intro=el('header',null,'tour-intro');intro.append(el('p','HOLLOW GEOMETRY','tour-eyebrow'),el('h1','Геометрия, которая оживает.'),el('p','Выберите путешествие. Дальше — просто смотрите.','tour-lead'));
  const grid=el('div',null,'tour-grid');
  for(const [id,tour]of Object.entries(TOURS)) {
    const card=button(grid,'',()=>actions.startTour(id));card.className='tour-card';card.style.setProperty('--tour-color',tour.color);
    card.setAttribute('aria-label',`Смотреть: ${tour.name}`);
    const icon=el('span',tour.icon,'tour-icon');icon.setAttribute('aria-hidden','true');
    const meta=el('span',`${minutes(id)} · ${tour.steps.length} глав`,'tour-meta');
    card.append(icon,el('strong',tour.name),el('span',tour.description,'tour-description'),meta,el('span','↗','tour-card-play'));
  }
  const footer=el('p','Один клик запускает фильм. В любой момент можно остановиться и покрутить фигуру.','tour-menu-note');
  welcome.append(intro,grid,footer);document.body.append(welcome);
  player=el('section',null,'tour-player');player.hidden=true;player.setAttribute('aria-label','Управление путешествием');
  const progress=el('div',null,'tour-progress'),fill=el('span');progress.append(fill);progress.setAttribute('aria-hidden','true');
  const head=el('div',null,'tour-player-head'),chapter=el('span',null,'tour-eyebrow');
  head.append(chapter);button(head,'Все туры',()=>actions.stopTour());
  const title=el('h2'),text=el('p',null,'tour-narration'),controlsRow=el('div',null,'tour-controls');
  const previous=button(controlsRow,'←',()=>actions.tourStep(getState().tour.index-1));previous.setAttribute('aria-label','Предыдущая глава');
  const play=button(controlsRow,'Пауза',()=>actions.tourControl({playing:!getState().tour.playing}));play.className='tour-play';
  const next=button(controlsRow,'Дальше →',()=>actions.tourStep(getState().tour.index+1));next.setAttribute('aria-label','Следующая глава');
  const inspect=button(controlsRow,'В лабораторию',()=>actions.interface('advanced'));inspect.className='tour-inspect';
  const options=el('details',null,'tour-options');options.append(el('summary','Главы и просмотр'));
  const waitLabel=el('label',null,'lab-check'),wait=el('input');wait.type='checkbox';wait.setAttribute('aria-label','Останавливаться между главами');
  wait.addEventListener('change',()=>actions.tourControl({auto:!wait.checked}));waitLabel.append(wait,el('span','Останавливаться между главами'));options.append(waitLabel);
  const chapters=el('div',null,'tour-chapters');options.append(chapters);
  const status=el('p',null,'tour-status');
  player.append(progress,head,title,text,controlsRow,status,options);document.body.append(player);
  let currentKey='',currentTour='';
  function render(state,previousState,action={}) {
    const simple=state.ui.mode==='simple',active=!!state.tour.id;
    document.body.classList.toggle('mode-simple',simple);document.body.classList.toggle('mode-advanced',!simple);document.body.classList.toggle('touring',simple&&active);
    welcome.hidden=!simple||active;player.hidden=!simple||!active;
    toursButton.setAttribute('aria-pressed',simple);advanced.setAttribute('aria-pressed',!simple);gentle.setAttribute('aria-pressed',state.display.gentleOrbit);
    if(!active){if(previousState?.tour.id){clearEffects();cancelCameraAnimation();}currentKey='';return;}
    const tour=TOURS[state.tour.id],step=tourStep(state),key=`${state.tour.id}:${state.tour.index}`;
    if(key!==currentKey || ['tour/start','tour/step'].includes(action.type) || action.type.startsWith('history/')) {
      clearEffects();currentKey=key;title.textContent=step.title;text.textContent=step.text;linkText(text);
      chapter.textContent=`${tour.name} · ${state.tour.index+1} / ${tour.steps.length}`;
      previous.disabled=state.tour.index===0;next.disabled=state.tour.index===tour.steps.length-1;
      document.getElementById('info').classList.remove('vis');options.open=false;
      beginShot(step.scene);
    }
    if(currentTour!==state.tour.id) {
      currentTour=state.tour.id;chapters.replaceChildren();tour.steps.forEach((step,index)=>button(chapters,`${index+1}. ${step.title}`,()=>actions.tourStep(index)));
    }
    [...chapters.children].forEach((node,index)=>node.setAttribute('aria-current',index===state.tour.index?'step':'false'));
    fill.style.width=`${100*(state.tour.index+tourProgress(state))/tour.steps.length}%`;
    play.textContent=state.tour.phase==='complete'?'Смотреть снова':state.tour.playing?'Ⅱ Пауза':'▶ Продолжить';
    wait.checked=!state.tour.auto;
    status.textContent=state.tour.playing?'Можно вращать фигуру — фильм встанет на паузу.':state.tour.phase==='complete'?'Путешествие завершено. Останьтесь здесь или выберите следующее.':'Пауза. Вращайте и приближайте фигуру, затем продолжайте.';
    if(previousState?.tour.playing&&!state.tour.playing){resumeFlight=isCamAnimating()&&!cameraHandedOff;cancelCameraAnimation();}
    if(previousState&&!previousState.tour.playing&&state.tour.playing&&resumeFlight&&!cameraHandedOff){resumeFlight=false;beginShot(step.scene);}
  }
  render(getState());subscribe(render);
  const pause=event=>{if(event?.automatic||!getState().tour.id)return;cameraHandedOff=true;cancelCameraAnimation();if(getState().tour.playing)actions.tourControl({playing:false});};
  controls.addEventListener('start',pause);window.addEventListener('camera-manual-change',pause);
  window.addEventListener('golden-inspect',pause);window.addEventListener('inspect-object',pause);
  document.addEventListener('click',event=>{if(event.target.closest('a.settings-link')&&getState().ui.mode==='simple')actions.interface('advanced');},true);
  window.addEventListener('resize',()=>{if(getState().tour.id&&!cameraHandedOff)beginShot(tourStep(getState()).scene);});
}
