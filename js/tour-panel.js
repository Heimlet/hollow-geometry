/** Local disclosure state; folding the player never touches the film or camera. */
import { el } from './lab-controls.js';

export function mountTourPanel(player,{head,content,extras,secondary=[]}) {
  const mobile=matchMedia('(max-width:700px), (max-width:1000px) and (max-height:600px)');
  const handle=el('button',null,'tour-panel-handle'),label=el('span'),chevron=el('span',null,'tour-panel-chevron');
  handle.type='button';chevron.setAttribute('aria-hidden','true');
  handle.append(label,chevron);player.insertBefore(handle,head);
  const folds=[content,extras].map((nodes,index)=>{
    const fold=el('div',null,'tour-panel-fold'),inner=el('div',null,'tour-panel-fold-inner');
    fold.id=`tour-panel-${index?'details':'text'}`;
    player.insertBefore(fold,nodes[0]);inner.append(...nodes);fold.append(inner);return fold;
  });
  handle.setAttribute('aria-controls',folds.map(node=>node.id).join(' '));
  secondary.forEach(node=>node.classList.add('tour-panel-secondary'));
  let folded=false,gesture=null,swiped=false;
  function sync(){
    const hidden=mobile.matches&&folded;
    if(hidden&&[...folds,...secondary].some(node=>node.contains(document.activeElement)))handle.focus({preventScroll:true});
    player.dataset.folded=String(hidden);
    handle.setAttribute('aria-expanded',String(!hidden));
    handle.setAttribute('aria-label',hidden?'Развернуть текст и настройки тура':'Свернуть текст и настройки тура');
    handle.title=hidden?'Показать текст · можно потянуть вверх':'Скрыть текст · можно потянуть вниз';
    label.textContent=hidden?'Текст и настройки':'Свернуть';
    for(const node of [...folds,...secondary]){node.inert=hidden;if(hidden)node.setAttribute('aria-hidden','true');else node.removeAttribute('aria-hidden');}
    // A previously scrolled mobile player must not leave its fixed controls offscreen.
    player.scrollTop=0;
  }
  function setFolded(value){const changed=folded!==value;folded=value;sync();if(changed)player.dispatchEvent(new CustomEvent('tour-panel-toggle',{bubbles:true,detail:{collapsed:mobile.matches&&folded}}));}
  handle.addEventListener('click',event=>{
    if(swiped&&event.detail!==0){swiped=false;return;}
    swiped=false;setFolded(!folded);
  });
  handle.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.isPrimary===false)return;
    swiped=false;gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointerup',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;
    if(Math.abs(dy)<28||Math.abs(dy)<Math.abs(dx)*1.3)return;
    swiped=true;setFolded(dy>0);
  });
  handle.addEventListener('pointercancel',()=>{gesture=null;swiped=false;});
  mobile.addEventListener('change',sync);sync();
  return {expand:()=>setFolded(false)};
}
