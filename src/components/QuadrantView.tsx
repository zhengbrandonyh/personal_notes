import {TaskStageSelect} from './TaskStageSelect';
import {isFinished} from '../utils/taskWorkflow';
import {taskSubtasks,chronologicalSubtasks,subtaskTimeLabel} from '../utils/subtaskNodes';
import {localDate} from '../utils/date';
import React, { useState } from 'react';
import { TaskItem, DomainType, QuadrantId, SubTask } from '../types';
import { Check, Plus, ArrowRight, ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react';
import { getQuadrantName, getQuadrantSublabel } from '../utils/quadrant';

interface QuadrantViewProps {
  tasks: TaskItem[];
  currentDomain: DomainType;
  onPlanToday:(t:TaskItem)=>void;
  onSelectTask: (task: TaskItem) => void;
  onToggleComplete: (task: TaskItem) => void;
  onQuickAdd: (quadrantId: QuadrantId) => void;
  onMoveQuadrant: (taskId: string, quadrantId: QuadrantId) => void;
  onUpdateTask?: (id: string, patch: Partial<TaskItem>) => unknown | Promise<unknown>;
  onReorderTasks?: (reorderedTasks: TaskItem[]) => void;
}

export const QuadrantView: React.FC<QuadrantViewProps> = ({
  tasks,
  currentDomain,
  onSelectTask,onPlanToday,
  onToggleComplete,
  onQuickAdd,
  onMoveQuadrant,
  onUpdateTask,
  onReorderTasks,
}) => {
  const TODAY = localDate();
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [subtaskInputs, setSubtaskInputs] = useState<Record<string, string>>({});
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after'>('after');

  // Filter tasks in current domain and active
  const scopedTasks = tasks.filter(
    (t) => !t.deletedAt && (currentDomain === 'all' || t.domain === currentDomain)
  );

  const activeTasks = scopedTasks.filter((t) => t.status !== 'done');

  // Derive quadrant for a task
  const getQuadrant = (t: TaskItem): QuadrantId => {
    if (t.importance === true && t.urgency === true) return 'q1';
    if (t.importance === true && t.urgency !== true) return 'q2';
    if (t.importance !== true && t.urgency === true) return 'q3';
    return 'q4';
  };

  const getQuadrantValues = (qId: QuadrantId): { importance: boolean | null; urgency: boolean | null } => {
    if (qId === 'q1') return { importance: true, urgency: true };
    if (qId === 'q2') return { importance: true, urgency: false };
    if (qId === 'q3') return { importance: false, urgency: true };
    if (qId === 'q4') return { importance: false, urgency: false };
    return { importance: null, urgency: null };
  };


  // Drag handlers for cards
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(taskId);
  };

  const handleDragOverItem = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingTaskId === targetTaskId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    setDragOverTaskId(targetTaskId);
    setDragOverPosition(position);
  };

  const handleDropOnItem = (e: React.DragEvent, targetTask: TaskItem, targetQId: QuadrantId) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggingTaskId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetTask.id) {
      setDraggingTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const sourceTask = tasks.find((t) => t.id === sourceId);
    if (!sourceTask) return;

    const { importance, urgency } = getQuadrantValues(targetQId);
    const updatedSource = { ...sourceTask, importance, urgency };

    // Reorder in full tasks array
    const remaining = tasks.filter((t) => t.id !== sourceId);
    const targetIdx = remaining.findIndex((t) => t.id === targetTask.id);

    let insertIdx = targetIdx;
    if (dragOverPosition === 'after') {
      insertIdx = targetIdx + 1;
    }
    if (insertIdx < 0) insertIdx = 0;

    const newTasks = [...remaining];
    newTasks.splice(insertIdx, 0, updatedSource);

    // Reassign orders
    const finalTasks = newTasks.map((t, idx) => ({ ...t, order: idx }));

    if (onReorderTasks) {
      onReorderTasks(finalTasks);
    } else {
      onMoveQuadrant(sourceId, targetQId);
    }

    setDraggingTaskId(null);
    setDragOverTaskId(null);
  };

  // Drag over empty quadrant area
  const handleDropOnQuadrantArea = (e: React.DragEvent, targetQuadrant: QuadrantId) => {
    e.preventDefault();
    const sourceId = draggingTaskId || e.dataTransfer.getData('text/plain');
    if (sourceId) {
      onMoveQuadrant(sourceId, targetQuadrant);
    }
    setDraggingTaskId(null);
    setDragOverTaskId(null);
  };

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleToggleSubtask = (task: TaskItem, subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateTask) return;
    const nextSubs = taskSubtasks(task).map((s) =>
      s.id === subId ? { ...s, done: !s.done } : s
    );
    onUpdateTask(task.id, { subtasks: nextSubs,subtaskNodesVersion:1 });
  };

  const handleAddSubtask = (task: TaskItem, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = (subtaskInputs[task.id] || '').trim();
    if (!text || !onUpdateTask) return;
    const newSub: SubTask = {
      id: 'sub_' + Date.now(),
      title: text,
      done: false,
    };
    onUpdateTask(task.id, {
      subtasks: [...taskSubtasks(task), newSub],subtaskNodesVersion:1,
    });
    setSubtaskInputs((prev) => ({ ...prev, [task.id]: '' }));
  };

  const quadrantList: Array<{ id: QuadrantId; qNum: number; color: string }> = [
    { id: 'q1', qNum: 1, color: '#f53f3f' },
    { id: 'q2', qNum: 2, color: '#165dff' },
    { id: 'q3', qNum: 3, color: '#ff7d00' },
    { id: 'q4', qNum: 4, color: '#86909c' },
  ];

  return (
    <div className="space-y-6 pb-8">
{/* 2x2 Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {quadrantList.map(({ id, qNum, color }) => {
          const qTasks = activeTasks.filter((t) => getQuadrant(t) === id).sort((a,b)=>a.order-b.order);

          return (
            <div
              key={id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnQuadrantArea(e, id)}
              className="semi-card p-5 min-h-[340px] flex flex-col bg-[var(--card)] dark:bg-[var(--card)] border border-[var(--line)] dark:border-[var(--line)] rounded-xl shadow-xs"
            >
              {/* Quadrant Header */}
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[var(--line)] dark:border-[var(--line)] shrink-0">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-2xs"
                    style={{ backgroundColor: color }}
                  >
                    Q{qNum}
                  </span>
                  <strong className="text-sm font-bold text-[var(--ink)] dark:text-[var(--ink)]">
                    {getQuadrantName(id)}
                  </strong>
                  <span className="text-xs text-[var(--muted)] hidden sm:inline">
                    {getQuadrantSublabel(id)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--muted)]">{qTasks.length} 项</span>
                  <button
                    onClick={() => onQuickAdd(id)}
                    className="p-1 rounded-md hover:bg-[var(--raised)] dark:hover:bg-[var(--raised)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                    aria-label={`在${getQuadrantName(id)}新建事项`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Task Cards in Quadrant - Scrollable with drag & drop reorder */}
              <div className="space-y-2 flex-1 min-h-0 max-h-[400px] overflow-y-auto pr-1">
                {qTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--muted)]">
                    暂无事项 · 可拖入事项或点击右上角 ＋ 添加
                  </div>
                ) : (
                  qTasks.map((t) => {
                    const subtasks = chronologicalSubtasks(t);
                    const isExpanded = expandedTaskIds.has(t.id);
                    const completedSubs = subtasks.filter((s) => s.done).length;
                    const isBeingDragged = draggingTaskId === t.id;
                    const isOverThis = dragOverTaskId === t.id;

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragEnd={()=>{setDraggingTaskId(null);setDragOverTaskId(null);}}
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onDragOver={(e) => handleDragOverItem(e, t.id)}
                        onDrop={(e) => handleDropOnItem(e, t, id)}
                        className={`p-3 border rounded-xl bg-[var(--card)] dark:bg-[var(--bg)] hover:border-[var(--primary)] cursor-grab active:cursor-grabbing transition-all flex flex-col gap-2 group shadow-2xs relative ${
                          isBeingDragged ? 'opacity-40 border-dashed border-[var(--primary)]' : 'border-[var(--line)] dark:border-[var(--line)]'
                        } ${
                          isOverThis && dragOverPosition === 'before' ? 'border-t-2 border-t-[#165dff]' : ''
                        } ${
                          isOverThis && dragOverPosition === 'after' ? 'border-b-2 border-b-[#165dff]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={() => onToggleComplete(t)}
                            className="w-4 h-4 rounded border border-[var(--text-secondary)] hover:border-[var(--primary)] mt-0.5 flex items-center justify-center shrink-0 bg-[var(--card)] dark:bg-[var(--card)]"
                            aria-label="标记完成"
                          >
                            {isFinished(t) && <Check className="w-3 h-3 text-[var(--primary)]" />}
                          </button>

                          <div
                            onClick={() => onSelectTask(t)}
                            className="flex-1 min-w-0 cursor-pointer"
                          >
                            <div className="text-xs font-semibold text-[var(--ink)] dark:text-[var(--ink)] group-hover:text-[var(--primary)] break-words">
                              {t.title}
                            </div>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] text-[var(--muted)]">
                              {onUpdateTask&&<TaskStageSelect task={t} onChange={stage=>onUpdateTask(t.id,{stage})}/>}
                              <span className="flex items-center gap-1">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    t.domain === 'work' ? 'bg-[var(--action)]' : 'bg-[#ff7d00]'
                                  }`}
                                />
                                {t.domain === 'work' ? '工作' : '生活'}
                              </span>

                              {t.scheduledEnd && (
                                <span className="font-mono text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                                  {t.scheduledEnd.slice(5, 10).replace('-', '/')} 结束
                                </span>
                              )}

                              {t.tags && t.tags.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--primary-light)] text-[var(--primary)] dark:bg-[var(--action)]/20 dark:text-[var(--primary-hover)]">
                                  #{t.tags[0]}
                                </span>
                              )}

                              {/* Subtask expandable trigger button */}
                              <button
                                type="button"
                                onClick={(e) => toggleExpand(t.id, e)}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                  subtasks.length > 0
                                    ? 'bg-[var(--raised)] dark:bg-[var(--raised)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-[var(--line)]'
                                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                                }`}
                              >
                                <span>{subtasks.length?`子事项 ${completedSubs}/${subtasks.length}`:'+ 子事项'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                          <button className="today-plan-button quadrant-today-action" aria-pressed={t.plannedFor===TODAY} onClick={()=>onPlanToday(t)}>{t.plannedFor===TODAY?'移出今天':'加入今天'}</button>
                        </div>

                        {/* Inline Expandable Subtasks dropdown */}
                        {isExpanded && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 pt-2 border-t border-[var(--line)] dark:border-[var(--line)] space-y-1.5 pl-6"
                          >
                            {subtasks.length === 0 ? null : (
                              subtasks.map((s) => (
                                <div key={s.id} className="flex items-center gap-2 group/sub">
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleSubtask(t, s.id, e)}
                                    className="text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                                  >
                                    {s.done ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)] fill-[#e8f3ff]" />
                                    ) : (
                                      <Circle className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                    )}
                                  </button>
                                  <span
                                    className={`text-xs flex-1 min-w-0 break-words ${
                                      s.done ? 'line-through text-[var(--muted)]' : 'text-[var(--ink)] dark:text-[var(--ink)]'
                                    }`}
                                  >
                                    {s.title}
                                  </span>
                                  {s.at&&<time className="quadrant-subtask-time" dateTime={s.at} title={s.at.replace('T',' ')}>{subtaskTimeLabel(s.at)}</time>}
                                </div>
                              ))
                            )}

                            {/* Add subtask inline form */}
                            <form
                              onSubmit={(e) => handleAddSubtask(t, e)}
                              className="flex items-center gap-1.5 pt-1"
                            >
                              <input
                                type="text"
                                value={subtaskInputs[t.id] || ''}
                                onChange={(e) =>
                                  setSubtaskInputs((prev) => ({ ...prev, [t.id]: e.target.value }))
                                }
                                placeholder="添加子事项"
                                className="flex-1 bg-[var(--card)] dark:bg-[var(--card)] border border-[var(--line)] dark:border-[var(--line)] rounded-md px-2 py-1 text-[11px] text-[var(--ink)] dark:text-[var(--ink)] outline-none focus:border-[var(--primary)]"
                              />
                              <button
                                type="submit"
                                className="px-2.5 py-1 bg-[var(--action)] hover:bg-[var(--action-hover)] text-white rounded-md text-[10px] font-medium"
                              >
                                添加
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      
    </div>
  );
};
