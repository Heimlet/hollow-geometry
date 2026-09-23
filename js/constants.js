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
    desc:'Простейшее Платоново тело. Самодуальный. Каждая вершина соединена с каждой другой. Вписан в куб — 4 из 8 вершин. Совпадает с восходящим тетраэдром Меркабы.',
  },
  cube: {
    name:'Куб', nameEn:'Cube', V:8, E:12, F:6,
    faceType:'Квадраты', sym:'O_h (48)', dual:'Октаэдр',
    element:'🌍 Земля', schlaefli:'{4,3}',
    desc:'Рёбра куба проходят через вершины кубооктаэдра (узлы Метатрона). Вписан в додекаэдр — делят 8 вершин. Содержит Меркабу (два тетраэдра).',
  },
  octahedron: {
    name:'Октаэдр', nameEn:'Octahedron', V:6, E:12, F:8,
    faceType:'Треугольники', sym:'O_h (48)', dual:'Куб',
    element:'💨 Воздух', schlaefli:'{3,4}',
    desc:'Дуал куба — вершины в центрах граней куба. Ядро Меркабы: пересечение двух тетраэдров = октаэдр.',
  },
  dodecahedron: {
    name:'Додекаэдр', nameEn:'Dodecahedron', V:20, E:30, F:12,
    faceType:'Пятиугольники', sym:'I_h (120)', dual:'Икосаэдр',
    element:'✨ Эфир', schlaefli:'{5,3}',
    desc:'Делит 8 вершин с кубом. Пронизан золотым сечением φ. 12 пятиугольных граней = 12 знаков зодиака.',
  },
  icosahedron: {
    name:'Икосаэдр', nameEn:'Icosahedron', V:12, E:30, F:20,
    faceType:'Треугольники', sym:'I_h (120)', dual:'Додекаэдр',
    element:'💧 Вода', schlaefli:'{3,5}',
    desc:'Построен делением рёбер октаэдра в золотом сечении (Евклид XIII.16). Дуален додекаэдру. 12 вершин на 3 золотых прямоугольниках.',
  },
  merkaba_up: {
    name:'Меркаба ▲', nameEn:'Merkaba Up', V:4, E:6, F:4,
    faceType:'Треугольники', sym:'T_d', dual:'—',
    element:'💫 Ян', schlaefli:'—',
    desc:'Восходящий тетраэдр. Совпадает с Платоновым тетраэдром. 4 вершины куба чётной подгруппы. Направление вращения задаётся в исследовательском режиме.',
  },
  merkaba_down: {
    name:'Меркаба ▼', nameEn:'Merkaba Down', V:4, E:6, F:4,
    faceType:'Треугольники', sym:'T_d', dual:'—',
    element:'💫 Инь', schlaefli:'—',
    desc:'Нисходящий тетраэдр. 4 вершины куба нечётной подгруппы. Пересечение с ▲ = октаэдр.',
  },
  cuboctahedron: {
    name:'Кубооктаэдр', nameEn:'Cuboctahedron', V:12, E:24, F:14,
    faceType:'8△+6□', sym:'O_h (48)', dual:'Ромб.додекаэдр',
    element:'⚖️ Равновесие', schlaefli:'r{4,3}',
    desc:'Вектор Равновесия Фуллера. 12 вершин = середины рёбер куба. Все рёбра и расстояния центр-вершина равны. Основа Куба Метатрона.',
  },
  metatron: {
    name:'Куб Метатрона', nameEn:"Metatron's Cube", V:13, E:78, F:0,
    faceType:'—', sym:'O_h', dual:'—',
    element:'🌀 Творение', schlaefli:'K₁₃',
    desc:'13 узлов (центр + кубооктаэдр) = 78 линий. Содержит проекции всех 5 Платоновых тел.',
  },
};

for (const compound of COMPOUNDS.filter(c=>c.id!=='merkaba')) compound.members.forEach((id,i)=>{
  OBJ_IDS.push(id); COLORS[id]=COMPONENT_COLORS[i];
  const base=INFO[compound.kind];INFO[id]={...base,name:`${base.name} ${i+1} · ${compound.name}`,nameEn:compound.id,desc:`Компонент ${i+1} соединения «${compound.name}». Цвет и номер сохраняются при рекурсии и сборке.`};
});

OBJ_IDS.push('tetrahedron_mirror');
COLORS.tetrahedron_mirror=0xffb06a;
INFO.tetrahedron_mirror={...INFO.tetrahedron,name:'Тетраэдр · зеркальная пара',nameEn:'Opposite tetrahedron',desc:'Центральное отражение исходного тетраэдра: каждая вершина p заменена на −p. Вместе они занимают все восемь вершин куба и образуют соединение двух тетраэдров.'};
