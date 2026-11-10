import type {TaskItem,TaskTimePlan,TimeSession,TimeReminder} from '../types';
import {dateOnly,localDate} from './date';
import {toDatetimeLocalString} from './dateTime';
import {taskNodes,taskSubtasks} from './subtaskNodes';
export const validDay=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export const validClock=(s:unknown):s is string=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const validMoment=(s:unknown):s is string=>typeof s==='string'&&s.includes('T')&&!isNaN(Date.parse(s))&&validDay(s.slice(0,10));
export function shiftDate(value:string,days:number){const d=new Date(value.includes('T')?value:value+'T12:00');d.setDate(d.getDate()+days);return value.includes('T')?toDatetimeLocalString(d.toISOString()):localDate(d);}
export const dayDistance=(a:string,b:string)=>Math.round((Date.parse(b+'T12:00Z')-Date.parse(a+'T12:00Z'))/86400000);
export function periodOf(t:Pick<TaskItem,'timePlan'|'scheduledStart'|'scheduledEnd'>){if(t.timePlan)return t.timePlan.period;const start=dateOnly(t.scheduledStart),end=dateOnly(t.scheduledEnd);return start&&end&&start<=end&&(start!==end||('milestones' in t&&!!(t as TaskItem).milestones?.length))?{start,end}:null;}
export function editableTimePlan(t:TaskItem):TaskTimePlan {if(t.timePlan)return structuredClone(t.timePlan);const period=periodOf(t);return {period,sessions:!period&&t.scheduledStart&&t.scheduledEnd?[{id:'legacy-session',start:t.scheduledStart,end:t.scheduledEnd}]:[],daily:[],reminders:t.remindAt?[{id:'legacy-reminder',target:'absolute',offsetMinutes:0,at:t.remindAt,createdAt:t.createdAt}]:[]};}
export interface SessionOccurrence extends TimeSession {dailyId?:string;date?:string;}
export function sessionsOf(t:TaskItem,from?:string,to?:string):SessionOccurrence[]{
 if(t.calendarEntry)return t.calendarEntry.kind==='session'&&t.scheduledStart&&t.scheduledEnd?[{id:t.calendarEntry.sessionId||t.id,start:t.scheduledStart,end:t.scheduledEnd,dailyId:t.calendarEntry.dailyId,date:t.calendarEntry.date}]:[];
 const p=editableTimePlan(t),result:SessionOccurrence[]=p.sessions.filter(s=>(!from||dateOnly(s.end)>=from)&&(!to||dateOnly(s.start)<=to)).map(s=>({...s}));
 if(p.period){const a=from&&from>p.period.start?from:p.period.start,b=to&&to<p.period.end?to:p.period.end;for(let date=a;date<=b;date=shiftDate(date,1))for(const g of p.daily){if(!g.excluded.includes(date)&&!g.overrides[date])result.push({id:g.id+'@'+date,start:date+'T'+g.startTime,end:date+'T'+g.endTime,dailyId:g.id,date});}for(const g of p.daily)for(const [date,s] of Object.entries(g.overrides))if(date>=p.period.start&&date<=p.period.end&&!g.excluded.includes(date)&&(!from||dateOnly(s.end)>=from)&&(!to||dateOnly(s.start)<=to))result.push({id:g.id+'@'+date,...s,dailyId:g.id,date});}
 return result.sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
}
export function timePlanError(t:Partial<TaskItem>):string {
 if(t.calendarEntry)return '日历展示记录不能直接保存';const p=t.timePlan;if(p===undefined)return '';
 if(!p||typeof p!=='object'||Array.isArray(p)||!Array.isArray(p.sessions)||!Array.isArray(p.daily)||!Array.isArray(p.reminders))return '时间设置格式无效';
 if(p.period!==null&&(!p.period||!validDay(p.period.start)||!validDay(p.period.end)||p.period.start>p.period.end||dayDistance(p.period.start,p.period.end)>3653))return '计划周期无效（最长 10 年）';
 if(p.sessions.length>100||p.daily.length>20||p.reminders.length>100)return '时间设置数量过多';
 const ids=new Set<string>();const idOK=(id:unknown)=>{if(typeof id!=='string'||!id.trim()||ids.has(id))return false;ids.add(id);return true;};const intervalOK=(s:any)=>s&&validMoment(s.start)&&validMoment(s.end)&&Date.parse(s.end)>Date.parse(s.start);
 for(const s of p.sessions)if(!s||!idOK(s.id)||!intervalOK(s))return '日程时间无效，结束时间须晚于开始时间';
 for(const g of p.daily){if(!p.period)return '周期内每天需要先设置计划周期';if(!g||!idOK(g.id)||!validClock(g.startTime)||!validClock(g.endTime)||g.startTime>=g.endTime||!g.overrides||typeof g.overrides!=='object'||Array.isArray(g.overrides)||!Array.isArray(g.excluded)||g.excluded.some(d=>!validDay(d)))return '每日安排格式无效';for(const [d,s] of Object.entries(g.overrides))if(!validDay(d)||!intervalOK(s))return '单次日程调整无效';else if(d>=p.period.start&&d<=p.period.end&&(dateOnly(s.start)<p.period.start||dateOnly(s.end)>p.period.end))return '单次日程须在计划周期内';}
 for(const r of p.reminders){if(!r||!idOK(r.id)||!['deadline','session','daily','subtask','absolute'].includes(r.target)||!Number.isInteger(r.offsetMinutes)||r.offsetMinutes<0||r.offsetMinutes>525600||!validMoment(r.createdAt)||r.clock!==undefined&&!validClock(r.clock))return '提醒设置无效';if(r.target==='absolute'&&!validMoment(r.at))return '请选择提醒时间';if(r.target==='deadline'&&t.dueAt===null||r.target==='session'&&!p.sessions.some(s=>s.id===r.targetId)||r.target==='daily'&&!p.daily.some(g=>g.id===r.targetId)||r.target==='subtask'&&t.subtasks!==undefined&&!taskSubtasks(t as TaskItem).some(s=>s.id===r.targetId&&s.at))return '提醒对应的时间已不存在，请先移除该提醒';}
 const c=p.recurrence;if(c&&(!['plan','completion'].includes(c.basis)||!Number.isInteger(c.interval)||c.interval<1||c.interval>365||!Array.isArray(c.weekdays)||c.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)||c.until!==null&&!validDay(c.until)||c.count!==null&&(!Number.isInteger(c.count)||c.count<1||c.count>10000)||!Number.isInteger(c.index)||c.index<1))return '重复规则无效';return '';
}
export function calendarEntries(tasks:TaskItem[],from:string,to:string):TaskItem[]{return tasks.flatMap(t=>{
 if(t.calendarEntry)return [t];const p=periodOf(t),entries:TaskItem[]=[];
 if(p&&p.start<=to&&p.end>=from)entries.push({...t,scheduledStart:p.start+'T00:00',scheduledEnd:p.end+'T23:59',calendarEntry:{sourceId:t.id,kind:'period'}});
 for(const s of sessionsOf(t,from,to))entries.push({...t,id:t.id+'::'+s.id,milestones:[],subtasks:[],subtaskNodesVersion:1,scheduledStart:s.start,scheduledEnd:s.end,calendarEntry:{sourceId:t.id,kind:'session',sessionId:s.id,dailyId:s.dailyId,date:s.date}});
 const due=dateOnly(t.dueAt);if(due&&due>=from&&due<=to&&(!p||due<p.start||due>p.end)&&!entries.some(e=>dateOnly(e.scheduledStart)===due))entries.push({...t,id:t.id+'::deadline',scheduledStart:null,scheduledEnd:null,milestones:[],subtasks:[],subtaskNodesVersion:1,calendarEntry:{sourceId:t.id,kind:'deadline'}});
 // A dated subtask outside a parent period has its own day marker, without occupying clock time.
 for(const node of taskNodes(t))if(node.date>=from&&node.date<=to&&(!p||node.date<p.start||node.date>p.end))entries.push({...t,id:t.id+'::node:'+node.id,title:node.title,milestones:[],subtasks:[],subtaskNodesVersion:1,dueAt:node.at,scheduledStart:null,scheduledEnd:null,status:node.done?'done':t.status,calendarEntry:{sourceId:t.id,kind:'subtask',subtaskId:node.id,date:node.date}});
 return entries;
 });}
