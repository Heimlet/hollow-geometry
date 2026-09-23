import {TOURS} from './tour-data.js';
/** Stable chapter IDs: editing/reordering the film cannot silently change a link. */
export const READING_DEMOS=[
  {topic:'torus',section:'От двух тетраэдров к тору',label:'Проследить путь вершин и рождение поверхности',tour:'torus',chapter:'torus-orbits'},
  {topic:'torus',section:'От внутреннего куба к внешнему',label:'Увидеть переход между вложенными кубами',tour:'torus',chapter:'torus-expansion'},
  {topic:'torus',section:'Что скрывает плоский рисунок',label:'Увидеть квадрат и шестиугольник одного куба',tour:'projections',chapter:'cube-square'},
  {topic:'torus',section:'Что скрывает плоский рисунок',label:'Увидеть тела за Звездой Давида',tour:'merkaba',chapter:'star-reveal'},
  {topic:'phi',section:'Убрать кусок — и получить ту же форму',label:'Посмотреть деление прямоугольников и спирали',tour:'golden',chapter:'rectangle-division'},
  {topic:'phi',section:'В Метатроне можно заглянуть внутрь',label:'Увидеть три золотые плоскости',tour:'golden',chapter:'golden-planes'},
  {topic:'phi',section:'Вот эта простота и поражает',label:'Посмотреть, как звезда повторяет себя',tour:'golden',chapter:'nested-stars'},
  {topic:'icosahedron',section:'Три плоскости задают весь объём',label:'Увидеть прямоугольники внутри икосаэдра',tour:'golden',chapter:'golden-planes'},
  {topic:'spiral',section:'Весь рост задаёт одно действие',label:'Посмотреть рост точной спирали',tour:'golden',chapter:'spiral-growth'},
  {topic:'dodecahedron',section:'Большое продолжается в малом',label:'Заглянуть во вложенные звёзды',tour:'golden',chapter:'nested-stars'},
  {topic:'pentagram',section:'Откуда появляется следующая звезда',label:'Посмотреть рождение следующей звезды',tour:'golden',chapter:'nested-stars'},
  {topic:'octahedron',section:'Мост к икосаэдру',label:'Увидеть золотой мост между телами',tour:'golden',chapter:'golden-bridge'},
  {topic:'merkaba',section:'Оставить общее — получить октаэдр',label:'Посмотреть общий объём тетраэдров',tour:'merkaba',chapter:'intersection'},
  {topic:'platonic',section:'Что у них общего',label:'Начать путешествие по пяти телам',tour:'platonic',chapter:'five-solids'},
  {topic:'fruit',section:'Один, шесть, ещё шесть',label:'Смотреть тур «Плод и Цветок жизни»',tour:'fruit',chapter:'first-circle'},
  {topic:'fruit',section:'Как из кругов рождается куб Метатрона',label:'Увидеть переход от кругов к линиям',tour:'fruit',chapter:'fruit-network'},
  {topic:'metatron',section:'Что именно построено в этой сцене',label:'Увидеть Плод жизни в объёме',tour:'fruit',chapter:'circles-depth'},
  {topic:'vortex',section:'Два тетраэдра — два движения',label:'Посмотреть встречное вращение внутри тора',tour:'torus',chapter:'torus-weave'},
  {topic:'torus',section:'Меркаба в центре',label:'Посмотреть, как вокруг звезды рождается тор',tour:'torus',chapter:'torus-birth'},
  {topic:'torus',section:'Формы рождаются из движения',label:'Вращать тетраэдры и увидеть новые тела',tour:'torus',chapter:'torus-intersection'},
  {topic:'torus',section:'Два повтора — неповторяющийся путь',label:'Увидеть путь с отношением скоростей φ',tour:'torus',chapter:'torus-golden'},
];
export function resolveReadingDemo(demo) {
  const tour=TOURS[demo.tour],index=tour?.steps.findIndex(step=>step.id===demo.chapter);
  return tour&&index>=0?{tour:demo.tour,index,name:tour.name,title:tour.steps[index].title}:null;
}
