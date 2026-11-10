import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SEED_TASKS,validateData,SEED_NOTES} from './storage';
import {calendarChange,completeTask,scheduleWarnings,nextOccurrence,taskOptionsError,timedChange} from './taskWorkflow';
import {normalizeAssistantReply,applyAssistantActions} from './assistantActions';
import {dueReminders,readDeliveries,reminderKey} from './reminders';
import {parseNoteDraft,recoverNoteDrafts,clearCommittedDrafts,NOTE_DRAFT_PREFIX} from './noteDrafts';
import {layoutTodaySchedule} from './todaySchedule';
const task=()=>({...structuredClone(SEED_TASKS[0]),id:'test',scheduledStart:'2026-10-10T09:00',scheduledEnd:'2026-12-01T18:00',dueAt:'2026-12-05',milestones:[{id:'m1',title:'提测',date:'2026-11-11'}]});
test('calendar move preserves duration, independent deadline and milestone offsets; resize cannot hide milestones',()=>{
 const t=task(),next=calendarChange(t,'2026-10-12','move');
 assert.equal(next.scheduledStart,'2026-10-12T09:00:00');assert.equal(next.scheduledEnd,'2026-12-03T18:00:00');assert.equal(next.dueAt,t.dueAt);assert.equal(next.milestones![0].date,'2026-11-13');assert.equal(t.milestones![0].date,'2026-11-11');
 assert.throws(()=>calendarChange(t,'2026-11-01','resize'),/提测/);
 assert.equal(calendarChange(t,'2026-12-03','resize').scheduledEnd,'2026-12-03T18:00');
});
test('timed week moves and resizes update the interval without rewriting deadline',()=>{
 const t={...task(),scheduledStart:'2026-11-11T09:00',scheduledEnd:'2026-11-11T10:00'};
 const n=timedChange(t,'2026-11-12T10:15','2026-11-12T11:45');assert.equal(n.milestones![0].date,'2026-11-12');assert.equal(n.dueAt,t.dueAt);
 assert.throws(()=>timedChange(t,'2026-11-11T10:00','2026-11-11T09:00'),/无效/);
});
test('conflict detection spans domains, ignores completed and adjacent intervals, and checks constraints',()=>{
 const t={...task(),scheduledStart:'2026-11-02T09:00',scheduledEnd:'2026-11-02T10:00',milestones:[],estimatedMinutes:90,scheduleConstraints:{earliest:'10:00',latest:'18:00',weekdaysOnly:true}};
 const occupied={...t,id:'other',title:'生活安排',domain:'life' as const,scheduledStart:'2026-11-02T09:30',scheduledEnd:'2026-11-02T10:30'};
 const warnings=scheduleWarnings(t,[t,occupied,{...occupied,id:'done',status:'done'},{...occupied,id:'adjacent',scheduledStart:'2026-11-02T10:00'}]);
 assert.equal(warnings.length,3);assert.match(warnings.join(),/生活安排/);assert.match(warnings.join(),/预计/);assert.match(warnings.join(),/时段/);
});
test('today choice is additive and does not change dates or priority in backup validation',()=>{
 const t={...task(),plannedFor:'2026-11-02'};assert.deepEqual(validateData({tasks:[t],notes:[]}).tasks[0],t);assert.equal(t.dueAt,'2026-12-05');
 assert.match(taskOptionsError({...t,estimatedMinutes:-1}),/预计/);assert.match(taskOptionsError({...t,scheduleConstraints:{earliest:'18:00',latest:'09:00',weekdaysOnly:true}}),/排期/);
});
test('repeat completion keeps history and creates exactly one next occurrence even when reopened',()=>{
 const t={...task(),repeat:'weekdays' as const,scheduledStart:'2026-11-06T09:00',scheduledEnd:'2026-11-06T10:00',dueAt:'2026-11-06',milestones:[],remindAt:'2026-11-06T08:50',plannedFor:'2026-11-06'};
 let result=completeTask([t],t.id,'2026-11-06T10:00',()=> 'next');assert.equal(result.length,2);assert.equal(result[0].scheduledStart,'2026-11-09T09:00:00');assert.equal(result[0].remindAt,'2026-11-09T08:50:00');assert.equal(result[0].plannedFor,null);assert.equal(result[1].status,'done');assert.equal(result[0].subtasks.every(s=>!s.done),true);
 result=completeTask(result,t.id,'2026-11-06T10:01',()=> 'duplicate');result=completeTask(result,t.id,'2026-11-06T10:02',()=> 'duplicate');assert.equal(result.length,2);
});
test('monthly recurrence clamps February and restores the original month day in March',()=>{
 const t={...task(),repeat:'monthly' as const,scheduledStart:'2027-01-31T09:00',scheduledEnd:'2027-01-31T10:00',dueAt:'2027-01-31',milestones:[]};const feb=nextOccurrence(t,'2027-01-31T10:00','feb')!;const march=nextOccurrence(feb,'2027-02-28T10:00','march')!;assert.equal(feb.dueAt,'2027-02-28');assert.equal(march.dueAt,'2027-03-31');
});
test('reminder chain deduplicates per occurrence, excludes complete/deleted, and redelivers a changed reminder',()=>{
 const t={...task(),remindAt:'2026-11-02T09:00'};const log=[{key:reminderKey(t),title:t.title,at:'2026-11-02T09:00',channel:'in-app' as const}];assert.equal(dueReminders([t],log,Date.parse('2026-11-02T10:00')).length,0);assert.equal(dueReminders([{...t,remindAt:'2026-11-02T09:15'}],log,Date.parse('2026-11-02T10:00')).length,1);assert.equal(dueReminders([{...t,status:'done'},{...t,deletedAt:'now'}],[],Date.now()).length,0);assert.throws(()=>readDeliveries('{bad'));
});
test('draft recovery preserves its base version for conflict detection rather than replacing it',()=>{
 const base=structuredClone(SEED_NOTES[0]),draft={...base,text:'尚未保存的正文'};const v=parseNoteDraft(JSON.stringify({draft,base,at:'2026-11-02T09:00'}));assert.equal(v.base.text,base.text);assert.equal(v.draft.text,'尚未保存的正文');assert.throws(()=>parseNoteDraft(JSON.stringify({...v,base:{...base,id:'other'}})),/草稿/);
});
test('AI accepts milestones, duration, constraints and reasons, revalidating combined ranges atomically',()=>{
 const data={tasks:[task()],notes:[]};const reply=normalizeAssistantReply({message:'预览',actions:[{entity:'task',operation:'update',targetId:'test',reason:'按预计用时安排在工作时间',data:{estimatedMinutes:60,scheduleConstraints:{earliest:'09:00',latest:'18:00',weekdaysOnly:true},milestones:[{id:'m',title:'提测',date:'2026-11-11'}]}}]},data);assert.equal(reply.actions[0].reason,'按预计用时安排在工作时间');assert.equal(applyAssistantActions(data,reply.actions,data,'2026-11-02T09:00',()=> 'new').tasks[0].estimatedMinutes,60);
 const invalid=normalizeAssistantReply({message:'预览',actions:[{entity:'task',operation:'update',targetId:'test',data:{scheduledEnd:'2026-11-01T10:00'}}]},data);assert.throws(()=>applyAssistantActions(data,invalid.actions,data,'2026-11-02T09:00',()=> 'new'),/提测/);assert.equal(data.tasks[0].scheduledEnd,'2026-12-01T18:00');
});
test('week time layout includes early morning events and completed history',()=>{const t={...task(),status:'done' as const,scheduledStart:'2026-11-02T06:00',scheduledEnd:'2026-11-02T07:00',milestones:[]};assert.equal(layoutTodaySchedule([t],'2026-11-02',{startMinute:0,pixelsPerMinute:1,minHeight:24,includeDone:true})[0].top,360);});

