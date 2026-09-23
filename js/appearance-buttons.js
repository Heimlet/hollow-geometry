/** Compact controls reuse the same object settings as every other UI surface. */
import { getState, subscribe, actions } from './state.js';
export function appearanceButtons(parent, ids, name) {
  const box=document.createElement('span');box.className='appearance-buttons';
  for(const [key,label,icon] of [['faces','Грани','▰'],['edges','Рёбра','◇']]) {
    const button=document.createElement('button');button.type='button';button.textContent=icon;
    button.title=`${label} всех видимых вложенных тел · ${name}`;button.setAttribute('aria-label',button.title);
    button.addEventListener('click',event=>{event.stopPropagation();actions.appearance(ids,key);});box.append(button);
    const sync=()=>{const settings=ids.map(id=>getState().objects[id]).filter(o=>o?.visible);
      button.disabled=!settings.length;button.setAttribute('aria-pressed',settings.length&&settings.every(o=>o[key])?'true':settings.some(o=>o[key])?'mixed':'false');};
    sync();subscribe((state,previous)=>{if(state.objects!==previous.objects)sync();});
  }
  parent.append(box);return box;
}
