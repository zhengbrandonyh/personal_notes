import {saveNoteVersion} from './noteVersions';
import {editableTimePlan,validDay,validClock} from './timePlan';
import {taskSubtasks,materializeSubtasks,subtaskError} from './subtaskNodes';
import {taskOptionsError,nextOccurrence,isFinished,scheduleWarnings} from './taskWorkflow';
import {milestoneError} from './milestones';
import { JournalNote, TaskItem, ViewMode } from '../types';
import type { DataStore } from './storage';
import { validateNoteParents } from './noteTree';

export interface AssistantAction {
  id: string;
  entity: 'task' | 'note';
  operation: 'create' | 'update' | 'delete';
  targetId?: string;
  data: Partial<TaskItem> & Partial<JournalNote> & {planPeriod?:NonNullable<TaskItem['timePlan']>['period'];sessions?:import('../types').TimeSession[];dailySchedules?:{id:string;startTime:string;endTime:string}[]};
  selected: boolean;
  reason?: string;
}
export interface AssistantReply { message: string; actions: AssistantAction[]; navigate?: ViewMode }
const views: ViewMode[] = ['today', 'quadrant', 'calendar', 'journal', 'review'];
const taskFields = ['title', 'note', 'domain', 'status', 'stage', 'importance', 'urgency', 'dueAt', 'scheduledStart', 'scheduledEnd', 'tags','milestones','estimatedMinutes','scheduleConstraints','plannedFor','planPeriod','sessions','dailySchedules','subtasks'];
const noteFields = ['title', 'text', 'domain', 'type', 'parentId'];
export function normalizeAssistantReply(raw: any, context: DataStore): AssistantReply {
  if (!raw || typeof raw.message !== 'string' || !Array.isArray(raw.actions) || raw.actions.length > 30) throw new Error('AI 返回格式不完整，请重试');
  const actions = raw.actions.map((action: any, index: number): AssistantAction => {
    if (!['task', 'note'].includes(action.entity) || !['create', 'update', 'delete'].includes(action.operation)) throw new Error('AI 返回了不支持的操作');
    const records = action.entity === 'task' ? context.tasks : context.notes;
    if (action.operation !== 'create' && !records.some(item => !item.deletedAt && item.id === action.targetId)) throw new Error('AI 指定的记录不在当前范围，请重新生成');
    const allowed = action.entity === 'task' ? taskFields : noteFields;
    const data: any = {};
    if (action.operation !== 'delete') {
      if (!action.data || typeof action.data !== 'object' || Array.isArray(action.data)) throw new Error('操作内容不完整');
      for (const [key, value] of Object.entries(action.data)) {
        if (!allowed.includes(key)) throw new Error('AI 返回了不支持的字段：' + key);
        if (['title', 'note', 'text'].includes(key) && (typeof value !== 'string' || value.length > 50000 || (key === 'title' && !value.trim()))) throw new Error('AI 返回的内容格式不正确');
        if (key === 'domain' && !['work', 'life'].includes(value as string)) throw new Error('分类无效');
        if (key === 'status' && !['todo', 'done', 'in_progress'].includes(value as string)) throw new Error('状态无效');
        if (key === 'type' && !['随手记', '会议记录', '复盘'].includes(value as string)) throw new Error('笔记类型无效');
        if (['importance', 'urgency'].includes(key) && ![true, false, null].includes(value as any)) throw new Error('优先级无效');
        if (['dueAt', 'scheduledStart', 'scheduledEnd'].includes(key) && value !== null && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value) || isNaN(Date.parse(value)))) throw new Error('时间格式无效');
        if (key === 'tags' && (!Array.isArray(value) || value.length > 30 || value.some(tag => typeof tag !== 'string' || tag.length > 100))) throw new Error('标签格式无效');
        if(key==='subtasks'){const err=subtaskError({subtasks:value as TaskItem['subtasks'],subtaskNodesVersion:1,milestones:[]});if(err)throw new Error(err);}
        if(key==='planPeriod'&&value!==null&&(!value||typeof value!=='object'||!validDay((value as any).start)||!validDay((value as any).end)||(value as any).start>(value as any).end))throw new Error('计划周期无效');
        if(key==='sessions'&&(!Array.isArray(value)||value.length>100||value.some(s=>!s||typeof s.id!=='string'||typeof s.start!=='string'||typeof s.end!=='string'||!s.start.includes('T')||!s.end.includes('T')||isNaN(Date.parse(s.start))||isNaN(Date.parse(s.end))||Date.parse(s.end)<=Date.parse(s.start))))throw new Error('日程时间无效');
        if(key==='dailySchedules'&&(!Array.isArray(value)||value.length>20||value.some(s=>!s||typeof s.id!=='string'||!validClock(s.startTime)||!validClock(s.endTime)||s.startTime>=s.endTime)))throw new Error('每日安排无效');
        if (key === 'parentId' && value !== null && !context.notes.some(note => !note.deletedAt && note.id === value)) throw new Error('父级笔记不存在');
        data[key] = key === 'title' ? (value as string).trim() : structuredClone(value);
      }
      if (action.operation === 'create' && !data.title) throw new Error('新建记录缺少标题');
      if (!Object.keys(data).length) throw new Error('操作内容为空');
    }
    const optionError=taskOptionsError(data);if(optionError)throw new Error(optionError);
    if(data.milestones!==undefined&&(!Array.isArray(data.milestones)||data.milestones.length>100||data.milestones.some((m:any)=>!m||typeof m.id!=='string'||typeof m.title!=='string'||typeof m.date!=='string')))throw new Error('关键节点格式无效');
    return {reason:typeof action.reason==='string'?action.reason.slice(0,1500):undefined, id: 'action_' + index, entity: action.entity, operation: action.operation, targetId: action.targetId, data, selected: true };
  });
  return { message: raw.message.slice(0, 20000), actions, navigate: views.includes(raw.navigate) ? raw.navigate : undefined };
}

