import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveNoteVersion,restoreNoteVersion,noteVersions,noteContent,diffNoteLines} from './noteVersions';
import {StorageService,SEED_NOTES,validateData,DATA_KEY,parseBackup} from './storage';
import {applyAssistantActions,normalizeAssistantReply} from './assistantActions';
const now='2026-11-10T09:00:00+08:00';let seq=0;const uid=()=>`version-${++seq}`;
const note=()=>({...structuredClone(SEED_NOTES[0]),title:'初始标题',text:'初始正文'});
test('first save preserves the existing note as V1 without rewriting it on read',()=>{
 const before=note(),copy=structuredClone(before);assert.equal(noteVersions(before)[0].number,1);assert.deepEqual(before,copy);
 const next=saveNoteVersion(before,{...before,text:'新正文'},now,uid);
 assert.deepEqual(next.versions!.map(v=>[v.number,v.content.text]),[[1,'初始正文'],[2,'新正文']]);assert.deepEqual(before,copy);
 next.versions![0].content.text='改变副本';assert.equal(before.text,'初始正文');
});
test('unchanged content does not create duplicate versions and snapshots are flat independent records',()=>{
 const n=note(),v2=saveNoteVersion(n,{...n,text:'V2'},now,uid),again=saveNoteVersion(v2,{...v2,updatedAt:'other'},now,uid);
 assert.equal(again.versions!.length,2);assert.equal('versions' in again.versions![1].content,false);assert.deepEqual(v2.versions,again.versions);
});
test('rollback preserves saved content and unsaved rich text and charts, creates a new version, and can be undone',()=>{
 const first=note(),v2=saveNoteVersion(first,{...first,title:'V2',text:'V2正文'},now,uid);
 const draft={...v2,text:'未保存草稿',richText:'<h2>未保存草稿</h2>',charts:[{id:'c',title:'结果',type:'bar' as const,points:[{label:'A',value:2},{label:'B',value:3}]}]};
 const result=restoreNoteVersion(v2,draft,noteVersions(v2)[0].id,now,uid);
 assert.equal(result.text,first.text);assert.equal(result.richText,undefined);assert.equal(result.charts,undefined);
 assert.deepEqual(result.versions!.map(v=>v.reason),['baseline','save','recovery','restore']);assert.equal(result.versions![2].content.richText,draft.richText);assert.deepEqual(result.versions![2].content.charts,draft.charts);
 assert.equal(result.parentId,v2.parentId);assert.deepEqual(result.links,v2.links);assert.equal(result.domain,v2.domain);
 const undone=restoreNoteVersion(result,result,result.versions![2].id,now,uid);assert.deepEqual(noteContent(undone),noteContent(draft));assert.equal(undone.versions!.at(-1)!.number,5);
 assert.equal(v2.title,'V2');assert.equal(v2.versions!.length,2);
});
test('restoring old content retains current hierarchy, domain, links and date metadata',()=>{
 const n=note(),v2=saveNoteVersion(n,{...n,parentId:'other',domain:'life',date:'2026-11-10',links:['new-task'],text:'新正文'},now,uid);
 const restored=restoreNoteVersion(v2,v2,v2.versions![0].id,now,uid);
 for(const key of ['parentId','domain','date','links'] as const)assert.deepEqual(restored[key],v2[key]);
 assert.throws(()=>restoreNoteVersion(v2,v2,'missing',now,uid),/版本/);assert.throws(()=>restoreNoteVersion({...v2,deletedAt:now},v2,v2.versions![0].id,now,uid),/变化/);
});
test('versions survive JSON backup roundtrips and malformed or nested histories are rejected',()=>{
 const n=note(),saved=saveNoteVersion(n,{...n,text:'new'},now,uid),restored=parseBackup(JSON.stringify({schemaVersion:2,tasks:[],notes:[saved]}));assert.deepEqual(restored.notes[0],saved);
 for(const versions of [[{...saved.versions![0],number:0}],[saved.versions![0],saved.versions![0]],[{...saved.versions![0],content:{...saved.versions![0].content,versions:[]}}],[{...saved.versions![0],savedAt:'bad'}]])assert.throws(()=>validateData({tasks:[],notes:[{...saved,versions}]}),/版本/);
});
test('storage quota failure cannot apply a rollback without preserving recovery snapshots',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),map=new Map<string,string>();let full=false;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>map.get(k)||null,setItem:(k:string,v:string)=>{if(full)throw new Error('QuotaExceededError');map.set(k,v);}}});
 try{const n=note(),saved=saveNoteVersion(n,{...n,text:'最新正文'},now,uid);StorageService.write({tasks:[],notes:[saved]});const before=map.get(DATA_KEY);full=true;
  await assert.rejects(StorageService.transact(data=>({...data,notes:[restoreNoteVersion(data.notes[0],{...saved,text:'未保存内容'},saved.versions![0].id,now,uid)]})),/Quota/);
  assert.equal(map.get(DATA_KEY),before);assert.equal(StorageService.loadAllData().notes[0].text,'最新正文');
 }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete (globalThis as any).localStorage;}
});
test('AI note updates create recoverable history and stale plans still fail',()=>{
 const n=note(),base={tasks:[],notes:[n]},plan=normalizeAssistantReply({message:'更新',actions:[{entity:'note',operation:'update',targetId:n.id,data:{text:'AI更新的正文'}}]},base);
 const result=applyAssistantActions(base,plan.actions,base,now,uid);assert.equal(result.notes[0].versions!.length,2);assert.equal(result.notes[0].versions![0].content.text,n.text);
 assert.throws(()=>applyAssistantActions(result,plan.actions,base,now,uid),/变化/);assert.equal(base.notes[0].text,n.text);
});
test('line comparison preserves order, repeated lines, chart differences and literal unsafe text',()=>{
 const a={title:'标题',text:'相同\n重复\n重复\n移除'},b={title:'标题',text:'相同\n重复\n新增<script>不执行</script>'};
 const lines=diffNoteLines(a,b);assert.deepEqual(lines.filter(l=>l.kind!=='add').map(l=>l.text),[a.title,...a.text.split('\n')]);assert.deepEqual(lines.filter(l=>l.kind!=='remove').map(l=>l.text),[b.title,...b.text.split('\n')]);
 assert.ok(lines.some(l=>l.kind==='add'&&l.text.includes('<script>')));
 const chart={id:'c',title:'进度',type:'bar' as const,points:[{label:'一',value:2},{label:'二',value:3}]};assert.ok(diffNoteLines(a,{...a,charts:[chart]}).some(l=>l.kind==='add'&&l.text.includes('进度')));
});
