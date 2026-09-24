import { TORUS_PREFACE } from './tour-preface-data.js';
import { appendChapterLink } from './tour-reading.js';
import { actions } from './state.js';
import { el,button } from './lab-controls.js';
import { tourIcon } from './tour-icons.js';
import { geometryFigure } from './geometry-figures.js';

/** Explicit destinations keep scientific sources separate from tour chapters. */
export function mountTorusPreface(parent) {
  const article=el('article',null,'tour-preface');
  article.setAttribute('aria-labelledby','torus-preface-title');
  const mark=el('div',null,'preface-mark');mark.append(tourIcon('torus'));
  mark.setAttribute('aria-hidden','true');
  const title=el('h2',TORUS_PREFACE.title);title.id='torus-preface-title';
  const lead=el('p',null,'preface-lead');
  for(const part of TORUS_PREFACE.lead)lead.append(typeof part==='string'?part:el('span',part.gold,'preface-gold'));
  article.append(mark,el('p','ПРЕДИСЛОВИЕ К «ТОР · ПЕРЕПЛЕТЕНО»','tour-eyebrow'),title,lead);
  article.append(geometryFigure(TORUS_PREFACE.figure));
  for(const item of TORUS_PREFACE.sections) {
    const section=el('section'),copy=el('p');
    if(item.title)section.append(el('h3',item.title));section.append(copy);
    for(const part of item.text) {
      if(typeof part==='string')copy.append(part);
      else if(part.tour)appendChapterLink(copy,part,{inline:true,warningParent:section,cancelLabel:'Продолжить читать'});
      else {
        const link=el('a',part.label,'preface-research');
        link.href=part.url;link.target='_blank';link.rel='noopener noreferrer';
        link.title=`${part.title} · источник в новой вкладке`;
        link.setAttribute('aria-label',`${part.label} — ${part.title}, откроется в новой вкладке`);
        copy.append(link);
      }
    }
    for(const kind of item.figures||[item.figure].filter(Boolean))section.append(geometryFigure(kind));
    article.append(section);
  }
  const footer=el('footer',null,'preface-footer');
  footer.append(el('p',TORUS_PREFACE.invitation));
  appendChapterLink(footer,TORUS_PREFACE.start,{cancelLabel:'Продолжить читать'});
  const reference=button(footer,'Справка о торе',()=>actions.readTopic('torus'));
  reference.className='preface-reference';
  article.append(footer);parent.append(article);
}
