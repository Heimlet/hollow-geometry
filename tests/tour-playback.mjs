import assert from 'node:assert/strict';
import {bindTourPlayback,setControlText} from '../js/tour-playback.js';
import {initialState,reduce} from '../js/state.js';
import {TOURS,tourStep} from '../js/tour-data.js';
class Button extends EventTarget{
 captures=[];mutations=0;value='';
 setPointerCapture(id){this.captures.push(id);}
 get textContent(){return this.value;}
 set textContent(value){this.value=value;this.mutations++;}
}
const button=new Button();let state;
bindTourPlayback(button,()=>state.tour.playing,playing=>{state=reduce(state,{type:'tour/control',patch:{playing}});});
const emit=(name,data={})=>button.dispatchEvent(Object.assign(new Event(name),data));
function gesture(){emit('pointerdown',{button:0,isPrimary:true,pointerId:1});emit('click',{detail:1});}
for(const tour of Object.keys(TOURS))for(let index=0;index<TOURS[tour].steps.length;index++){
 state=reduce(initialState(),{type:'tour/start',id:tour,index});
 state=reduce(state,{type:'tour/seek',elapsed:tourStep(state).seconds-.001});
 state=reduce(state,{type:'tour/control',patch:{playing:true}});
 emit('pointerdown',{button:0,isPrimary:true,pointerId:1});
 assert.equal(state.tour.playing,false,'Pause is immediate, before releasing mouse/touch');
 const paused=state;state=reduce(state,{type:'tour/tick',seconds:1});
 assert.equal(state,paused,'A chapter boundary cannot swallow the pause');
 emit('click',{detail:1});assert.equal(state,paused,'The same click cannot undo its own pause');
 gesture();assert.equal(state.tour.playing,true,'The next ordinary click resumes');
 emit('click',{detail:0});assert.equal(state.tour.playing,false,'Keyboard and assistive activation pause');
 emit('click',{detail:0});assert.equal(state.tour.playing,true,'Keyboard and assistive activation resume');
}
emit('pointerdown',{button:2,isPrimary:true,pointerId:2});assert.equal(state.tour.playing,true,'Right click does not pause');
emit('pointerdown',{button:0,isPrimary:false,pointerId:3});assert.equal(state.tour.playing,true,'A secondary touch does not toggle playback');
emit('pointerdown',{button:0,isPrimary:true,pointerId:1});emit('pointercancel');gesture();assert.equal(state.tour.playing,true,'Cancelled touches cannot poison the next click');
emit('pointerdown',{button:0,isPrimary:true,pointerId:1});emit('click',{detail:0});assert.equal(state.tour.playing,true,'A keyboard click after pointer cancellation/loss is independent');
for(let i=0;i<100;i++)setControlText(button,'Пауза');assert.equal(button.mutations,1,'Animation ticks never replace the pressed button text node');
setControlText(button,'Продолжить');assert.equal(button.mutations,2,'A real playback change updates the label once');
console.log('PASS: first-contact pause across every chapter boundary, no duplicate click toggle, mouse/touch/keyboard and stable button text');
