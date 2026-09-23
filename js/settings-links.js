/** Semantic text references and navigation; never changes application settings. */
const targets = new Map();
let returnFocus = null;
let sidebarWasHidden = false;
export function registerSetting(key, element, name) {
  element.id ||= `setting-${key.replaceAll('.', '-')}`;
  targets.set(key, { element, name });
}
export function settingLink(text, key) {
  const link = document.createElement('a');
  link.className = 'settings-link'; link.textContent = text;
  link.href = '#' + (targets.get(key)?.element.id || `setting-${key.replaceAll('.', '-')}`);
  link.dataset.setting = key;
  link.title = `Открыть настройки: ${text}`;
  link.setAttribute('aria-label', `${text} — открыть настройки`);
  return link;
}
export function openSetting(key, source) {
  const target = targets.get(key);
  if (!target) return false;
  const sidebar = document.getElementById('sidebar');
  if (!document.body.classList.contains('settings-navigation')) {
    sidebarWasHidden = sidebar.classList.contains('hidden');
    returnFocus = source || document.activeElement;
  }
  sidebar.classList.remove('hidden'); document.body.classList.add('settings-navigation');
  for (let el = target.element; el && el !== sidebar; el = el.parentElement) {
    if (el.matches('details')) el.open = true;
    if (el.matches('.grp-body, .obj-ctrls')) {
      el.classList.add('open'); el.previousElementSibling?.setAttribute('aria-expanded', 'true');
      if (el.matches('.grp-body')) el.previousElementSibling?.classList.add('open');
    }
  }
  // An object/group link opens its own controls as well as all ancestor groups.
  const details = target.element.querySelector(':scope > .obj-ctrls, :scope > .grp-body');
  if (details) {
    details.classList.add('open'); details.previousElementSibling?.setAttribute('aria-expanded', 'true');
    if (details.matches('.grp-body')) details.previousElementSibling?.classList.add('open');
  }
  document.querySelectorAll('.setting-destination').forEach(el => el.classList.remove('setting-destination'));
  target.element.classList.add('setting-destination'); target.element.tabIndex = -1;
  document.getElementById('settings-nav-name').textContent = `Настройки: ${target.name}`;
  // Disable accordion transition during navigation so scroll/focus has a stable destination.
  target.element.scrollIntoView({ block: 'center', behavior: 'instant' });
  target.element.focus({ preventScroll: true });
  return true;
}
export function initSettingsNavigation() {
  const banner = document.createElement('div'); banner.id = 'settings-nav';
  const name = document.createElement('span'); name.id = 'settings-nav-name'; name.setAttribute('role', 'status');
  const back = document.createElement('button'); back.textContent = '← Назад'; back.title = 'Вернуться к тексту или фигуре';
  function finish() {
    document.body.classList.remove('settings-navigation');
    document.querySelectorAll('.setting-destination').forEach(el => el.classList.remove('setting-destination'));
  }
  back.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation();
    finish();
    document.getElementById('sidebar').classList.toggle('hidden', sidebarWasHidden);
    if (returnFocus?.isConnected) requestAnimationFrame(() => returnFocus.focus({ preventScroll: true }));
  });
  banner.append(back, name); document.getElementById('sidebar').prepend(banner);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-setting]');
    if (link && openSetting(link.dataset.setting, link)) { event.preventDefault(); event.stopPropagation(); }
  });
  document.getElementById('sb-toggle').addEventListener('click', finish);
  window.addEventListener('inspect-object', finish);
  window.addEventListener('golden-inspect', finish);
}

