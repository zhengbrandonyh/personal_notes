import {test} from 'node:test';
import assert from 'node:assert/strict';
import {milestoneError,milestonesInRange} from './milestones';
import {SEED_TASKS,validateData,SEED_NOTES} from './storage';
const task={...SEED_TASKS[0],scheduledStart:'2026-10-10T09:00:00',scheduledEnd:'2026-12-01T18:00:00',milestones:[{id:'qa',title:'提测',date:'2026-11-11'}]};
test('milestones survive backup validation and appear only in their calendar week',()=>{
 const data=validateData(JSON.parse(JSON.stringify({tasks:[task],notes:SEED_NOTES})));
 assert.deepEqual(data.tasks[0].milestones,task.milestones);
 assert.equal(milestoneError(task),'');
 assert.equal(milestonesInRange(task,'2026-11-09','2026-11-15')[0].title,'提测');
 assert.equal(milestonesInRange(task,'2026-11-16','2026-11-22').length,0);
});
test('invalid dates and shrinking or removing the task range cannot silently discard milestones',()=>{
 assert.match(milestoneError({...task,scheduledEnd:'2026-11-01T18:00:00'}),/区间内/);
 assert.match(milestoneError({...task,scheduledStart:null}),/完整/);
 assert.match(milestoneError({...task,milestones:[{id:'x',title:'提测',date:'2026-02-30'}]}),/有效/);
 assert.match(milestoneError({...task,milestones:[{id:'x',title:' ',date:'2026-11-11'}]}),/名称/);
 assert.equal(milestoneError({...task,milestones:undefined}),'');
});
