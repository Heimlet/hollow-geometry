/** Scale changes use logarithmic distance, so the approach stays perceptually smooth. */
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const TOUR_ENTRY_SECONDS=1.15,TOUR_RESTART_SECONDS=2.4;
export const tourEntryScale=seconds=>64**(1-ease(seconds/TOUR_ENTRY_SECONDS));
export const tourRestartScale=seconds=>512**ease(seconds/TOUR_RESTART_SECONDS);
export const tourRestartSky=seconds=>1-ease(seconds/TOUR_RESTART_SECONDS);
