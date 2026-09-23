/** One history transaction per click or slider gesture, never per animation frame. */
import { actions, getState, getHistory, subscribe, beginHistoryGroup, endHistoryGroup, undo, redo } from './state.js';
export function initShortcuts() {
  const desktop=matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)');
  const help=document.createElement('aside');help.className='shortcut-dock';
  help.innerHTML=`<button class="shortcut-question" aria-label="Горячие клавиши" aria-expanded="false" aria-controls="shortcut-panel">?</button>
    <section id="shortcut-panel" hidden><h2>Горячие клавиши</h2><dl>
    <dt>Ctrl / ⌘ Z</dt><dd>Отменить</dd><dt>Ctrl / ⌘ Shift Z</dt><dd>Повторить</dd>
    <dt>Пробел</dt><dd>Пауза / продолжить тур</dd><dt>R</dt><dd>Сбросить камеру</dd>
    <dt>S</dt><dd>Звёзды</dd><dt>G</dt><dd>Проекция</dd><dt>H</dt><dd>Настройки</dd>
    <dt>Esc</dt><dd>Снять выделение / закрыть справку</dd></dl></section>`;
  document.body.append(help);const question=help.querySelector('button'),panel=help.querySelector('section');
  const close=()=>{panel.hidden=true;question.setAttribute('aria-expanded','false');};
  question.addEventListener('click',()=>{panel.hidden=!panel.hidden;question.setAttribute('aria-expanded',!panel.hidden);});
  document.addEventListener('pointerdown',event=>{if(!help.contains(event.target))close();});
  desktop.addEventListener('change',close);
  const back=document.getElementById('undo'), forward=document.getElementById('redo');
  back.addEventListener('click',undo); forward.addEventListener('click',redo);
  const sync=()=>{const history=getHistory();back.disabled=!history.canUndo;forward.disabled=!history.canRedo;};
  subscribe(sync);sync();
  let dragging=false, timer;
  const end=()=>{clearTimeout(timer);dragging=false;endHistoryGroup();};
  document.addEventListener('click',()=>{
    if(dragging)return;
    clearTimeout(timer);beginHistoryGroup();timer=setTimeout(end,0);
  },true);
  document.addEventListener('pointerdown',event=>{
    if(!event.target.matches('input[type=range]'))return;
    end();dragging=true;beginHistoryGroup();
  },true);
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);window.addEventListener('blur',end);
  document.addEventListener('keydown',event=>{
    if(!desktop.matches)return;
    if(event.code==='Escape')close();
    if(event.isComposing || event.target.closest('textarea, [contenteditable=true], input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button])'))return;
    const command=event.ctrlKey||event.metaKey;
    if(command && ['KeyZ','KeyY'].includes(event.code)) {
      event.preventDefault();end();
      if(event.code==='KeyY'||event.shiftKey)redo();else undo();return;
    }
    if(command||event.altKey)return;
    if(event.target.matches('input[type=range]') && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.code)) {
      if(!event.repeat){end();beginHistoryGroup();}return;
    }
    if(event.target.closest('input,select'))return;
    if(event.repeat)return;
    if(event.code==='Space'&&getState().tour.id&&!event.target.closest('button,a,summary')){event.preventDefault();actions.tourControl({playing:!getState().tour.playing});return;}
    if(event.code==='KeyS'){event.preventDefault();actions.display({stars:!getState().display.stars});}
    if(event.code==='KeyG'){event.preventDefault();actions.display({guide:!getState().display.guide});}
    if(event.code==='KeyH'){event.preventDefault();document.getElementById('sb-toggle').click();}
    if(event.code==='KeyR'){event.preventDefault();window.resetCamera();}
  });
  document.addEventListener('keyup',event=>{if(event.target.matches('input[type=range]'))end();});
}
