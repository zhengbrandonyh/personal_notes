import {calendarEntries} from './timePlan';
import type {TaskItem} from '../types';
import {dayInterval} from './date';
export const SCHEDULE_HEIGHT=704;
export function todayScheduledTasks(tasks:TaskItem[],day:string){return calendarEntries(tasks,day,day).filter(t=>t.calendarEntry?.kind==='session'&&!t.deletedAt&&!['done','completed'].includes(t.status)&&dayInterval(t.scheduledStart,t.scheduledEnd,day)[1]>0).sort((a,b)=>new Date(a.scheduledStart!).getTime()-new Date(b.scheduledStart!).getTime());}
export function layoutTodaySchedule(tasks:TaskItem[],day:string,options={startMinute:480,pixelsPerMinute:44/60,minHeight:32,includeDone:false}){
 const canvasHeight=(1440-options.startMinute)*options.pixelsPerMinute;
 const events=(options.includeDone?calendarEntries(tasks,day,day).filter(t=>t.calendarEntry?.kind==='session'&&!t.deletedAt&&dayInterval(t.scheduledStart,t.scheduledEnd,day)[1]>0):todayScheduledTasks(tasks,day)).flatMap(task=>{const [a,b]=dayInterval(task.scheduledStart,task.scheduledEnd,day);const start=Math.max(options.startMinute,a),end=Math.min(1440,b);if(end<=start)return [];const height=Math.max(options.minHeight,(end-start)*options.pixelsPerMinute-2),top=Math.min((start-options.startMinute)*options.pixelsPerMinute,canvasHeight-height);return [{task,start,end,top,height,lane:0,columns:1}];}).sort((a,b)=>a.top-b.top||b.height-a.height);
 let group:typeof events=[],ends:number[]=[],bottom=0;
 const finish=()=>{for(const e of group)e.columns=ends.length;group=[];ends=[];bottom=0;};
 for(const e of events){if(group.length&&e.top>=bottom)finish();let lane=ends.findIndex(x=>x<=e.top);if(lane<0)lane=ends.length;ends[lane]=e.top+e.height;e.lane=lane;group.push(e);bottom=Math.max(bottom,e.top+e.height);}finish();return events;
}
