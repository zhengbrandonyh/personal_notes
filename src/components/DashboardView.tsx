import {TaskStageSelect} from './TaskStageSelect';
import {isTodayAction,isAutomaticTodayAction} from '../utils/todayActions';
import {isFinished} from '../utils/taskWorkflow';
import {taskSubtasks} from '../utils/subtaskNodes';
import {QuickTaskInput} from './QuickTaskInput';
import {TodaySchedule} from './TodaySchedule';
import { localDate, daysAgo, dateOnly, dayInterval } from '../utils/date';
import {todayScheduledTasks} from '../utils/todaySchedule';
import React, { useState, useEffect } from 'react';
import { TaskItem, DomainType } from '../types';
import { Check, Clock, Calendar, ArrowUpRight, AlertCircle } from 'lucide-react';
import { getQuadrantName } from '../utils/quadrant';

interface DashboardViewProps {
  tasks: TaskItem[];
  onUpdateTask?:(id:string,patch:Partial<TaskItem>)=>unknown|Promise<unknown>;
  onCreate:(title:string)=>Promise<boolean>;
  onPlanToday:(t:TaskItem)=>void;
  currentDomain: DomainType;
  onSelectTask: (task: TaskItem) => void;
  onToggleComplete: (task: TaskItem) => void;
  onOpenAiSchedule: () => void;
  onViewAllTasks: () => void;
  onViewReview: () => void;
  onViewCalendar: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,onCreate,onPlanToday,onUpdateTask,
  currentDomain,
  onSelectTask,
  onToggleComplete,
  onViewAllTasks,
  onViewReview,
  onViewCalendar,
}) => {
  const [clock,setClock] = useState(()=>new Date());
  useEffect(()=>{const id=setInterval(()=>setClock(new Date()),30000);return()=>clearInterval(id);},[]);
  const TODAY = localDate(clock);
  const [todayTab, setTodayTab] = useState<'focus' | 'overdue' | 'done'>('focus');

  // Filter tasks belonging to current domain
  const scopedTasks = tasks.filter(
    (t) => !t.deletedAt && (currentDomain === 'all' || t.domain === currentDomain)
  );

  const activeTasks = scopedTasks.filter((t) => !isFinished(t));

  // Each task is filtered once even when several today conditions match.
  let displayTasks = activeTasks.filter((t) => isTodayAction(t,TODAY));

  if (todayTab === 'overdue') {
    displayTasks = activeTasks.filter((t) => {
      const end = dateOnly(t.dueAt);
      return end && end < TODAY;
    });
  } else if (todayTab === 'done') {
    displayTasks = scopedTasks.filter(
      (t) => isFinished(t) && t.completedAt && dateOnly(t.completedAt) === TODAY
    );
  }

  // Sort by end date asc
  displayTasks.sort((a, b) => {
    const endA = a.scheduledEnd || a.dueAt || '9999';
    const endB = b.scheduledEnd || b.dueAt || '9999';
    return endA.localeCompare(endB);
  });

  const overdueCount = activeTasks.filter((t) => {
    const end = dateOnly(t.dueAt);
    return end && end < TODAY;
  }).length;

  const completed7DaysCount = scopedTasks.filter(
    (t) => isFinished(t) && t.completedAt && dateOnly(t.completedAt) >= daysAgo(6) && dateOnly(t.completedAt) <= TODAY
  ).length;

  // Calculate today planned hours
  const calculatePlannedHours = () => {
    const intervals = todayScheduledTasks(activeTasks,TODAY)
      .map(t => dayInterval(t.scheduledStart,t.scheduledEnd,TODAY))
      .sort((a, b) => a[0] - b[0]);

    let total = 0;
    let currentEnd = 0;
    for (const [s, e] of intervals) {
      total += Math.max(0, e - Math.max(s, currentEnd));
      currentEnd = Math.max(currentEnd, e);
    }
    return (total / 60).toFixed(1);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
        <div>
          
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)] dark:text-[var(--ink)] mt-1">
            今天
          </h1>
          
        </div>
        <div>
          <span className="px-3 py-1 rounded-full bg-[var(--primary-light)] dark:bg-[var(--action)]/20 text-[var(--primary)] dark:text-[var(--primary-hover)] text-xs font-semibold">
            {activeTasks.length} 项未完成
          </span>
        </div>
      </div>

      {/* Main Home Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column Stack */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: 今日待办 */}
          <section className="semi-card p-5 bg-[var(--card)] dark:bg-[var(--card)] border border-[var(--line)] dark:border-[var(--line)] rounded-xl shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--line)] dark:border-[var(--line)]">
              <div>
                <h2 className="font-bold text-base text-[var(--ink)] dark:text-[var(--ink)]">今日待办</h2>
                
              </div>
              <button
                onClick={onViewAllTasks}
                className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1"
              >
                <span>四象限</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <QuickTaskInput onCreate={onCreate}/><div className="pt-4">
              {/* Semi Segmented Tabs */}
              <div className="flex gap-2 border-b border-[var(--line)] dark:border-[var(--line)] mb-4">
                <button
                  onClick={() => setTodayTab('focus')}
                  className={`pb-2 text-xs font-medium border-b-2 transition-all ${
                    todayTab === 'focus'
                      ? 'border-[var(--primary)] text-[var(--primary)] font-semibold'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  今日行动
                </button>
                <button
                  onClick={() => setTodayTab('overdue')}
                  className={`pb-2 text-xs font-medium border-b-2 transition-all ${
                    todayTab === 'overdue'
                      ? 'border-[var(--primary)] text-[var(--primary)] font-semibold'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  已逾期 {overdueCount > 0 && <span className="text-[#f53f3f]">· {overdueCount}</span>}
                </button>
                <button
                  onClick={() => setTodayTab('done')}
                  className={`pb-2 text-xs font-medium border-b-2 transition-all ${
                    todayTab === 'done'
                      ? 'border-[var(--primary)] text-[var(--primary)] font-semibold'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  今日已完成
                </button>
              </div>

              {/* Task Items List */}
              <div className="divide-y divide-[#e5e6eb] dark:divide-[#333336] max-h-[380px] overflow-y-auto pr-1">
                {displayTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--muted)]">
                    {todayTab==='focus'?'暂无今日行动':todayTab==='overdue'?'暂无逾期事项':'今天还没有完成事项'}
                  </div>
                ) : (
                  displayTasks.map((t) => {
                    const isDone = isFinished(t);
                    const end = dateOnly(t.dueAt);
                    const isOverdue = end && end < TODAY && !isDone;

                    return (
                      <div
                        key={t.id}
                        className={`py-3 flex items-start gap-3 group transition-colors ${
                          isDone ? 'opacity-60' : ''
                        }`}
                      >
                        <button
                          onClick={() => onToggleComplete(t)}
                          className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center transition-all shrink-0 ${
                            isDone
                              ? 'bg-[var(--action)] border-[var(--primary)] text-white'
                              : 'border-[var(--text-secondary)] hover:border-[var(--primary)] bg-[var(--card)] dark:bg-[var(--card)]'
                          }`}
                          aria-label={isDone ? '标记未完成' : '标记完成'}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>

                        <div
                          onClick={() => onSelectTask(t)}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <div
                            className={`text-xs font-semibold leading-relaxed truncate ${
                              isDone
                                ? 'line-through text-[var(--muted)]'
                                : 'text-[var(--ink)] dark:text-[var(--ink)] group-hover:text-[var(--primary)]'
                            }`}
                          >
                            {t.title}
                          </div>

                          <div className="flex items-center gap-2.5 mt-1 flex-wrap text-[11px] text-[var(--muted)]">
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
                              <span
                                className={`px-2 py-0.5 rounded-full font-mono text-[10px] ${
                                  isOverdue
                                    ? 'bg-[#ffece8] text-[#f53f3f] font-bold'
                                    : 'bg-[var(--raised)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {isOverdue && '已逾期 · '}
                                {t.scheduledEnd.slice(5, 10).replace('-', '/')} 结束
                              </span>
                            )}

                            {taskSubtasks(t).length > 0 && (
                              <span className="font-mono text-[10px]">
                                子项 {taskSubtasks(t).filter((s) => s.done).length}/{taskSubtasks(t).length}
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-full bg-[var(--raised)] dark:bg-[var(--bg)] text-[var(--text-secondary)] text-[10px]">
                              {getQuadrantName(
                                t.importance === null || t.urgency === null
                                  ? 'unclassified'
                                  : t.importance
                                    ? t.urgency
                                      ? 'q1'
                                      : 'q2'
                                    : t.urgency
                                      ? 'q3'
                                      : 'q4'
                              )}
                            </span>
                          </div>
                        </div>
                        {!isDone&&(todayTab!=='focus'||!isAutomaticTodayAction(t,TODAY))&&<button className="quiet-button" aria-pressed={t.plannedFor===TODAY} onClick={()=>onPlanToday(t)}>{t.plannedFor===TODAY?'移出今天':'加入今天'}</button>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* Card 2: 最近 7 天概览 */}
          <section className="semi-card p-5 bg-[var(--card)] dark:bg-[var(--card)] border border-[var(--line)] dark:border-[var(--line)] rounded-xl shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] dark:border-[var(--line)]">
              <div>
                <h2 className="font-bold text-sm text-[var(--ink)] dark:text-[var(--ink)]">近 7 天</h2>
                
              </div>
              <button
                onClick={onViewReview}
                className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1"
              >
                <span>查看统计</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-4">
              <div className="grid grid-cols-3 divide-x divide-[#e5e6eb] dark:divide-[#333336]">
                <div className="px-3 first:pl-0">
                  <span className="text-xs text-[var(--muted)] block">已完成事项</span>
                  <b className="text-2xl font-bold tracking-tight text-[var(--ink)] dark:text-[var(--ink)] block mt-1">
                    {completed7DaysCount} <span className="text-xs font-normal text-[var(--muted)]">件</span>
                  </b>
                </div>
                <div className="px-3">
                  <span className="text-xs text-[var(--muted)] block">待处理逾期</span>
                  <b className="text-2xl font-bold tracking-tight text-[#f53f3f] block mt-1">
                    {overdueCount} <span className="text-xs font-normal text-[var(--muted)]">件</span>
                  </b>
                </div>
                <div className="px-3">
                  <span className="text-xs text-[var(--muted)] block">今日排期时长</span>
                  <b className="text-2xl font-bold tracking-tight text-[var(--primary)] block mt-1">
                    {calculatePlannedHours()} <span className="text-xs font-normal text-[var(--muted)]">h</span>
                  </b>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: 今日安排 (8:00 - 24:00 timeline strictly as requested!) */}
        <div className="lg:col-span-5">
          <section className="semi-card p-5 h-full flex flex-col bg-[var(--card)] dark:bg-[var(--card)] border border-[var(--line)] dark:border-[var(--line)] rounded-xl shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] dark:border-[var(--line)] shrink-0">
              <div>
                <h2 className="font-bold text-base text-[var(--ink)] dark:text-[var(--ink)]">今日安排</h2>
                
              </div>
              <button
                onClick={onViewCalendar}
                className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1"
              >
                <span>查看日历</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <TodaySchedule tasks={activeTasks} day={TODAY} clock={clock} onSelect={onSelectTask}/>
          </section>
        </div>
      </div>
    </div>
  );
};
