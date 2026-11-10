import React,{useEffect,useMemo,useRef,useState} from 'react';
import {X,History,Check,RotateCcw} from 'lucide-react';
import type {JournalNote,NoteVersion} from '../types';
import {noteVersions,sameNoteContent,diffNoteLines} from '../utils/noteVersions';
import {cleanNoteHtml,textToHtml} from '../utils/noteRichText';
import {NoteChartFigure} from './RichNoteEditor';
const reasonLabel={baseline:'初始版本',save:'保存',recovery:'恢复点',restore:'恢复版本'};
const stamp=(value:string)=>new Date(value).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
function VersionPreview({version}:{version:NoteVersion}){return <div className="version-original"><h3>{version.content.title||'未命名笔记'}</h3><div className="note-rich-body" dangerouslySetInnerHTML={{__html:version.content.richText!==undefined?cleanNoteHtml(version.content.richText):textToHtml(version.content.text)}}/>{version.content.charts?.map(c=><NoteChartFigure key={c.id} chart={c}/>)}</div>;}
export function NoteVersionHistory({note,draft,busy,onClose,onRestore}:{note:JournalNote;draft:JournalNote;busy:boolean;onClose:()=>void;onRestore:(targetId:string)=>Promise<boolean>}){
 const versions=useMemo(()=>noteVersions(note),[note]),current=versions.at(-1)!;
 const [leftId,setLeftId]=useState(versions.at(-2)?.id||current.id),[rightId,setRightId]=useState(current.id);
 const [mode,setMode]=useState<'diff'|'original'>('diff'),[confirm,setConfirm]=useState(false),[error,setError]=useState('');
 const closeRef=useRef<HTMLButtonElement>(null),previousFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{previousFocus.current=document.activeElement as HTMLElement;closeRef.current?.focus();return()=>previousFocus.current?.focus();},[]);
 useEffect(()=>{setRightId(current.id);setConfirm(false);},[current.id]);
 const left=versions.find(v=>v.id===leftId)||versions[0],right=versions.find(v=>v.id===rightId)||current;
 const diff=useMemo(()=>diffNoteLines(left.content,right.content),[left,right]);
 const added=diff.filter(l=>l.kind==='add').length,removed=diff.filter(l=>l.kind==='remove').length;
 const formatChanged=JSON.stringify(left.content.richText)!==JSON.stringify(right.content.richText);
 const canRestore=!sameNoteContent(left.content,draft)||!sameNoteContent(left.content,note);
 return <div className="modal-backdrop version-backdrop" onClick={()=>{if(!busy)onClose();}}><section role="dialog" aria-modal="true" aria-label="笔记版本记录" className="note-version-dialog" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();if(!busy)onClose();}}}>
  <header className="version-header"><h2><History size={18}/>版本记录</h2><button ref={closeRef} className="icon-button" aria-label="关闭版本记录" disabled={busy} onClick={onClose}><X size={18}/></button></header>
  <div className="version-workspace"><aside className="version-list" aria-label="笔记保存版本">{[...versions].reverse().map(v=><button key={v.id} className={'version-item'+(left.id===v.id?' selected':'')} aria-pressed={left.id===v.id} onClick={()=>{setLeftId(v.id);setConfirm(false);setError('');}}><span><b>V{v.number}</b>{v.id===current.id&&<small><Check size={12}/>当前</small>}</span><time dateTime={v.savedAt}>{stamp(v.savedAt)}</time><span className="version-reason">{reasonLabel[v.reason]}{v.restoredFrom&&' · 来自 V'+versions.find(x=>x.id===v.restoredFrom)?.number}</span></button>)}</aside>
   <div className="version-details"><div className="version-compare-controls"><label>比较<select aria-label="比较源版本" value={left.id} onChange={e=>{setLeftId(e.target.value);setConfirm(false);}}>{versions.map(v=><option key={v.id} value={v.id}>V{v.number} · {stamp(v.savedAt)}</option>)}</select></label><span aria-hidden="true">→</span><label>对照<select aria-label="比较目标版本" value={right.id} onChange={e=>setRightId(e.target.value)}>{versions.map(v=><option key={v.id} value={v.id}>V{v.number}{v.id===current.id?' · 当前':''}</option>)}</select></label></div>
    <div className="version-diff-toolbar"><span>{added||removed?`新增 ${added} 行 · 移除 ${removed} 行`:formatChanged?'文字格式已变化':'内容相同'}{formatChanged&&(added||removed)?' · 格式有变化':''}</span><div className="version-view-switch"><button aria-pressed={mode==='diff'} onClick={()=>setMode('diff')}>差异</button><button aria-pressed={mode==='original'} onClick={()=>setMode('original')}>原文</button></div></div>
    {mode==='diff'?<div className="version-diff" aria-label="版本内容差异">{diff.map((line,i)=><div className={'version-diff-line '+line.kind} key={i}><span aria-hidden="true">{line.kind==='add'?'+':line.kind==='remove'?'−':' '}</span><span className="sr-only">{line.kind==='add'?'新增：':line.kind==='remove'?'移除：':''}</span><span>{line.text||' '}</span></div>)}{!added&&!removed&&formatChanged&&<p className="version-format-hint">文字内容相同，可切换“原文”比较字体、颜色及表格格式。</p>}</div>:<div className="version-originals"><section><h3>V{left.number}</h3><VersionPreview version={left}/></section><section><h3>V{right.number}</h3><VersionPreview version={right}/></section></div>}
    {error&&<p role="alert" className="version-error">{error}</p>}
    {confirm&&<div className="version-restore-confirm" role="alert"><p>恢复 V{left.number}？当前内容{!sameNoteContent(draft,note)?'及未保存草稿':''}会保留为恢复点，恢复后生成新版本。</p><div><button className="quiet-button" disabled={busy} onClick={()=>setConfirm(false)}>取消</button><button className="btn-primary px-4 py-2" disabled={busy} onClick={async()=>{setError('');try{if(await onRestore(left.id))setConfirm(false);else setError('恢复未完成，当前内容与草稿仍保留。');}catch(e){setError((e as Error).message);}}}>{busy?'恢复中…':'保留当前并恢复'}</button></div></div>}
   </div></div>
  <footer className="version-footer"><span>{versions.length} 个版本</span><button className="btn-secondary px-4 py-2 inline-flex items-center gap-2" disabled={busy||!canRestore||confirm} onClick={()=>setConfirm(true)}><RotateCcw size={14}/>恢复 V{left.number}</button></footer>
 </section></div>;
}
