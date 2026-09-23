/** First-visit walkthrough of the real controls, with one persistent opt-out. */
import { actions,getState,subscribe } from './state.js';
import { el,button } from './lab-controls.js';
export const ONBOARDING_KEY='hollowGeometry.onboarding.v1';
export function shouldShowOnboarding(storage){try{return storage.getItem(ONBOARDING_KEY)!=='seen';}catch{return true;}}
export function rememberOnboarding(storage){try{storage.setItem(ONBOARDING_KEY,'seen');}catch{/* Private storage may be unavailable. */}}
const steps=[
  {target:'.experience-mode',title:'Два способа смотреть',text:'«Туры» — готовые путешествия. «Лаборатория» — свои эксперименты. ≈ делает вращение мягче.'},
  {target:'.tour-menu-tools',title:'Всё рядом',text:'φ открывает справку, значок музыки — плейлист. «Как смотреть» повторит это знакомство.'},
  {target:'.tour-card[data-tour="fruit"]',title:'Начнём с Цветка жизни',text:'Нажмите эту карточку. Путешествие само проведёт вас от кругов к объёму.',next:'Открыть Цветок жизни'},
  {target:'.tour-narration',title:'Текст можно читать в своём темпе',text:'Длинный текст прокручивается пальцем или колёсиком. Подчёркнутые названия открывают справку. Пока вы знакомитесь, тур остановлен.'},
  {target:'.tour-play',title:'Остановите время',text:'Нажмите «Пауза и осмотр», чтобы спокойно дочитать и рассмотреть рисунок.',next:'Нажать паузу'},
  {target:'scene',title:'Теперь можно покрутить',text:'Потяните рисунок мышью или пальцем. На паузе камера свободна. Колёсико или жест двумя пальцами меняет масштаб.'},
  {target:'.tour-player',title:'Переходите между главами',text:'Каждая полоска вверху — глава: нажмите нужную. Стрелки ведут назад и вперёд. В «Главах и просмотре» есть остановка между этапами.'},
  {target:'.tour-return',title:'Вернуться к задуманному ракурсу',text:'↶ возвращает камеру. «Продолжить тур» запускает движение, «Все туры» открывает главную. Теперь начнём путешествие с первого кадра.',next:'Смотреть тур'},
];
export function initOnboarding(resetCamera){
  let storage;try{storage=window.localStorage;}catch{storage=null;}
  const tools=document.querySelector('.tour-menu-tools');
  const replay=button(tools,'? Как смотреть',()=>start());replay.className='onboarding-replay';
  replay.title='Повторить знакомство с интерфейсом';tools.insertBefore(replay,tools.querySelector('.tour-playlist'));
  const overlay=el('div',null,'onboarding');overlay.hidden=true;
  const shades=Array.from({length:4},()=>{const shade=el('div',null,'onboarding-shade');shade.setAttribute('aria-hidden','true');overlay.append(shade);return shade;});
  const ring=el('div',null,'onboarding-focus');ring.setAttribute('aria-hidden','true');
  const card=el('section',null,'onboarding-card');card.setAttribute('role','dialog');card.setAttribute('aria-labelledby','onboarding-title');card.setAttribute('aria-describedby','onboarding-copy');
  const count=el('span',null,'onboarding-count'),title=el('h2'),copy=el('p'),row=el('div',null,'onboarding-actions');title.id='onboarding-title';copy.id='onboarding-copy';
  const skip=button(card,'Пропустить',()=>finish());skip.className='onboarding-skip';skip.setAttribute('aria-label','Закрыть знакомство с интерфейсом');
  const back=button(row,'←',()=>show(index-1));back.setAttribute('aria-label','Предыдущая подсказка');
  const next=button(row,'Дальше',()=>advance());next.className='onboarding-next';
  card.append(count,title,copy,row);overlay.append(ring,card);document.body.append(overlay);
  let active=false,index=0,changing=false,savedAuto=true,openedTour=false,frame=null,returnFocus=null;
  const command=run=>{changing=true;try{run();}finally{changing=false;}};
  const target=()=>steps[index].target==='scene'?document.getElementById('c'):document.querySelector(steps[index].target);
  function finish({restart=false,preserve=false}={}){
    if(!active)return;active=false;overlay.hidden=true;cancelAnimationFrame(frame);document.body.classList.remove('onboarding-active');
    if(openedTour)command(()=>{if(restart)actions.startTour('fruit');actions.tourControl({auto:savedAuto,...(!preserve&&getState().tour.id?{playing:true}:{})});});
    if(returnFocus?.isConnected&&returnFocus.getClientRects().length)returnFocus.focus({preventScroll:true});
  }
  function start(){
    if(active)return;rememberOnboarding(storage);returnFocus=document.activeElement;savedAuto=getState().tour.auto;openedTour=false;
    command(()=>actions.interface('simple'));active=true;document.body.classList.add('onboarding-active');show(0);frame=requestAnimationFrame(track);
  }
  function show(value){
    if(value<0)return;index=value;
    command(()=>{
      if(index<3&&getState().tour.id)actions.stopTour();
      if(index>=3){if(getState().tour.id!=='fruit')actions.startTour('fruit');openedTour=true;actions.tourControl({auto:false,playing:index===4});}
    });
    count.textContent=`ЗНАКОМСТВО · ${index+1} / ${steps.length}`;title.textContent=steps[index].title;copy.textContent=steps[index].text;
    next.textContent=steps[index].next||'Дальше';back.disabled=index===0;skip.textContent=index<3?'Пропустить':'Закрыть обучение';
    overlay.hidden=false;target()?.scrollIntoView({block:'nearest',behavior:'instant'});position();next.focus({preventScroll:true});
  }
  function advance(){
    if(index===steps.length-1){resetCamera();finish({restart:true});return;}
    show(index+1);
  }
  function box(node,x,y,w,h){Object.assign(node.style,{left:`${x}px`,top:`${y}px`,width:`${Math.max(0,w)}px`,height:`${Math.max(0,h)}px`});}
  function position(){
    const node=target();if(!node)return;
    const W=innerWidth,H=innerHeight,pad=7,r=node.getBoundingClientRect();
    let left=Math.max(4,r.left-pad),top=Math.max(4,r.top-pad),right=Math.min(W-4,r.right+pad),bottom=Math.min(H-4,r.bottom+pad);
    if(steps[index].target==='scene'){
      const player=document.querySelector('.tour-player').getBoundingClientRect();
      left=18;top=105;right=player.left>W*.45?player.left-24:W-18;bottom=player.left>W*.45?H-40:player.top-18;
    }
    box(shades[0],0,0,W,top);box(shades[1],0,top,left,bottom-top);box(shades[2],right,top,W-right,bottom-top);box(shades[3],0,bottom,W,H-bottom);box(ring,left,top,right-left,bottom-top);
    const width=Math.min(340,W-24);card.style.width=`${width}px`;const height=card.getBoundingClientRect().height,gap=15;
    let x=Math.max(12,Math.min(W-width-12,(left+right-width)/2)),y;
    if(H-bottom>=height+gap+12)y=bottom+gap;
    else if(top>=height+gap+12)y=top-height-gap;
    else if(W-right>=width+gap+12){x=right+gap;y=(top+bottom-height)/2;}
    else if(left>=width+gap+12){x=left-width-gap;y=(top+bottom-height)/2;}
    else y=Math.max(12,H-height-12);
    card.style.left=`${x}px`;card.style.top=`${Math.max(12,Math.min(H-height-12,y))}px`;
  }
  function track(){if(!active)return;if(!overlay.hidden)position();frame=requestAnimationFrame(track);}
  subscribe((state,previous,action)=>{
    if(!active||changing)return;
    if(state.ui.mode!=='simple'){queueMicrotask(()=>finish({preserve:true}));return;}
    overlay.hidden=!!state.ui.topic;
    if(state.ui.topic)return;
    // UI commands are deferred out of the store's notification phase.
    if(index===2&&action.type==='tour/start'){queueMicrotask(()=>{if(active)show(3);});return;}
    if(index===4&&action.type==='tour/control'&&!state.tour.playing){queueMicrotask(()=>{if(active)show(5);});return;}
    if(openedTour&&state.tour.id!=='fruit'){queueMicrotask(()=>finish({preserve:true}));return;}
    if(index>=3&&index!==4&&state.tour.playing)queueMicrotask(()=>{if(active&&!changing)command(()=>actions.tourControl({playing:false}));});
  });
  document.addEventListener('keydown',event=>{
    if(!active||overlay.hidden)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish();return;}
    // Keep shortcut handlers from changing the scene during the walkthrough.
    event.stopPropagation();
    if(event.key!=='Tab')return;
    const node=target(),selector='button:not(:disabled),a[href],input:not(:disabled),summary,[tabindex="0"]';
    const options=[...(node?.matches(selector)?[node]:[]),...node?.querySelectorAll(selector)||[],...card.querySelectorAll(selector)].filter(n=>n.getClientRects().length);
    event.preventDefault();let i=options.indexOf(document.activeElement);i=(i+(event.shiftKey?-1:1)+options.length)%options.length;options[i]?.focus({preventScroll:true});
  },true);
  if(shouldShowOnboarding(storage))requestAnimationFrame(()=>requestAnimationFrame(()=>start()));
}
