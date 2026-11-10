import {taskNodes,subtaskError} from './subtaskNodes';
import type { TaskItem } from '../types';
export function milestoneError(task: Pick<TaskItem, 'milestones'|'scheduledStart'|'scheduledEnd'> & Partial<Pick<TaskItem,'subtasks'|'subtaskNodesVersion'|'timePlan'>>): string {
  const subError=task.subtasks?subtaskError(task as TaskItem):'';
  if(task.subtaskNodesVersion===1||!task.milestones?.length)return subError;
  const period=task.timePlan?task.timePlan.period:task.scheduledStart&&task.scheduledEnd?{start:task.scheduledStart.slice(0,10),end:task.scheduledEnd.slice(0,10)}:null;
  if(!period)return '请先设置完整的事项时间区间';const {start,end}=period;
  const ids=new Set<string>();
  for (const m of task.milestones) {
    if (!m || typeof m.id!=='string' || !m.id.trim() || ids.has(m.id) || typeof m.title!=='string' || !m.title.trim()) return '请填写关键节点名称';
    ids.add(m.id);
    if (typeof m.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(m.date) || isNaN(Date.parse(m.date)) || new Date(m.date).toISOString().slice(0,10)!==m.date) return '请选择有效的节点日期';
    if (m.date<start || m.date>end) return `「${m.title}」须在事项时间区间内`;
  }
  return subError;
}
export function milestonesInRange(task: TaskItem, start: string, end: string) {
  return taskNodes(task).filter(m=>m.date>=start && m.date<=end).sort((a,b)=>a.date.localeCompare(b.date));
}
