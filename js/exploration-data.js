import { COMPOUNDS } from './compound-data.js';

// Collections that can be separated, including the five nested Platonic solids.
// Mathematical compounds remain a distinct geometry catalogue.
export const PLATONIC = { id: 'platonic', name: 'Платоновы тела',
  members: ['tetrahedron', 'cube', 'octahedron', 'dodecahedron', 'icosahedron'] };
export const ASSEMBLIES = [PLATONIC, ...COMPOUNDS];
export const assemblyOf = id => ASSEMBLIES.find(group => group.members.includes(id));
export const VIEW_CONTEXTS = [...ASSEMBLIES,
  { id: 'metatron', name: 'Куб Метатрона', members: ['_metatron_'] },
  { id: 'other', name: 'Другие многогранники', members: ['cuboctahedron'] },
  { id: 'golden', name: 'Золотое сечение', members: [] },
];
export function contextForObjects(ids) {
  return VIEW_CONTEXTS.find(group => ids.length && ids.every(id => group.members.includes(id)))?.id;
}
