import { ASSEMBLIES, VIEW_CONTEXTS, contextForObjects } from './exploration-data.js';
import { initialLab, labChange } from './lab-state.js';
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
    visible: false, edges: false, faces: false, nodes: false, lines: false, opacity: opacity[id] ?? .12,
  }])), recursion: { depth: 1, scale: .35 }, presetId: null,
  lab: initialLab(), viewContext: 'platonic',
  study: { mode: 'none', progress: 0, running: false, speed: .12, steps: 5, turns: 3, size: 1, attached: false },
  display: { autoRotate: false, speed: .15, stars: true, guide: false, golden: false } });
}
function requireValid(condition, message) { if (!condition) throw new Error(message); }
export function reduce(state, action) {
  let next = state;
  switch (action.type) {
    case 'view/focus': {
      requireValid(VIEW_CONTEXTS.some(view => view.id === action.id), 'Unknown view context');
      if (state.viewContext !== action.id) next = { ...state, viewContext: action.id, presetId: null };
      break;
    }
    case 'assembly/change': {
      const pack=ASSEMBLIES.find(c=>c.id===action.id);requireValid(pack,'Unknown assembly');
      // Preserve a partial selection; only an empty collection needs revealing.
      const reveal=action.reveal && pack.members.every(id=>!state.objects[id].visible);
      const base=reveal?reduce(state,{type:'objects/change',ids:pack.members,patch:{visible:true}}):state;
      const lab=labChange(base.lab,'explode',{scope:'components',value:0,direction:0});
      next={...base,presetId:null,viewContext:pack.id,lab:labChange(lab,'collections',action.patch,pack.id)};break;
    }
    case 'lab/change': {
      next = {...state,lab:labChange(state.lab,action.section,action.patch,action.id)};
      if(action.section==='explode' && action.patch.scope && action.patch.scope!==state.lab.explode.scope) {
        if(action.patch.scope==='components') next.lab={...next.lab,explode:{...next.lab.explode,value:0,direction:0}};
        else next.lab={...next.lab,collections:Object.fromEntries(Object.entries(next.lab.collections).map(([id,c])=>[id,{...c,explode:0,direction:0}]))};
      }
      if(action.section==='layers') {
        const layers={...next.lab.layers};
        for(const kind of ['hull','intersection']) {
          if(action.patch[kind]===false){layers[kind+'Faces']=false;layers[kind+'Edges']=false;}
          if(action.patch[kind]===true&&!state.lab.layers[kind]){layers[kind+'Faces']=action.patch[kind+'Faces']??true;layers[kind+'Edges']=action.patch[kind+'Edges']??true;}
          if(action.patch[kind+'Faces']===true||action.patch[kind+'Edges']===true)layers[kind]=true;
        }
        next.lab={...next.lab,layers};
      }
      if ((action.section==='layers' && ['hull','intersection','projection','source','hullFaces','hullEdges','intersectionFaces','intersectionEdges'].some(k=>action.patch[k]===true)) || (action.section==='rotation' && action.patch.running)) {
        if(!state.objects.merkaba_up.visible && !state.objects.merkaba_down.visible) {
          next.lab={...next.lab,layers:{...next.lab.layers,source:action.section==='layers'?(action.patch.source??true):true}};
          next.objects={...state.objects}; for(const id of ['merkaba_up','merkaba_down'])next.objects[id]={...state.objects[id],visible:true,faces:true,edges:true};
        }
      }
      break;
    }
    case 'compound/solo': {
      const pack=ASSEMBLIES.find(c=>c.id===action.id);requireValid(pack && pack.members.includes(action.member),'Invalid component');
      const restore=state.lab.collections[pack.id].restore || Object.fromEntries(pack.members.map(id=>[id,state.objects[id]]));
      const objects={...state.objects};for(const id of pack.members)objects[id]={...objects[id],visible:id===action.member,edges:id===action.member,faces:id===action.member,nodes:id===action.member,lines:id===action.member};
      next={...state,objects,presetId:null,viewContext:pack.id,lab:labChange(state.lab,'collections',{restore},pack.id)};break;
    }
    case 'compound/restore': {
      const restore=state.lab.collections[action.id]?.restore;if(restore)next={...state,objects:{...state.objects,...restore},presetId:null,viewContext:action.id,lab:labChange(state.lab,'collections',{restore:null},action.id)};break;
    }
    case 'study/change': {
      const study = {...state.study, ...action.patch};
      requireValid(['none','spiral','rectangle','pentagram'].includes(study.mode) &&
        study.progress >= 0 && study.progress <= 1 && Number.isFinite(study.progress) &&
        study.steps >= 1 && study.steps <= 8 && Number.isInteger(study.steps) &&
        study.speed >= .01 && study.speed <= .5 && Number.isInteger(study.turns) && study.turns>=1 && study.turns<=5 && Number.isFinite(study.size) && study.size>=.1 && study.size<=3 && typeof study.running === 'boolean' && typeof study.attached === 'boolean', 'Invalid study');
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
      next = { ...state, objects, presetId: null, viewContext: contextForObjects(action.ids) || state.viewContext };
      if (!objects.merkaba_up.visible && !objects.merkaba_down.visible) next.lab = {...state.lab,
        rotation:{...state.lab.rotation,running:false},layers:{...state.lab.layers,source:false,hull:false,intersection:false,projection:false,hullFaces:false,hullEdges:false,intersectionFaces:false,intersectionEdges:false}};
      if(patch.visible===true && action.ids.some(id=>['merkaba_up','merkaba_down'].includes(id)) && !state.objects.merkaba_up.visible && !state.objects.merkaba_down.visible) next.lab={...next.lab,layers:{...next.lab.layers,source:true}};
      for(const pack of ASSEMBLIES) if(pack.members.every(id=>!objects[id].visible)) next.lab=labChange(next.lab,'collections',{direction:0,explode:0},pack.id);
      if(action.ids.length===ALL_IDS.length && patch.visible===false) next={...next,study:{...state.study,mode:'none',running:false},lab:{...next.lab,explode:{...next.lab.explode,value:0,direction:0},collections:Object.fromEntries(Object.entries(next.lab.collections).map(([id,c])=>[id,{...c,explode:0,direction:0}]))}};
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
      next = { ...state, objects, presetId: preset.id, viewContext: contextForObjects(preset.obj) || state.viewContext, display: { ...state.display, autoRotate: false } };
      if(preset.obj.includes('merkaba_up'))next.lab={...state.lab,layers:{...state.lab.layers,source:true}};
      if(preset.labProjection)next.lab={...next.lab,layers:{...next.lab.layers,projection:true,axis:preset.labProjection,...(preset.labProjection==='hexagon'?{hull:true,hullEdges:true,hullFaces:false}:{})}};
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
  // Visibility invariants apply to every command, including solo/restore and presets.
  if(!next.objects.merkaba_up.visible&&!next.objects.merkaba_down.visible &&
    (next.lab.rotation.running||['source','hull','intersection','projection','hullFaces','hullEdges','intersectionFaces','intersectionEdges'].some(k=>next.lab.layers[k]))) {
    next={...next,lab:{...next.lab,rotation:{...next.lab.rotation,running:false},layers:{...next.lab.layers,source:false,hull:false,intersection:false,projection:false,hullFaces:false,hullEdges:false,intersectionFaces:false,intersectionEdges:false}}};
  }
  for(const pack of ASSEMBLIES)if(pack.members.every(id=>!next.objects[id].visible)&&(next.lab.collections[pack.id].direction||next.lab.collections[pack.id].explode))next={...next,lab:labChange(next.lab,'collections',{direction:0,explode:0},pack.id)};
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
  focus: id => dispatch({ type: 'view/focus', id }),
  assembly: (id,patch,reveal=true) => dispatch({type:'assembly/change',id,patch,reveal}),
  solo: (id,member) => dispatch({type:'compound/solo',id,member}),
  restore: id => dispatch({type:'compound/restore',id}),
  lab: (section, patch, id) => dispatch({ type: 'lab/change', section, patch, id }),
  study: patch => dispatch({ type: 'study/change', patch }),
  objects: (ids, patch) => dispatch({ type: 'objects/change', ids, patch }),
  preset: id => dispatch({ type: 'preset/select', id }),
  clearPreset: () => dispatch({ type: 'preset/clear' }),
  recursion: patch => dispatch({ type: 'recursion/change', patch }),
  display: patch => dispatch({ type: 'display/change', patch }),
};
