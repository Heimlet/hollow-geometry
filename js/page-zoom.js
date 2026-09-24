/** Keep page chrome at its CSS scale. Do not consume canvas pointer/wheel input. */
export function initPageZoom(doc=document){
  const prevent=event=>event.preventDefault();
  doc.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey)event.preventDefault();},{passive:false});
  doc.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&(['+','=','-','_','0'].includes(event.key)||['Equal','Minus','Digit0','NumpadAdd','NumpadSubtract','Numpad0'].includes(event.code)))event.preventDefault();
  });
  // Safari's native pinch changes page scale; OrbitControls handles canvas
  // pinch itself via pointer events, which are deliberately left untouched.
  doc.addEventListener('gesturestart',prevent,{passive:false});
  doc.addEventListener('gesturechange',prevent,{passive:false});
}
