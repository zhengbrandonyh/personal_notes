import type {TaskItem} from '../types';
/** Capture pending inline entries in saves and exports without mutating the open draft. */
export function collectTaskDraft(draft:TaskItem,sub:string,tag:string):TaskItem {
 return {...draft,title:draft.title.trim(),tags:tag.trim()?[...new Set([...draft.tags,tag.trim()])]:[...draft.tags],subtasks:sub.trim()?[...draft.subtasks,{id:'sub_'+Date.now()+'_'+Math.random().toString(36).slice(2),title:sub.trim(),done:false}]:[...draft.subtasks]};
}
