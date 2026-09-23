import assert from 'node:assert/strict';
import {initialState,reduce,createStore,actions,getState} from '../js/state.js';
import {KNOWLEDGE,topicFor} from '../js/tour-knowledge.js';
let state=reduce(initialState(),{type:'tour/start',id:'golden'});
state=reduce(state,{type:'tour/step',index:3});
state=reduce(state,{type:'tour/tick',seconds:9});
const before=state;
state=reduce(state,{type:'knowledge/open',topic:'icosahedron',history:false});
assert.equal(state.ui.mode,'simple');assert.equal(state.ui.topic,'icosahedron');assert.equal(state.tour.id,'golden');assert.equal(state.tour.index,3);assert.equal(state.tour.elapsed,9);assert.equal(state.tour.playing,false);
assert.equal(reduce(state,{type:'tour/tick',seconds:20,history:false}),state,'Reading must freeze the timeline');
assert.deepEqual(state.objects,before.objects);assert.deepEqual(state.lab,before.lab);
state=reduce(state,{type:'knowledge/open',topic:'phi',history:false});assert.equal(state.tour.elapsed,9);
state=reduce(state,{type:'knowledge/close',history:false});assert.equal(state.ui.topic,null);assert.equal(state.tour.playing,false,'Dismiss stays paused');
state=reduce(state,{type:'knowledge/open',topic:'spiral',history:false});
state=reduce(state,{type:'knowledge/close',resume:true,history:false});assert.equal(state.tour.playing,true);assert.equal(state.tour.elapsed,9,'Resume keeps the exact moment');
state=reduce(state,{type:'knowledge/open',topic:'phi',history:false});state=reduce(state,{type:'ui/mode',mode:'advanced'});assert.equal(state.tour.id,null);assert.equal(state.ui.mode,'advanced');assert.ok(!state.ui.topic);
const store=createStore();store.dispatch({type:'tour/start',id:'golden'});const history=store.getHistory().undoCount;
store.dispatch({type:'knowledge/open',topic:'phi',history:false});store.dispatch({type:'knowledge/close',resume:true,history:false});assert.equal(store.getHistory().undoCount,history);
for(const [key,card]of Object.entries(KNOWLEDGE)) {assert.equal(topicFor(key),key);assert.ok(card.sections.length>=3,key);for(const related of card.related)assert.ok(KNOWLEDGE[related]);}
assert.equal(topicFor('object.icosahedron'),'icosahedron');assert.equal(topicFor('object.tetrahedron_mirror'),'tetrahedron');
assert.throws(()=>reduce(state,{type:'knowledge/open',topic:'missing'}));
console.log('PASS: pause/read/resume preserves tour, objects and progress; explicit laboratory exit; no history pollution; linked knowledge topics');

// The public close command used by X, Escape and backdrop resumes automatically.
actions.startTour('golden');actions.tickTour(2);actions.readTopic('phi');actions.closeTopic();assert.equal(getState().tour.playing,true);assert.equal(getState().tour.elapsed,2);assert.equal(getState().ui.topic,null);
