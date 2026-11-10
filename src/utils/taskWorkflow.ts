import {taskStageError} from './taskStage';
import {timePlanError,sessionsOf,periodOf,movePeriod,shiftDate,dayDistance} from './timePlan';
import {taskSubtasks} from './subtaskNodes';
import type {TaskItem} from '../types';
import {localDate,dateOnly} from './date';
import {toDatetimeLocalString} from './dateTime';
import {milestoneError} from './milestones';
export const isFinished=(t:TaskItem)=>['done','completed'].includes(t.status);
export function taskOptionsError(t:Partial<TaskItem>):string {
 const stageError=taskStageError(t);if(stageError)return stageError;
 const err=timePlanError(t);if(err)return err;
 if(t.plannedFor!=null&&(typeof t.plannedFor!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(t.plannedFor)||isNaN(Date.parse(t.plannedFor))||new Date(t.plannedFor).toISOString().slice(0,10)!==t.plannedFor))return '今日行动日期无效';
 if(t.estimatedMinutes!=null&&(!Number.isInteger(t.estimatedMinutes)||t.estimatedMinutes<1||t.estimatedMinutes>10080))return '预计用时须为 1–10080 分钟';
 if(t.remindAt!=null&&(typeof t.remindAt!=='string'||!t.remindAt.includes('T')||isNaN(Date.parse(t.remindAt))))return '提醒时间无效';
 if(t.repeat!=null&&!['daily','weekdays','weekly','monthly'].includes(t.repeat))return '重复规则无效';
 const c=t.scheduleConstraints;
 if(c!=null){if(typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['earliest','latest','weekdaysOnly'].includes(k))||typeof c.weekdaysOnly!=='boolean'||![c.earliest,c.latest].every(s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s))||c.earliest>=c.latest)return '可排期时间无效';}
 return '';
}
function shift(value:string,days:number){const d=new Date(value.includes('T')?value:value+'T12:00');d.setDate(d.getDate()+days);return value.includes('T')?`${localDate(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`:localDate(d);}
export function calendarChange(task:TaskItem,date:string,kind:'move'|'resize',anchor?:string):TaskItem {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('日期无效');
 if(task.timePlan){const next=movePeriod(task,date,kind,anchor);const err=milestoneError(next);if(err)throw new Error(err);return next;}
 if(!task.scheduledStart||!task.scheduledEnd)throw new Error('请先在事项中设置完整时间区间');
 let next={...task};
 if(kind==='resize')next.scheduledEnd=date+'T'+toDatetimeLocalString(task.scheduledEnd).slice(11);
 else{const days=Math.round((new Date(date+'T12:00').getTime()-new Date((anchor||dateOnly(task.scheduledStart))+'T12:00').getTime())/86400000);next={...next,scheduledStart:shift(task.scheduledStart,days),scheduledEnd:shift(task.scheduledEnd,days),milestones:task.milestones?.map(m=>({...m,date:shift(m.date,days)})),subtasks:task.subtasks.map(s=>({...s,...(s.at?{at:shiftDate(s.at,days)}:{})}))};}
 if(new Date(next.scheduledEnd!)<=new Date(next.scheduledStart!))throw new Error('结束时间须晚于开始时间');
 const err=milestoneError(next);if(err)throw new Error(err);return next;
}
export function scheduleWarnings(task:TaskItem,tasks:TaskItem[]):string[] {
 if(isFinished(task)||task.deletedAt)return [];const warnings=new Set<string>(),sessions=sessionsOf(task),period=periodOf(task);let lastEnd=0;
 for(const interval of sessions){const s=new Date(interval.start),e=new Date(interval.end);if(s.getTime()<lastEnd)warnings.add('此事项的日程互相重叠');lastEnd=Math.max(lastEnd,e.getTime());
 for(const other of tasks)if(other.id!==task.id&&!other.deletedAt&&!isFinished(other)&&sessionsOf(other,localDate(s),localDate(e)).some(o=>s<new Date(o.end)&&e>new Date(o.start)))warnings.add('与「'+other.title+'」时间重叠');
 if(period&&(localDate(s)<period.start||localDate(e)>period.end))warnings.add('日程超出计划周期');if(task.dueAt&&e>new Date(task.dueAt.includes('T')?task.dueAt:task.dueAt+'T23:59:59'))warnings.add('日程晚于截止时间');
 const c=task.scheduleConstraints;if(c){const hh=(d:Date)=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');if(localDate(s)!==localDate(e)||hh(s)<c.earliest||hh(e)>c.latest)warnings.add('超出 AI 可排期时段 '+c.earliest+'–'+c.latest);if(c.weekdaysOnly){for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1))if([0,6].includes(d.getDay())){warnings.add('包含非工作日');break;}}}if(task.estimatedMinutes&&(e.getTime()-s.getTime())/60000<task.estimatedMinutes)warnings.add('排期短于预计 '+task.estimatedMinutes+' 分钟');}return [...warnings];
}
/** Create the next occurrence once, keeping completion history and the monthly anchor. */
export function nextOccurrence(task:TaskItem,now:string,id:string):TaskItem|null {
 if(!task.repeat)return null;
 const config=task.timePlan?.recurrence;if(config?.count&&config.index>=config.count)return null;
 const taskAnchor=task.timePlan?.period?.start||task.timePlan?.sessions[0]?.start||task.scheduledStart||task.dueAt||task.remindAt||task.plannedFor||localDate(new Date(now));const anchor=config?.basis==='completion'?localDate(new Date(now)):taskAnchor;
 const original=new Date(anchor.includes('T')?anchor:anchor+'T12:00');const next=new Date(original);
 const advance=()=>{if(task.repeat==='monthly'){const day=config?.basis==='completion'?original.getDate():task.repeatAnchorDay||original.getDate();next.setDate(1);next.setMonth(next.getMonth()+(config?.interval||1));next.setDate(Math.min(day,new Date(next.getFullYear(),next.getMonth()+1,0).getDate()));}
 else if(task.repeat==='weekdays'){let n=config?.interval||1;while(n){next.setDate(next.getDate()+1);if(![0,6].includes(next.getDay()))n--;}}
 else{next.setDate(next.getDate()+(task.repeat==='weekly'&&!config?.weekdays.length?7*(config?.interval||1):task.repeat==='weekly'?1:config?.interval||1));if(task.repeat==='weekly'&&config?.weekdays.length)while(!config.weekdays.includes(next.getDay())||Math.floor(dayDistance(localDate(original),localDate(next))/7)%config.interval!==0)next.setDate(next.getDate()+1);}};
 advance();while(localDate(next)<=localDate(new Date(now)))advance();
 if(config?.until&&localDate(next)>config.until)return null;
 const delta=dayDistance(dateOnly(taskAnchor),localDate(next));
 const p=task.timePlan?structuredClone(task.timePlan):undefined;if(p){if(p.period)p.period={start:shiftDate(p.period.start,delta),end:shiftDate(p.period.end,delta)};p.sessions=p.sessions.map(s=>({...s,start:shiftDate(s.start,delta),end:shiftDate(s.end,delta)}));p.daily=p.daily.map(g=>({...g,overrides:{},excluded:[]}));p.reminders=p.reminders.filter(r=>r.target!=='absolute').map(r=>({...r,createdAt:now}));if(p.recurrence)p.recurrence.index++;}
 return {...structuredClone(task),...(p?{timePlan:p}:{}),id,recurrenceOf:task.id,repeatAnchorDay:task.repeatAnchorDay||original.getDate(),status:'todo',stage:'not_started',completedAt:null,plannedFor:null,dueAt:task.dueAt?shift(task.dueAt,delta):null,scheduledStart:task.scheduledStart?shift(task.scheduledStart,delta):null,scheduledEnd:task.scheduledEnd?shift(task.scheduledEnd,delta):null,remindAt:task.remindAt?shift(task.remindAt,delta):null,milestones:task.milestones?.map(m=>({...m,date:shift(m.date,delta)})),subtasks:taskSubtasks(task).map(s=>({...s,done:false,...(s.at?{at:shiftDate(s.at,delta)}:{})})),subtaskNodesVersion:1,createdAt:now,updatedAt:now};
}
export function completeTask(tasks:TaskItem[],id:string,now:string,uid:()=>string):TaskItem[]{
 const task=tasks.find(t=>t.id===id&&!t.deletedAt);if(!task)return tasks;
 const done=isFinished(task),next=!done&&!tasks.some(t=>t.recurrenceOf===id)?nextOccurrence(task,now,uid()):null;
 return [...(next?[next]:[]),...tasks.map(t=>t.id===id?{...t,status:done?'todo' as const:'done' as const,completedAt:done?null:now,updatedAt:now}:t)];
}

export function timedChange(task:TaskItem,start:string,end:string):TaskItem {
 const dayDelta=Math.round((new Date(dateOnly(start)+'T12:00').getTime()-new Date(dateOnly(task.scheduledStart)+'T12:00').getTime())/86400000);
 const next={...task,scheduledStart:start,scheduledEnd:end,milestones:task.milestones?.map(m=>({...m,date:shift(m.date,dayDelta)})),subtasks:task.subtasks.map(s=>({...s,...(s.at?{at:shiftDate(s.at,dayDelta)}:{})}))};
 if(!start||!end||isNaN(Date.parse(start))||isNaN(Date.parse(end))||new Date(end)<=new Date(start))throw new Error('排期时间无效');
 const err=milestoneError(next);if(err)throw new Error(err);return next;
}
