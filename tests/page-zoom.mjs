import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {initPageZoom} from '../js/page-zoom.js';
const three=pathToFileURL(process.argv[2]).href,THREE=await import(three);
const source=(await readFile(new URL('../vendor/three/addons/controls/OrbitControls.js',import.meta.url),'utf8')).replaceAll("'three'",JSON.stringify(three));
const {OrbitControls}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const doc=new EventTarget();initPageZoom(doc);
class Canvas extends EventTarget{
 style={};clientWidth=800;clientHeight=600;
 getRootNode(){return doc;}
 setPointerCapture(){}releasePointerCapture(){}
}
const emit=(target,type,props={})=>{
 const event=Object.assign(new Event(type,{cancelable:true,bubbles:true}),props);
 target.dispatchEvent(event);
 // Simulate the DOM bubble phase after the actual OrbitControls listener.
 if(target!==doc&&!event.cancelBubble)doc.dispatchEvent(event);
 return event;
};
for(const camera of [new THREE.PerspectiveCamera(35,4/3,.1,1000),new THREE.OrthographicCamera(-4,4,3,-3,.1,1000)]){
 const canvas=new Canvas();camera.position.set(0,0,10);const controls=new OrbitControls(camera,canvas);
 const apparentScale=()=>camera.isOrthographicCamera?camera.zoom:1/camera.position.length();
 for(const ctrlKey of [false,true]){
  const before=apparentScale(),event=emit(canvas,'wheel',{ctrlKey,deltaY:-20,deltaMode:0,clientX:400,clientY:300});
  assert.ok(apparentScale()>before,'Normal wheel and trackpad pinch still zoom the real camera');
  assert.equal(event.defaultPrevented,true,'Neither gesture zooms the page');
 }
 const before=apparentScale();
 emit(canvas,'pointerdown',{pointerType:'touch',pointerId:1,pageX:300,pageY:300});
 emit(canvas,'pointerdown',{pointerType:'touch',pointerId:2,pageX:500,pageY:300});
 emit(doc,'gesturestart');emit(doc,'gesturechange');
 emit(canvas,'pointermove',{pointerType:'touch',pointerId:2,pageX:600,pageY:300});
 assert.ok(apparentScale()>before,'Two-finger pointer pinch zooms figures even with native page pinch blocked');
 emit(canvas,'pointerup',{pointerType:'touch',pointerId:2});emit(canvas,'pointerup',{pointerType:'touch',pointerId:1});controls.dispose();
}
for(const type of ['gesturestart','gesturechange'])assert.equal(emit(doc,type).defaultPrevented,true);
for(const modifier of ['ctrlKey','metaKey'])for(const key of ['+','=','-','_','0'])assert.equal(emit(doc,'keydown',{[modifier]:true,key}).defaultPrevented,true);
for(const props of [{key:' '},{key:'z',ctrlKey:true},{key:'+'},{key:'Escape'}])assert.equal(emit(doc,'keydown',props).defaultPrevented,false,'Tour and editing shortcuts still work');
assert.equal(emit(doc,'wheel',{deltaY:40}).defaultPrevented,false,'Interface scrolling remains available');
assert.equal(emit(doc,'wheel',{deltaY:40,ctrlKey:true}).defaultPrevented,true,'Pinching the interface cannot zoom the page');
console.log('PASS: page scale locked, actual perspective/orthographic wheel and two-pointer camera zoom retained, scrolling and playback keys retained');
