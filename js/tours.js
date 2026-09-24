/** Film controller: pure timeline in tour-state, transient drawing here. */
import { getState, actions, subscribe } from './state.js';
import { TOURS, tourDuration, tourStep } from './tour-data.js';
import { tourProgress, smooth } from './tour-state.js';
import { levels, refreshLevelAppearance } from './levels.js';
import { tourFaceOpacity,recursionMoment,tourObjectAlpha,tetraWitnessAppearance,torusSourceMix,torusOpeningHandoff } from './tour-effects.js';
import { expansionAt,cubeWitnessInk,torusMacroFocus,spiralGuideRadius,torusReferenceYaw } from './torus-math.js';
import { applyTourReference } from './tour-reference.js';
import { bindTourPlayback,setControlText } from './tour-playback.js';
import { mountTourPanel } from './tour-panel.js';
import { createTorusHeightMeasure,hasTorusHeight } from './torus-measure.js';
import { geometryFigure } from './geometry-figures.js';
import { withOrthographicDepth } from './projection.js';
import { createTorusScene } from './torus-scene.js';
import { merkabaAnchors,cubeHalfHeight,createTorusWitness } from './torus-witness.js';
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
import { queueTourShot,cancelTourShot,tourCameraBusy,updateTourCamera,tourCameraStatus,beginTourCameraInteraction,endTourCameraInteraction } from './tour-camera.js';
import { stageViewport } from './tour-camera-math.js';
let player, effectActive=false, status, animationState, cameraState,returnCamera,resetCameraButton;
let playerLayout='';
const transition=createTourTransition(scene);
const nodeStudy=createMetatronStudy(scene);
const fruitScene=createFruitScene(scene);
const torusScene=createTorusScene(scene);
const torusWitness=createTorusWitness(scene);
const torusMeasure=createTorusHeightMeasure();
const dimensionScene=createDimensionScene(scene);
let transitionKey=null,lastGolden=null,fadeInk=false;
export function applyTourTransition(dt) {
  const state=getState(),key=state.tour.id?`${state.tour.id}:${tourStep(state)?.scene.continuousMotion?'continuous':state.tour.index}`:null;
  if(key!==transitionKey){if(tourStep(state)?.scene.camera?.cut)transition.reset();fadeInk=lastGolden!==state.goldenScene.id;lastGolden=state.goldenScene.id;transitionKey=key;}
  const blend=transition.apply(key,key?captureVisibleParts(levels,derivedObjects,traditionalFields):new Map(),dt,state.tour.playing);
  document.body.style.setProperty('--tour-ink-opacity',fadeInk?blend:1);
}
export const restoreTourMaterials=()=>transition.restore();
export function renderTourScene(draw){
  const state=getState(),recipe=tourStep(state)?.scene;
  const extent=recipe?.axisGuide?spiralGuideRadius(expansionAt(recipe,tourProgress(state),state.tour.motion).scale):0;
  return withOrthographicDepth(camera,extent,draw);
}
const minutes=id=>`${Math.ceil(tourDuration(id)/60)} мин`;
function clearEffects() {
  if(!effectActive)return;
  for(const level of levels) {
    level.group.scale.setScalar(1);level.group.quaternion.identity();
    level.mc.nodes.forEach(n=>{n.visible=level.mc.nVis;n.material.opacity=1;});
    level.mc.lines.geometry.setDrawRange(0,Infinity);
    for(const object of Object.values(level.objs)) {object.edges.geometry.setDrawRange(0,Infinity);object.fMat.opacity=object.op;}
  }
  for(const owner of derivedObjects){owner.object.fMat.opacity=owner.object.op;owner.object.group.scale.setScalar(1);owner.object.group.quaternion.identity();}
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
  const expansion=expansionAt(recipe,tourProgress(state),state.tour.motion),scale=recipe?.networkHandoff?torusOpeningHandoff(tourProgress(state)).scale:expansion.scale;
  if(expansion.active||recipe?.worldScale||recipe?.networkHandoff){for(const level of levels){level.group.scale.setScalar(scale);level.group.updateMatrixWorld(true);}for(const owner of derivedObjects){owner.object.group.scale.setScalar(scale);owner.object.group.updateMatrixWorld(true);}}
  applyTourReference(levels,derivedObjects,torusReferenceYaw(recipe,tourProgress(state),state.lab.rotation.up),!!(recipe?.axisGuide||recipe?.referenceFrame));
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
  const control=s.reading?'🔒 Открыта справка':s.locked?'🔒 Камера по сценарию':s.interactive?'↔ Вращение и зум':'↔ Можно вращать';
  if(animationState.textContent!==motion)animationState.textContent=motion;
  if(cameraState.textContent!==control)cameraState.textContent=control;
  cameraState.dataset.locked=String(s.locked);
  returnCamera.disabled=!!(s.locked||s.flight||s.restarting);
  const message=cue|| (s.reading?'Сцена остановлена на время чтения.':s.restarting?'Фигура становится точкой. Отсюда начнётся новый круг.':s.returning?'Камера плавно возвращается. Её снова можно перехватить.':s.interactive&&getState().tour.playing?'Вращайте и приближайте. После 10 с бездействия камера вернётся к сценарию.':s.flight?'Переход к следующему ракурсу.':s.locked?'Ручное вращение заблокировано. «Пауза и осмотр» освобождает камеру.':getState().tour.playing?'Тур продолжается. Вращайте свободно; ↶ вернёт ракурс этой главы.':getState().tour.phase==='complete'?'Путешествие завершено. Вращайте сцену; ↶ вернёт финальный ракурс.':'Вращайте фигуру. ↶ вернёт ракурс, «Продолжить тур» — движение.');
  const projection=projectionDepth>0?` · Перспектива ${Math.round(projectionDepth*100)}%`:' · Точная ортография';
  if(status.textContent!==message+projection)status.textContent=message+projection;
}
export function applyTourEffects() {
  const state=getState(),recipe=tourStep(state)?.scene;
  nodeStudy.update(levels[0]?.mc,recipe?.nodeStudy,tourProgress(state));
  const progress=tourProgress(state),intro=recipe?.dimensions;
  const sequence=dimensionSequence(progress,recipe?.dimensionUntil);
  dimensionScene.update(!!intro,sequence.build);
  fruitScene.update(recipe?.networkHandoff?'network':recipe?.fruit,recipe?.networkHandoff?1:intro?Math.max(0,(sequence.build-.75)/.25):progress,camera.position.clone().sub(controls.target).normalize(),recipe?.networkHandoff?torusOpeningHandoff(progress).network:intro?dimensionFrame(sequence.build).network:1,recipe?.networkHandoff?1:intro?sequence.expansion:0);
  const expansion=expansionAt(recipe,tourProgress(state),state.tour.motion);
  torusScene.update(recipe?.torus||(recipe?.cubeWitness?'cage':recipe?.spiralPreview?'mechanism':null),tourProgress(state),expansion.active?expansion.turns*10:state.tour.elapsed,{layers:{inner:state.display.torusInner,outer:state.display.torusOuter,rounded:state.display.torusRounded,spiral:state.display.torusSpiral},showHeightGuide:false,previewTime:(recipe?.timelineFrom||0)+state.tour.elapsed,referenceYaw:torusReferenceYaw(recipe,tourProgress(state),state.lab.rotation.up),axis:!!recipe?.axisGuide,intersectionWitness:!!recipe?.intersectionWitness,rotation:state.lab.rotation.up*Math.PI/180,startRotation:(recipe?.rotationFrom||0)*Math.PI/180,scale:expansion.scale,expansion:expansion.active?expansion:null,anchors:recipe?.axisGuide?merkabaAnchors(levels[0]):null,cubeHalfHeight:recipe?.axisGuide?cubeHalfHeight(levels[0]):null,direction:state.tour.motion?.direction||1,intersectionSource:derivedObjects.find(o=>o.kind==='intersection'&&o.level===0)?.object});
  torusScene.updateAxisView(camera,innerWidth,innerHeight);
  torusWitness.update(recipe?.goldenCoupling||recipe?.goldenWitnessCarry?levels[0]?.objs.dodecahedron:null,progress,camera,{carry:!!recipe?.goldenWitnessCarry});
  const measureBounds=player?.getBoundingClientRect();
  torusMeasure.update({enabled:hasTorusHeight(recipe)&&state.display.torusHeight,anchors:hasTorusHeight(recipe)?merkabaAnchors(levels[0]):null,camera,units:expansion.units,obstacles:[...torusWitness.bounds(),resetCameraButton?.getBoundingClientRect()].filter(Boolean),
    viewport:stageViewport(innerWidth,innerHeight,measureBounds?.height||220,measureBounds?.width||440),panelTop:measureBounds?.top,opacity:recipe?.torus==='birth'?smooth(progress/.15):1});
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
      if(!recipe.golden)object.eMat.opacity=.97*layerAlpha*(recipe.edgeEmphasis?.[object.id]??1);
      if((recipe.pairFocus||recipe.spiralFocus)&&['merkaba_up','merkaba_down'].includes(object.id)){const focus=smooth(p/.12)*(1-smooth((p-.87)/.13));object.eMat.opacity=.97*(.2+.75*focus);}
      if(recipe.macro&&['merkaba_up','merkaba_down'].includes(object.id))object.fMat.opacity=.18*torusMacroFocus(p);
      if(recipe.intersectionWitness&&['merkaba_up','merkaba_down'].includes(object.id)){object.fMat.opacity=.12*(1-smooth((p-.18)/.12));object.eMat.opacity=.97*(1-(1-layerAlpha)*smooth((p-.22)/.08));}
      if(recipe.sourceSurfaces&&['merkaba_up','merkaba_down'].includes(object.id)){const mix=torusSourceMix(recipe,p);object.fMat.opacity=(recipe.sourceFaceOpacity??object.op)*mix;object.eMat.opacity=.97*(.2+.65*mix);}
      if(recipe.tetraWitness&&['merkaba_up','merkaba_down'].includes(object.id)){const focus=tetraWitnessAppearance(p,object.id);object.eMat.opacity=.97*focus.edges;object.fMat.opacity=focus.faces;}
    }
  }
  for(const owner of derivedObjects)if(owner.object.vis){
    const alpha=recipe.cubeWitness&&owner.kind==='hull'?Math.max(cubeWitnessInk(p),smooth((Math.abs(Math.cos(2*state.lab.rotation.up*Math.PI/180))-.9)/.1)):1;
    const layer=recipe.derived?.[owner.kind],pulse=recipe.coreEmphasis&&owner.kind==='intersection'?.1*Math.cos(2*state.lab.rotation.up*Math.PI/180)**24:0;
    const proof=recipe.sourceSurfaces?1-torusSourceMix(recipe,p):1;
    owner.object.fMat.opacity=(tourFaceOpacity({...recipe,...layer},p)+pulse)*alpha*proof;owner.object.eMat.opacity=(layer?.edgeOpacity??.85)*alpha*proof;
    if(recipe.pairFocus||recipe.spiralFocus){const focus=1-smooth(p/.12)*(1-smooth((p-.87)/.13));owner.object.fMat.opacity*=focus;if(!(recipe.hullOutline&&owner.kind==='hull'))owner.object.eMat.opacity*=focus;}
    if(recipe.hullOutline&&owner.kind==='hull')owner.object.eMat.opacity=(layer?.edgeOpacity??.16)+.42*torusMacroFocus(p);
    if(recipe.intersectionWitness&&owner.kind==='intersection'){owner.object.eMat.opacity*=smooth((p-.2)/.07);owner.object.fMat.opacity*=smooth((p-.15)/.1);}
    if(recipe.tetraWitness&&owner.kind==='hull'){const mix=smooth((p-.82)/.18);const entry=smooth(p/.12);owner.object.fMat.opacity=(.004+.004*mix)*alpha*entry;owner.object.eMat.opacity=(.12+.04*mix)*alpha*entry;}
    if(recipe.tetraWitness&&owner.kind==='intersection'){const focus=tetraWitnessAppearance(p);owner.object.fMat.opacity=focus.coreFaces+.1*focus.handoff*Math.cos(2*state.lab.rotation.up*Math.PI/180)**24;owner.object.eMat.opacity=focus.coreEdges;}
  }
}
export function initTours() {
  controls.addEventListener('start',beginTourCameraInteraction);
  controls.addEventListener('end',endTourCameraInteraction);
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
  resetCameraButton=reset;
  reset.title='Вернуть ракурс тура';reset.setAttribute('aria-label',reset.title);
  const welcome=el('main',null,'tour-menu');welcome.setAttribute('aria-label','Выбор путешествия');
  const musicRow=el('div',null,'tour-menu-tools'),playlist=el('a',null,'tour-playlist');
  playlist.href='https://music.yandex.com/playlists/3ce0098c-24f8-988b-b3ae-9a7ebc2dcc19';
  playlist.target='_blank';playlist.rel='noopener noreferrer';
  playlist.title='Плейлист · Яндекс Музыка';
  playlist.setAttribute('aria-label','Плейлист в Яндекс Музыке · откроется в новой вкладке');
  const musicIcon=el('img',null,'playlist-icon');musicIcon.src='assets/yandex-music.svg';musicIcon.alt='';musicIcon.width=22;musicIcon.height=22;
  playlist.append(musicIcon);musicRow.append(playlist);
  const grid=el('div',null,'tour-grid'),finale=el('section',null,'tour-finale'),history=createTourHistory(),cards=new Map();
  finale.setAttribute('aria-label','Финальное путешествие');
  function markViewed(id){const card=cards.get(id),viewed=history.has(id);card.dataset.viewed=String(viewed);card.querySelector('.tour-viewed').hidden=!viewed;card.setAttribute('aria-label',`Смотреть: ${TOURS[id].name}${viewed?' · Просмотрено':''}`);}
  for(const [id,tour]of Object.entries(TOURS)) {
    const featured=id==='torus',card=button(featured?finale:grid,'',()=>actions.startTour(id));card.className=featured?'tour-card tour-finale-card':'tour-card';card.dataset.tour=id;card.style.setProperty('--tour-color',tour.color);
    card.setAttribute('aria-label',`Смотреть: ${tour.name}`);
    const icon=el('span',null,'tour-icon');icon.append(tourIcon(id,tour.icon));icon.setAttribute('aria-hidden','true');
    const meta=el('span',`${tour.reading==='torus'?'Финал · ':''}${minutes(id)} · ${tour.steps.length} глав`,'tour-meta');
    const viewed=el('span',null,'tour-viewed');viewed.append(tourIcon('viewed'));viewed.title='Просмотрено';viewed.setAttribute('aria-hidden','true');
    if(featured){
      const art=geometryFigure('torus-cover');art.classList.add('tour-finale-art');art.setAttribute('aria-hidden','true');
      const copy=el('span',null,'tour-finale-copy'),cta=el('span','Смотреть тур →','tour-finale-cta');
      copy.append(el('span','Финальное путешествие','tour-eyebrow'),el('strong',tour.name),el('span',tour.description,'tour-description'),meta,cta);
      card.append(art,copy,viewed);
    }else card.append(icon,el('strong',tour.name),el('span',tour.description,'tour-description'),meta,viewed,el('span','↗','tour-card-play'));
    cards.set(id,card);markViewed(id);
  }
  const premise=el('p','Геометрия не развивается — она раскрывается.','tour-premise');
  // A quiet visual aside belongs to the menu, never to the film or its controls.
  const perspective=el('figure',null,'home-perspective'),perspectiveImage=el('img');
  perspectiveImage.src='assets/perspective-meme.png';
  perspectiveImage.alt='Бернард: «Для меня это ни на что не похоже».';
  perspectiveImage.width=400;perspectiveImage.height=224;
  perspectiveImage.loading='lazy';perspectiveImage.decoding='async';perspectiveImage.draggable=false;
  perspective.append(perspectiveImage);
  welcome.append(musicRow,premise,grid,finale,perspective);mountTorusPreface(welcome);
  const footer=el('footer',null,'tour-clock'),clock=el('time');
  const clockFormat=new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  clock.title='Местные дата и время браузера';
  function updateClock(){const now=new Date();clock.dateTime=now.toISOString();clock.textContent=clockFormat.format(now);}
  updateClock();setInterval(updateClock,1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateClock();});
  footer.append(clock);welcome.append(footer);document.body.append(welcome);
  player=el('section',null,'tour-player');player.hidden=true;player.setAttribute('aria-label','Управление путешествием');
  const progress=el('nav',null,'tour-progress');progress.setAttribute('aria-label','Прогресс по главам');
  const head=el('div',null,'tour-player-head'),chapter=el('span',null,'tour-eyebrow');
  head.append(chapter);const phi=button(head,'φ',()=>actions.readTopic('phi'));phi.setAttribute('aria-label','φ — чем это интересно');button(head,'Все туры',()=>actions.stopTour());
  const reading=button(player,'О торе: тело, космос, физика',()=>actions.readTopic(tourStep(getState())?.scene.reading||TOURS[getState().tour.id]?.reading));reading.className='tour-reading-shortcut';reading.hidden=true;
  const title=el('h2'),text=el('p',null,'tour-narration'),controlsRow=el('div',null,'tour-controls');
  const previous=button(controlsRow,'←',()=>actions.tourStep(getState().tour.index-1));previous.setAttribute('aria-label','Предыдущая глава');
  const play=el('button',null,'tour-play'),playLabel=el('span','Пауза'),playKey=el('kbd','Пробел','tour-play-key');
  playKey.setAttribute('aria-hidden','true');play.type='button';play.setAttribute('aria-keyshortcuts','Space');play.append(playLabel,playKey);controlsRow.append(play);
  bindTourPlayback(play,()=>getState().tour.playing,playing=>actions.tourControl({playing}));
  const restart=button(controlsRow,'↻ Начать заново',()=>actions.restartTour());restart.className='tour-restart';restart.setAttribute('aria-label','Начать заново');restart.hidden=true;
  const next=button(controlsRow,'Дальше →',()=>actions.tourStep(getState().tour.index+1));next.className='tour-next';next.setAttribute('aria-label','Следующая глава');
  returnCamera=button(controlsRow,'↶ Ракурс',resetTourCamera);returnCamera.className='tour-return';returnCamera.title='Вернуть ракурс тура';returnCamera.setAttribute('aria-label',returnCamera.title);
  const coupling=el('div',null,'tour-coupling'),law=el('span');
  const reverse=button(coupling,'↶ Обратный ход',()=>actions.reverseTour());reverse.className='tour-reverse';reverse.title='Поменять направления вращения и роста, сохранив текущее положение';coupling.prepend(law);
  const measureRow=el('div',null,'tour-measure-row'),measureToggle=button(measureRow,'',()=>actions.display({torusHeight:!getState().display.torusHeight}));
  measureToggle.className='tour-measure-toggle';measureToggle.append(tourIcon('ruler'),el('span','Высота тора'));
  measureToggle.title='Высота H₀ × φⁿ: размерные линии и золотые шаги от начала расширения';
  measureToggle.setAttribute('aria-label','Размерная разметка высоты тора');
  const layerButtons=[['torusInner','Внутренний тор'],['torusOuter','Внешний тор'],['torusRounded','Округлые воронки'],['torusSpiral','По спиралям'],['torusTetrahedra','Тетраэдры']].map(([key,label])=>{
    const node=button(measureRow,label,()=>actions.display({[key]:!getState().display[key]}));
    node.className='tour-measure-toggle';node.setAttribute('aria-label','Показать: '+label.toLowerCase());
    return {key,node};
  });
  const inspect=button(player,'Покинуть тур → лаборатория',()=>actions.interface('advanced'));inspect.className='tour-exit';
  const options=el('details',null,'tour-options');options.append(el('summary','Главы и просмотр'));
  const waitLabel=el('label',null,'lab-check'),wait=el('input');wait.type='checkbox';wait.setAttribute('aria-label','Останавливаться между главами');
  wait.addEventListener('change',()=>actions.tourControl({auto:!wait.checked}));waitLabel.append(wait,el('span','Останавливаться между главами'));options.append(waitLabel);
  const chapters=el('div',null,'tour-chapters');options.append(chapters);
  status=el('p',null,'tour-status');
  const states=el('div',null,'tour-states');animationState=el('span');cameraState=el('span');states.append(animationState,cameraState);
  player.append(progress,head,title,text,reading,coupling,measureRow,controlsRow,states,status,options,inspect);document.body.append(player);
  const panel=mountTourPanel(player,{head,content:[text,reading,coupling,measureRow],extras:[states,status,options,inspect],secondary:[phi]});
  let currentKey='',currentTour='';
  function render(state,previousState,action={}) {
    if(state.tour.phase==='complete'&&history.complete(state.tour.id))markViewed(state.tour.id);
    const simple=state.ui.mode==='simple',active=!!state.tour.id;
    document.body.classList.toggle('mode-simple',simple);document.body.classList.toggle('mode-advanced',!simple);document.body.classList.toggle('touring',simple&&active);
    welcome.hidden=!simple||active;player.hidden=!simple||!active;
    if(active&&(!previousState?.tour.id||previousState.tour.id!==state.tour.id))panel.expand();
    const quietFinale=state.tour.id==='torus'&&state.tour.index<TOURS.torus.steps.length-1;
    reading.hidden=quietFinale||!(tourStep(state)?.scene.reading||TOURS[state.tour.id]?.reading);phi.hidden=quietFinale;
    setControlText(reading,tourStep(state)?.scene.readingLabel||(tourStep(state)?.scene.reading==='vortex'?'Вихревое движение · формулы и физика':'О торе: тело, космос, физика'));
    toursButton.setAttribute('aria-pressed',simple);advanced.setAttribute('aria-pressed',!simple);gentle.setAttribute('aria-pressed',state.display.gentleOrbit);
    setControlText(advanced,active?'Покинуть тур':'Лаборатория');advanced.title=active?'Покинуть тур и перейти в лабораторию':'Открыть лабораторию';
    player.dataset.playback=state.tour.phase==='complete'&&!tourStep(state)?.scene.endless?'complete':state.tour.playing?'playing':'paused';
    measureRow.hidden=!hasTorusHeight(tourStep(state)?.scene);measureToggle.setAttribute('aria-pressed',String(state.display.torusHeight));
    for(const {key,node}of layerButtons){
      node.setAttribute('aria-pressed',String(state.display[key]));
      node.hidden=['torusRounded','torusSpiral'].includes(key)&&!['whole','cosmos'].includes(tourStep(state)?.scene.torus);
    }
    const reversible=!!state.tour.motion;
    coupling.hidden=!reversible;reverse.disabled=state.tour.phase==='restarting'||state.tour.phase==='complete'&&!tourStep(state)?.scene.endless;
    const contracting=state.tour.motion?.direction===-1;
    reverse.setAttribute('aria-pressed',String(contracting));setControlText(reverse,contracting?'↷ Вернуть расширение':'↶ Обратный ход');
    if(reversible){setControlText(law,`${tourStep(state).scene.referenceFrame?'180° между телами':'90°'} → ${contracting?'÷':'×'}φ · ${contracting?'сжатие':'расширение'}`);law.dataset.golden='true';}
    if(!active){if(previousState?.tour.id){clearEffects();cancelCameraAnimation();cancelTourShot();}currentKey='';return;}
    const tour=TOURS[state.tour.id],step=tourStep(state),key=`${state.tour.id}:${state.tour.index}`;
    const chapterChanged=key!==currentKey || ['tour/start','tour/step'].includes(action.type) || action.type.startsWith('history/');
    if(chapterChanged) {
      clearEffects();currentKey=key;title.textContent=step.title;text.textContent=step.text;
      const goldText=[...(step.goldText||[]),...(step.scene.dimensions?['разрешаем']:[])];
      let textParts=[step.text];
      for(const phrase of goldText)textParts=textParts.flatMap(part=>typeof part==='string'
        ?part.split(phrase).flatMap((fragment,index)=>index?[el('span',phrase,'tour-gold'),fragment]:[fragment]):[part]);
      text.replaceChildren(...textParts);
      if(!quietFinale)linkTourText(text);
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const node of [title,text])node.animate([{opacity:.3,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'ease-out'});
      chapter.textContent=`${tour.name} · ${state.tour.index+1} / ${tour.steps.length}`;
      previous.disabled=state.tour.index===0;next.disabled=state.tour.index===tour.steps.length-1;next.hidden=next.disabled;
      document.getElementById('info').classList.remove('vis');options.open=false;
      queueTourShot({holdTimeline:!step.scene.continuousMotion&&!step.scene.networkHandoff,entrance:state.tour.index===0});
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
    play.hidden=state.tour.phase==='complete'&&!step.scene.endless;setControlText(playLabel,state.tour.playing?'Ⅱ Пауза и осмотр':'▶ Продолжить тур');
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
