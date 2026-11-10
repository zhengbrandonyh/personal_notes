import {isFinished} from '../utils/taskWorkflow';
import { localDate, daysAgo, dateOnly } from '../utils/date';
import React from 'react';
import { TaskItem, DomainType } from '../types';
import { Sparkles, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface SummaryChartCardProps {
  tasks: TaskItem[];
  currentDomain: DomainType;
  onSelectTask: (task: TaskItem) => void;
  onOpenAiReview: () => void;
}

export const SummaryChartCard: React.FC<SummaryChartCardProps> = ({
  tasks,
  currentDomain,
  onSelectTask,
  onOpenAiReview,
}) => {
  const TODAY = localDate();

  // Filter tasks in scope
  const scopedTasks = tasks.filter(
    (t) => !t.deletedAt && (currentDomain === 'all' || t.domain === currentDomain)
  );

  // Recent 7 days completed main tasks
  const doneTasks = scopedTasks.filter(
    (t) => isFinished(t) && t.completedAt && dateOnly(t.completedAt) >= daysAgo(6) && dateOnly(t.completedAt) <= TODAY
  );

  // Due tasks in recent 7 days
  const dueTasks = scopedTasks.filter((t) => t.dueAt && dateOnly(t.dueAt) >= daysAgo(6) && dateOnly(t.dueAt) <= TODAY);

  // On time completed tasks
  const onTimeTasks = dueTasks.filter(
    (t) => isFinished(t) && t.completedAt && dateOnly(t.completedAt) <= dateOnly(t.dueAt)
  );

  // Overdue active tasks
  const overdueActiveTasks = scopedTasks.filter(
    (t) => !isFinished(t) && t.dueAt && dateOnly(t.dueAt) < TODAY
  );

  // Work vs Life breakdown
  const workCount = doneTasks.filter((t) => t.domain === 'work').length;
  const totalCount = doneTasks.length;

  const onTimeRateText = dueTasks.length > 0 ? `${Math.round((onTimeTasks.length / dueTasks.length) * 100)}%` : '—';

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
        <div>
          <div className="text-xs text-[var(--muted)] mt-2">{daysAgo(6).slice(5).replace('-','/')} — {TODAY.slice(5).replace('-','/')}</div>
          
        </div>

        <button
          onClick={onOpenAiReview}
          className="px-4 py-2 bg-[var(--action)] hover:bg-[var(--action-hover)] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-lime-400" />
          <span>近7天摘要</span>
        </button>
      </div>

      {/* Metric Cards Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="clay-card p-5">
          <span className="text-xs text-[var(--muted)] block" title="按完成时间计数，不含子事项">已完成事项</span>
          <b className="text-3xl font-bold text-[var(--ink)] dark:text-[var(--ink)] block my-1">
            {doneTasks.length} <small className="text-xs font-normal text-[var(--muted)]">件</small>
          </b>
          
        </div>

        <div className="clay-card p-5">
          <span className="text-xs text-[var(--muted)] block">按时完成率</span>
          <b className="text-3xl font-bold text-[var(--ink)] dark:text-[var(--ink)] block my-1">
            {onTimeRateText}
          </b>
          <span className="text-[11px] text-[var(--muted)] block">
            按时完成 {onTimeTasks.length} / 到期事项 {dueTasks.length}
          </span>
        </div>

        <div className="clay-card p-5">
          <span className="text-xs text-[var(--muted)] block" title="到期但尚未完成">当前逾期</span>
          <b className="text-3xl font-bold text-[#bd5144] block my-1">
            {overdueActiveTasks.length} <small className="text-xs font-normal text-[var(--muted)]">件</small>
          </b>
          
        </div>
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart Plot */}
        <section className="clay-card p-5">
          <div className="pb-3 border-b border-[var(--line)] dark:border-[#3d4939] mb-4">
            <h2 className="font-bold text-base text-[var(--ink)] dark:text-[var(--ink)]">每日完成</h2>
            
          </div>

          <div className="h-[190px] flex items-end justify-between gap-4 pt-4 border-b border-[var(--line)] dark:border-[#3d4939] pb-6">
            {Array.from({ length: 7 }, (_, i) => {
              const dateStr = daysAgo(6 - i);
              const num = doneTasks.filter((t) => t.completedAt && dateOnly(t.completedAt)===dateStr).length;
              const barHeight = num ? Math.min(130, num * 55) : 2;

              return (
                <div key={dateStr} className="flex-1 flex flex-col items-center justify-end h-full relative">
                  <span className="text-[10px] text-[#6d8060] font-mono mb-1">{num}</span>
                  <div
                    className="w-full max-w-[36px] bg-[#c1df9d] rounded-t-md transition-all"
                    style={{ height: `${barHeight}px` }}
                  />
                  <small className="absolute -bottom-5 text-[10px] text-[var(--muted)] font-mono">
                    {Number(dateStr.slice(5, 7))}/{Number(dateStr.slice(8, 10))}
                  </small>
                </div>
              );
            })}
          </div>
        </section>

        {/* Work vs Life Distribution */}
        <section className="clay-card p-5">
          <div className="pb-3 border-b border-[var(--line)] dark:border-[#3d4939] mb-4">
            <h2 className="font-bold text-base text-[var(--ink)] dark:text-[var(--ink)]">工作与生活</h2>
            
          </div>

          <div className="space-y-6 my-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#6e963e]" /> 工作
                </span>
                <span className="text-[var(--muted)]">
                  {workCount} 件 · {totalCount ? Math.round((workCount / totalCount) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#edf1e6] dark:bg-[#202820] overflow-hidden">
                <div
                  className="h-full bg-[#6e963e]"
                  style={{ width: `${totalCount ? (workCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#c08a48]" /> 生活
                </span>
                <span className="text-[var(--muted)]">
                  {totalCount - workCount} 件 · {totalCount ? Math.round(((totalCount - workCount) / totalCount) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#edf1e6] dark:bg-[#202820] overflow-hidden">
                <div
                  className="h-full bg-[#c08a48]"
                  style={{ width: `${totalCount ? ((totalCount - workCount) / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            
          </div>
        </section>

        {/* Overdue Tasks List */}
        <section className="clay-card p-5">
          <div className="pb-3 border-b border-[var(--line)] dark:border-[#3d4939] mb-3">
            <h2 className="font-bold text-base text-[var(--ink)] dark:text-[var(--ink)]">已逾期</h2>
          </div>
          <div className="divide-y divide-[#eef0ea] dark:divide-[#3d4939]">
            {overdueActiveTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--muted)]">没有逾期事项</div>
            ) : (
              overdueActiveTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTask(t)}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-[#f0f7e7]/40 p-2 rounded-lg"
                >
                  <span className="text-xs font-semibold text-[var(--ink)] dark:text-[var(--ink)] truncate">
                    {t.title}
                  </span>
                  <span className="text-[10px] font-mono text-[#bd5144] font-bold shrink-0">
                    {t.dueAt} 截止
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Done Tasks List */}
        <section className="clay-card p-5">
          <div className="pb-3 border-b border-[var(--line)] dark:border-[#3d4939] mb-3">
            <h2 className="font-bold text-base text-[var(--ink)] dark:text-[var(--ink)]">已完成事项</h2>
          </div>
          <div className="divide-y divide-[#eef0ea] dark:divide-[#3d4939]">
            {doneTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--muted)]">暂无完成记录</div>
            ) : (
              doneTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTask(t)}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-[#f0f7e7]/40 p-2 rounded-lg"
                >
                  <span className="text-xs font-medium text-[var(--muted)] line-through truncate">
                    {t.title}
                  </span>
                  <span className="text-[10px] font-mono text-[#6e963e] shrink-0">
                    ✓ {dateOnly(t.completedAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 口径说明 Collapsible */}

    </div>
  );
};
