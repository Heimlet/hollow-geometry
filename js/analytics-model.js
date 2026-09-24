/** Passive observer of committed state. No store writes and no animation-frame events. */
import { TOURS } from './tour-data.js';

export function analyticsContext(state){
  const tour=TOURS[state.tour.id],chapter=tour?.steps[state.tour.index];
  return {section:state.ui.topic?'reading':tour?'tour':state.ui.mode==='advanced'?'laboratory':'home',
    tour:state.tour.id||'none',chapter:chapter?.id|| (chapter?`chapter-${state.tour.index+1}`:'none'),
    chapter_number:chapter?state.tour.index+1:0,topic:state.ui.topic||'none',
    activity:state.ui.topic?'reading':tour?(state.tour.phase==='restarting'?'restarting':state.tour.playing?'playing':'paused'):state.ui.mode==='advanced'?'laboratory':'menu'};
}
const contextKey=context=>JSON.stringify(context);
export function createAnalyticsObserver({initial,send,view=()=>{},now=()=>performance.now(),visible=true}){
  let context=analyticsContext(initial),key=contextKey(context),last=now(),seconds=0,shown=visible,ended=false;
  const completed=new Set(),recent=new Map();
  const emit=(event,extra={},ctx=context)=>{try{send(event,{...ctx,visible:shown,...extra});}catch{/* Keep the store safe if telemetry fails. */}};
  function accrue(){const time=now();if(shown&&!ended)seconds+=Math.max(0,Math.min(30000,time-last))/1000;last=time;}
  function flush(reason='interval'){
    accrue();if(seconds>=.01){emit('hg_time',{seconds:Math.round(seconds*1000)/1000,reason});seconds=0;}
  }
  function page(){
    const path=context.topic!=='none'?`reading/${context.topic}`:context.tour!=='none'?`tour/${context.tour}/${context.chapter}`:context.section;
    try{view(path,context.topic!=='none'?`Справка · ${context.topic}`:context.tour!=='none'?`${TOURS[context.tour].name} · ${context.chapter_number}`:'Hollow Geometry');}catch{}
  }
  function interaction(event,properties={},interval=0){
    const time=now();if(interval&&time-(recent.get(event)??-Infinity)<interval)return;
    recent.set(event,time);emit(event,properties);
  }
  return {flush,interaction,
    visibility(value){if(value===shown)return;flush('visibility');shown=value;last=now();},
    suspend(){if(ended)return;flush('pagehide');ended=true;},
    resume(value){ended=false;shown=value;last=now();},
    update(state,previous,action){
      const before=previous.tour,after=state.tour;
      if(action.type==='tour/tick'&&before.id===after.id&&before.index===after.index&&before.phase===after.phase&&before.playing===after.playing)return;
      const next=analyticsContext(state),nextKey=contextKey(next),old=context;
      if(nextKey!==key){flush('change');context=next;key=nextKey;}
      const newRun=after.id&&(before.id!==after.id||action.type==='tour/start'||(before.phase==='restarting'&&after.phase!=='restarting'));
      if(before.id&&(before.id!==after.id||newRun))emit('hg_tour_exit',{reason:action.type,completed_chapters:completed.size},old);
      if(newRun){completed.clear();emit('hg_tour_start',{start_chapter:after.index+1});}
      const changedChapter=before.id!==after.id||before.index!==after.index||newRun;
      if(action.type==='tour/tick'&&before.id&&!newRun&&before.phase!=='complete'&&before.phase!=='restarting'&&
        (changedChapter||(before.phase==='watch'&&['explore','complete'].includes(after.phase)))){
        const chapter=TOURS[before.id].steps[before.index];
        if(!completed.has(before.index)){
          completed.add(before.index);emit('hg_chapter_finish',{}, {...old,chapter:chapter.id||`chapter-${before.index+1}`,chapter_number:before.index+1});
          if(before.index===TOURS[before.id].steps.length-1)emit('hg_tour_finish',{completed_chapters:completed.size,total_chapters:TOURS[before.id].steps.length,all_chapters_finished:completed.size===TOURS[before.id].steps.length});
        }
      }
      if(after.id&&changedChapter)emit('hg_chapter_view',{transition:action.type==='tour/tick'?'automatic':'manual'});
      if(previous.ui.topic!==state.ui.topic){
        if(previous.ui.topic)emit('hg_reading_close',{},old);
        if(state.ui.topic)emit('hg_reading_open');
      }
      if(old.section!==context.section||old.tour!==context.tour||old.chapter!==context.chapter||old.topic!==context.topic)page();
      if(action.type==='tour/control'&&typeof action.patch.playing==='boolean'&&before.playing!==after.playing)
        emit(after.playing?'hg_tour_resume':'hg_tour_pause');
      if(action.type==='tour/restart'&&before.phase!=='restarting')emit('hg_tour_restart');
      if(action.type==='tour/reverse')emit('hg_tour_reverse',{direction:after.motion?.direction||1});
      if(action.type==='ui/mode'&&state.ui.mode==='advanced'&&previous.ui.mode!=='advanced')emit('hg_lab_open');
      if(action.type==='preset/select')emit('hg_preset_select',{preset:state.presetId||'none'});
      if(action.type==='display/change')interaction('hg_display_change',{settings:Object.keys(action.patch).join(','),...action.patch},1000);
      if(action.history!==false&&/^(objects\/change|object\/visibility|object\/only|object\/mirror|metatron\/type|objects\/appearance)$/.test(action.type))
        interaction('hg_object_change',{action:action.type,objects:action.ids?.join(',')||action.id||'none',settings:Object.keys(action.patch||{}).join(',')},1000);
    },
  };
}