export function occurrenceChange(source:TaskItem,entry:TaskItem,start:string,end:string):TaskItem {const p=editableTimePlan(source),m=entry.calendarEntry;if(!m||m.kind!=='session')throw new Error('请选择实际日程');if(m.dailyId&&m.date){const g=p.daily.find(x=>x.id===m.dailyId);if(!g)throw new Error('每日安排已变化');g.overrides[m.date]={start,end};}else{const s=p.sessions.find(s=>s.id===m.sessionId);if(!s)throw new Error('日程已变化');s.start=start;s.end=end;}const next={...source,timePlan:p};const err=timePlanError(next);if(err)throw new Error(err);return next;}
export function movePeriod(t:TaskItem,date:string,kind:'move'|'resize',anchor?:string):TaskItem {const p=editableTimePlan(t);if(!p.period)throw new Error('请先设置计划周期');const delta=dayDistance(anchor||p.period.start,date);p.period=kind==='resize'?{...p.period,end:date}:{start:shiftDate(p.period.start,delta),end:shiftDate(p.period.end,delta)};
 if(kind==='move')p.daily=p.daily.map(g=>({...g,overrides:Object.fromEntries(Object.entries(g.overrides).map(([d,s])=>[shiftDate(d,delta),{start:shiftDate(s.start,delta),end:shiftDate(s.end,delta)}])),excluded:g.excluded.map(d=>shiftDate(d,delta))}));const next={...t,timePlan:p,milestones:kind==='move'?t.milestones?.map(m=>({...m,date:shiftDate(m.date,delta)})):t.milestones,subtasks:kind==='move'?t.subtasks.map(s=>({...s,...(s.at?{at:shiftDate(s.at,delta)}:{})})):t.subtasks};const err=timePlanError(next);if(err)throw new Error(err);return next;}
