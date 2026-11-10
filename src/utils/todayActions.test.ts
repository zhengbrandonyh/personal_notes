import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SEED_TASKS} from './storage';
import {isTodayAction,isAutomaticTodayAction} from './todayActions';
import type {TaskItem} from '../types';
const day='2026-11-08';
const task=(patch:Partial<TaskItem>={}):TaskItem=>({...structuredClone(SEED_TASKS[0]),id:'task',status:'todo',deletedAt:null,scheduledStart:null,scheduledEnd:null,dueAt:null,plannedFor:null,milestones:[],subtasks:[],...patch});
const plan=()=>({period:{start:'2026-11-02',end:'2026-11-12'},sessions:[],daily:[],reminders:[]});

test('today actions include each requested trigger and manual additions, without duplicating a task matching several triggers',()=>{
 const start=task({scheduledStart:day+'T09:00',scheduledEnd:'2026-11-12T18:00'});
 const node=task({subtasks:[{id:'s',title:'提测',done:false,at:day+'T14:00'}]});
 const due=task({dueAt:day});const manual=task({plannedFor:day});
 for(const t of [start,node,due,manual])assert.equal(isTodayAction(t,day),true);
 const combined={...start,...node,dueAt:day,plannedFor:day};assert.equal([combined].filter(t=>isTodayAction(t,day)).length,1);
 assert.equal(isAutomaticTodayAction(manual,day),false);assert.equal(isAutomaticTodayAction(node,day),true);
});

test('finished and deleted tasks are excluded for every trigger; finished child nodes alone do not keep a task in today actions',()=>{
 const t=task({plannedFor:day,dueAt:day,scheduledStart:day+'T09:00',subtasks:[{id:'s',title:'提测',done:false,at:day}]});
 for(const status of ['done','completed'] as const)assert.equal(isTodayAction({...t,status},day),false);
 assert.equal(isTodayAction({...t,deletedAt:'2026-11-08T10:00'},day),false);
 assert.equal(isTodayAction({...t,status:'in_progress'},day),true);
 const child=task({subtasks:[{id:'s',title:'提测',done:true,at:day}]});assert.equal(isTodayAction(child,day),false);
 assert.equal(isTodayAction({...child,dueAt:day},day),true);
});

test('canonical plans use their actual current dates rather than preserved legacy fields',()=>{
 const t=task({scheduledStart:day+'T09:00',scheduledEnd:day+'T18:00',timePlan:plan()});assert.equal(isTodayAction(t,day),false);
 t.timePlan!.period!.start=day;assert.equal(isTodayAction(t,day),true);
 t.timePlan={...plan(),period:null,sessions:[{id:'s',start:day+'T11:00',end:day+'T12:00'}]};assert.equal(isTodayAction(t,day),true);
 t.timePlan={...plan(),period:null};assert.equal(isTodayAction(t,day),false);
});

test('daily schedules follow exclusions and single-day moves when choosing today actions',()=>{
 const t=task({timePlan:{...plan(),daily:[{id:'g',startTime:'09:00',endTime:'10:00',overrides:{},excluded:[]}]}});
 assert.equal(isTodayAction(t,day),true);t.timePlan!.daily[0].excluded=[day];assert.equal(isTodayAction(t,day),false);
 t.timePlan!.daily[0].excluded=[];t.timePlan!.daily[0].overrides[day]={start:'2026-11-09T09:00',end:'2026-11-09T10:00'};assert.equal(isTodayAction(t,day),false);
 t.timePlan!.daily[0].overrides={};t.timePlan!.daily[0].overrides['2026-11-07']={start:day+'T14:00',end:day+'T15:00'};t.timePlan!.daily[0].excluded=[day];assert.equal(isTodayAction(t,day),true);
});

test('date matching respects local timezone, old milestone nodes and exact start dates without pulling in unrelated long-term tasks',()=>{
 assert.equal(isTodayAction(task({dueAt:'2026-11-07T16:30:00Z'}),day),true);
 assert.equal(isTodayAction(task({dueAt:'2026-11-08T16:30:00Z'}),day),false);
 assert.equal(isTodayAction(task({milestones:[{id:'legacy',title:'提测',date:day}]}),day),true);
 assert.equal(isTodayAction(task({scheduledStart:'2026-11-07T09:00',scheduledEnd:'2026-11-10T18:00'}),day),false);
 assert.equal(isTodayAction(task({dueAt:'2026-11-07'}),day),false);
 assert.equal(isTodayAction(task({plannedFor:'2026-11-07'}),day),false);
 assert.equal(isTodayAction(task(),day),false);
});

test('selection is read-only and automatically updates when a child is completed or the local day changes',()=>{
 const t=task({subtasks:[{id:'s',title:'提测',done:false,at:day}]});const raw=JSON.stringify(t);assert.equal(isTodayAction(t,day),true);assert.equal(JSON.stringify(t),raw);
 assert.equal(isTodayAction(t,'2026-11-09'),false);t.subtasks[0].done=true;assert.equal(isTodayAction(t,day),false);
 t.plannedFor=day;assert.equal(isTodayAction(t,day),true);
});
