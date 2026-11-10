import {calendarEntries,editableTimePlan,timeDescription} from '../utils/timePlan';
import {taskNodes} from '../utils/subtaskNodes';
import {WeekTimeGrid} from './WeekTimeGrid';
import { localDate } from '../utils/date';
import React, { useState, useRef } from 'react';
import { TaskItem, DomainType, CalendarSubView } from '../types';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

import { CalendarWeek } from './CalendarWeek';
import { getCalendarSpan } from '../utils/calendarLayout';
export { dateOnly as extractDateOnly } from '../utils/date';

interface CalendarViewProps {
  tasks: TaskItem[];
  currentDomain: DomainType;
  onSelectTask: (task: TaskItem) => void;
  onQuickAddForDate: (dateStr: string) => void;
  onReschedule?:(task:TaskItem,date:string,kind:'move'|'resize',anchor?:string)=>void;
  onUpdateScheduledTime?: (task: TaskItem, startIso: string, endIso: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  currentDomain,
  onSelectTask,
  onQuickAddForDate,onReschedule,onUpdateScheduledTime,
}) => {
  const TODAY = localDate();
  const [overflowDate,setOverflowDate]=useState<string|null>(null);
  const overflowTrigger=useRef<HTMLElement|null>(null);
  const showDateTasks=(date:string)=>{overflowTrigger.current=document.activeElement as HTMLElement;setOverflowDate(date);};
  const closeDateTasks=()=>{setOverflowDate(null);requestAnimationFrame(()=>overflowTrigger.current?.focus());};
  const [calMode, setCalMode] = useState<CalendarSubView>('month');
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth()); // 0-indexed (9 = Oct)
  const [selectedDate, setSelectedDate] = useState<string>(TODAY);

  // Scoped active tasks
  const scopedTasks = tasks.filter(
    (t) => !t.deletedAt && (currentDomain === 'all' || t.domain === currentDomain)
  );

  const activeTasks = scopedTasks.filter((t) => t.status !== 'done');
  const unscheduledTasks = activeTasks.filter((t) => !editableTimePlan(t).period&&!editableTimePlan(t).sessions.length&&!editableTimePlan(t).daily.length&&!t.dueAt&&!taskNodes(t).length);

  // Helper date math
  const pad = (n: number) => String(n).padStart(2, '0');
  const datestr = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const getTaskSpan = getCalendarSpan;

  // Check if task covers dateStr
  const inDay = (t: TaskItem, dateStr: string) => {
    const span = getTaskSpan(t);
    if (!span) return false;
    return span.start <= dateStr && span.end >= dateStr;
  };

  const dateTasks = (dateStr: string) => calendarEntries(scopedTasks,dateStr,dateStr).filter((t) => inDay(t, dateStr)).sort((a,b)=>(a.scheduledStart||a.dueAt||'').localeCompare(b.scheduledStart||b.dueAt||''));

  const shiftMonth = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    if(calMode==='month'){d.setDate(1);d.setMonth(calMonth+delta);d.setFullYear(calYear + (calMonth+delta<0?-1:calMonth+delta>11?1:0));}
    else d.setDate(d.getDate() + delta*(calMode==='week'?7:1));
    setSelectedDate(localDate(d));setCalYear(d.getFullYear());setCalMonth(d.getMonth());
  };

  // Month Days Array
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7; // Mon = 0
  const gridStart = new Date(calYear, calMonth, 1 - offset);
  const totalDaysCount = Math.ceil((offset + new Date(calYear, calMonth + 1, 0).getDate()) / 7) * 7;

  const daysArray = Array.from(
    { length: totalDaysCount },
    (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
  );

  // Group into 7-day weeks for cross-day horizontal spanning bars
  const weeks: Date[][] = [];
  for (let i = 0; i < daysArray.length; i += 7) {
    weeks.push(daysArray.slice(i, i + 7));
  }

  // Selected week for Week View
  const selectedD = new Date(selectedDate + 'T12:00:00');
  const selOffset = (selectedD.getDay() + 6) % 7;
  const currWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedD);
    d.setDate(d.getDate() - selOffset + i);
    return d;
  });
  const currWeekStart = datestr(currWeekDays[0]);
  const currWeekEnd = datestr(currWeekDays[6]);

  return (
    <div className="space-y-6 pb-8">
{/* Calendar Bar Nav & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <strong className="text-lg font-bold text-[var(--ink)] dark:text-[var(--ink)]">
            {calMode==='month'?`${calYear} 年 ${calMonth+1} 月`:calMode==='week'?`${currWeekStart}—${currWeekEnd}`:selectedDate}
          </strong>
          <div className="flex items-center border border-[var(--line)] dark:border-[var(--line)] rounded-lg overflow-hidden bg-[var(--card)] dark:bg-[var(--card)]">
            <button
              onClick={() => shiftMonth(-1)}
              className="px-2.5 py-1 text-xs hover:bg-[var(--raised)] dark:hover:bg-[var(--raised)] transition-colors text-[var(--text-secondary)] dark:text-[var(--text-secondary)]"
              aria-label={calMode==='month'?'上个月':calMode==='week'?'上一周':'上一天'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setCalYear(new Date().getFullYear());
                setCalMonth(new Date().getMonth());
                setSelectedDate(TODAY);
              }}
              className="px-3 py-1 text-xs font-semibold hover:bg-[var(--raised)] dark:hover:bg-[var(--raised)] transition-colors border-x border-[var(--line)] dark:border-[var(--line)] text-[var(--primary)]"
            >
              今天
            </button>
            <button
              onClick={() => shiftMonth(1)}
              className="px-2.5 py-1 text-xs hover:bg-[var(--raised)] dark:hover:bg-[var(--raised)] transition-colors text-[var(--text-secondary)] dark:text-[var(--text-secondary)]"
              aria-label={calMode==='month'?'下个月':calMode==='week'?'下一周':'下一天'}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Semi Design Segmented Control */}
        <div className="inline-flex bg-[var(--raised)] dark:bg-[var(--bg)] p-1 rounded-lg gap-1 border border-[var(--line)] dark:border-[var(--line)]">
          {(['month', 'week', 'agenda'] as CalendarSubView[]).map((m) => (
            <button
              key={m}
              onClick={() => setCalMode(m)}
              aria-pressed={calMode === m}
              className={`text-xs font-medium px-4 py-1 rounded-md transition-all ${
                calMode === m
                  ? 'bg-[var(--card)] dark:bg-[var(--raised)] text-[var(--primary)] shadow-xs font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--ink)] dark:hover:text-[var(--ink)]'
              }`}
            >
              {m === 'month' ? '月视图' : m === 'week' ? '周视图' : '日程列表'}
            </button>
          ))}
        </div>
      </div>

      <p className="calendar-drag-help">拖动日程改期；月视图拖动右端调整日期，周视图上下拉伸调整时长（15 分钟）。</p>
      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Area */}
        <div className={calMode==='week'?'lg:col-span-12 space-y-3':'lg:col-span-8 space-y-3'}>
          {/* MONTH VIEW */}
          {calMode === 'month' && (
            <div className="semi-card overflow-hidden">
              {/* Day of Week Header */}
              <div className="grid grid-cols-7 bg-[var(--bg)] dark:bg-[var(--bg)] border-b border-[var(--line)] dark:border-[var(--line)]">
                {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((w) => (
                  <div key={w} className="py-2.5 text-center text-xs font-semibold text-[var(--muted)]">
                    {w}
                  </div>
                ))}
              </div>

              <div className="calendar-weeks">
                {weeks.map(weekDays => <CalendarWeek key={datestr(weekDays[0])} days={weekDays}
                  tasks={calendarEntries(scopedTasks,datestr(weekDays[0]),datestr(weekDays[6]))} month={calMonth} selectedDate={selectedDate} today={TODAY}
                  onSelectDate={setSelectedDate} onSelectTask={onSelectTask} onReschedule={onReschedule} onShowDateTasks={showDateTasks} />)}
              </div>
            </div>
          )}

          {calMode === 'week' && (
            <div className="semi-card overflow-hidden">
              <CalendarWeek days={currWeekDays} tasks={calendarEntries(scopedTasks,currWeekStart,currWeekEnd).filter(t=>t.calendarEntry?.kind!=='session')} month={calMonth}
                selectedDate={selectedDate} today={TODAY} weekView
                onSelectDate={setSelectedDate} onSelectTask={onSelectTask} onReschedule={onReschedule} onShowDateTasks={showDateTasks} />
              <WeekTimeGrid days={currWeekDays} tasks={scopedTasks} onSelect={onSelectTask} onChange={onUpdateScheduledTime}/>
            </div>
          )}

          {/* AGENDA VIEW */}
          {calMode === 'agenda' && (
            <div className="semi-card p-5 space-y-3">
              <h2 className="font-bold text-sm text-[var(--ink)] dark:text-[var(--ink)]">
                {selectedDate} · 当日日程
              </h2>
              <div className="divide-y divide-[#e5e6eb] dark:divide-[#333336] max-h-[460px] overflow-y-auto pr-1">
                {dateTasks(selectedDate).length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--muted)]">
                    暂无安排
                  </div>
                ) : (
                  dateTasks(selectedDate).map((t) => {
                    const span = getTaskSpan(t);
                    return (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask(t)}
                        className="py-3 flex items-center justify-between cursor-pointer hover:bg-[var(--bg)] dark:hover:bg-[var(--bg)] p-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              t.domain === 'work' ? 'bg-[var(--action)]' : 'bg-[#ff7d00]'
                            }`}
                          />
                          <span className="text-xs font-medium text-[var(--ink)] dark:text-[var(--ink)] truncate">
                            {t.title}
                          </span>
                          {span && span.isMultiDay && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--primary-light)] text-[var(--primary)] shrink-0">
                              跨天 ({span.start.slice(5)}~{span.end.slice(5)})
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-[var(--muted)] shrink-0 ml-2">
                          {t.calendarEntry?.kind==='period'?'计划周期':t.calendarEntry?.kind==='subtask'?'子事项节点':t.scheduledStart?t.scheduledStart.slice(11,16):'截止'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side Panel */}
        <aside className={calMode==='week'?'lg:col-span-12 grid sm:grid-cols-2 gap-4':'lg:col-span-4 space-y-4'}>
          <section className="semi-card p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] dark:border-[var(--line)] mb-3 shrink-0">
              <div>
                <h2 className="font-bold text-sm text-[var(--ink)] dark:text-[var(--ink)]">
                  {selectedDate.slice(5).replace('-', '/')} · {selectedDate === TODAY ? '今天' : '已选日期'}
                </h2>
                
              </div>
              <button
                onClick={() => onQuickAddForDate(selectedDate)}
                className="p-1 rounded-lg hover:bg-[var(--raised)] dark:hover:bg-[var(--raised)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                title="新建此日期的事项"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {dateTasks(selectedDate).length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--muted)]">暂无安排</div>
              ) : (
                dateTasks(selectedDate).map((t) => {
                  const span = getTaskSpan(t);
                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="p-3 border border-[var(--line)] dark:border-[var(--line)] rounded-xl bg-[var(--card)] dark:bg-[var(--card)] cursor-pointer hover:border-[var(--primary)] transition-all"
                    >
                      <div className="text-xs font-semibold text-[var(--ink)] dark:text-[var(--ink)] break-words">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--muted)]">
                        <span>{t.domain === 'work' ? '工作' : '生活'} · {t.calendarEntry?.kind==='period'?'计划周期':t.calendarEntry?.kind==='subtask'?'子事项节点':t.calendarEntry?.kind==='deadline'?'截止':'日程'}</span>
                        {span && span.isMultiDay && (
                          <span className="text-[var(--primary)] font-mono">
                            跨天: {span.start} 至 {span.end}
                          </span>
                        )}
                        {!span?.isMultiDay && t.scheduledStart && (
                          <span className="font-mono">
                            {t.scheduledStart.slice(11, 16)} {t.scheduledEnd ? `~ ${t.scheduledEnd.slice(11, 16)}` : ''}
                          </span>
                        )}
                      </div>
                      {taskNodes(t).filter(n=>n.date===selectedDate).map(n=><div key={n.id} className="calendar-sidebar-node">{n.done?'✓':'◆'} {n.title}{n.at.includes('T')?' · '+n.at.slice(11,16):''}</div>)}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Unscheduled Sidebar */}
          <section className="semi-card p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] dark:border-[var(--line)] mb-3 shrink-0">
              <h2 className="font-bold text-sm text-[var(--ink)] dark:text-[var(--ink)]">
                未排期 <span className="ml-1 px-1.5 py-0.5 rounded bg-[var(--raised)] dark:bg-[var(--bg)] text-xs font-mono">{unscheduledTasks.length}</span>
              </h2>
              
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {unscheduledTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--muted)]">都已排期</div>
              ) : (
                unscheduledTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="p-3 border border-[var(--line)] dark:border-[var(--line)] rounded-xl bg-[var(--card)] dark:bg-[var(--card)] cursor-pointer hover:border-[var(--primary)] transition-all"
                  >
                    <div className="text-xs font-semibold text-[var(--ink)] dark:text-[var(--ink)] break-words">
                      {t.title}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
      {overflowDate&&<div className="modal-backdrop" onClick={closeDateTasks}><section className="calendar-day-dialog" role="dialog" aria-modal="true" aria-label={overflowDate+' 全部事项'} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();closeDateTasks();}}}>
        <header><div><h2>{overflowDate.slice(5).replace('-','/')} · 全部事项</h2><span>{dateTasks(overflowDate).length} 项</span></div><button autoFocus className="icon-button" aria-label="关闭当天全部事项" onClick={closeDateTasks}><X size={18}/></button></header>
        <div className="calendar-day-dialog-list">{dateTasks(overflowDate).map(t=><button key={t.id} className="calendar-day-dialog-item" onClick={()=>{setOverflowDate(null);onSelectTask(t);}}><strong>{['done','completed'].includes(t.status)?'✓ ':''}{t.title}</strong><small>{t.domain==='work'?'工作':'生活'} · {timeDescription(t)}</small>{taskNodes(t).filter(m=>m.date===overflowDate).map(m=><span className="calendar-dialog-node" key={m.id}>{m.done?'✓':'◆'} {m.title}{m.at.includes('T')?' · '+m.at.slice(11,16):''}</span>)}</button>)}</div>
        <footer><button className="quiet-button" onClick={()=>{const date=overflowDate;setOverflowDate(null);onQuickAddForDate(date);}}>＋ 新建事项</button><button className="btn-primary px-4 py-2" onClick={closeDateTasks}>完成</button></footer>
      </section></div>}
    </div>
  );
};
