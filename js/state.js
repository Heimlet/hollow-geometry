import { KNOWLEDGE } from './tour-knowledge.js';
import { PLATONIC_TYPES, MIRROR_PAIRS, pairOf } from './mirror-data.js';
import { ASSEMBLIES, VIEW_CONTEXTS, contextForObjects } from './exploration-data.js';
import { initialLab, labChange } from './lab-state.js';
import { objectId, derivedKind } from './scene-selectors.js';
/** Single source of truth for scene configuration. No DOM or Three.js objects.
 * Commands are atomic; subscribers only render committed, immutable snapshots.
 */
import { OBJ_IDS } from './constants.js';
import { getPreset } from './preset-data.js';
import { GOLDEN_SCENES } from './golden-scene-data.js';
import { initialTour, enterTourStep, frameTour, tickTour } from './tour-state.js';
import { TOURS } from './tour-data.js';
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
  lab: initialLab(), viewContext: 'platonic', ui:{mode:'simple',topic:null,topicTrail:[]}, tour:initialTour(),
  study: { mode: 'none', progress: 0, running: false, speed: .12, steps: 5, turns: 3, size: 1, attached: false },
  goldenScene: { id: 'none', progress: 0, running: false },
  display: { autoRotate: false, speed: .15, stars: true, starCount: 2400, gentleOrbit:true, guide: false, golden: false } });
}
function requireValid(condition, message) { if (!condition) throw new Error(message); }
export function reduce(state, action) {
  let next = state;
  switch (action.type) {
    case 'knowledge/open': {
      requireValid(KNOWLEDGE[action.topic],'Unknown reading topic');
      if(state.ui.topic===action.topic)break;
      const trail=state.ui.topic?[...(state.ui.topicTrail||[]),state.ui.topic].slice(-30):[];
      next={...state,ui:{...state.ui,topic:action.topic,topicTrail:trail},tour:{...state.tour,playing:false}};break;
    }
    case 'knowledge/back': {
      const trail=state.ui.topicTrail||[];if(!trail.length)break;
      next={...state,ui:{...state.ui,topic:trail.at(-1),topicTrail:trail.slice(0,-1)},tour:{...state.tour,playing:false}};break;
    }
    case 'knowledge/close': {
      next={...state,ui:{...state.ui,topic:null,topicTrail:[]}};
      if(action.resume&&state.tour.id&&state.tour.phase!=='complete')next=reduce(next,{type:'tour/control',patch:{playing:true}});
      break;
    }
    case 'ui/mode': {
      requireValid(['simple','advanced'].includes(action.mode),'Invalid interface mode');
      next={...state,ui:{mode:action.mode},tour:{...state.tour,id:null,playing:false,phase:'idle'}};break;
    }
    case 'tour/start': next=enterTourStep(state,action.id,action.index??0,state.tour.auto);break;
    case 'tour/restart': {
      requireValid(state.tour.id&&state.tour.index===TOURS[state.tour.id].steps.length-1,'Restart belongs to the final chapter');
      if(state.tour.phase==='restarting')break;
      next={...state,ui:{...state.ui,topic:null,topicTrail:[]},tour:{...state.tour,playing:true,phase:'restarting',restartElapsed:0}};break;
    }
    case 'tour/step': {
      requireValid(state.tour.id&&Number.isInteger(action.index),'No active tour');
      next=enterTourStep(state,state.tour.id,action.index,state.tour.auto);break;
    }
    case 'tour/control': {
      requireValid(Object.entries(action.patch).every(([k,v])=>['playing','auto'].includes(k)&&typeof v==='boolean'),'Invalid tour controls');
      next={...state,tour:{...state.tour,...action.patch},ui:{...state.ui,...(action.patch.playing?{topic:null,topicTrail:[]}:{})}};
      if(!state.tour.id)next.tour.playing=false;
      else if(action.patch.playing===true&&state.tour.phase!=='restarting'&&state.tour.elapsed>=TOURS[state.tour.id].steps[state.tour.index].seconds)
        next=enterTourStep(next,state.tour.id,(state.tour.index+1)%TOURS[state.tour.id].steps.length,next.tour.auto);
      break;
    }
    case 'tour/seek': {
      requireValid(state.tour.id&&Number.isFinite(action.elapsed),'Invalid tour time');
      next=frameTour(state,action.elapsed);next={...next,tour:{...next.tour,playing:false,phase:'explore'}};break;
    }
    case 'tour/tick': {
      requireValid(Number.isFinite(action.seconds)&&action.seconds>=0,'Invalid tour tick');next=tickTour(state,action.seconds);break;
    }
    case 'tour/stop': next={...state,ui:{...state.ui,topic:null,topicTrail:[]},tour:{...state.tour,id:null,playing:false,phase:'idle'}};break;
    case 'metatron/selection': {
      const ids=PLATONIC_TYPES.flatMap(pairOf);
      requireValid(typeof action.visible==='boolean','Invalid Metatron selection');
      next=reduce(state,{type:'objects/change',ids,patch:{visible:action.visible}});
      next=reduce(next,{type:'objects/change',ids:['_metatron_'],patch:{visible:true}});
      next={...next,viewContext:'metatron'};break;
    }
    case 'objects/appearance': {
      requireValid(action.ids?.length&&action.ids.every(id=>ALL_IDS.includes(id))&&['edges','faces'].includes(action.key),'Invalid appearance command');
      const ids=action.ids.filter(id=>state.objects[id].visible);if(!ids.length)break;
      next=reduce(state,{type:'objects/change',ids,patch:{[action.key]:!ids.every(id=>state.objects[id][action.key])}});
      next={...next,viewContext:state.viewContext};break;
    }
    case 'object/mirror': {
      requireValid(MIRROR_PAIRS[action.id],'No distinct mirror partner');
      const mirror=MIRROR_PAIRS[action.id],visible=!state.objects[mirror].visible;
      next=reduce(state,{type:'objects/change',ids:visible?pairOf(action.id):[mirror],patch:{visible}});break;
    }
    case 'metatron/type': {
      requireValid(PLATONIC_TYPES.includes(action.id)&&typeof action.visible==='boolean','Invalid Metatron type');
      const ids=pairOf(action.id);
      next=action.visible?reduce(state,{type:'objects/change',ids:ALL_IDS.filter(id=>id!=='_metatron_'&&!ids.includes(id)),patch:{visible:false}}):state;
      next=reduce(next,{type:'objects/change',ids:action.visible?[...ids,'_metatron_']:ids,patch:{visible:action.visible}});
      next={...next,viewContext:'metatron'};break;
    }
    case 'golden-scene/start': {
      const demo=GOLDEN_SCENES[action.id];requireValid(demo,'Unknown golden scene');
      const objects=Object.fromEntries(ALL_IDS.map(id=>[id,{...state.objects[id],
        visible:demo.objects.includes(id),edges:demo.objects.includes(id),faces:demo.objects.includes(id),
        nodes:false,lines:false,...(demo.objects.includes(id)?{opacity:.035}:{})}]));
      next={...state,objects,presetId:null,viewContext:'golden',recursion:{...state.recursion,depth:1},
        lab:initialLab(),study:{...state.study,mode:'none',running:false},
        display:{...state.display,golden:false,guide:false,autoRotate:false},
        goldenScene:{id:action.id,progress:0,running:true}};break;
    }
    case 'golden-scene/change': {
      requireValid(action.patch && Object.keys(action.patch).every(key=>['id','progress','running'].includes(key)) &&
        (action.patch.id===undefined || action.patch.id==='none' || action.patch.id===state.goldenScene.id),'Use start to activate a golden scene');
      const demo={...state.goldenScene,...action.patch};
      requireValid((demo.id==='none'||GOLDEN_SCENES[demo.id]) && typeof demo.running==='boolean' &&
        Number.isFinite(demo.progress)&&demo.progress>=0&&demo.progress<=1,'Invalid golden scene');
      if(demo.id==='none')demo.running=false;
      next={...state,goldenScene:demo};break;
    }
    case 'object/visibility': {
      const id = objectId(action.id), kind = derivedKind(id);
      requireValid(typeof action.visible === 'boolean', 'Invalid visibility');
      next = kind ? reduce(state, {type:'lab/change',section:'layers',patch:{[kind]:action.visible}})
        : reduce(state, {type:'objects/change',ids:[id],patch:{visible:action.visible}});
      next = {...next, presetId:null, viewContext:state.viewContext};
      if (action.visible && ['merkaba_up','merkaba_down'].includes(id)) next.lab = {...next.lab,layers:{...next.lab.layers,source:true}};
      break;
    }
    case 'object/only': {
      const id = objectId(action.id), kind = derivedKind(id);
      requireValid(kind || ALL_IDS.includes(id), 'Unknown object');
      const keep = kind ? ['merkaba_up','merkaba_down'] : [id];
      const existingSources = kind && keep.some(key => state.objects[key].visible);
      const objects = Object.fromEntries(ALL_IDS.map(key => {
        const current = state.objects[key];
        // A hidden source can have a different explode offset; keep both inputs'
        // existing states so isolating a derived solid does not change its shape.
        if (existingSources && keep.includes(key)) return [key, current];
        return [key, keep.includes(key) ? {...current,visible:true,...(!current.visible?{edges:true,faces:true,nodes:true,lines:true}:{})}
          : {...current,visible:false,edges:false,faces:false,nodes:false,lines:false}];
      }));
      const layers = {...state.lab.layers,source:!kind&&keep.some(key=>['merkaba_up','merkaba_down'].includes(key)),
        hull:false,intersection:false,projection:false,hullFaces:false,hullEdges:false,intersectionFaces:false,intersectionEdges:false};
      if (kind) Object.assign(layers,{[kind]:true,[kind+'Faces']:state.lab.layers[kind]?state.lab.layers[kind+'Faces']:true,[kind+'Edges']:state.lab.layers[kind]?state.lab.layers[kind+'Edges']:true});
      next = {...state,objects,presetId:null,study:{...state.study,mode:'none',running:false},
        display:{...state.display,golden:false,guide:false},lab:{...state.lab,layers,
          rotation:{...state.lab.rotation,running:false},explode:{...state.lab.explode,direction:0},
          collections:Object.fromEntries(Object.entries(state.lab.collections).map(([key,value])=>[key,{...value,direction:0}]))}};
      break;
    }
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
        if((!state.objects.merkaba_up.visible && !state.objects.merkaba_down.visible) || (action.section==='rotation' && action.patch.running && next.lab.rotation.mode==='tradition')) {
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
      for(const [parent,mirror] of Object.entries(MIRROR_PAIRS)) {
        if(action.ids.includes(parent)&&patch.visible===false)objects[mirror]={...objects[mirror],visible:false,faces:false,edges:false,nodes:false,lines:false};
        if(action.ids.includes(mirror)&&objects[mirror].visible&&!objects[parent].visible)objects[parent]={...objects[parent],visible:true,faces:true,edges:true};
        if(action.ids.includes(parent)&&objects[mirror].visible) {
          const appearance=Object.fromEntries(Object.entries(patch).filter(([key])=>['faces','edges','opacity'].includes(key)));
          objects[mirror]={...objects[mirror],...appearance};
        }
      }
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
      requireValid(Object.entries(action.patch).every(([key, value]) => key === 'starCount'
        ? Number.isInteger(value) && value >= 200 && value <= 8000 : key === 'speed'
        ? Number.isFinite(value) && value >= 0 && value <= .5
        : ['autoRotate', 'stars', 'guide', 'golden', 'gentleOrbit'].includes(key) && typeof value === 'boolean'), 'Invalid display settings');
      next = { ...state, display: { ...state.display, ...action.patch } }; break;
    }
    default: throw new Error(`Unknown action: ${action.type}`);
  }
  // A projection panel opened for a preset has the same lifetime as that preset.
  // A new Merkaba projection supplies its new axis; other presets clear the panel.
  if (next.presetId !== state.presetId && !getPreset(next.presetId)?.labProjection && next.lab.layers.projection) {
    next = {...next,lab:{...next.lab,layers:{...next.lab.layers,projection:false}}};
  }
  // Visibility invariants apply to every command, including solo/restore and presets.
  if(!next.objects.merkaba_up.visible&&!next.objects.merkaba_down.visible &&
    (next.lab.rotation.running||['source','hull','intersection','projection','hullFaces','hullEdges','intersectionFaces','intersectionEdges'].some(k=>next.lab.layers[k]))) {
    next={...next,lab:{...next.lab,rotation:{...next.lab.rotation,running:false},layers:{...next.lab.layers,source:false,hull:false,intersection:false,projection:false,hullFaces:false,hullEdges:false,intersectionFaces:false,intersectionEdges:false}}};
  }
  for(const pack of ASSEMBLIES)if(pack.members.every(id=>!next.objects[id].visible)&&(next.lab.collections[pack.id].direction||next.lab.collections[pack.id].explode))next={...next,lab:labChange(next.lab,'collections',{direction:0,explode:0},pack.id)};
  // Guided geometry assumes canonical, co-centred sources. Editing the scene
  // ends the guide atomically rather than leaving orphaned annotations behind.
  if(state.goldenScene.id!=='none' && !action.type.startsWith('golden-scene/') && !action.type.startsWith('tour/') && action.history!==false &&
    (['objects/change','object/visibility','object/only','preset/select','recursion/change','assembly/change','lab/change','compound/solo','compound/restore'].includes(action.type) ||
    action.type==='view/focus'&&action.id!=='golden' || action.type==='study/change' || action.type==='display/change'&&action.patch.golden===true))
    next={...next,goldenScene:{...state.goldenScene,id:'none',running:false}};
  // The timeline has a single owner. Manual scene edits hand control back to the
  // user; free camera interaction only pauses it through tour/control.
  if(state.tour.id && !action.type.startsWith('tour/') && !action.type.startsWith('ui/') && action.history!==false &&
    action.type!=='display/change' && action.type!=='view/focus')next={...next,tour:{...state.tour,id:null,playing:false,phase:'idle'}};
  return freeze(next);
}
export function groupVisibility(state, ids) {
  const count = ids.filter(id => state.objects[id].visible).length;
  return count === ids.length ? true : count === 0 ? false : 'mixed';
}
export function createStore() {
  let state = initialState();
  const listeners = new Set();
  const past = [], future = [];
  let notifying = false, grouping = false, recorded = false;
  const notify = (previous, action) => {
    notifying = true;
    try { listeners.forEach(listener => listener(state, previous, action)); }
    finally { notifying = false; }
  };
  // Restored animation frames are stable until the user presses Play again.
  const paused = snapshot => freeze({...snapshot,
    ui:state.ui,tour:{...snapshot.tour,playing:false},
    goldenScene:{...snapshot.goldenScene,running:false}, study:{...snapshot.study,running:false},
    lab:{...snapshot.lab,rotation:{...snapshot.lab.rotation,running:false},
      explode:{...snapshot.lab.explode,direction:0},
      collections:Object.fromEntries(Object.entries(snapshot.lab.collections).map(([id,c])=>[id,{...c,direction:0}]))}});
  const travel = (from, to, type) => {
    requireValid(!notifying, 'Subscribers must not dispatch; dispatch commands from controllers');
    grouping = false; recorded = false;
    if (!from.length) return;
    const previous = state; to.push(previous); state = paused(from.pop());
    notify(previous, {type});
  };
  return {
    getState: () => state,
    getHistory: () => ({canUndo:past.length>0,canRedo:future.length>0,undoCount:past.length,redoCount:future.length}),
    beginHistoryGroup() { if (!grouping) { grouping = true; recorded = false; } },
    endHistoryGroup() { grouping = false; recorded = false; },
    undo: () => travel(past, future, 'history/undo'),
    redo: () => travel(future, past, 'history/redo'),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    dispatch(action) {
      requireValid(!notifying, 'Subscribers must not dispatch; dispatch commands from controllers');
      const previous = state;
      state = reduce(state, action);
      if (action.history !== false && JSON.stringify(state) !== JSON.stringify(previous)) {
        if (!grouping || !recorded) {
          past.push(previous); if (past.length > 100) past.shift();
          recorded = true;
        }
        future.length = 0;
      }
      notify(previous, action);
    },
  };
}
export const { getState, dispatch, subscribe, getHistory, beginHistoryGroup, endHistoryGroup, undo, redo } = createStore();
export const actions = {
  readTopic: topic => dispatch({type:'knowledge/open',topic,history:false}),
  backTopic: () => dispatch({type:'knowledge/back',history:false}),
  closeTopic: (resume=true) => dispatch({type:'knowledge/close',resume,history:false}),
  interface: mode => dispatch({type:'ui/mode',mode,history:false}),
  startTour: (id,index=0) => dispatch({type:'tour/start',id,index}),
  restartTour: () => dispatch({type:'tour/restart'}),
  tourStep: index => dispatch({type:'tour/step',index}),
  tourControl: patch => dispatch({type:'tour/control',patch}),
  seekTour: elapsed => dispatch({type:'tour/seek',elapsed}),
  tickTour: seconds => dispatch({type:'tour/tick',seconds,history:false}),
  stopTour: () => dispatch({type:'tour/stop'}),
  metatronSelection: visible => dispatch({type:'metatron/selection',visible}),
  appearance: (ids,key) => dispatch({type:'objects/appearance',ids,key}),
  mirror: id => dispatch({type:'object/mirror',id}),
  metatronType: (id,visible) => dispatch({type:'metatron/type',id,visible}),
  startGoldenScene: id => dispatch({type:'golden-scene/start',id}),
  goldenScene: patch => dispatch({type:'golden-scene/change',patch}),
  tickGoldenScene: patch => dispatch({type:'golden-scene/change',patch,history:false}),
  objectVisibility: (id, visible) => dispatch({type:'object/visibility',id,visible}),
  onlyObject: id => dispatch({type:'object/only',id}),
  focus: id => dispatch({ type: 'view/focus', id }),
  assembly: (id,patch,reveal=true) => dispatch({type:'assembly/change',id,patch,reveal}),
  solo: (id,member) => dispatch({type:'compound/solo',id,member}),
  restore: id => dispatch({type:'compound/restore',id}),
  lab: (section, patch, id) => dispatch({ type: 'lab/change', section, patch, id }),
  tickLab: (section, patch, id) => dispatch({ type: 'lab/change', section, patch, id, history:false }),
  study: patch => dispatch({ type: 'study/change', patch }),
  tickStudy: patch => dispatch({ type: 'study/change', patch, history:false }),
  objects: (ids, patch) => dispatch({ type: 'objects/change', ids, patch }),
  preset: id => dispatch({ type: 'preset/select', id }),
  clearPreset: () => dispatch({ type: 'preset/clear' }),
  recursion: patch => dispatch({ type: 'recursion/change', patch }),
  display: patch => dispatch({ type: 'display/change', patch }),
};
