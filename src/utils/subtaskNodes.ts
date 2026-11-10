import type {SubTask,TaskItem,TaskMilestone} from '../types';
import {dateOnly} from './date';
import {toDatetimeLocalString} from './dateTime';
type Source=Pick<TaskItem,'subtasks'|'milestones'|'subtaskNodesVersion'>;
/** Read legacy nodes without writing or discarding their original records. */
export function taskSubtasks(t:Source):SubTask[]{
 const result=(t.subtasks||[]).map(s=>({...s}));if(t.subtaskNodesVersion===1)return result;
 for(const m of t.milestones||[]){if(result.some(s=>s.legacyMilestoneId===m.id))continue;const exact=result.find(s=>s.title===m.title&&(!s.at||dateOnly(s.at)===m.date));if(exact){if(!exact.at)exact.at=m.date;exact.legacyMilestoneId=m.id;continue;}let id='legacy-node:'+m.id;while(result.some(s=>s.id===id))id+=':node';result.push({id,title:m.title,done:false,at:m.date,legacyMilestoneId:m.id});}return result;
}
export function materializeSubtasks(t:TaskItem):TaskItem{return {...structuredClone(t),subtasks:taskSubtasks(t),subtaskNodesVersion:1};}
/** Display in chronological order without rewriting the user's stored list. */
export function chronologicalSubtasks(t:Source):SubTask[]{
 return taskSubtasks(t).map((subtask,index)=>{
  const at=subtask.at;
  const timestamp=at?Date.parse(at.includes('T')?at:at+'T00:00'):NaN;
  return {subtask,index,time:Number.isFinite(timestamp)?timestamp:Infinity};
 }).sort((a,b)=>a.time-b.time||a.index-b.index).map(row=>row.subtask);
}
export function subtaskTimeLabel(at?:string|null):string{
 if(!at)return '';
 const local=at.includes('T')?toDatetimeLocalString(at):at;
 return local.slice(5,10).replace('-','/')+(at.includes('T')?' '+local.slice(11,16):'');
}
export function taskNodes(t:Source):(TaskMilestone&{at:string;done:boolean})[]{return taskSubtasks(t).filter(s=>s.at).map(s=>({id:s.id,title:s.title,date:dateOnly(s.at),at:s.at!,done:s.done}));}
const validDay=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function subtaskError(t:Source&Partial<Pick<TaskItem,'timePlan'|'scheduledStart'|'scheduledEnd'>>):string {
 if(t.subtaskNodesVersion!==undefined&&t.subtaskNodesVersion!==1)return '子事项版本无效';if(!Array.isArray(t.subtasks)||t.subtasks.length>500)return '子事项格式无效';const ids=new Set<string>();
 for(const s of t.subtasks){if(!s||typeof s.id!=='string'||!s.id.trim()||ids.has(s.id)||typeof s.title!=='string'||!s.title.trim()||typeof s.done!=='boolean')return '请填写有效的子事项名称';ids.add(s.id);if(s.legacyMilestoneId!==undefined&&typeof s.legacyMilestoneId!=='string')return '子事项来源无效';if(s.at!=null&&(typeof s.at!=='string'||!validDay(s.at.slice(0,10))||s.at.length>10&&(!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/.test(s.at)||isNaN(Date.parse(s.at)))))return '子事项时间无效';}
 const period=t.timePlan?t.timePlan.period:t.scheduledStart&&t.scheduledEnd&&(dateOnly(t.scheduledStart)!==dateOnly(t.scheduledEnd)||!!t.milestones?.length)?{start:dateOnly(t.scheduledStart),end:dateOnly(t.scheduledEnd)}:null;
 if(period)for(const s of taskSubtasks(t))if(s.at&&(dateOnly(s.at)<period.start||dateOnly(s.at)>period.end))return `「${s.title}」须在计划周期内`;
 return '';
}
