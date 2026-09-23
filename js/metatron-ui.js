import { PLATONIC_TYPES, pairOf } from './mirror-data.js';
import { PLATONIC } from './exploration-data.js';
import { INFO } from './constants.js';
import { getState, actions } from './state.js';
import { el,check,button } from './lab-controls.js';
import { appearanceButtons } from './appearance-buttons.js';
import { registerSetting, settingLink } from './settings-links.js';
export function initMetatronUI() {
  const host=document.querySelector('#setting-group-metatron > .grp-body'),section=el('section',null,'metatron-types');
  section.append(el('h3','Тела внутри конструкции'),el('p','Выберите тип: останется сеть и выбранная пара на всех уровнях. У тетраэдра есть отдельная зеркальная фигура; остальные тела при центральном отражении совпадают с собой.','camera-hint'));
  for(const id of PLATONIC_TYPES) {
    const row=el('div',null,'metatron-type');
    const input=check(row,`${INFO[id].name} внутри Метатрона`,()=>{const values=pairOf(id).map(key=>getState().objects[key].visible);return values.every(Boolean)?true:values.some(Boolean)?'mixed':false;},visible=>actions.metatronType(id,visible));
    input.parentElement.querySelector('span').replaceChildren(settingLink(INFO[id].name,`object.${id}`));
    appearanceButtons(row,pairOf(id),`${INFO[id].name} внутри Метатрона`);section.append(row);
  }
  const buttons=el('div',null,'lab-buttons');section.append(buttons);
  button(buttons,'Все пять тел',()=>actions.metatronSelection(true));
  button(buttons,'Только сеть',()=>actions.metatronSelection(false));
  button(buttons,'Смотреть тур',()=>actions.startTour('metatron'));
  button(buttons,'О 13 точках',()=>actions.readTopic('metatron_nodes'));
  registerSetting('metatron.types',section,'Тела внутри куба Метатрона');host.append(section);
}
