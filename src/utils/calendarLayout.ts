import { TaskItem } from '../types';
import {periodOf} from './timePlan';
import {taskNodes} from './subtaskNodes';
import { dateOnly } from './date';

export function getCalendarSpan(task: TaskItem) {
  if(task.timePlan&&!task.calendarEntry){const p=periodOf(task);if(p)return {...p,isMultiDay:p.start<p.end};const dates=[...task.timePlan.sessions.flatMap(s=>[dateOnly(s.start),dateOnly(s.end)]),dateOnly(task.dueAt)].filter(Boolean).sort();return dates.length?{start:dates[0],end:dates.at(-1)!,isMultiDay:dates[0]<dates.at(-1)!}:null;}
  const start = dateOnly(task.scheduledStart);
  const end = dateOnly(task.scheduledEnd || task.dueAt);
  if (!start && !end) return null;
  return { start: start || end, end: end || start, isMultiDay: (start || end) < (end || start) };
}

function dayIndex(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

/** Clip spans to a week and place overlapping events on separate lanes. */
export function layoutCalendarWeek(tasks: TaskItem[], weekStart: string, weekEnd: string) {
  const events = tasks.flatMap(task => {
    const span = getCalendarSpan(task);
    if (!span?.isMultiDay || span.start > weekEnd || span.end < weekStart) return [];
    return [{ task, span, start: Math.max(0, dayIndex(span.start) - dayIndex(weekStart)),
      end: Math.min(6, dayIndex(span.end) - dayIndex(weekStart)) }];
  }).sort((a, b) => a.start - b.start || b.end - a.end || a.task.id.localeCompare(b.task.id));
  const laneEnds: number[] = [];
  return events.map(event => {
    let lane = laneEnds.findIndex(end => end < event.start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = event.end;
    return { ...event, lane, continuesBefore: event.span.start < weekStart, continuesAfter: event.span.end > weekEnd };
  });
}

/** Reserve room for title and milestone labels; disjoint spans may share a lane. */
export function calendarLaneHeights(events: ReturnType<typeof layoutCalendarWeek>, weekStart: string, weekEnd: string) {
  const heights: number[] = [];
  for (const event of events) {
    const withNodes = taskNodes(event.task).some(node => node.date >= weekStart && node.date <= weekEnd);
    heights[event.lane] = Math.max(heights[event.lane] || 32, withNodes ? 52 : 32);
  }
  return heights;
}

/** Cap the month overview, retaining exact per-day counts for the complete list. */
export function compactCalendarWeek(events: ReturnType<typeof layoutCalendarWeek>, laneLimit = 3) {
  const visible = events.filter(event => event.lane < laneLimit);
  const hiddenCounts = Array(7).fill(0) as number[];
  for (const event of events) if (event.lane >= laneLimit) {
    for (let column = event.start; column <= event.end; column++) hiddenCounts[column]++;
  }
  return { visible, hiddenCounts, laneCount: Math.min(laneLimit, events.reduce((n,event)=>Math.max(n,event.lane+1),0)) };
}
