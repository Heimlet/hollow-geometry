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
actions.readTopic('dodecahedron');actions.readTopic('pentagram');actions.readTopic('phi');
assert.deepEqual(getState().ui.topicTrail,['dodecahedron','pentagram']);
actions.backTopic();assert.equal(getState().ui.topic,'pentagram');actions.backTopic();assert.equal(getState().ui.topic,'dodecahedron');
assert.equal(getState().tour.playing,false);assert.equal(getState().tour.elapsed,2);assert.deepEqual(getState().ui.topicTrail,[]);
actions.closeTopic();assert.equal(getState().tour.playing,true);assert.deepEqual(getState().ui.topicTrail,[]);
assert.equal(topicFor('golden.scene.pentagon'),'pentagram');
assert.equal(topicFor('display.stars'),null);assert.equal(topicFor('nonexistent'),null,'Unknown settings cannot silently open projection help');
console.log('PASS: reversible reading trail, tour clock preserved, contextual pentagram topic and no unrelated fallback');

const {READING_DEMOS,resolveReadingDemo}=await import('../js/reading-demos.js');
const {TOURS}=await import('../js/tour-data.js');
for(const demo of READING_DEMOS) {
  assert.ok(KNOWLEDGE[demo.topic].sections.some(s=>s[0]===demo.section),demo.section);
  const target=resolveReadingDemo(demo);assert.ok(target,demo.chapter);
  assert.equal(TOURS[target.tour].steps.filter(s=>s.id===demo.chapter).length,1,'Chapter IDs must be unique');
}
const target=resolveReadingDemo(READING_DEMOS[0]);
assert.equal(TOURS[target.tour].steps[target.index].scene.golden,'division');
actions.startTour('metatron');actions.tickTour(3);actions.readTopic('phi');
const pausedReading=getState();
resolveReadingDemo(READING_DEMOS[0]);assert.equal(getState(),pausedReading,'Preparing a link must not change settings, close reading or leave the current tour');
actions.startTour(target.tour,target.index);assert.equal(getState().tour.index,target.index);assert.equal(getState().tour.elapsed,0);assert.equal(getState().ui.topic,null);assert.equal(getState().tour.playing,true);assert.equal(getState().goldenScene.id,'division');
assert.equal(getState().objects._metatron_.visible,false);assert.equal(getState().objects.icosahedron.visible,true);
assert.equal(resolveReadingDemo({tour:'golden',chapter:'missing'}),null);
assert.throws(()=>reduce(getState(),{type:'tour/start',id:'golden',index:999}));
console.log('PASS: all reading links resolve stable chapter IDs, selection is inert, confirmed jump replaces scene atomically');

const {TORUS_PREFACE}=await import('../js/tour-preface-data.js');
const references=TORUS_PREFACE.sections.flatMap(s=>s.text.filter(p=>typeof p!=='string'));
const chapterLinks=[...references.filter(p=>p.tour),TORUS_PREFACE.start];
const beforePreface=getState();
for(const link of chapterLinks){
  const chapter=resolveReadingDemo(link);assert.ok(chapter,`${link.tour}/${link.chapter}`);
  assert.equal(TOURS[link.tour].steps.filter(s=>s.id===link.chapter).length,1,'Preface chapter destinations stay unambiguous');
}
assert.equal(getState(),beforePreface,'Rendering preface destinations must not change the scene');
for(const link of references.filter(p=>p.url)){assert.equal(new URL(link.url).protocol,'https:');assert.ok(link.title);}
for(const link of chapterLinks){
  const chapter=resolveReadingDemo(link);
  const opened=reduce(beforePreface,{type:'tour/start',id:chapter.tour,index:chapter.index});
  assert.equal(opened.tour.id,link.tour);assert.equal(TOURS[opened.tour.id].steps[opened.tour.index].id,link.chapter);
  assert.equal(opened.tour.elapsed,0);assert.equal(opened.ui.topic,null);
}
console.log('PASS: every preface link targets a unique chapter; research links are identified; chapter previews leave state unchanged');
