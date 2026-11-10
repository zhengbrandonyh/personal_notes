import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {TaskStageSelect} from '../components/TaskStageSelect';
import {SummaryChartCard} from '../components/SummaryChartCard';
import {CalendarWeek} from '../components/CalendarWeek';
import {taskStage,TASK_STAGES} from './taskStage';
import {completeTask,nextOccurrence,isFinished} from './taskWorkflow';
import {SEED_TASKS,validateData,parseBackup} from './storage';
import {localDate} from './date';
import {applyAssistantActions,normalizeAssistantReply} from './assistantActions';
test('all five task stages roundtrip through backup without changing completion or schedule',()=>{
 const base=structuredClone(SEED_TASKS[0]);assert.equal(taskStage(base),'not_started');assert.equal(base.stage,undefined);
 for(const s of TASK_STAGES){const next={...base,stage:s.value};const result=parseBackup(JSON.stringify({tasks:[next],notes:[]})).tasks[0];assert.equal(taskStage(result),s.value);assert.equal(result.status,base.status);assert.equal(result.scheduledStart,base.scheduledStart);}
 assert.throws(()=>validateData({tasks:[{...base,stage:'invalid'}],notes:[]}),/状态/);
});
test('completion and reopening retain the work stage while a new recurrence resets it',()=>{
 const n={...SEED_TASKS[0],stage:'testing' as const};const done=completeTask([n],n.id,'2026-11-10T12:00',()=> 'next');assert.equal(done[0].stage,'testing');assert.equal(isFinished(done[0]),true);const open=completeTask(done,n.id,'2026-11-10T12:01',()=> 'next');assert.equal(open[0].stage,'testing');assert.equal(isFinished(open[0]),false);
 const next=nextOccurrence({...n,repeat:'daily'},'2026-11-10T12:00','next')!;assert.equal(next.stage,'not_started');assert.equal(next.status,'todo');
});
test('tag controls use the selected stage color and completed legacy tasks cannot change it',()=>{
 for(const s of TASK_STAGES){const html=renderToStaticMarkup(React.createElement(TaskStageSelect,{task:{...SEED_TASKS[0],stage:s.value},onChange:()=>{}}));assert.match(html,new RegExp('data-stage="'+s.value+'"'));assert.match(html,new RegExp('value="'+s.value+'" selected'));}
 const html=renderToStaticMarkup(React.createElement(TaskStageSelect,{task:{...SEED_TASKS[0],status:'completed'},onChange:()=>{}}));assert.match(html,/disabled/);
});
test('summary and calendar show old completed records identically to done records',()=>{
 const date=localDate(),base={...SEED_TASKS[0],dueAt:date,completedAt:date+'T10:00',scheduledStart:date+'T09:00',scheduledEnd:date+'T10:00'};
 const summary=(status:'done'|'completed')=>renderToStaticMarkup(React.createElement(SummaryChartCard,{tasks:[{...base,status}],currentDomain:'all',onSelectTask:()=>{},onOpenAiReview:()=>{}}));assert.equal(summary('done'),summary('completed'));
 const start=new Date(date+'T12:00'),days=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});
 const calendar=(status:'done'|'completed')=>renderToStaticMarkup(React.createElement(CalendarWeek,{tasks:[{...base,status}],days,month:start.getMonth(),selectedDate:date,today:date,onSelectDate:()=>{},onSelectTask:()=>{}}));assert.equal(calendar('done'),calendar('completed'));assert.match(calendar('completed'),/is-done/);
});
test('AI can change a stage without completing the task and rejects invalid stage values',()=>{
 const n=structuredClone(SEED_TASKS[0]),data={tasks:[n],notes:[]};
 const plan=normalizeAssistantReply({message:'进入测试',actions:[{entity:'task',operation:'update',targetId:n.id,data:{stage:'testing'}}]},data);
 const result=applyAssistantActions(data,plan.actions,data,'2026-11-10T09:00',()=> 'new');assert.equal(result.tasks[0].stage,'testing');assert.equal(result.tasks[0].status,n.status);assert.equal(result.tasks[0].completedAt,n.completedAt);
 assert.throws(()=>normalizeAssistantReply({message:'非法',actions:[{entity:'task',operation:'update',targetId:n.id,data:{stage:'unknown'}}]},data),/状态/);
});
