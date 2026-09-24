/** Independent of WebGL: analytics must never block the scene or retain a failed queue. */
import { analyticsConfig } from './analytics-config.js';

export function metricaAllowed(config,location){
  if(!/^[1-9]\d{0,14}$/.test(String(config.counterId)))return false;
  try {
    const site=new URL(config.siteUrl),page=new URL(location.href);
    return site.protocol==='https:'&&page.origin===site.origin&&page.pathname.startsWith(site.pathname);
  } catch { return false; }
}

export function createMetrica(config,win,doc){
  const noop={enabled:false,send(){},view(){}};
  if(!metricaAllowed(config,win.location))return noop;
  const id=Number(config.counterId),url=`https://mc.yandex.ru/metrika/tag.js?id=${id}`;
  let stopped=false;
  if(!win.ym){
    win.ym=function(...args){
      // An ad blocker or network failure must not accumulate events forever.
      const queue=win.ym.a||=[];if(!stopped&&queue.length<160)queue.push(args);
    };
    win.ym.l=Date.now();
  }
  const call=(...args)=>{if(!stopped)try{win.ym(id,...args);}catch{/* Telemetry cannot interrupt controls. */}};
  call('init',{ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',referrer:doc.referrer,url:win.location.href,accurateTrackBounce:true,trackLinks:true});
  if(![...doc.scripts].some(script=>script.src===url)){
    const script=doc.createElement('script');script.async=true;script.src=url;
    script.onerror=()=>{stopped=true;if(win.ym?.a)win.ym.a.length=0;};
    doc.head.append(script);
  }
  let lastView=win.location.href;
  return {enabled:true,
    send(event,properties={}){
      // params remain reportable without pre-created conversion goals.
      call('params',{hollow_geometry:{[event]:properties}});
      if(event!=='hg_time')call('reachGoal',event,properties);
    },
    view(path,title){
      const url=new URL(config.siteUrl);url.hash=path;
      call('hit',url.href,{title,referer:lastView});lastView=url.href;
    },
  };
}
export const metrica=typeof window==='undefined'?{enabled:false}:createMetrica(analyticsConfig,window,document);