export function reminderMoments(t:TaskItem,r:TimeReminder,from:string,to:string):{at:string;occurrence:string}[]{
 const p=editableTimePlan(t);let targets:{moment:string;id:string}[]=[];if(r.target==='absolute')return r.at?[{at:r.at,occurrence:'absolute'}]:[];
 if(r.target==='deadline'&&t.dueAt)targets=[{moment:t.dueAt.includes('T')?t.dueAt:t.dueAt+'T23:59',id:'deadline'}];
 if(r.target==='subtask'){const s=taskSubtasks(t).find(s=>s.id===r.targetId&&s.at&&!s.done);if(s)targets=[{moment:s.at!.includes('T')?s.at!:s.at+'T'+(r.clock||'09:00'),id:s.id}];}
 if(r.target==='session'){const s=p.sessions.find(s=>s.id===r.targetId);if(s)targets=[{moment:s.start,id:s.id}];}if(r.target==='daily')targets=sessionsOf(t,from,to).filter(s=>s.dailyId===r.targetId).map(s=>({moment:s.start,id:s.id}));
 return targets.map(s=>({at:new Date(Date.parse(s.moment)-r.offsetMinutes*60000).toISOString(),occurrence:s.id}));
}
export function timeDescription(t:TaskItem):string {const m=t.calendarEntry;if(m?.kind==='period'){const p=periodOf(t);return p?'计划周期 '+p.start+' — '+p.end:'计划周期';}if(m?.kind==='subtask')return '子事项节点 '+(t.dueAt||'').replace('T',' ');if(m?.kind==='deadline')return '截止 '+(t.dueAt||'').replace('T',' ');return t.scheduledStart?toDatetimeLocalString(t.scheduledStart).replace('T',' ')+' — '+toDatetimeLocalString(t.scheduledEnd):'';}
