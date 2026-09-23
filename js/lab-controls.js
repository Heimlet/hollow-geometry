/** Small accessible controls, bound to the single store. */
import { subscribe } from './state.js';
export function el(tag, text, className) { const node=document.createElement(tag); if(text)node.textContent=text; if(className)node.className=className; return node; }
export function button(parent,text,run) { const b=el('button',text); b.type='button'; b.addEventListener('click',run); parent.append(b); return b; }
export function bind(sync) { sync(); subscribe(sync); }
export function check(parent,name,read,write) {
  const label=el('label',null,'lab-check'), input=el('input'); input.type='checkbox'; input.setAttribute('aria-label',name);
  input.addEventListener('change',()=>write(input.checked)); label.append(input,el('span',name)); parent.append(label);
  bind(()=>{const v=read();input.checked=v===true;input.indeterminate=v==='mixed';}); return input;
}
export function slider(parent,name,min,max,step,read,write,format=v=>String(v)) {
  const label=el('label',null,'lab-range'), caption=el('span',name), output=el('output'), input=el('input');
  input.type='range'; Object.assign(input,{min,max,step});input.setAttribute('aria-label',name);
  input.addEventListener('input',()=>write(+input.value));label.append(caption,output,input);parent.append(label);
  bind(()=>{const v=read();input.value=v;output.textContent=format(v);}); return input;
}
export function select(parent,name,options,read,write) {
  const label=el('label',name,'lab-select'), input=el('select');input.setAttribute('aria-label',name);
  for(const [value,text] of options){const opt=el('option',text);opt.value=value;input.append(opt);}
  input.addEventListener('change',()=>write(input.value));label.append(input);parent.append(label);bind(()=>input.value=read());return input;
}
export function disposeGroup(group) { group.traverse(o=>{o.geometry?.dispose(); if(o.material) for(const m of [].concat(o.material))m.dispose();}); group.clear(); }
