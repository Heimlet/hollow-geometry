import {READING_DEMOS,resolveReadingDemo} from './reading-demos.js';
import { mountKnowledgePreview,hideKnowledgePreview } from './knowledge-preview.js';
import { KNOWLEDGE,topicFor } from './tour-knowledge.js';
import { actions,getState,subscribe } from './state.js';
import { el,button } from './lab-controls.js';
import { linkText,openSetting } from './settings-links.js';
import { geometryFigure } from './geometry-figures.js';
let pendingDemo=null;
/** One confirmation path for chapter links in reading cards and on the home page. */
export function appendChapterLink(parent,demo,{inline=false,warningParent=parent,cancelLabel='Остаться в справке'}={}) {
  const target=resolveReadingDemo(demo);if(!target)return null;
  const watch=button(parent,inline?demo.label:`▷ ${demo.label}`,()=>{
    pendingDemo?.remove();
    const warning=el('aside',null,'knowledge-tour-confirm');warning.setAttribute('role','alert');
    const state=getState();
    warning.append(el('strong',`Открыть главу «${target.title}»?`),el('p',`Текущая сцена и её настройки будут заменены сценарием этой главы.${state.tour.id?' Вы покинете текущий тур и начнёте выбранную главу с начала.':''}`));
    const row=el('div');
    const cancel=button(row,cancelLabel,()=>{warning.remove();pendingDemo=null;watch.focus({preventScroll:true});});
    button(row,'Начать показ',()=>actions.startTour(target.tour,target.index));
    warning.append(row);warningParent.append(warning);pendingDemo=warning;
    warning.scrollIntoView({block:'nearest',behavior:'smooth'});cancel.focus({preventScroll:true});
  });
  watch.className=inline?'preface-chapter':'knowledge-watch';watch.title=`${target.name} · глава ${target.index+1}: ${target.title}`;
  return watch;
}
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
  for(const node of nodes){
    const matcher=/(?<![\p{L}\p{N}])(φ|тор(?:а|у|ом|е|ы|ов)?|вихрев(?:ое|ого|ому|ым|ом) движени(?:е|я|ю|ем|и))(?![\p{L}\p{N}])/giu;
    const matchedTopic=text=>text==='φ'?'phi':/^вихрев/i.test(text)?'vortex':'torus';
    const matches=[...node.textContent.matchAll(matcher)].filter(m=>matchedTopic(m[0])!==context);
    if(!matches.length)continue;
    const fragment=document.createDocumentFragment();let end=0;
    for(const match of matches){fragment.append(node.textContent.slice(end,match.index));const b=el('button',match[0],'tour-topic');b.type='button';b.dataset.topic=matchedTopic(match[0]);b.title=KNOWLEDGE[b.dataset.topic].title;fragment.append(b);end=match.index+match[0].length;}
    fragment.append(node.textContent.slice(end));node.replaceWith(fragment);
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
    if(['tour/start','ui/mode','knowledge/open'].includes(action.type)){pendingDemo?.remove();pendingDemo=null;}
    const key=state.ui.topic||null;if(key===previous)return;if(previous)scrollPositions.set(previous,body.scrollTop);previous=key;
    back.hidden=!(state.ui.topicTrail?.length);
    if(!key){hideKnowledgePreview();if(dialog.open)dialog.close();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});return;}
    const entry=KNOWLEDGE[key];body.replaceChildren();pendingDemo=null;
    body.append(el('p',entry.kicker,'tour-eyebrow'));const heading=el('h2',entry.title);heading.id='knowledge-title';heading.tabIndex=-1;body.append(heading);mountKnowledgePreview(body,key,entry.title);body.append(el('p',entry.lead,'knowledge-lead'));
    entry.sections.forEach(([title,copy,references=[],formula])=>{const section=el('section');section.append(el('h3',title));if(formula)section.append(el('p',formula,'knowledge-formula'));section.append(el('p',copy));
      for(const item of entry.illustrations||[])if(item.section===title){
        const card=el('aside',null,'knowledge-illustration'),link=el('a',`${item.label} ↗`);
        link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.title='Иллюстрация откроется в новой вкладке';
        card.append(link,el('p',item.caption));
        if(item.source){const source=el('a','Подпись и источник изображения');source.href=item.source;source.target='_blank';source.rel='noopener noreferrer';card.append(source);}
        section.append(card);
      }
      if(references.length){const citations=el('div',null,'knowledge-citations');for(const index of references){const [label,url]=entry.sources[index],a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';citations.append(a);}section.append(citations);}
      for(const figure of entry.figures||[])if(figure.section===title)section.append(geometryFigure(figure.kind));
      body.append(section);READING_DEMOS.filter(d=>d.topic===key&&d.section===title).forEach(d=>appendChapterLink(section,d));if(key==='phi'&&title==='Один угол — целый узор')phyllotaxis(body);});
    if(entry.related.length){const related=el('div',null,'knowledge-related');related.append(el('h3','Связанные идеи'));entry.related.forEach(id=>{const b=button(related,KNOWLEDGE[id].title,()=>actions.readTopic(id));b.dataset.topic=id;});body.append(related);}
    if(entry.sources.length){const sources=el('div',null,'knowledge-sources');sources.append(el('h3','Источники и дальше'));for(const [title,url]of entry.sources){const a=el('a',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';sources.append(a);}body.append(sources);}
    body.querySelectorAll('p').forEach(paragraph=>linkTourText(paragraph,key));
    close.setAttribute('aria-label',state.tour.id&&state.tour.phase!=='complete'?'Закрыть справку и продолжить тур':'Закрыть справку');
    resume.textContent=state.tour.id?(state.tour.phase==='complete'?'Вернуться к финалу':'Продолжить тур'):'Вернуться';
    leave.textContent=state.tour.id?'Покинуть тур и перейти в лабораторию':'Открыть в лаборатории';
    leave.hidden=!entry.setting;
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
  const tools=document.querySelector('.tour-menu-tools');
  const phi=button(tools,'φ — чем это интересно',()=>actions.readTopic('phi'));phi.className='phi-library';tools.prepend(phi);
  const panel=document.getElementById('setting-display-golden');if(panel){const b=button(panel,'φ — прочитать о смысле и связях',()=>actions.readTopic('phi'));b.className='phi-library';}
}
