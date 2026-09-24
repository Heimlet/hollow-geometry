/** Shed only cinematic extras after sustained slow frames; ignore suspended tabs. */
export function createStarBudget(){
  let average=1/60,slow=0,fast=0,target=1,value=1;
  return {update(dt,active=true){
    if(!active||!Number.isFinite(dt)||dt<=0||dt>.2){slow=fast=0;return value;}
    average+=(dt-average)*(1-Math.exp(-dt/1.5));
    slow=average>1/35?slow+dt:0;fast=average<1/52?fast+dt:0;
    if(slow>=2){target=Math.max(0,target-.25);slow=0;}
    if(fast>=5){target=Math.min(1,target+.1);fast=0;}
    value+=(target-value)*(1-Math.exp(-dt/1.5));
    return value;
  }};
}
