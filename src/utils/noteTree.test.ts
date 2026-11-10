import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JournalNote } from '../types';
import { noteAncestors, visibleNoteTree, validateNoteParents } from './noteTree';
const note=(id:string,parentId:string|null=null,deletedAt:string|null=null)=>({id,parentId,deletedAt,title:id}) as JournalNote;
test('nested notes expand with their ancestry and a filtered child retains parent context',()=>{
 const notes=[note('root'),note('child','root'),note('grandchild','child')];
 assert.deepEqual(noteAncestors(notes,'grandchild'),['child','root']);
 assert.deepEqual(visibleNoteTree(notes,notes,new Set()).map(row=>row.note.id),['root']);
 assert.deepEqual(visibleNoteTree(notes,[notes[2]],new Set(),true).map(row=>[row.note.id,row.depth,row.contextOnly]),[['root',0,true],['child',1,true],['grandchild',2,false]]);
});
test('deleting a parent retains its child as a visible root, restoring preserves hierarchy',()=>{
 const notes=[note('root',null,'2026-11-01'),note('child','root')];
 assert.deepEqual(visibleNoteTree(notes,[notes[1]],new Set()).map(row=>[row.note.id,row.depth]),[['child',0]]);
 notes[0].deletedAt=null;
 assert.deepEqual(visibleNoteTree(notes,notes,new Set(['root'])).map(row=>[row.note.id,row.depth]),[['root',0],['child',1]]);
});
test('legacy notes remain valid and parent cycles are rejected',()=>{
 assert.doesNotThrow(()=>validateNoteParents([{id:'legacy'} as JournalNote]));
 assert.throws(()=>validateNoteParents([note('a','b'),note('b','a')]),/循环/);
});
