/** Shared UI decisions, derived exclusively from the committed scene state. */
export const objectId = id => id === 'metatron' ? '_metatron_' : id;
export const derivedKind = id => id === 'merkaba_hull' ? 'hull' : id === 'merkaba_intersection' ? 'intersection' : undefined;
export const objectSetting = id => derivedKind(id) ? `lab.${derivedKind(id)}` : `object.${objectId(id)}`;
export function objectVisible(state, id) {
  const kind = derivedKind(id);
  if (kind) return state.lab.layers[kind];
  id = objectId(id);
  return !!state.objects[id]?.visible && (!['merkaba_up', 'merkaba_down'].includes(id) || state.lab.layers.source);
}
export function onlyObjectVisible(state, id) {
  const ids = [...Object.keys(state.objects), 'merkaba_hull', 'merkaba_intersection'];
  const visible = ids.filter(key => objectVisible(state, key));
  return visible.length === 1 && visible[0] === objectId(id) && state.study.mode === 'none'
    && !state.display.golden && !state.display.guide && !state.lab.layers.projection;
}
export function assemblyAvailability(value, direction, hasObjects = true) {
  return {
    expand: hasObjects && value < 1 && direction !== 1,
    collapse: hasObjects && (value > 0 || direction === 1) && direction !== -1,
    pause: direction !== 0,
    reset: value !== 0 || direction !== 0,
  };
}