// Longest semantic phrases first; Cyrillic word boundaries avoid partial names.
const terms = [
  ['group.tetra10', 'соединени(?:е|я|ю|ем) (?:10|десяти) тетраэдров'],
  ['group.tetra5', 'соединени(?:е|я|ю|ем) (?:5|пяти) тетраэдров'],
  ['group.cube5', 'соединени(?:е|я|ю|ем) (?:5|пяти) кубов'],
  ['group.compound', 'соединени(?:я|й|ям) многогранников'],
  ['golden.studies', 'золот(?:ая|ой|ую) спирал(?:ь|и|ью)|вложенные пентаграммы|деление золотого прямоугольника'],
  ['lab.hull', 'выпукл(?:ая|ую|ой) оболочк(?:а|у|и|ой)|оболочк(?:а|у|и|ой) Меркабы'],
  ['lab.intersection', 'пересечени(?:е|я|ю|ем) (?:двух тетраэдров|тетраэдров|Меркабы)'],
  ['lab.source', 'исходные тетраэдры'],
  ['lab.rotation', 'вращени(?:е|я|ю|ем) Меркабы'],
  ['lab.explode', 'взрывн(?:ая|ой|ую) схем(?:а|ы|у|ой)|Explode'],
  ['display.golden', 'золот(?:ое|ого|ому|ым) сечени(?:е|я|ю|ем)|отношени(?:е|я) φ'],
  ['detail._metatron_.nodes', 'узл(?:ы|ов|а|ами|ах) метатрона'],
  ['detail._metatron_.lines', 'лини(?:и|й|ями|ях) метатрона'],
  ['object._metatron_', "куб(?:а|у|ом|е)? метатрона|метатрон(?:а|у|ом|е)?|metatron's cube"],
  ['group.merkaba', 'два тетраэдра|двух тетраэдров'],
  ['object.merkaba_up', 'восходящ(?:ий|им|его) тетраэдр(?:ом|а)?|меркаба ▲|тетраэдр ▲|merkaba up'],
  ['object.merkaba_down', 'нисходящ(?:ий|им|его) тетраэдр(?:ом|а)?|меркаба ▼|тетраэдр ▼|merkaba down'],
  ['group.platonic', 'платонов(?:ы|ых|ым|ыми) тел(?:а|о|ам|ами)?|платоново тело'],
  ['group.merkaba', 'меркаб(?:а|ы|у|ой|е)'],
  ['object.cuboctahedron', 'кубооктаэдр(?:а|у|ом|е|ы|ов)?|cuboctahedron'],
  ['object.dodecahedron', '(?<!ромб\\.)додекаэдр(?:а|у|ом|е|ы|ов)?|dodecahedron'],
  ['object.icosahedron', 'икосаэдр(?:а|у|ом|е|ы|ов)?|icosahedron'],
  ['object.octahedron', 'октаэдр(?:а|у|ом|е|ы|ов)?|octahedron'],
  ['object.tetrahedron', 'тетраэдр(?:а|у|ом|е|ы|ов)?|tetrahedron'],
  ['object.cube', 'куб(?:а|у|ом|е|ы|ов)?|cube'],
  ['display.stars', 'зв[её]зд(?:ы|ный фон)'],
  ['display.autoRotate', 'автовращени(?:е|я)|авто-вращ\\.'],
  ['display.guide', 'направляющ(?:ая|ую|ей) проекции'],
  ['camera', 'ортографическ(?:ая|ую|ой) (?:камера|проекция)|перспектив(?:а|у|ы)'],
  ['recursion', 'рекурси(?:я|и|ю)'],
];
export function textReferences(text, objectId) {
  const contextual = objectId ? [
    ...(objectId === '_metatron_' ? [['detail._metatron_.nodes', 'узл(?:ы|ов|ами|ах|а)'], ['detail._metatron_.lines', 'лини(?:и|й|ями|ях)']]
      : [[`detail.${objectId}.edges`, 'р[её]бр(?:а|о|ам|ами|ах)|р[её]бер'], [`detail.${objectId}.faces`, 'гран(?:и|ей|ям|ями|ях)']]),
  ] : [];
  const qualified = [
    ['cube', 'куба'], ['tetrahedron', 'тетраэдра'], ['octahedron', 'октаэдра'],
    ['dodecahedron', 'додекаэдра'], ['icosahedron', 'икосаэдра'], ['cuboctahedron', 'кубооктаэдра'],
  ].flatMap(([id, noun]) => [
    [`detail.${id}.edges`, `(?:р[её]бра|р[её]бер|р[её]брам|р[её]брами) ${noun}`],
    [`detail.${id}.faces`, `(?:грани|граней|граням|гранями) ${noun}`],
  ]);
  const rules = [...qualified, ...terms, ...contextual];
  const regex = new RegExp(`(?<![\\p{L}\\p{N}])(?:${rules.map(([, pattern]) => `(${pattern})`).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const parts = []; let end = 0;
  for (const match of text.matchAll(regex)) {
    if (match.index > end) parts.push({ text: text.slice(end, match.index) });
    const index = match.slice(1).findIndex(value => value !== undefined);
    parts.push({ text: match[0], key: rules[index][0] }); end = match.index + match[0].length;
  }
  if (end < text.length) parts.push({ text: text.slice(end) });
  return parts;
}
export function linkText(root, objectId) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.parentElement.closest('a, button, input, select, script, style, [data-no-setting-links]')) nodes.push(node);
  }
  for (const node of nodes) {
    const parts = textReferences(node.textContent, objectId);
    if (!parts.some(part => part.key && targets.has(part.key))) continue;
    const fragment = document.createDocumentFragment();
    for (const part of parts) fragment.append(part.key && targets.has(part.key) ? settingLink(part.text, part.key) : document.createTextNode(part.text));
    node.replaceWith(fragment);
  }
}
