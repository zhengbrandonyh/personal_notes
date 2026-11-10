import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectTaskDraft} from './taskDraft';
import {SEED_TASKS} from './storage';
test('saving or exporting captures pending inline entries without mutating the draft',()=>{
 const draft=structuredClone(SEED_TASKS[0]),before=JSON.stringify(draft);
 const result=collectTaskDraft(draft,'  需求评审  ','  新标签 ');
 assert.equal(result.subtasks.at(-1)?.title,'需求评审');assert.equal(result.subtasks.at(-1)?.done,false);assert.ok(result.tags.includes('新标签'));assert.equal(JSON.stringify(draft),before);
});
test('empty pending entries and duplicate tags do not create extra records',()=>{
 const draft={...SEED_TASKS[0],tags:['评审']};const result=collectTaskDraft(draft,'  ',' 评审 ');
 assert.deepEqual(result.tags,['评审']);assert.deepEqual(result.subtasks,draft.subtasks);
});
