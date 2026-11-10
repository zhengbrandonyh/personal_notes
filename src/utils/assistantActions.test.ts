import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAssistantReply,applyAssistantActions} from './assistantActions';
import {SEED_TASKS,SEED_NOTES} from './storage';
const baseline=()=>structuredClone({tasks:SEED_TASKS,notes:SEED_NOTES});
const reply=(actions:any[],data=baseline())=>normalizeAssistantReply({message:'操作预览',actions},data);
test('AI plans reject arbitrary fields and targets outside the supplied scope',()=>{
 assert.throws(()=>reply([{entity:'task',operation:'update',targetId:'unknown',data:{title:'bad'}}]),/当前范围/);
 assert.throws(()=>reply([{entity:'task',operation:'update',targetId:'t1',data:{id:'overwrite'}}]),/不支持的字段/);
});
test('selected operations apply atomically, preserving unselected records and completing timestamps',()=>{
 const data=baseline();const plan=reply([{entity:'task',operation:'update',targetId:'t1',data:{status:'done'}},{entity:'note',operation:'create',data:{title:'子笔记',parentId:'n1',text:'内容'}}],data);
 plan.actions[1].selected=false;
 const next=applyAssistantActions(data,plan.actions,data,'2026-11-01T10:00:00Z',()=> 'new-id');
 assert.equal(next.tasks.find(t=>t.id==='t1')!.completedAt,'2026-11-01T10:00:00Z');
 assert.deepEqual(next.notes,data.notes);assert.equal(data.tasks[0].status,'todo');
});
test('stale plans and cyclic note moves never mutate persisted input',()=>{
 const original=baseline(); const changed=baseline(); changed.tasks[0].title='其他页面已修改';
 const plan=reply([{entity:'task',operation:'update',targetId:'t1',data:{title:'旧草稿'}}],original);
 assert.throws(()=>applyAssistantActions(changed,plan.actions,original,new Date().toISOString(),()=> 'new'),/记录已发生变化/);
 const cycle=reply([{entity:'note',operation:'update',targetId:'n1',data:{parentId:'n2'}},{entity:'note',operation:'update',targetId:'n2',data:{parentId:'n1'}}],original);
 assert.throws(()=>applyAssistantActions(original,cycle.actions,original,new Date().toISOString(),()=> 'new'),/循环/);
 assert.equal(original.notes[0].parentId,undefined);
});
test('AI task deletion keeps subtasks and rejects reversed schedule ranges',()=>{
 const data=baseline();const plan=reply([{entity:'task',operation:'delete',targetId:'t1'}],data);let count=0;
 const next=applyAssistantActions(data,plan.actions,data,new Date().toISOString(),()=> 'child-'+count++);
 assert.equal(next.tasks.filter(t=>t.id.startsWith('child-')).length,2);
 const invalid=reply([{entity:'task',operation:'update',targetId:'t1',data:{scheduledStart:'2026-11-02T12:00',scheduledEnd:'2026-11-02T11:00'}}],data);
 assert.throws(()=>applyAssistantActions(data,invalid.actions,data,new Date().toISOString(),()=> 'new'),/结束时间/);
});
test('rescheduling preserves the independent deadline',()=>{
 const data=baseline();const plan=reply([{entity:'task',operation:'update',targetId:'t1',data:{scheduledStart:'2026-11-03T09:00',scheduledEnd:'2026-11-03T10:00'}}],data);
 const next=applyAssistantActions(data,plan.actions,data,new Date().toISOString(),()=> 'new');
 assert.equal(next.tasks.find(t=>t.id==='t1')!.dueAt,data.tasks.find(t=>t.id==='t1')!.dueAt);
});
