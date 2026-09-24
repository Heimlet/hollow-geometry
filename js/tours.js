/** Film controller: pure timeline in tour-state, transient drawing here. */
import { getState, actions, subscribe } from './state.js';
import { TOURS, tourDuration, tourStep } from './tour-data.js';
import { tourProgress, smooth } from './tour-state.js';
import { levels, refreshLevelAppearance } from './levels.js';
import { tourFaceOpacity,recursionMoment,tourObjectAlpha,tetraWitnessAppearance } from './tour-effects.js';
import { expansionAt,cubeWitnessInk } from './torus-math.js';
import { createTorusScene } from './torus-scene.js';
import { merkabaAnchors,createTorusWitness } from './torus-witness.js';
import { createFruitScene } from './fruit-scene.js';
import { createDimensionScene,dimensionFrame,dimensionSequence } from './dimension-scene.js';
import { createTourHistory } from './tour-history.js';
import { createMetatronStudy } from './metatron-study.js';
import { derivedObjects,traditionalFields } from './lab.js';
import { captureVisibleParts,createTourTransition } from './tour-transitions.js';
import { scene,projectionDepth,camera,controls } from './scene.js';
import { cancelCameraAnimation } from './presets.js';
import { el, button } from './lab-controls.js';
import { tourIcon } from './tour-icons.js';
import { initTourReading,linkTourText } from './tour-reading.js';
import { mountTorusPreface } from './tour-preface.js';
import { queueTourShot,cancelTourShot,tourCameraBusy,updateTourCamera,tourCameraStatus } from './tour-camera.js';
import { stageViewport } from './tour-camera-math.js';
let player, effectActive=false, status, animationState, cameraState,returnCamera;
let playerLayout='';
const transition=createTourTransition(scene);
const nodeStudy=createMetatronStudy(scene);
const fruitScene=createFruitScene(scene);
const torusScene=createTorusScene(scene);
const torusWitness=createTorusWitness(scene);
const dimensionScene=createDimensionScene(scene);
let transitionKey=null,lastGolden=null,fadeInk=false;
export function applyTourTransition(dt) {
  const state=getState(),key=state.tour.id?`${state.tour.id}:${tourStep(state)?.scene.continuousMotion?'continuous':state.tour.index}`:null;
  if(key!==transitionKey){if(tourStep(state)?.scene.camera?.cut)transition.reset();fadeInk=lastGolden!==state.goldenScene.id;lastGolden=state.goldenScene.id;transitionKey=key;}
  const blend=transition.apply(key,key?captureVisibleParts(levels,derivedObjects,traditionalFields):new Map(),dt,state.tour.playing);
  document.body.style.setProperty('--tour-ink-opacity',fadeInk?blend:1);
}
export const restoreTourMaterials=()=>transition.restore();
const minutes=id=>`${Math.ceil(tourDuration(id)/60)} мин`;
function clearEffects() {
  if(!effectActive)return;
  for(const level of levels) {
    level.group.scale.setScalar(1);
    level.mc.nodes.forEach(n=>{n.visible=level.mc.nVis;n.material.opacity=1;});
    level.mc.lines.geometry.setDrawRange(0,Infinity);
    for(const object of Object.values(level.objs)) {object.edges.geometry.setDrawRange(0,Infinity);object.fMat.opacity=object.op;}
  }
  for(const owner of derivedObjects){owner.object.fMat.opacity=owner.object.op;owner.object.group.scale.setScalar(1);}
  refreshLevelAppearance();effectActive=false;
}
export function resetTourCamera() {
  if(!getState().tour.id)return false;
  if(getState().tour.phase==='restarting')return true;
  queueTourShot({holdTimeline:false});return true;
}
export function updateTours(dt) {
  const state=getState();
  if(state.tour.playing&&!document.hidden&&(!tourCameraBusy()||state.tour.phase==='restarting'))actions.tickTour(Math.min(dt,.05));
}
export function updateTourStage(dt) {
  const state=getState(),recipe=tourStep(state)?.scene;
  if(recipe?.effect==='recursion')for(const level of levels){level.group.scale.setScalar(recursionMoment(tourProgress(state),level.idx,state.recursion.scale).scale);level.group.updateMatrixWorld(true);}
  const expansion=expansionAt(recipe,tourProgress(state),state.tour.motion),scale=expansion.scale;
  if(expansion.active||recipe?.worldScale){for(const level of levels){level.group.scale.setScalar(scale);level.group.updateMatrixWorld(true);}for(const owner of derivedObjects){owner.object.group.scale.setScalar(scale);owner.object.group.updateMatrixWorld(true);}}
  const bounds=player?.getBoundingClientRect();
  const layout=stageViewport(innerWidth,innerHeight,bounds?.height||220,bounds?.width||440);
  const layoutKey=`${layout.panelRight}:${layout.centerY}:${layout.compact}`;
  if(player&&layoutKey!==playerLayout){
    playerLayout=layoutKey;player.dataset.compact=String(layout.compact);
    player.style.setProperty('--tour-panel-right',`${layout.panelRight}px`);
    player.style.setProperty('--tour-panel-center',`${layout.centerY}px`);
  }
  updateTourCamera(dt,bounds?.height||220,bounds?.width||440);
  if(!getState().tour.id||!status)return;
  const s=tourCameraStatus(),p=tourProgress(getState());
  const symbol=recipe.camera?.symbol,cue=s.locked&&!s.flight&&symbol&&p>=symbol.from&&p<=symbol.to?symbol.label:null;
  const motion=getState().tour.playing?(s.restarting?'↻ Возвращение к началу':'▶ Анимация идёт'):getState().tour.phase==='complete'&&!recipe.endless?'✓ Тур завершён':'Ⅱ ТУР НА ПАУЗЕ';
  const control=s.reading?'🔒 Открыта справка':s.locked?'🔒 Камера по сценарию':'↔ Можно вращать';
  if(animationState.textContent!==motion)animationState.textContent=motion;
  if(cameraState.textContent!==control)cameraState.textContent=control;
  cameraState.dataset.locked=String(s.locked);
  returnCamera.disabled=!!(s.locked||s.flight||s.restarting);
  const message=cue|| (s.reading?'Сцена остановлена на время чтения.':s.restarting?'Фигура становится точкой. Отсюда начнётся новый круг.':s.flight?'Переход к следующему ракурсу.':s.locked?'Ручное вращение заблокировано. «Пауза и осмотр» освобождает камеру.':getState().tour.playing?'Тур продолжается. Вращайте свободно; ↶ вернёт ракурс этой главы.':getState().tour.phase==='complete'?'Путешествие завершено. Вращайте сцену; ↶ вернёт финальный ракурс.':'Вращайте фигуру. ↶ вернёт ракурс, «Продолжить тур» — движение.');
  const projection=projectionDepth>0?` · Перспектива ${Math.round(projectionDepth*100)}%`:' · Точная ортография';
  if(status.textContent!==message+projection)status.textContent=message+projection;
}
export function applyTourEffects() {
  const state=getState(),recipe=tourStep(state)?.scene;
  nodeStudy.update(levels[0]?.mc,recipe?.nodeStudy,tourProgress(state));
  const progress=tourProgress(state),intro=recipe?.dimensions;
  const sequence=dimensionSequence(progress,recipe?.dimensionUntil);
  dimensionScene.update(!!intro,sequence.build);
  fruitScene.update(recipe?.fruit,intro?Math.max(0,(sequence.build-.75)/.25):progress,camera.position.clone().sub(controls.target).normalize(),intro?dimensionFrame(sequence.build).network:1,intro?sequence.expansion:0);
  const expansion=expansionAt(recipe,tourProgress(state),state.tour.motion);
  torusScene.update(recipe?.torus||(recipe?.cubeWitness?'cage':recipe?.spiralPreview?'mechanism':null),tourProgress(state),expansion.active?expansion.turns*10:state.tour.elapsed,{axis:!!recipe?.axisGuide,rotation:state.lab.rotation.up*Math.PI/180,startRotation:(recipe?.rotationFrom||0)*Math.PI/180,scale:expansion.scale,expansion:expansion.active?expansion:null,anchors:recipe?.axisGuide?merkabaAnchors(levels[0]):null,direction:state.tour.motion?.direction||1,intersectionSource:derivedObjects.find(o=>o.kind==='intersection'&&o.level===0)?.object});
  torusWitness.update(recipe?.goldenCoupling?levels[0]?.objs.dodecahedron:null,progress,camera);
  if(!recipe)return;
  const p=tourProgress(state),reveal=smooth(Math.min(1,p/(recipe.buildUntil||.8)));effectActive=true;
  for(const level of levels) {
    if(recipe.effect==='nodes')level.mc.nodes.forEach((node,i)=>{node.visible=level.mc.nVis&&p*14>=i;node.material.opacity=Math.min(1,Math.max(0,p*14-i));});
    if(recipe.effect==='network')level.mc.lines.geometry.setDrawRange(0,Math.floor(78*reveal)*2);
    const alpha=recipe.effect==='recursion'?recursionMoment(p,level.idx,state.recursion.scale).alpha:1;
    if(recipe.effect==='recursion') {
      level.mc.lMat.opacity=.44*alpha;
      level.mc.nodes.forEach(node=>{node.material.opacity=alpha;node.visible=level.mc.nVis&&alpha>.01;});
    }
    for(const object of Object.values(level.objs)) {
      if(!object.vis)continue;
      if(recipe.effect==='edges')object.edges.geometry.setDrawRange(0,Math.floor(object.edges.geometry.attributes.position.count*reveal/2)*2);
      const layerAlpha=alpha*tourObjectAlpha(recipe,p,level.idx,object.id);
      object.fMat.opacity=tourFaceOpacity(recipe,p)*layerAlpha;
      if(!recipe.golden)object.eMat.opacity=.97*layerAlpha;
      if((recipe.pairFocus||recipe.spiralFocus)&&['merkaba_up','merkaba_down'].includes(object.id)){const focus=smooth(p/.12)*(1-smooth((p-.87)/.13));object.eMat.opacity=.97*(.2+.75*focus);}
      if(recipe.tetraWitness&&['merkaba_up','merkaba_down'].includes(object.id)){const focus=tetraWitnessAppearance(p,object.id);object.eMat.opacity=.97*focus.edges;object.fMat.opacity=focus.faces;}
    }
  }
  for(const owner of derivedObjects)if(owner.object.vis){
    const alpha=recipe.cubeWitness&&owner.kind==='hull'?Math.max(cubeWitnessInk(p),smooth((Math.abs(Math.cos(2*state.lab.rotation.up*Math.PI/180))-.9)/.1)):1;
    const layer=recipe.derived?.[owner.kind],pulse=recipe.coreEmphasis&&owner.kind==='intersection'?.1*Math.cos(2*state.lab.rotation.up*Math.PI/180)**24:0;
    const proof=recipe.goldenCoupling?.2+.8*smooth((p-.5)/.3):1;
    owner.object.fMat.opacity=(tourFaceOpacity({...recipe,...layer},p)+pulse)*alpha*proof;owner.object.eMat.opacity=(layer?.edgeOpacity??.85)*alpha*proof;
    if(recipe.pairFocus||recipe.spiralFocus){const focus=1-smooth(p/.12)*(1-smooth((p-.87)/.13));owner.object.fMat.opacity*=focus;owner.object.eMat.opacity*=focus;}
    if(recipe.tetraWitness&&owner.kind==='intersection'){const focus=tetraWitnessAppearance(p);owner.object.fMat.opacity=focus.coreFaces+.1*focus.handoff*Math.cos(2*state.lab.rotation.up*Math.PI/180)**24;owner.object.eMat.opacity=focus.coreEdges;}
  }
}
export function initTours() {
  const mode=el('nav',null,'experience-mode');mode.setAttribute('aria-label','Режим интерфейса');
  mode.append(el('span','Hollow Geometry','experience-brand'));
  const toursButton=button(mode,'',()=>actions.interface('simple'));
  toursButton.className='experience-tours';toursButton.append(tourIcon('tours'),el('span','Туры'));
  toursButton.title='Выбрать путешествие';
  const advanced=button(mode,'Лаборатория',()=>actions.interface('advanced'));
  const gentle=button(mode,'≈ Мягко',()=>actions.display({gentleOrbit:!getState().display.gentleOrbit}));
  gentle.title='Мягкое вращение камеры';gentle.setAttribute('aria-label',gentle.title);
  document.body.append(mode);
  const reset=button(document.body,'⟲',()=>window.resetCamera());reset.className='fbtn tour-reset';
  reset.title='Вернуть ракурс тура';reset.setAttribute('aria-label',reset.title);
  const welcome=el('main',null,'tour-menu');welcome.setAttribute('aria-label','Выбор путешествия');
  const musicRow=el('div',null,'tour-menu-tools'),playlist=el('a',null,'tour-playlist');
  playlist.href='https://music.yandex.com/playlists/3ce0098c-24f8-988b-b3ae-9a7ebc2dcc19';
  playlist.target='_blank';playlist.rel='noopener noreferrer';
  playlist.title='Плейлист · Яндекс Музыка';
  playlist.setAttribute('aria-label','Плейлист в Яндекс Музыке · откроется в новой вкладке');
  const musicIcon=el('img',null,'playlist-icon');musicIcon.src='assets/yandex-music.svg';musicIcon.alt='';musicIcon.width=22;musicIcon.height=22;
  playlist.append(musicIcon);musicRow.append(playlist);
  const grid=el('div',null,'tour-grid'),history=createTourHistory(),cards=new Map();
  function markViewed(id){const card=cards.get(id),viewed=history.has(id);card.dataset.viewed=String(viewed);card.querySelector('.tour-viewed').hidden=!viewed;card.setAttribute('aria-label',`Смотреть: ${TOURS[id].name}${viewed?' · Просмотрено':''}`);}
  for(const [id,tour]of Object.entries(TOURS)) {
    const card=button(grid,'',()=>actions.startTour(id));card.className='tour-card';card.dataset.tour=id;card.style.setProperty('--tour-color',tour.color);
    card.setAttribute('aria-label',`Смотреть: ${tour.name}`);
    const icon=el('span',null,'tour-icon');icon.append(tourIcon(id,tour.icon));icon.setAttribute('aria-hidden','true');
    const meta=el('span',`${tour.reading==='torus'?'Финал · ':''}${minutes(id)} · ${tour.steps.length} глав`,'tour-meta');
    const viewed=el('span',null,'tour-viewed');viewed.append(tourIcon('viewed'));viewed.title='Просмотрено';viewed.setAttribute('aria-hidden','true');
    card.append(icon,el('strong',tour.name),el('span',tour.description,'tour-description'),meta,viewed,el('span','↗','tour-card-play'));
    cards.set(id,card);markViewed(id);
  }
  const premise=el('p','Геометрия не развивается — она раскрывается.','tour-premise');
  welcome.append(musicRow,premise,grid);mountTorusPreface(welcome);document.body.append(welcome);
  player=el('section',null,'tour-player');player.hidden=true;player.setAttribute('aria-label','Управление путешествием');
  const progress=el('nav',null,'tour-progress');progress.setAttribute('aria-label','Прогресс по главам');
  const head=el('div',null,'tour-player-head'),chapter=el('span',null,'tour-eyebrow');
  head.append(chapter);const phi=button(head,'φ',()=>actions.readTopic('phi'));phi.setAttribute('aria-label','φ — чем это интересно');button(head,'Все туры',()=>actions.stopTour());
  const reading=button(player,'О торе: тело, космос, физика',()=>actions.readTopic(tourStep(getState())?.scene.reading||TOURS[getState().tour.id]?.reading));reading.className='tour-reading-shortcut';reading.hidden=true;
  const title=el('h2'),text=el('p',null,'tour-narration'),controlsRow=el('div',null,'tour-controls');
  const previous=button(controlsRow,'←',()=>actions.tourStep(getState().tour.index-1));previous.setAttribute('aria-label','Предыдущая глава');
  const play=button(controlsRow,'Пауза',()=>actions.tourControl({playing:!getState().tour.playing}));play.className='tour-play';
  const restart=button(controlsRow,'↻ Начать заново',()=>actions.restartTour());restart.className='tour-restart';restart.setAttribute('aria-label','Начать заново');restart.hidden=true;
  const next=button(controlsRow,'Дальше →',()=>actions.tourStep(getState().tour.index+1));next.setAttribute('aria-label','Следующая глава');
  returnCamera=button(controlsRow,'↶ Ракурс',resetTourCamera);returnCamera.className='tour-return';returnCamera.title='Вернуть ракурс тура';returnCamera.setAttribute('aria-label',returnCamera.title);
  const coupling=el('div',null,'tour-coupling'),law=el('span');
  const reverse=button(coupling,'↶ Обратный ход',()=>actions.reverseTour());reverse.className='tour-reverse';reverse.title='Поменять направления вращения и роста, сохранив текущее положение';coupling.prepend(law);
  const inspect=button(player,'Покинуть тур → лаборатория',()=>actions.interface('advanced'));inspect.className='tour-exit';
  const options=el('details',null,'tour-options');options.append(el('summary','Главы и просмотр'));
  const waitLabel=el('label',null,'lab-check'),wait=el('input');wait.type='checkbox';wait.setAttribute('aria-label','Останавливаться между главами');
  wait.addEventListener('change',()=>actions.tourControl({auto:!wait.checked}));waitLabel.append(wait,el('span','Останавливаться между главами'));options.append(waitLabel);
  const chapters=el('div',null,'tour-chapters');options.append(chapters);
  status=el('p',null,'tour-status');
  const states=el('div',null,'tour-states');animationState=el('span');cameraState=el('span');states.append(animationState,cameraState);
  player.append(progress,head,title,text,reading,coupling,controlsRow,states,status,options,inspect);document.body.append(player);
  let currentKey='',currentTour='';
  function render(state,previousState,action={}) {
    if(state.tour.phase==='complete'&&history.complete(state.tour.id))markViewed(state.tour.id);
    const simple=state.ui.mode==='simple',active=!!state.tour.id;
    document.body.classList.toggle('mode-simple',simple);document.body.classList.toggle('mode-advanced',!simple);document.body.classList.toggle('touring',simple&&active);
    welcome.hidden=!simple||active;player.hidden=!simple||!active;
    const quietFinale=state.tour.id==='torus'&&state.tour.index<TOURS.torus.steps.length-1;
    reading.hidden=quietFinale||!(tourStep(state)?.scene.reading||TOURS[state.tour.id]?.reading);phi.hidden=quietFinale;
    reading.textContent=tourStep(state)?.scene.readingLabel||(tourStep(state)?.scene.reading==='vortex'?'Вихревое движение · формулы и физика':'О торе: тело, космос, физика');
    toursButton.setAttribute('aria-pressed',simple);advanced.setAttribute('aria-pressed',!simple);gentle.setAttribute('aria-pressed',state.display.gentleOrbit);
    advanced.textContent=active?'Покинуть тур':'Лаборатория';advanced.title=active?'Покинуть тур и перейти в лабораторию':'Открыть лабораторию';
    player.dataset.playback=state.tour.phase==='complete'&&!tourStep(state)?.scene.endless?'complete':state.tour.playing?'playing':'paused';
    const reversible=!!state.tour.motion;
    coupling.hidden=!reversible;reverse.disabled=state.tour.phase==='restarting'||state.tour.phase==='complete'&&!tourStep(state)?.scene.endless;
    const contracting=state.tour.motion?.direction===-1;
    reverse.setAttribute('aria-pressed',String(contracting));reverse.textContent=contracting?'↷ Вернуть расширение':'↶ Обратный ход';
    if(reversible){const ratio=tourStep(state).scene.expansionRatio;law.textContent=`90° → ${contracting?'÷':'×'}${ratio===3?'3':'φ'} · ${contracting?'сжатие':'расширение'}`;law.dataset.golden=String(ratio!==3);}
    if(!active){if(previousState?.tour.id){clearEffects();cancelCameraAnimation();cancelTourShot();}currentKey='';return;}
    const tour=TOURS[state.tour.id],step=tourStep(state),key=`${state.tour.id}:${state.tour.index}`;
    const chapterChanged=key!==currentKey || ['tour/start','tour/step'].includes(action.type) || action.type.startsWith('history/');
    if(chapterChanged) {
      clearEffects();currentKey=key;title.textContent=step.title;text.textContent=step.text;
      if(step.scene.dimensions)text.replaceChildren(...step.text.split(/(разрешаем)/u).map(part=>part==='разрешаем'?el('span',part,'tour-gold'):part));
      if(!quietFinale)linkTourText(text);
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const node of [title,text])node.animate([{opacity:.3,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'ease-out'});
      chapter.textContent=`${tour.name} · ${state.tour.index+1} / ${tour.steps.length}`;
      previous.disabled=state.tour.index===0;next.disabled=state.tour.index===tour.steps.length-1;next.hidden=next.disabled;
      document.getElementById('info').classList.remove('vis');options.open=false;
      queueTourShot({holdTimeline:!step.scene.continuousMotion,entrance:state.tour.index===0});
    }
    if(currentTour!==state.tour.id) {
      currentTour=state.tour.id;chapters.replaceChildren();progress.replaceChildren();
      tour.steps.forEach((step,index)=>{
        button(chapters,`${index+1}. ${step.title}`,()=>actions.tourStep(index));
        const segment=button(progress,'',()=>actions.tourStep(index));segment.title=`${index+1}. ${step.title}`;segment.setAttribute('aria-label',`Глава ${index+1}: ${step.title}`);segment.append(el('span'));
      });
    }
    [...chapters.children].forEach((node,index)=>node.setAttribute('aria-current',index===state.tour.index?'step':'false'));
    [...progress.children].forEach((node,index)=>{
      const value=index<state.tour.index?1:index===state.tour.index?tourProgress(state):0;
      node.firstElementChild.style.width=`${value*100}%`;node.dataset.status=index<state.tour.index?'complete':index===state.tour.index?'current':'next';
      node.setAttribute('aria-current',index===state.tour.index?'step':'false');
    });
    restart.hidden=state.tour.index!==tour.steps.length-1;restart.disabled=state.tour.phase==='restarting';
    play.hidden=state.tour.phase==='complete'&&!step.scene.endless;play.textContent=state.tour.playing?'Ⅱ Пауза и осмотр':'▶ Продолжить тур';
    wait.checked=!state.tour.auto;
    if(previousState?.tour.playing&&!state.tour.playing)cancelTourShot();
    if(previousState&&!previousState.tour.playing&&state.tour.playing&&!chapterChanged&&state.tour.phase!=='restarting')queueTourShot();
  }
  render(getState());subscribe(render);
  const pause=()=>{if(getState().tour.id&&getState().tour.playing)actions.tourControl({playing:false});};
  // A free orbit changes only the viewpoint: the chapter clock keeps running.
  window.addEventListener('camera-manual-change',pause);
  window.addEventListener('golden-inspect',()=>{if(getState().tour.id){document.getElementById('info').classList.remove('vis');actions.readTopic('phi');}});
  initTourReading();
}