test('weekly and daily recurrence preserve reminder offsets and reject malformed new options',()=>{
 const t={...task(),scheduledStart:'2026-11-02T09:00',scheduledEnd:'2026-11-02T10:00',dueAt:'2026-11-02',milestones:[],repeat:'weekly' as const};assert.equal(nextOccurrence(t,'2026-11-02T10:00','w')!.dueAt,'2026-11-09');assert.equal(nextOccurrence({...t,repeat:'daily'},'2026-11-02T10:00','d')!.dueAt,'2026-11-03');assert.match(taskOptionsError({...t,plannedFor:'2026-02-30'}),/日期/);assert.throws(()=>validateData({tasks:[{...t,remindAt:'nonsense'}],notes:[]}),/提醒/);
});

 test('older conflicting drafts remain recoverable and a successful save only clears identical drafts',()=>{
 const entries=new Map<string,string>();const storage={get length(){return entries.size;},key:(i:number)=>[...entries.keys()][i]||null,getItem:(k:string)=>entries.get(k)||null,setItem:(k:string,v:string)=>entries.set(k,v),removeItem:(k:string)=>{entries.delete(k);},clear:()=>entries.clear()} as Storage;
 const base=structuredClone(SEED_NOTES[0]),draft={...base,title:'恢复正文'},other={...base,title:'另一个页面未保存的正文'};
 storage.setItem(NOTE_DRAFT_PREFIX+'1',JSON.stringify({base,draft,at:'2026-10-01T09:00'}));storage.setItem(NOTE_DRAFT_PREFIX+'2',JSON.stringify({base,draft:other,at:'2026-10-01T10:00'}));
 assert.equal(recoverNoteDrafts(storage,base.id).length,2);clearCommittedDrafts(storage,{...draft,updatedAt:'2026-11-02T09:00'});assert.equal(recoverNoteDrafts(storage,base.id).length,1);assert.equal(recoverNoteDrafts(storage,base.id)[0].draft.title,other.title);
 });
test('finishing overdue recurring tasks skips missed occurrences without producing an immediate reminder loop',()=>{const t={...task(),repeat:'daily' as const,scheduledStart:'2026-10-01T09:00',scheduledEnd:'2026-10-01T10:00',dueAt:'2026-10-01',milestones:[],remindAt:'2026-10-01T08:45'};const n=nextOccurrence(t,'2026-11-02T12:00','next')!;assert.equal(n.scheduledStart,'2026-11-03T09:00:00');assert.equal(n.remindAt,'2026-11-03T08:45:00');});
