import { COMPOUNDS } from './compound-data.js';
import { PHI, CR, R_META } from './constants.js';

export const PRESETS = [
  { id:'triangle',  name:'Треугольник',   icon:'△', dir:[1,1,1],   obj:['tetrahedron'],              R:CR,     desc:'Тетраэдр вдоль оси 3-го порядка [1,1,1]' },
  { id:'square',    name:'Квадрат',       icon:'◻', dir:[0,0,1],   obj:['cube'],                     R:CR,     desc:'Куб вдоль нормали к грани [0,0,1]' },
  { id:'pentagon',  name:'Пятиугольник',  icon:'⬠', dir:[0,PHI,1], obj:['dodecahedron'],              R:CR,     desc:'Додекаэдр вдоль оси 5-го порядка' },
  { id:'hexagon',   name:'Шестиугольник', icon:'⬡', dir:[1,1,1],   obj:['cube'],                     R:CR,     desc:'Куб вдоль диагонали [1,1,1]' },
  { id:'star6',     name:'Звезда Давида', icon:'✡', dir:[1,1,1],   obj:['merkaba_up','merkaba_down'], R:CR,     desc:'Меркаба вдоль [1,1,1] → гексаграмма' },
  { id:'pentagram', name:'Пентаграмма',   icon:'⛤', dir:[0,PHI,1], obj:['dodecahedron'],              R:CR,     desc:'Додекаэдр вдоль оси 5-го порядка → звезда', star:true },
  { id:'decagram',  name:'Декаграмма',    icon:'✳', dir:[0,PHI,1], obj:['dodecahedron','icosahedron'],R:CR,     desc:'Додекаэдр + Икосаэдр → 10-лучевая звезда' },
  { id:'metatron2d',name:'Куб Метатрона', icon:'❋', dir:[1,1,1],   obj:['_metatron_'],                R:R_META, desc:'Кубооктаэдр вдоль [1,1,1] → 2D паттерн' },
];

export function getPreset(id) { return PRESETS.find(preset => preset.id === id) || null; }

// Named Merkaba projections are distinct from the Platonic-solid presets above.
PRESETS.push(
  {id:'merkaba-square',name:'Меркаба: квадрат',icon:'◻',dir:[0,0,1],obj:['merkaba_up','merkaba_down'],R:CR,desc:'Ортографический ракурс Меркабы по оси [0,0,1]',labProjection:'square'},
  {id:'merkaba-hexagon',name:'Меркаба: шестиугольник',icon:'⬡',dir:[1,1,1],obj:['merkaba_up','merkaba_down'],R:CR,desc:'Шестиугольник внешнего контура оболочки Меркабы',labProjection:'hexagon'},
  {id:'merkaba-triangles',name:'Меркаба: треугольники',icon:'△▽',dir:[1,1,1],obj:['merkaba_up','merkaba_down'],R:CR,desc:'Два равносторонних треугольника в каноническом положении',labProjection:'triangles'},
);
for(const compound of COMPOUNDS)for(const order of compound.id==='merkaba'?[2,3]:[2,3,5])PRESETS.push({
  id:`${compound.id}-axis-${order}`,name:`${compound.name}: ось ${order}`,icon:`${order}`,compound:compound.id,
  dir:order===2?[0,0,1]:order===3?[1,1,1]:[0,PHI,1],obj:compound.members,R:CR,
  desc:`Ось симметрии порядка ${order}. Симметрия проявляется в канонической сборке.`,
});
