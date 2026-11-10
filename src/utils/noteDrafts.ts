import type {JournalNote} from '../types';
export const NOTE_DRAFT_PREFIX='dn-note-draft-v1:';
export interface NoteDraft {draft:JournalNote;base:JournalNote;at:string;}
export function parseNoteDraft(raw:string):NoteDraft {const v=JSON.parse(raw);if(!v||typeof v.at!=='string'||!v.draft||!v.base||v.base.id!==v.draft.id||typeof v.draft.text!=='string'||typeof v.draft.title!=='string')throw new Error('草稿格式异常，原内容已保留');return v;}
export function recoverNoteDrafts(storage:Storage,noteId:string):NoteDraft[]{const drafts:NoteDraft[]=[];for(let i=0;i<storage.length;i++){const k=storage.key(i)!;if(k.startsWith(NOTE_DRAFT_PREFIX)){const raw=storage.getItem(k);if(raw){const v=parseNoteDraft(raw);if(v.draft.id===noteId&&JSON.stringify(v.draft)!==JSON.stringify(v.base))drafts.push(v);}}}return drafts.sort((a,b)=>b.at.localeCompare(a.at));}
export function clearCommittedDrafts(storage:Storage,sent:JournalNote){
 const content=(note:JournalNote)=>JSON.stringify({...note,updatedAt:''});
 const remove:string[]=[];for(let i=0;i<storage.length;i++){const k=storage.key(i)!;if(k.startsWith(NOTE_DRAFT_PREFIX)){const raw=storage.getItem(k);if(!raw)continue;const v=parseNoteDraft(raw);if(v.draft.id===sent.id&&content(v.draft)===content(sent))remove.push(k);}}
 for(const k of remove)storage.removeItem(k);
}
