import { dateOnly, localDate } from './date';
import { QuadrantId, TaskItem, SubTask } from '../types';

export function getQuadrantId(item: TaskItem): QuadrantId {
  if (item.importance == null || item.urgency == null) {
    return 'unclassified';
  }
  if (item.importance === true && item.urgency === true) {
    return 'q1';
  }
  if (item.importance === true && item.urgency === false) {
    return 'q2';
  }
  if (item.importance === false && item.urgency === true) {
    return 'q3';
  }
  return 'q4';
}

export function getQuadrantName(quadrantId: QuadrantId | number): string {
  if (quadrantId === 1 || quadrantId === 'q1') return '立即做';
  if (quadrantId === 2 || quadrantId === 'q2') return '规划做';
  if (quadrantId === 3 || quadrantId === 'q3') return '尽快处理';
  if (quadrantId === 4 || quadrantId === 'q4') return '以后再做';
  return '待分类';
}

export function getQuadrantSublabel(quadrantId: QuadrantId | number): string {
  if (quadrantId === 1 || quadrantId === 'q1') return '重要 · 紧急';
  if (quadrantId === 2 || quadrantId === 'q2') return '重要 · 不紧急';
  if (quadrantId === 3 || quadrantId === 'q3') return '不重要 · 紧急';
  if (quadrantId === 4 || quadrantId === 'q4') return '不重要 · 不紧急';
  return '未判断轻重';
}

export function isItemOverdue(item: TaskItem): boolean {
  if (item.status === 'done' || item.status === 'completed' || item.deletedAt) return false;
  const targetDateStr = dateOnly(item.dueAt);
  if (!targetDateStr) return false;

  const todayStr = localDate();
  return targetDateStr < todayStr;
}

export function isItemImpending(item: TaskItem): boolean {
  if (item.status === 'done' || item.status === 'completed' || item.deletedAt) return false;
  const targetDateStr = dateOnly(item.dueAt);
  if (!targetDateStr) return false;

  const todayStr = localDate();
  if (targetDateStr === todayStr) return true;

  // Within next 2 days
  const targetTime = new Date(targetDateStr).getTime();
  const todayTime = new Date(todayStr).getTime();
  const diffDays = (targetTime - todayTime) / (1000 * 3600 * 24);
  return diffDays >= 0 && diffDays <= 2;
}

export function getDueStatusText(item: TaskItem): { text: string; isOverdue: boolean } {
  if (item.status === 'done' || item.status === 'completed') return { text: '已完成', isOverdue: false };
  const targetDateStr = dateOnly(item.dueAt);
  if (!targetDateStr) return { text: '', isOverdue: false };

  const todayStr = localDate();
  if (targetDateStr < todayStr) return { text: '已超时', isOverdue: true };
  if (targetDateStr === todayStr) return { text: '今日截止', isOverdue: false };

  const targetTime = new Date(targetDateStr).getTime();
  const todayTime = new Date(todayStr).getTime();
  const diffDays = Math.round((targetTime - todayTime) / (1000 * 3600 * 24));
  if (diffDays === 1) return { text: '明日截止', isOverdue: false };
  return { text: `还剩 ${diffDays} 天`, isOverdue: false };
}

export function calculateSubtaskProgress(subtasks: SubTask[] | undefined): { done: number; completed: number; total: number; percentage: number; percent: number } {
  if (!subtasks || subtasks.length === 0) {
    return { done: 0, completed: 0, total: 0, percentage: 0, percent: 0 };
  }
  const done = subtasks.filter((s) => s.done).length;
  const total = subtasks.length;
  const percentage = Math.round((done / total) * 100);
  return { done, completed: done, total, percentage, percent: percentage };
}


