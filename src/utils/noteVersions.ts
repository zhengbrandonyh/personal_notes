import type {JournalNote,NoteContent,NoteVersion} from '../types';
import {validateNoteExtras} from './noteRichText';
export function noteContent(note:NoteContent):NoteContent {
 return structuredClone({title:note.title,text:note.text,...(note.richText!==undefined?{richText:note.richText}:{}),...(note.charts!==undefined?{charts:note.charts}:{})});
}
export const sameNoteContent=(a:NoteContent,b:NoteContent)=>JSON.stringify(noteContent(a))===JSON.stringify(noteContent(b));
/** Legacy notes get a read-only baseline until their next explicit save. */
export function noteVersions(note:JournalNote):NoteVersion[]{
 return note.versions?.length?structuredClone(note.versions):[{id:'baseline:'+note.id,number:1,savedAt:note.updatedAt,reason:'baseline',content:noteContent(note)}];
}
function append(history:NoteVersion[],content:NoteContent,now:string,uid:()=>string,reason:NoteVersion['reason'],restoredFrom?:string){
 history.push({id:uid(),number:(history.at(-1)?.number||0)+1,savedAt:now,reason,...(restoredFrom?{restoredFrom}:{}),content:noteContent(content)});
}
function preserveCurrent(history:NoteVersion[],note:NoteContent,now:string,uid:()=>string){
 if(!history.length||!sameNoteContent(history.at(-1)!.content,note))append(history,note,now,uid,'recovery');
}
export function saveNoteVersion(latest:JournalNote|undefined,next:JournalNote,now:string,uid:()=>string):JournalNote {
 const history=latest?noteVersions(latest):[];
 if(latest)preserveCurrent(history,latest,now,uid);
 if(!history.length||!sameNoteContent(history.at(-1)!.content,next))append(history,next,now,uid,'save');
 return {...structuredClone(next),versions:history,updatedAt:now};
}
/** Recovery snapshots and the restored content are persisted in one atomic record write. */
export function restoreNoteVersion(latest:JournalNote,draft:JournalNote,targetId:string,now:string,uid:()=>string):JournalNote {
 if(latest.id!==draft.id||latest.deletedAt)throw new Error('笔记已变化，请重新打开后恢复');
 const history=noteVersions(latest),target=history.find(v=>v.id===targetId);
 if(!target)throw new Error('该版本已变化，请重新打开版本记录');
 preserveCurrent(history,latest,now,uid);
 preserveCurrent(history,draft,now,uid);
 append(history,target.content,now,uid,'restore',target.id);
 const restored={...structuredClone(latest),...noteContent(target.content),versions:history,updatedAt:now};
 // Optional content must also be removed when restoring an older plain-text version.
 if(target.content.richText===undefined)delete restored.richText;
 if(target.content.charts===undefined)delete restored.charts;
 return restored;
}
export function validateNoteVersions(note:JournalNote){
 if(note.versions===undefined)return;
 if(!Array.isArray(note.versions))throw new Error('笔记版本格式不正确');
 const ids=new Set<string>();let previous=0;
 for(const v of note.versions){
  if(!v||typeof v.id!=='string'||!v.id||ids.has(v.id)||!Number.isSafeInteger(v.number)||v.number<=previous||typeof v.savedAt!=='string'||isNaN(Date.parse(v.savedAt))||!['baseline','save','recovery','restore'].includes(v.reason)||!v.content||typeof v.content.title!=='string'||typeof v.content.text!=='string'||Object.keys(v.content).some(k=>!['title','text','richText','charts'].includes(k))||(v.restoredFrom!==undefined&&typeof v.restoredFrom!=='string'))throw new Error('笔记版本格式不正确');
  validateNoteExtras({...note,...v.content,richText:v.content.richText,charts:v.content.charts});
  ids.add(v.id);previous=v.number;
 }
}
export type NoteDiffLine={kind:'same'|'add'|'remove';text:string};
export function noteDiffText(content:NoteContent){return [content.title,content.text,...(content.charts||[]).flatMap(c=>['图表：'+c.title+'（'+(c.type==='bar'?'柱状图':'折线图')+'）',...c.points.map(p=>p.label+'：'+p.value)])].join('\n');}
export function diffNoteLines(before:NoteContent,after:NoteContent):NoteDiffLine[]{
 const a=noteDiffText(before).split('\n'),b=noteDiffText(after).split('\n');
 if(a.length*b.length>500000)return [...a.map(text=>({kind:'remove' as const,text})),...b.map(text=>({kind:'add' as const,text}))];
 const grid=Array.from({length:a.length+1},()=>new Uint32Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)grid[i][j]=a[i]===b[j]?grid[i+1][j+1]+1:Math.max(grid[i+1][j],grid[i][j+1]);
 const lines:NoteDiffLine[]=[];let i=0,j=0;
 while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){lines.push({kind:'same',text:a[i++]});j++;}else if(i<a.length&&(j===b.length||grid[i+1][j]>=grid[i][j+1]))lines.push({kind:'remove',text:a[i++]});else lines.push({kind:'add',text:b[j++]});}
 return lines;
}
