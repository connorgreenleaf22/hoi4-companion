import type {PlannerStep} from '../../src/types';

export function validateDateOnly(value:string):number{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Use a valid date-only planning baseline.');
  const time=Date.parse(`${value}T00:00:00Z`);
  if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw new Error('Use a valid date-only planning baseline.');
  return time;
}
export function nominalDuration(value:unknown):number|null{
  if(value===null||value===undefined)return null;
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>365000)throw new Error('Nominal duration must be a finite number from 0 to 365,000 days, or unknown.');
  return value;
}
export function nominalTiming(startDate:string,durations:(number|null)[]){
  const baseline=validateDateOnly(startDate);let knownDays=0;let cumulative:number|null=0;
  const dates:(string|null)[]=[];const cumulativeDays:(number|null)[]=[];const knownSubtotals:number[]=[];
  for(const raw of durations){
    const days=nominalDuration(raw);if(days!==null)knownDays+=days;
    cumulative=days===null||cumulative===null?null:cumulative+days;
    let date:string|null=null;
    if(cumulative!==null){const time=baseline+cumulative*86400000;const result=new Date(time);if(!Number.isFinite(result.getTime())||result.getUTCFullYear()>9999)throw new Error('Nominal schedule exceeds the supported calendar.');date=result.toISOString().slice(0,10);}
    dates.push(date);cumulativeDays.push(cumulative);knownSubtotals.push(knownDays);
  }
  return {knownDays,totalDays:cumulative,finishDate:dates.length?dates.at(-1)!:startDate,dates,cumulativeDays,knownSubtotals};
}
export function applyTiming(steps:PlannerStep[],startDate:string){
  const timing=nominalTiming(startDate,steps.map(s=>s.days));
  steps.forEach((step,index)=>{step.cumulativeKnownDays=timing.knownSubtotals[index];step.cumulativeDays=timing.cumulativeDays[index];step.finishDate=step.reachability==='yes'?timing.dates[index]:null;});
  return {...timing,finishDate:steps.every(s=>s.reachability==='yes')?timing.finishDate:null};
}
