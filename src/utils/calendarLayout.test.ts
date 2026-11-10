import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskItem } from '../types';
import { layoutCalendarWeek } from './calendarLayout';

const task = (id: string, start: string, end: string) => ({
  id, scheduledStart: start + 'T09:00', scheduledEnd: end + 'T18:00'
}) as TaskItem;

test('cross-week spans remain inside each matching week and expose continuation edges', () => {
  const item = task('cross', '2026-10-11', '2026-10-14');
  const first = layoutCalendarWeek([item], '2026-10-05', '2026-10-11')[0];
  assert.deepEqual([first.start, first.end, first.continuesBefore, first.continuesAfter], [6, 6, false, true]);
  const next = layoutCalendarWeek([item], '2026-10-12', '2026-10-18')[0];
  assert.deepEqual([next.start, next.end, next.continuesBefore, next.continuesAfter], [0, 2, true, false]);
});

test('overlapping inclusive dates use separate lanes and disjoint events reuse a lane', () => {
  const items = [task('a', '2026-10-05', '2026-10-07'), task('b', '2026-10-07', '2026-10-08'), task('c', '2026-10-08', '2026-10-09')];
  const rows = layoutCalendarWeek(items, '2026-10-05', '2026-10-11');
  assert.equal(rows.find(x => x.task.id === 'a')!.lane, 0);
  assert.equal(rows.find(x => x.task.id === 'b')!.lane, 1);
  assert.equal(rows.find(x => x.task.id === 'c')!.lane, 0);
  assert.deepEqual(layoutCalendarWeek([...items].reverse(), '2026-10-05', '2026-10-11'), rows);
});

test('month/year boundaries clip correctly while single-day and unrelated items stay out of spans', () => {
  const rows = layoutCalendarWeek([
    task('year', '2026-12-30', '2027-01-05'), task('single', '2027-01-01', '2027-01-01'), task('outside', '2027-01-10', '2027-01-12')
  ], '2026-12-28', '2027-01-03');
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].start, rows[0].end], [2, 6]);
});

test('dense milestone weeks reserve two lines without changing lane collision rules', async () => {
  const { calendarLaneHeights } = await import('./calendarLayout');
  const items = Array.from({length:14},(_,i)=>({...task('dense-'+i,'2026-11-02','2026-11-06'),milestones:[{id:'m'+i,title:'提测',date:'2026-11-04'}]}));
  const rows=layoutCalendarWeek(items,'2026-11-02','2026-11-08');
  assert.equal(rows.length,14);
  assert.deepEqual(calendarLaneHeights(rows,'2026-11-02','2026-11-08'),Array(14).fill(52));
  assert.equal(new Set(rows.map(row=>row.lane)).size,14);
});
test('a shared lane expands only for milestones visible in this week', async () => {
  const { calendarLaneHeights }=await import('./calendarLayout');
  const items=[task('plain','2026-11-02','2026-11-03'),{...task('node','2026-11-05','2026-11-06'),milestones:[{id:'n',title:'节点',date:'2026-11-05'}]}];
  assert.deepEqual(calendarLaneHeights(layoutCalendarWeek(items,'2026-11-02','2026-11-08'),'2026-11-02','2026-11-08'),[52]);
  const later={...task('later','2026-11-02','2026-11-13'),milestones:[{id:'next',title:'下周节点',date:'2026-11-11'}]};
  assert.deepEqual(calendarLaneHeights(layoutCalendarWeek([later],'2026-11-02','2026-11-08'),'2026-11-02','2026-11-08'),[32]);
});

test('month overview caps lanes and counts every hidden cross-day task on each matching date', async()=>{
 const {compactCalendarWeek}=await import('./calendarLayout');
 const items=Array.from({length:12},(_,i)=>task('row-'+i,'2026-11-02',i<6?'2026-11-06':'2026-11-04'));
 const events=layoutCalendarWeek(items,'2026-11-02','2026-11-08');
 const compact=compactCalendarWeek(events);
 assert.equal(compact.laneCount,3);assert.equal(compact.visible.length,3);
 assert.deepEqual(compact.hiddenCounts,[9,9,9,3,3,0,0]);
 for(let day=0;day<7;day++)assert.equal(compact.visible.filter(e=>e.start<=day&&e.end>=day).length+compact.hiddenCounts[day],events.filter(e=>e.start<=day&&e.end>=day).length);
});
test('month hidden counts clip week continuations and retain disjoint tasks sharing a visible lane',async()=>{
 const {compactCalendarWeek}=await import('./calendarLayout');
 const events=layoutCalendarWeek([task('one','2026-10-30','2026-11-03'),task('two','2026-11-03','2026-11-04'),task('three','2026-11-04','2026-11-10')],'2026-11-02','2026-11-08');
 const compact=compactCalendarWeek(events,1);
 assert.equal(compact.laneCount,1);assert.deepEqual(compact.visible.map(e=>e.task.id),['one','three']);assert.deepEqual(compact.hiddenCounts,[0,1,1,0,0,0,0]);
});
