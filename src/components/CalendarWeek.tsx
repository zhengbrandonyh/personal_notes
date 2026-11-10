import {isFinished} from '../utils/taskWorkflow';
import {taskNodes} from '../utils/subtaskNodes';
import {toDatetimeLocalString} from '../utils/dateTime';
import { milestonesInRange } from '../utils/milestones';
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TaskItem } from '../types';
import { localDate } from '../utils/date';
import { getCalendarSpan, layoutCalendarWeek, calendarLaneHeights, compactCalendarWeek } from '../utils/calendarLayout';

interface Props {
  days: Date[];
  tasks: TaskItem[];
  month: number;
  selectedDate: string;
  today: string;
  weekView?: boolean;
  onReschedule?:(task:TaskItem,date:string,kind:'move'|'resize',anchor?:string)=>void;
  onShowDateTasks?: (date:string)=>void;
  onSelectDate: (date: string) => void;
  onSelectTask: (task: TaskItem) => void;
}

export function CalendarWeek({ days, tasks, month, selectedDate, today, weekView = false, onReschedule, onShowDateTasks, onSelectDate, onSelectTask }: Props) {
  const drag=(e:React.DragEvent,task:TaskItem,kind:'move'|'resize',anchor:string)=>{e.stopPropagation();e.dataTransfer.setData('application/x-daynight-task',JSON.stringify({id:task.id,kind,anchor}));e.dataTransfer.effectAllowed='move';};
  const events = layoutCalendarWeek(tasks, localDate(days[0]), localDate(days[6]));
  const compact=compactCalendarWeek(events);
  const visibleEvents=weekView?events:compact.visible;
  const laneHeights = weekView?calendarLaneHeights(events, localDate(days[0]), localDate(days[6])):Array(compact.laneCount).fill(36);
  const lanes = laneHeights.length;
  const contentRow = lanes + 2;
  return (
    <div className={'calendar-week' + (weekView ? ' calendar-week-expanded' : ' calendar-week-month')}
      onDragOver={e=>{if(e.dataTransfer.types.includes('application/x-daynight-task')){e.preventDefault();e.dataTransfer.dropEffect='move';}}}
      onDrop={e=>{const raw=e.dataTransfer.getData('application/x-daynight-task');if(!raw)return;e.preventDefault();try{const v=JSON.parse(raw),task=tasks.find(t=>t.id===v.id);const rect=e.currentTarget.getBoundingClientRect();const col=Math.min(6,Math.max(0,Math.floor((e.clientX-rect.left)/rect.width*7)));if(task&&(v.kind==='move'||v.kind==='resize'))onReschedule?.(task,localDate(days[col]),v.kind,v.anchor);}catch{}}}
      role="group" aria-label={`${localDate(days[0])} 至 ${localDate(days[6])}`}
      style={{ gridTemplateRows: `${weekView ? 60 : 36}px ${laneHeights.map(height => height + 'px').join(' ')} ${weekView ? 'minmax(16px, auto)' : 'minmax(32px, auto)'}` }}>
      {days.map((day, column) => {
        const date = localDate(day);
        const selected = date === selectedDate;
        return (
          <button type="button" key={date} className={'calendar-date-cell' + (selected ? ' is-selected' : '') + (!weekView && day.getMonth() !== month ? ' is-outside' : '')}
            style={{ gridColumn: column + 1, gridRow: '1 / -1' }}
            aria-label={`选择日期 ${date}`} aria-pressed={selected} aria-current={date === today ? 'date' : undefined}
            onClick={() => onSelectDate(date)}>
            {weekView && <span className="calendar-weekday">周{['一', '二', '三', '四', '五', '六', '日'][column]}</span>}
            <span className={'calendar-day-number' + (date === today ? ' is-today' : '')}>
              {weekView ? date.slice(5).replace('-', '/') : day.getDate()}
            </span>
          </button>
        );
      })}
      {visibleEvents.map(event => (
        <button type="button" key={event.task.id}
          draggable={!!onReschedule&&!!event.task.scheduledStart&&!!event.task.scheduledEnd}
          onDragStart={e=>drag(e,event.task,'move',localDate(days[event.start]))}
          className={'calendar-span ' + (milestonesInRange(event.task,localDate(days[event.start]),localDate(days[event.end])).length ? 'has-milestones ' : '') + (event.task.domain === 'work' ? 'is-work' : 'is-life') + (event.task.calendarEntry?.kind==='period'?' is-period':'') +
            (event.continuesBefore ? ' continues-before' : '') + (event.continuesAfter ? ' continues-after' : '') +
            (isFinished(event.task) ? ' is-done' : '')}
          style={{ gridColumn: `${event.start + 1} / ${event.end + 2}`, gridRow: event.lane + 2 }}
          aria-label={`${event.task.title}，${event.span.start} 至 ${event.span.end}`}
          title={`${event.task.title} · ${event.span.start} 至 ${event.span.end}${taskNodes(event.task).map(m=>`\n${m.done?'✓':'◆'} ${m.at.replace('T',' ')} ${m.title}`).join('')}`}
          onClick={() => onSelectTask(event.task)}>
          {event.continuesBefore && <ChevronLeft size={12} aria-hidden="true" />}
          <span className="calendar-span-title">{isFinished(event.task) ? '✓ ' : ''}{event.task.title}</span>
          {milestonesInRange(event.task,localDate(days[event.start]),localDate(days[event.end])).filter((m,i,a)=>a.findIndex(x=>x.date===m.date)===i).map(m=>{const column=days.findIndex(d=>localDate(d)===m.date);return <i key={m.id} className="calendar-milestone" style={{left:`${(column-event.start)/(event.end-event.start+1)*100}%`,width:`${100/(event.end-event.start+1)}%`}} aria-label={`${m.date} ${m.title}`}><b>◆</b><em>{taskNodes(event.task).filter(x=>x.date===m.date).map(x=>(x.done?'✓ ':'')+x.title+(x.at.includes('T')?' '+x.at.slice(11,16):'')).join(" · ")}</em></i>;})}
          {onReschedule&&!event.continuesAfter&&event.task.scheduledStart&&event.task.scheduledEnd&&<span role="button" tabIndex={0} className="calendar-resize" draggable aria-label={'拖动调整结束日期 '+event.task.title} title="拖到目标日期以调整结束时间" onDragStart={e=>drag(e,event.task,'resize',localDate(days[event.start]))} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Enter'){e.stopPropagation();onSelectTask(event.task);}}}>⋮</span>}{event.continuesAfter && <ChevronRight size={12} aria-hidden="true" />}
        </button>
      ))}
      {days.map((day, column) => {
        const date = localDate(day);
        const items = tasks.filter(task => {
          const span = getCalendarSpan(task);
          return span && !span.isMultiDay && span.start === date;
        }).sort((a, b) => (a.scheduledStart || '').localeCompare(b.scheduledStart || ''));
        const limit = weekView ? items.length : Math.max(0, 3-visibleEvents.filter(event=>event.start<=column&&event.end>=column).length);
        const hidden = Math.max(0,items.length-limit)+(weekView?0:compact.hiddenCounts[column]);
        return (
          <div key={date} className="calendar-day-items" style={{ gridColumn: column + 1, gridRow: contentRow }}>
            {items.slice(0, limit).map(task => (
              <button type="button" key={task.id} className={'calendar-single ' + (task.domain === 'work' ? 'is-work' : 'is-life') + (isFinished(task) ? ' is-done' : '')}
                draggable={!!onReschedule&&!!task.scheduledStart&&!!task.scheduledEnd} onDragStart={e=>drag(e,task,'move',date)} title={task.title} onClick={() => onSelectTask(task)}>
                {task.calendarEntry?.kind==='session'&&<small className="calendar-single-time">{toDatetimeLocalString(task.scheduledStart).slice(11,16)}</small>}{task.calendarEntry?.kind==='subtask'&&<small>◆</small>}<span className="calendar-single-title">{isFinished(task) ? '✓ ' : ''}{task.title}</span>{onReschedule&&task.scheduledStart&&task.scheduledEnd&&<span className="calendar-resize" draggable title="拖动调整结束日期" onDragStart={e=>drag(e,task,'resize',date)} onClick={e=>e.stopPropagation()}>⋮</span>}
              </button>
            ))}
            {hidden > 0 && <button type="button" className="calendar-more" aria-label={`${date} 还有 ${hidden} 项，查看当天全部事项`} onClick={() => {onSelectDate(date);onShowDateTasks?.(date);}}>+{hidden} 项</button>}
          </div>
        );
      })}
    </div>
  );
}
