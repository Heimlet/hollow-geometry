/** Pause on contact, before another animation frame or a chapter handoff.
 * Consume that gesture's click so it cannot immediately resume the film.
 * Resume and keyboard/assistive activation retain normal button semantics. */
export function bindTourPlayback(button,read,write){
  let pausedPointer=null;
  button.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.isPrimary===false)return;
    pausedPointer=null;
    if(!read())return;
    pausedPointer=event.pointerId;
    button.setPointerCapture?.(event.pointerId);
    write(false);
  });
  button.addEventListener('pointercancel',()=>{pausedPointer=null;});
  button.addEventListener('click',event=>{
    const consumed=event.detail!==0&&pausedPointer!==null;
    pausedPointer=null;
    if(!consumed)write(!read());
  });
}
/** Keep the text node stable while animation snapshots update the progress. */
export function setControlText(node,text){if(node.textContent!==text)node.textContent=text;}
