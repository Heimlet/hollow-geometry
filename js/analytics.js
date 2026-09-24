import { getState,subscribe } from './state.js';
import { metrica } from './metrica.js';
import { createAnalyticsObserver } from './analytics-model.js';
let started=false;
export function initAnalytics(controls){
  if(started||!metrica.enabled)return;started=true;
  const observer=createAnalyticsObserver({initial:getState(),send:metrica.send,view:metrica.view,visible:!document.hidden});
  subscribe(observer.update);
  setInterval(()=>observer.flush(),15000);
  document.addEventListener('visibilitychange',()=>observer.visibility(!document.hidden));
  window.addEventListener('pagehide',()=>observer.suspend());
  window.addEventListener('pageshow',()=>observer.resume(!document.hidden));
  controls.addEventListener('start',()=>observer.interaction('hg_camera_interaction',{},1500));
  document.addEventListener('click',event=>{
    const node=event.target.closest?.('.tour-return,.tour-reset,.tour-playlist,.onboarding-replay,.onboarding-skip');if(!node||node.disabled)return;
    const kind=node.matches('.tour-return,.tour-reset')?'camera_return':node.matches('.tour-playlist')?'playlist':node.matches('.onboarding-replay')?'onboarding_replay':'onboarding_close';
    observer.interaction('hg_ui_click',{control:kind});
  });
  document.addEventListener('tour-panel-toggle',event=>observer.interaction('hg_panel_toggle',{collapsed:event.detail.collapsed}));
}
