/** Single source of truth for scene configuration. No DOM or Three.js objects.
 * Commands are atomic; subscribers only render committed, immutable snapshots.
 */
import { OBJ_IDS } from './constants.js';
import { getPreset } from './preset-data.js';
export const ALL_IDS = [...OBJ_IDS, '_metatron_'];
const opacity = { tetrahedron: .15, cube: .10, octahedron: .12, dodecahedron: .08,
  icosahedron: .12, merkaba_up: .12, merkaba_down: .12, cuboctahedron: .06, _metatron_: .4 };
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
export function initialState() {
  return freeze({ objects: Object.fromEntries(ALL_IDS.map(id => [id, {
    visible: false, edges: false, faces: false, nodes: false, lines: false, opacity: opacity[id],
  }])), recursion: { depth: 1, scale: .35 }, presetId: null,
  study: { mode: 'none', progress: 0, running: false, speed: .12, steps: 5, attached: false },
  display: { autoRotate: false, speed: .15, stars: true, guide: false, golden: false } });
}
function requireValid(condition, message) { if (!condition) throw new Error(message); }
export function reduce(state, action) {
  let next = state;
  switch (action.type) {
    case 'study/change': {
      const study = {...state.study, ...action.patch};
      requireValid(['none','spiral','rectangle','pentagram'].includes(study.mode) &&
        study.progress >= 0 && study.progress <= 1 && Number.isFinite(study.progress) &&
        study.steps >= 1 && study.steps <= 8 && Number.isInteger(study.steps) &&
        study.speed >= .01 && study.speed <= .5 && typeof study.running === 'boolean' && typeof study.attached === 'boolean', 'Invalid study');
      if(study.mode === 'none') study.running = false;
      next = {...state,study}; break;
    }
    case 'objects/change': {
      requireValid(action.ids?.length && action.ids.every(id => ALL_IDS.includes(id)), 'Unknown object');
      const patch = action.patch;
      requireValid(patch && Object.entries(patch).every(([key, value]) =>
        key === 'opacity' ? Number.isFinite(value) && value >= 0 && value <= 1 :
        ['visible', 'edges', 'faces', 'nodes', 'lines'].includes(key) && typeof value === 'boolean'), 'Invalid object settings');
      const objects = { ...state.objects };
      action.ids.forEach(id => {
        const previous = objects[id];
        const enabling = patch.visible === true && !previous.visible;
        const settings = { ...previous,
          ...(enabling ? { edges: true, faces: true, nodes: true, lines: true } : {}), ...patch };
        // A child switched on explicitly also reveals its parent.
        if (patch.visible === undefined && ['edges','faces','nodes','lines'].some(key => patch[key] === true)) settings.visible = true;
        if (!settings.visible) Object.assign(settings, { edges: false, faces: false, nodes: false, lines: false });
        objects[id] = settings;
      });
      // Explicit manual appearance edits exit preset mode; no invisible overrides.
      next = { ...state, objects, presetId: null };
      break;
    }
    case 'preset/select': {
      const preset = getPreset(action.id);
      requireValid(preset, 'Unknown preset');
      if (state.presetId === preset.id) { next = { ...state, presetId: null }; break; }
      const objects = { ...state.objects };
      preset.obj.forEach(id => {
        // A preset must always be drawable, even after hiding edges/faces/lines.
        objects[id] = { ...objects[id],
          ...(!objects[id].visible ? { faces: true, nodes: true, lines: true } : {}),
          visible: true, edges: true,
          ...(id === '_metatron_' ? { lines: true, opacity: Math.max(objects[id].opacity, .4) } : {}) };
      });
      next = { ...state, objects, presetId: preset.id, display: { ...state.display, autoRotate: false } };
      break;
    }
    case 'preset/clear': next = { ...state, presetId: null }; break;
    case 'recursion/change': {
      requireValid(action.patch && Object.keys(action.patch).every(key => ['depth', 'scale'].includes(key)), 'Invalid recursion keys');
      const recursion = { ...state.recursion, ...action.patch };
      requireValid([1, 2, 3].includes(recursion.depth) && Number.isFinite(recursion.scale)
        && recursion.scale >= .15 && recursion.scale <= .55, 'Invalid recursion');
      next = { ...state, recursion }; break;
    }
    case 'display/change': {
      requireValid(Object.entries(action.patch).every(([key, value]) => key === 'speed'
        ? Number.isFinite(value) && value >= 0 && value <= .5
        : ['autoRotate', 'stars', 'guide', 'golden'].includes(key) && typeof value === 'boolean'), 'Invalid display settings');
      next = { ...state, display: { ...state.display, ...action.patch } }; break;
    }
    default: throw new Error(`Unknown action: ${action.type}`);
  }
  return freeze(next);
}
export function groupVisibility(state, ids) {
  const count = ids.filter(id => state.objects[id].visible).length;
  return count === ids.length ? true : count === 0 ? false : 'mixed';
}
export function createStore() {
  let state = initialState();
  const listeners = new Set();
  let notifying = false;
  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    dispatch(action) {
      requireValid(!notifying, 'Subscribers must not dispatch; dispatch commands from controllers');
      const previous = state;
      state = reduce(state, action);
      notifying = true;
      try { listeners.forEach(listener => listener(state, previous, action)); }
      finally { notifying = false; }
    },
  };
}
export const { getState, dispatch, subscribe } = createStore();
export const actions = {
  study: patch => dispatch({ type: 'study/change', patch }),
  objects: (ids, patch) => dispatch({ type: 'objects/change', ids, patch }),
  preset: id => dispatch({ type: 'preset/select', id }),
  clearPreset: () => dispatch({ type: 'preset/clear' }),
  recursion: patch => dispatch({ type: 'recursion/change', patch }),
  display: patch => dispatch({ type: 'display/change', patch }),
};
