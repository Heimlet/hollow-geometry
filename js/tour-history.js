/** Viewing marks are local to this browser, separate from scene undo/redo. */
import { TOURS } from './tour-data.js';
const KEY='hollow-geometry-viewed-tours-v1';
export function createTourHistory(storage) {
  let saved=[];
  try{storage??=window.localStorage;const value=JSON.parse(storage.getItem(KEY)||'[]');if(Array.isArray(value))saved=value;}catch{}
  const viewed=new Set(saved.filter(id=>typeof id==='string'&&Object.hasOwn(TOURS,id)));
  return {
    has:id=>viewed.has(id),
    complete(id){
      if(!Object.hasOwn(TOURS,id)||viewed.has(id))return false;
      viewed.add(id);try{storage?.setItem(KEY,JSON.stringify([...viewed]));}catch{}
      return true;
    },
  };
}