export function applyAssistantActions(current: DataStore, actions: AssistantAction[], snapshot: DataStore, now: string, uid: () => string): DataStore {
  const next = structuredClone(current);
  const changes = actions.filter(action => action.selected);
  if (!changes.length) throw new Error('请选择要执行的操作');
  const touched = new Set<string>();
  for (const action of changes) {
    if (action.operation === 'create') continue;
    const key = action.entity + ':' + action.targetId;
    if (touched.has(key)) throw new Error('同一记录有重复操作，请重新生成');
    touched.add(key);
    const records = action.entity === 'task' ? current.tasks : current.notes;
    const baseline = action.entity === 'task' ? snapshot.tasks : snapshot.notes;
    const item = records.find(item => item.id === action.targetId && !item.deletedAt);
    if (!item || JSON.stringify(item) !== JSON.stringify(baseline.find(item => item.id === action.targetId))) throw new Error('记录已发生变化，请重新生成方案');
  }
  // Revalidate model fields at the write boundary as well as the preview boundary.
  normalizeAssistantReply({ message: '', actions: changes }, current);
  for (const action of changes) {
    if (action.entity === 'task') {
      const old = next.tasks.find(task => task.id === action.targetId);
      if (action.operation === 'delete') {
        old!.deletedAt = now; old!.updatedAt = now;
        for (const child of taskSubtasks(old!)) next.tasks.push({ ...structuredClone(old!),scheduledStart:null,scheduledEnd:null,dueAt:child.at||null,timePlan:undefined,subtaskNodesVersion:1, id: uid(), title: child.title, parentId: null, subtasks: [], deletedAt: null, sourceNoteId: null,repeat:null,remindAt:null,plannedFor:null,recurrenceOf:undefined,milestones:[], status: child.done ? 'done' : 'todo', completedAt: child.done ? now : null, createdAt: now });
      } else {
        const {planPeriod,sessions,dailySchedules,...fields}=action.data;
        if(old?.timePlan&&(fields.scheduledStart!==undefined||fields.scheduledEnd!==undefined))throw new Error('请使用新版日程字段重新生成排期，避免覆盖已有时间设置');
        const task = { ...(old || { id: uid(), parentId: null, title: '', note: '', domain: 'work', status: 'todo', importance: false, urgency: false, dueAt: null, scheduledStart: null, scheduledEnd: null, tags: [], subtasks: [], order: Date.parse(now), createdAt: now, deletedAt: null, completedAt: null }), ...structuredClone(fields), updatedAt: now } as TaskItem;

        if(fields.subtasks!==undefined)task.subtaskNodesVersion=1;
        if(fields.milestones!==undefined){const normal=taskSubtasks(old||task).filter(s=>!s.legacyMilestoneId);const converted=fields.milestones.map(m=>({id:'legacy-node:'+m.id,title:m.title,at:m.date,done:false,legacyMilestoneId:m.id}));task.subtasks=[...normal,...converted];task.subtaskNodesVersion=1;}
        if(planPeriod!==undefined||sessions!==undefined||dailySchedules!==undefined){const p=editableTimePlan(task);if(planPeriod!==undefined)p.period=planPeriod;if(sessions!==undefined)p.sessions=structuredClone(sessions);if(dailySchedules!==undefined)p.daily=dailySchedules.map(g=>({...g,overrides:p.daily.find(x=>x.id===g.id)?.overrides||{},excluded:p.daily.find(x=>x.id===g.id)?.excluded||[]}));task.timePlan=p;}
        if(task.scheduleConstraints&&(sessions!==undefined||dailySchedules!==undefined||fields.scheduledStart!==undefined||fields.scheduledEnd!==undefined)){const invalid=scheduleWarnings(task,[]).filter(w=>w.includes('时段')||w.includes('非工作日'));if(invalid.length)throw new Error('AI 排期不符合约束：'+invalid.join('；'));}
        if (task.scheduledStart && task.scheduledEnd && new Date(task.scheduledEnd) <= new Date(task.scheduledStart)) throw new Error('结束时间须晚于开始时间');
        if (isFinished(task)) task.completedAt = old?.completedAt || now;
        else if (old&&isFinished(old)) task.completedAt = null;
        const err=taskOptionsError(task)||milestoneError(task);if(err)throw new Error(err);
        if(old&&!isFinished(old)&&isFinished(task)&&!next.tasks.some(t=>t.recurrenceOf===old.id)){const occurrence=nextOccurrence(task,now,uid());if(occurrence)next.tasks.push(occurrence);}
        if (old) next.tasks[next.tasks.indexOf(old)] = task; else next.tasks.unshift(task);
      }
    } else {
      const old = next.notes.find(note => note.id === action.targetId);
      if (action.operation === 'delete') { old!.deletedAt = now; old!.updatedAt = now; }
      else {
        const note = { ...(old || { id: uid(), parentId: null, title: '', text: '', domain: 'work', type: '随手记', date: now.slice(0, 10), links: [], deletedAt: null }), ...action.data, updatedAt: now } as JournalNote;
        if(old && action.data.text!==undefined && action.data.text!==old.text) delete note.richText;
        const versioned=saveNoteVersion(old,note,now,uid);
        if (old) next.notes[next.notes.indexOf(old)] = versioned; else next.notes.unshift(versioned);
      }
    }
  }
  validateNoteParents(next.notes);
  return next;
}
