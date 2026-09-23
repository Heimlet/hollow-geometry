import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../js/settings-links.js', import.meta.url), 'utf8');
const { textReferences } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
function keys(text, context) { return textReferences(text, context).filter(part => part.key).map(part => part.key); }
assert.deepEqual(keys('Основа Куба Метатрона.'), ['object._metatron_']);
assert.deepEqual(keys('кубооктаэдр и куб'), ['object.cuboctahedron', 'object.cube']);
assert.deepEqual(keys('Рёбра куба, грани октаэдра.', 'icosahedron'), ['detail.cube.edges', 'detail.octahedron.faces']);
assert.deepEqual(keys('Меркабы: пересечение двух тетраэдров = октаэдр.'), ['group.merkaba','group.merkaba','object.octahedron']);
assert.deepEqual(keys('Ромб.додекаэдр'), []); // This dual has no settings in the app.
assert.deepEqual(keys('13 узлов = 78 линий', '_metatron_'), ['detail._metatron_.nodes','detail._metatron_.lines']);
assert.deepEqual(keys('Восходящий тетраэдр. Тетраэдр ▲'), ['object.merkaba_up','object.merkaba_up']);
const sentence = 'Содержит Меркабу (два тетраэдра). Вписан в додекаэдр.';
assert.equal(textReferences(sentence).map(part => part.text).join(''), sentence);
console.log('PASS: Russian inflections, qualified edge/face ownership, compound names, unsupported solids, exact text preservation');
