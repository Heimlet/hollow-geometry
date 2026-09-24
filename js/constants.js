export const OBJECT_OPACITY = { tetrahedron: .15, cube: .10, octahedron: .12, dodecahedron: .08,
  icosahedron: .12, merkaba_up: .12, merkaba_down: .12, cuboctahedron: .06, _metatron_: .4 };
import { COMPOUNDS, COMPONENT_COLORS } from './compound-data.js';
/**
 * Mathematical constants, color palette, object IDs, and info card data.
 * All geometric radii derive from R_META (the cuboctahedron circumradius).
 */

export const PHI = (1 + Math.sqrt(5)) / 2;
export const S3 = 1 / Math.sqrt(3);
export const S2 = 1 / Math.sqrt(2);

// ── Master parameter: cuboctahedron circumradius ──
export const R_META = 3.0;
export const A  = R_META * S2;                         // cube half-side ≈ 2.121
export const CR = A * Math.sqrt(3);                    // cube / dodec / merkaba circumradius ≈ 3.674
export const OR = A;                                   // octahedron circumradius ≈ 2.121
export const IR = A * Math.sqrt(PHI + 2) / (PHI * PHI); // icosahedron (Euclid XIII.16) ≈ 1.542

// ── Colors (hex) ──
export const COLORS = {
  metatron:      0xbbbbdd,
  tetrahedron:   0xff4455,
  cube:          0x33cc55,
  octahedron:    0xffcc22,
  dodecahedron:  0xcc44ff,
  icosahedron:   0x3399ff,
  merkaba_up:    0xff66cc,
  merkaba_down:  0x66ccff,
  cuboctahedron: 0x00ffbb,
};

// ── Canonical list of toggleable object types ──
export const OBJ_IDS = [
  'tetrahedron','cube','octahedron','dodecahedron','icosahedron',
  'merkaba_up','merkaba_down','cuboctahedron',
];

// ── Info cards (displayed on click / [i] button) ──
export const INFO = {
  tetrahedron: {
    name:'Тетраэдр', nameEn:'Tetrahedron', V:4, E:6, F:4,
    faceType:'Треугольники', sym:'T_d (24)', dual:'Тетраэдр',
    element:'🔥 Огонь', schlaefli:'{3,3}',
    desc:'Четыре одинаковых равносторонних треугольника, по три в каждой вершине. Это наименьшее Платоново тело. Соедините центры его граней — получите ещё один тетраэдр. Два встречных тетраэдра в вершинах куба образуют Меркабу.',
  },
  cube: {
    name:'Куб', nameEn:'Cube', V:8, E:12, F:6,
    faceType:'Квадраты', sym:'O_h (48)', dual:'Октаэдр',
    element:'🌍 Земля', schlaefli:'{4,3}',
    desc:'Шесть одинаковых квадратов, по три в каждой вершине. Середины рёбер куба дают вершины кубооктаэдра, центры граней — октаэдра. В чередующихся вершинах скрыты два тетраэдра Меркабы.',
  },
  octahedron: {
    name:'Октаэдр', nameEn:'Octahedron', V:6, E:12, F:8,
    faceType:'Треугольники', sym:'O_h (48)', dual:'Куб',
    element:'💨 Воздух', schlaefli:'{3,4}',
    desc:'Восемь одинаковых равносторонних треугольников, по четыре в каждой вершине. Его вершины можно получить из центров граней куба. В исходной Меркабе октаэдр — общий объём двух тетраэдров.',
  },
  dodecahedron: {
    name:'Додекаэдр', nameEn:'Dodecahedron', V:20, E:30, F:12,
    faceType:'Пятиугольники', sym:'I_h (120)', dual:'Икосаэдр',
    element:'✨ Эфир', schlaefli:'{5,3}',
    desc:'Двенадцать одинаковых правильных пятиугольников, по три в каждой вершине. Диагонали каждой грани создают пентаграмму, а в ней — следующий пятиугольник. Так золотое сечение связывает большое и малое.',
  },
  icosahedron: {
    name:'Икосаэдр', nameEn:'Icosahedron', V:12, E:30, F:20,
    faceType:'Треугольники', sym:'I_h (120)', dual:'Додекаэдр',
    element:'💧 Вода', schlaefli:'{3,5}',
    desc:'Двадцать одинаковых равносторонних треугольников, по пять в каждой вершине. Все 12 вершин можно получить из углов трёх золотых прямоугольников. Центры его граней дают вершины додекаэдра.',
  },
  merkaba_up: {
    name:'Меркаба ▲', nameEn:'Merkaba Up', V:4, E:6, F:4,
    faceType:'Треугольники', sym:'T_d', dual:'—',
    element:'💫 Ян', schlaefli:'—',
    desc:'Первый из двух тетраэдров Меркабы. Он занимает четыре чередующиеся вершины куба. Второй тетраэдр использует оставшиеся четыре, и вместе они создают объёмную звезду.',
  },
  merkaba_down: {
    name:'Меркаба ▼', nameEn:'Merkaba Down', V:4, E:6, F:4,
    faceType:'Треугольники', sym:'T_d', dual:'—',
    element:'💫 Инь', schlaefli:'—',
    desc:'Второй, перевёрнутый тетраэдр Меркабы. Вместе с первым он занимает все восемь вершин куба. Их общий объём в исходном положении — правильный октаэдр.',
  },
  cuboctahedron: {
    name:'Кубооктаэдр', nameEn:'Cuboctahedron', V:12, E:24, F:14,
    faceType:'8△+6□', sym:'O_h (48)', dual:'Ромб.додекаэдр',
    element:'⚖️ Равновесие', schlaefli:'r{4,3}',
    desc:'Квадраты и треугольники образуют одну оболочку. Расстояние от центра до вершины равно ребру. Все 12 вершин — середины рёбер куба и внешние узлы Метатрона.',
  },
  metatron: {
    name:'Куб Метатрона', nameEn:"Metatron's Cube", V:13, E:78, F:0,
    faceType:'—', sym:'O_h', dual:'—',
    element:'🌀 Творение', schlaefli:'K₁₃',
    desc:'Один центр и 12 вершин кубооктаэдра соединены попарно: всего 78 отрезков. В эту пространственную сеть вложены согласованные по размеру Платоновы тела. Нужный ракурс проявляет их общие направления.',
  },
};

for (const compound of COMPOUNDS.filter(c=>c.id!=='merkaba')) compound.members.forEach((id,i)=>{
  OBJ_IDS.push(id); COLORS[id]=COMPONENT_COLORS[i];
  const base=INFO[compound.kind];INFO[id]={...base,name:`${base.name} ${i+1} · ${compound.name}`,nameEn:compound.id,desc:`Компонент ${i+1} соединения «${compound.name}». Цвет и номер сохраняются при рекурсии и сборке.`};
});

OBJ_IDS.push('tetrahedron_mirror');
COLORS.tetrahedron_mirror=0xffb06a;
INFO.tetrahedron_mirror={...INFO.tetrahedron,name:'Тетраэдр · зеркальная пара',nameEn:'Opposite tetrahedron',desc:'Центральное отражение исходного тетраэдра: каждая вершина p заменена на −p. Вместе они занимают все восемь вершин куба и образуют соединение двух тетраэдров.'};
