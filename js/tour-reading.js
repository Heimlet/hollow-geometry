import { mountKnowledgePreview,hideKnowledgePreview } from './knowledge-preview.js';
import { KNOWLEDGE,topicFor } from './tour-knowledge.js';
import { actions,getState,subscribe } from './state.js';
import { el,button } from './lab-controls.js';
import { linkText,openSetting } from './settings-links.js';
export function openTourReading(key){const topic=topicFor(key);if(!topic)return false;actions.readTopic(topic);return true;}
export function linkTourText(root,context) {
  linkText(root,context);
  for(const link of root.querySelectorAll('a[data-setting]')) {
    const topic=topicFor(link.dataset.setting);
    if(!topic||topic===context){link.replaceWith(document.createTextNode(link.textContent));continue;}
    const b=el('button',link.textContent,'tour-topic');b.type='button';b.dataset.topic=topic;
    b.title=`Подробнее: ${KNOWLEDGE[topic].title}`;b.setAttribute('aria-label',b.title);link.replaceWith(b);
  }
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())if(!walker.currentNode.parentElement.closest('a,button'))nodes.push(walker.currentNode);
  for(const node of nodes)if(context!=='phi'&&node.textContent.includes('φ')) {
    const fragment=document.createDocumentFragment(),parts=node.textContent.split('φ');
    parts.forEach((part,i)=>{if(i){const b=el('button','φ','tour-topic');b.type='button';b.dataset.topic='phi';b.title='φ: чем это интересно';fragment.append(b);}fragment.append(part);});node.replaceWith(fragment);
  }
}
function phyllotaxis(parent) {
  const section=el('section',null,'phi-experiment');section.append(el('h3','Одно правило — два совершенно разных рисунка'));
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 320 320');svg.setAttribute('role','img');
  const note=el('p',null,'knowledge-note'),buttons=el('div',null,'phi-choices');
  const golden=360/(((1+Math.sqrt(5))/2)**2);let chosen;
  const draw=angle=>{chosen=angle;svg.replaceChildren();svg.setAttribute('aria-label',`Модель размещения 360 точек с шагом ${angle.toFixed(3)} градусов`);
    for(let i=1;i<=360;i++){const r=148*Math.sqrt(i/360),a=i*angle*Math.PI/180,c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('cx',160+r*Math.cos(a));c.setAttribute('cy',160+r*Math.sin(a));c.setAttribute('r',angle===120?'2.2':'3');c.setAttribute('fill',i%2?'#edca83':'#7dd8cf');svg.append(c);}
    note.textContent=angle===120?'120°: направление повторяется через три шага. Точки собираются в три луча.':'137,508…°: направление не повторяется через целое число шагов. Возникает плотный спиральный узор. Модель иллюстрирует идею размещения, а не воспроизводит биологический рост.';
    for(const b of buttons.children)b.setAttribute('aria-pressed',+b.dataset.angle===chosen);
  };
  for(const [label,angle] of [['Золотой угол · 137,508°',golden],['Сравнить · 120°',120]]){const b=button(buttons,label,()=>draw(angle));b.dataset.angle=angle;}
  section.append(buttons,svg,note);parent.append(section);draw(golden);
}
export function initTourReading() {
  const dialog=el('dialog',null,'knowledge-dialog');dialog.setAttribute('aria-labelledby','knowledge-title');
  const close=button(dialog,'×',()=>actions.closeTopic());close.className='knowledge-close';close.setAttribute('aria-label','Закрыть справку и продолжить тур');
  const back=button(dialog,'← К предыдущей справке',()=>actions.backTopic());back.className='knowledge-back';back.hidden=true;
  const body=el('article',null,'knowledge-body'),footer=el('footer',null,'knowledge-footer');
  const resume=button(footer,'Продолжить тур',()=>actions.closeTopic(true));resume.className='knowledge-resume';
  const leave=button(footer,'Покинуть тур и перейти в лабораторию',()=>{const entry=KNOWLEDGE[getState().ui.topic];actions.interface('advanced');openSetting(entry.setting,leave);});leave.className='knowledge-leave';
  dialog.append(body,footer);document.body.append(dialog);let previous=null,returnFocus=null;const scrollPositions=new Map();
  dialog.addEventListener('cancel',event=>{event.preventDefault();actions.closeTopic();});
  dialog.addEventListener('click',event=>{if(event.target===dialog&&event.clientX){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)actions.closeTopic();}});
  function sync(state,previousState,action={}) {
    const key=state.ui.topic||null;if(key===previous)return;if(previous)scrollPositions.set(previous,body.scrollTop);previous=key;
    back.hidden=!(state.ui.topicTrail?.length);
    if(!key){hideKnowledgePreview();if(dialog.open)dialog.close();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});return;}
    const entry=KNOWLEDGE[key];body.replaceChildren();
    body.append(el('p',entry.kicker,'tour-eyebrow'));const heading=el('h2',entry.title);heading.id='knowledge-title';heading.tabIndex=-1;body.append(heading);mountKnowledgePreview(body,key,entry.title);body.append(el('p',entry.lead,'knowledge-lead'));
    entry.sections.forEach(([title,copy],index)=>{const section=el('section');section.append(el('h3',title),el('p',copy));body.append(section);if(key==='phi'&&title==='Один угол — целый узор')phyllotaxis(body);});
    if(entry.related.length){const related=el('div',null,'knowledge-related');related.append(el('h3','Связанные идеи'));entry.related.forEach(id=>{const b=button(related,KNOWLEDGE[id].title,()=>actions.readTopic(id));b.dataset.topic=id;});body.append(related);}
    if(entry.sources.length){const sources=el('div',null,'knowledge-sources');sources.append(el('h3','Источники и дальше'));for(const [title,url]of entry.sources){const a=el('a',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';sources.append(a);}body.append(sources);}
    body.querySelectorAll('p').forEach(paragraph=>linkTourText(paragraph,key));
    if(key==='metatron_nodes'){const watch=button(body,'Смотреть тур «Тайна тринадцати точек»',()=>actions.startTour('nodes'));watch.className='phi-library';}
    close.setAttribute('aria-label',state.tour.id&&state.tour.phase!=='complete'?'Закрыть справку и продолжить тур':'Закрыть справку');
    resume.textContent=state.tour.id?(state.tour.phase==='complete'?'Вернуться к финалу':'Продолжить тур'):'Вернуться';
    leave.textContent=state.tour.id?'Покинуть тур и перейти в лабораторию':'Открыть в лаборатории';
    if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();}
    body.scrollTop=action.type==='knowledge/back'?(scrollPositions.get(key)||0):0;heading.focus({preventScroll:true});
  }
  sync(getState());subscribe(sync);
  document.addEventListener('click',event=>{
    const topic=event.target.closest('[data-topic]');
    if(topic){event.preventDefault();event.stopImmediatePropagation();openTourReading(topic.dataset.topic);return;}
    const link=event.target.closest('a[data-setting]');
    if(link&&getState().tour.id){event.preventDefault();event.stopImmediatePropagation();openTourReading(link.dataset.setting);}
  },true);
  const phi=button(document.querySelector('.tour-menu'),'φ — чем это интересно',()=>actions.readTopic('phi'));phi.className='phi-library';
  const panel=document.getElementById('setting-display-golden');if(panel){const b=button(panel,'φ — прочитать о смысле и связях',()=>actions.readTopic('phi'));b.className='phi-library';}
}
