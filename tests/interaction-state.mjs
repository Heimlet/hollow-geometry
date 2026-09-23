import assert from 'node:assert/strict';
import { createStore, ALL_IDS } from '../js/state.js';
import { PRESETS } from '../js/preset-data.js';
import { ASSEMBLIES } from '../js/exploration-data.js';
import { assemblyAvailability, objectVisible, onlyObjectVisible, objectSetting } from '../js/scene-selectors.js';

assert.deepEqual(assemblyAvailability(0,0),{expand:true,collapse:false,pause:false,reset:false});
assert.deepEqual(assemblyAvailability(1,0),{expand:false,collapse:true,pause:false,reset:true});
assert.deepEqual(assemblyAvailability(.4,1),{expand:false,collapse:true,pause:true,reset:true});
assert.deepEqual(assemblyAvailability(.4,-1),{expand:true,collapse:false,pause:true,reset:true});
assert.deepEqual(assemblyAvailability(.4,0),{expand:true,collapse:true,pause:false,reset:true});
assert.equal(assemblyAvailability(0,0,false).expand,false);
assert.equal(assemblyAvailability(0,1).collapse,true); // Reverse immediately after starting.
assert.equal(assemblyAvailability(1,-1).expand,false); // Cannot go past the endpoint.

for (const preset of PRESETS) {
  const store=createStore();
  store.dispatch({type:'preset/select',id:'merkaba-square'});
  store.dispatch({type:'preset/select',id:preset.id});
  assert.equal(store.getState().lab.layers.projection,!!preset.labProjection&&preset.id!=='merkaba-square',preset.id);
  if(preset.labProjection&&preset.id!=='merkaba-square')assert.equal(store.getState().lab.layers.axis,preset.labProjection);
}
for(const action of [{type:'preset/clear'},{type:'view/focus',id:'platonic'},{type:'objects/change',ids:['cube'],patch:{visible:true}}]){
  const store=createStore();store.dispatch({type:'preset/select',id:'merkaba-hexagon'});store.dispatch(action);
  assert.equal(store.getState().lab.layers.projection,false);
}
const store=createStore(),send=action=>store.dispatch(action),state=store.getState;
send({type:'lab/change',section:'layers',patch:{projection:true}});
send({type:'recursion/change',patch:{depth:3}});assert.equal(state().lab.layers.projection,true); // Manual panel is independent of recursion.
send({type:'preset/select',id:'pentagon'});assert.equal(state().lab.layers.projection,false);

send({type:'objects/change',ids:ALL_IDS,patch:{visible:true}});
const context=state().viewContext;let commits=0;store.subscribe(()=>commits++);
send({type:'object/visibility',id:'cube',visible:false});assert.equal(commits,1);
assert.equal(state().viewContext,context);assert.equal(state().objects.cube.edges,false);assert.equal(objectVisible(state(),'cube'),false);
send({type:'object/visibility',id:'cube',visible:true});assert.equal(objectVisible(state(),'cube'),true);assert.equal(state().objects.cube.edges,true);
for(const id of [...ALL_IDS,'metatron','merkaba_hull','merkaba_intersection']){
  send({type:'objects/change',ids:ALL_IDS,patch:{visible:true}});
  send({type:'lab/change',section:'layers',patch:{hull:true,intersection:true,projection:true}});
  send({type:'study/change',patch:{mode:'spiral',running:true}});
  send({type:'display/change',patch:{golden:true,guide:true}});
  const before=state().viewContext,count=commits;
  send({type:'object/only',id});assert.equal(commits,count+1);assert.equal(state().viewContext,before);
  assert.equal(onlyObjectVisible(state(),id),true,id);assert.equal(state().study.running,false);
  if(id.startsWith('merkaba_')&&['hull','intersection'].some(kind=>id.endsWith(kind))){
    assert.equal(state().objects.merkaba_up.visible,true);assert.equal(state().objects.merkaba_down.visible,true);
    assert.equal(state().lab.layers.source,false);
  }
  for(const key of ALL_IDS)if(!state().objects[key].visible)assert.ok(!state().objects[key].edges&&!state().objects[key].faces);
}
send({type:'object/visibility',id:'merkaba_intersection',visible:false});assert.equal(objectVisible(state(),'merkaba_intersection'),false);
send({type:'object/visibility',id:'merkaba_intersection',visible:true});assert.equal(objectVisible(state(),'merkaba_intersection'),true);
send({type:'object/visibility',id:'merkaba_up',visible:true});assert.equal(objectVisible(state(),'merkaba_up'),true);
assert.equal(objectSetting('metatron'),'object._metatron_');assert.equal(objectSetting('merkaba_hull'),'lab.hull');
for(const pack of ASSEMBLIES)assert.ok(state().lab.collections[pack.id]);
console.log('PASS: meaningful assembly controls, projection lifetime across every preset, atomic quick visibility and isolation of all ordinary/derived objects without camera focus changes');
