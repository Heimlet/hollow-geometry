/** Central reflection p → −p. Only the tetrahedron has a distinct opposite
 * placement among these five canonically centred Platonic solids. */
export const PLATONIC_TYPES=['tetrahedron','cube','octahedron','dodecahedron','icosahedron'];
export const MIRROR_PAIRS={tetrahedron:'tetrahedron_mirror'};
export const pairOf=id=>[id,...(MIRROR_PAIRS[id]?[MIRROR_PAIRS[id]]:[])];
