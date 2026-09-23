import assert from 'node:assert/strict';
import {createStore,ALL_IDS} from '../js/state.js';
import {onlyObjectVisible} from '../js/scene-selectors.js';
const s=createStore(), initial=s.getState();
const dispatch=action=>s.dispatch(action);
assert.equal(s.getHistory().canUndo,false);
s.beginHistoryGroup();
dispatch({type:'view/focus',id:'golden'});
for(const starCount of [2600,2800,3000,3200,8000])dispatch({type:'display/change',patch:{starCount}});
s.endHistoryGroup();
assert.equal(s.getHistory().undoCount,1);
s.undo();assert.equal(s.getState().display.starCount,2400);assert.equal(s.getState().viewContext,'platonic');
s.redo();assert.equal(s.getState().display.starCount,8000);assert.equal(s.getState().viewContext,'golden');
dispatch({type:'golden-scene/start',id:'bridge'});
const started=s.getState();
assert.deepEqual(ALL_IDS.filter(id=>started.objects[id].visible),['octahedron','icosahedron']);
assert.equal(started.recursion.depth,1);assert.equal(started.study.mode,'none');
for(let i=1;i<=200;i++)dispatch({type:'golden-scene/change',patch:{progress:i/200,running:i<200},history:false});
assert.equal(s.getHistory().undoCount,2);
s.undo();assert.equal(s.getState().goldenScene.id,'none');
s.redo();assert.equal(s.getState().goldenScene.id,'bridge');assert.equal(s.getState().goldenScene.progress,1);assert.equal(s.getState().goldenScene.running,false);
s.undo();dispatch({type:'display/change',patch:{stars:false}});assert.equal(s.getHistory().canRedo,false);
assert.equal(initial.display.stars,true);assert.ok(Object.isFrozen(initial.display));
for(const action of [
 {type:'objects/change',ids:['icosahedron'],patch:{visible:false}},
 {type:'recursion/change',patch:{depth:3}},
 {type:'lab/change',section:'explode',patch:{value:.5}},
 {type:'study/change',patch:{mode:'spiral'}},
]) {
 dispatch({type:'golden-scene/start',id:'rectangles'});
 dispatch(action);assert.equal(s.getState().goldenScene.id,'none');
 s.undo();assert.equal(s.getState().goldenScene.id,'rectangles');assert.equal(s.getState().goldenScene.running,false);
}
const {PRESETS}=await import('../js/preset-data.js');
for(const preset of PRESETS){dispatch({type:'golden-scene/start',id:'pentagon'});dispatch({type:'preset/select',id:preset.id});assert.equal(s.getState().goldenScene.id,'none');}
const count=s.getHistory().undoCount;
for(let i=0;i<500;i++)dispatch({type:'lab/change',section:'rotation',patch:{angle:i%180},history:false});
assert.equal(s.getHistory().undoCount,count);
dispatch({type:'golden-scene/start',id:'rectangles'});
assert.equal(onlyObjectVisible(s.getState(),'icosahedron'),false);
dispatch({type:'object/only',id:'icosahedron'});
assert.equal(onlyObjectVisible(s.getState(),'icosahedron'),true);
assert.throws(()=>dispatch({type:'golden-scene/change',patch:{id:'bridge'}}));
for(let i=0;i<120;i++)dispatch({type:'display/change',patch:{stars:i%2===0}});
assert.equal(s.getHistory().undoCount,100);
assert.throws(()=>dispatch({type:'display/change',patch:{starCount:9000}}));
console.log('PASS: atomic history, grouped gestures, redo branching, bounded memory, immutable snapshots, transient frames, guided scene activation/lifetime');
