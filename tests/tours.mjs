import assert from 'node:assert/strict';
import {initialState,reduce,createStore,ALL_IDS} from '../js/state.js';
import {TOURS,tourDuration} from '../js/tour-data.js';
import {PLATONIC_TYPES,pairOf} from '../js/mirror-data.js';
import {advanceRotation} from '../js/merkaba-motion.js';
assert.equal(Object.keys(TOURS).length,9);
let chapters=0;
for(const [id,tour]of Object.entries(TOURS)) {
  assert.ok(tourDuration(id)>=180,id);
  let state=reduce(initialState(),{type:'tour/start',id});
  for(let i=0;i<tour.steps.length;i++) {
    assert.equal(state.tour.index,i);assert.ok(Object.isFrozen(state));assert.ok(tour.steps[i].scene.fruit||ALL_IDS.some(key=>state.objects[key].visible));
    assert.equal(state.presetId,null);assert.equal(state.display.autoRotate,false);
    const start=state;
    const mid=reduce(state,{type:'tour/seek',elapsed:tour.steps[i].seconds/2});
    const replay=reduce(reduce(mid,{type:'tour/seek',elapsed:0}),{type:'tour/seek',elapsed:tour.steps[i].seconds/2});
    assert.deepEqual(replay,mid,'Seeking must be deterministic');
    assert.equal(reduce(mid,{type:'tour/tick',seconds:5}),mid,'Paused timeline must not move');
    state=reduce(start,{type:'tour/tick',seconds:tour.steps[i].seconds});chapters++;
  }
  assert.equal(state.tour.phase,'complete');assert.equal(state.tour.playing,false);
  state=reduce(state,{type:'tour/control',patch:{playing:true}});assert.equal(state.tour.index,0);
}
let state=reduce(initialState(),{type:'tour/start',id:'metatron'});
state=reduce(state,{type:'tour/control',patch:{auto:false}});
state=reduce(state,{type:'tour/tick',seconds:100});assert.equal(state.tour.index,0);assert.equal(state.tour.phase,'explore');assert.equal(state.tour.playing,false);
state=reduce(state,{type:'tour/control',patch:{playing:true}});assert.equal(state.tour.index,1);
state=reduce(state,{type:'objects/change',ids:['cube'],patch:{visible:true}});assert.equal(state.tour.id,null);
const store=createStore();store.dispatch({type:'tour/start',id:'golden'});for(let i=0;i<300;i++)store.dispatch({type:'tour/tick',seconds:.05,history:false});assert.equal(store.getHistory().undoCount,1);store.undo();assert.equal(store.getState().tour.id,null);store.redo();assert.equal(store.getState().tour.id,'golden');assert.equal(store.getState().tour.playing,false);
// Every entry point refers to the same pair, across all recursion levels.
state=reduce(initialState(),{type:'recursion/change',patch:{depth:3}});
for(const id of PLATONIC_TYPES) {
  state=reduce(state,{type:'metatron/type',id,visible:true});
  assert.deepEqual(ALL_IDS.filter(key=>state.objects[key].visible).sort(),['_metatron_',...pairOf(id)].sort());
  assert.equal(state.recursion.depth,3);
  state=reduce(state,{type:'metatron/type',id,visible:false});assert.deepEqual(ALL_IDS.filter(key=>state.objects[key].visible),['_metatron_']);
}
state=reduce(state,{type:'object/mirror',id:'tetrahedron'});assert.ok(state.objects.tetrahedron.visible&&state.objects.tetrahedron_mirror.visible);
state=reduce(state,{type:'objects/change',ids:['tetrahedron'],patch:{faces:false}});assert.equal(state.objects.tetrahedron_mirror.faces,false);
state=reduce(state,{type:'objects/change',ids:['tetrahedron'],patch:{visible:false}});assert.equal(state.objects.tetrahedron_mirror.visible,false);assert.equal(state.objects.tetrahedron_mirror.edges,false);
state=reduce(state,{type:'objects/change',ids:['cube'],patch:{visible:true}});
state=reduce(state,{type:'objects/appearance',ids:['cube','dodecahedron'],key:'faces'});assert.equal(state.objects.cube.faces,false);assert.equal(state.objects.dodecahedron.visible,false);
// Traditional motion belongs to two whole stars, with opposed 34:21 speeds.
const rot=initialState().lab.rotation;const motion=advanceRotation(rot,1);assert.ok(motion.up>0&&motion.down<0);assert.ok(Math.abs(motion.up/-motion.down-34/21)<1e-12);
assert.throws(()=>reduce(state,{type:'tour/start',id:'bad'}));assert.throws(()=>reduce(state,{type:'object/mirror',id:'cube'}));
console.log(`PASS: ${Object.keys(TOURS).length} tours, ${chapters} deterministic chapters, auto/manual advance, replay, pause, history, mirror pairs, exclusive Metatron selection and shared appearance`);
