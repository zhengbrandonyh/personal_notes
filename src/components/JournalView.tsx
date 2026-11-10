import {NoteVersionHistory} from './NoteVersionHistory';
import {History} from 'lucide-react';
import {NOTE_DRAFT_PREFIX,recoverNoteDrafts,clearCommittedDrafts,NoteDraft} from '../utils/noteDrafts';
import {RichNoteEditor} from './RichNoteEditor';
import {cleanNoteHtml,noteMarkdown} from '../utils/noteRichText';
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, FileText, Download, Trash2, FolderInput, Sparkles } from 'lucide-react';
import { StorageService } from '../utils/storage';
import { JournalNote, TaskItem, DomainType, NoteType } from '../types';
import { extractTasksFromNoteWithAI } from '../utils/ai';
import { isNoteDescendant, noteAncestors, visibleNoteTree } from '../utils/noteTree';

interface Props {
  notes: JournalNote[]; tasks: TaskItem[]; currentDomain: DomainType; activeId: string;
  onActiveId: (id: string) => void; onDirty: (value: boolean) => void;
  onAddNote: (type?: JournalNote['type'], parentId?: string | null) => void;
  onSave: (note: JournalNote, base: JournalNote) => Promise<boolean>;
  onRestoreVersion:(note:JournalNote,base:JournalNote,targetId:string)=>Promise<boolean>;
  onDeleteNote: (id: string) => Promise<boolean>;
  onExtractTasks: (candidates: Partial<TaskItem>[], note: JournalNote) => Promise<boolean>;
  onSelectTask: (task: TaskItem) => void;
}

export function JournalView({ notes, tasks, currentDomain, activeId, onActiveId, onDirty, onAddNote, onSave, onRestoreVersion, onDeleteNote, onExtractTasks, onSelectTask }: Props) {
  const tabKey=useRef(crypto.randomUUID?.()||String(Date.now())+Math.random());
  const [recovery,setRecovery]=useState<NoteDraft|null>(null);
  const [autoPaused,setAutoPaused]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false),[draftPersisted,setDraftPersisted]=useState(true);
  const latestDraft=useRef<JournalNote|null>(null);
  const savingRef=useRef(false);
  const [type, setType] = useState<NoteType>('全部');
  const [draft, setDraft] = useState<JournalNote | null>(null);
  const [base, setBase] = useState<JournalNote | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [candidates, setCandidates] = useState<Partial<TaskItem>[] | null>(null);
  const [moving, setMoving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('dn-note-expanded') || '[]')); } catch { return new Set(); }
  });
  const titleRef = useRef<HTMLInputElement>(null), menuRef = useRef<HTMLDetailsElement>(null);
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(base);
  const filtered = notes.filter(n => !n.deletedAt && (currentDomain === 'all' || n.domain === currentDomain) && (type === '全部' || n.type === type));
  const active = notes.find(n => n.id === activeId && !n.deletedAt);
  const rows = visibleNoteTree(notes, filtered, expanded);
  const loadDraft = (note: JournalNote | undefined) => {
    setDraft(note ? structuredClone(note) : null); setBase(note ? structuredClone(note) : null);
    setCandidates(null); setError(''); setMoving(false);setAutoPaused(false);setDraftPersisted(true);
    try{const saved=note?recoverNoteDrafts(localStorage,note.id).find(v=>JSON.stringify(v.draft)!==JSON.stringify(note)):undefined;setRecovery(saved||null);}catch(e){setError((e as Error).message);}
  };
  useEffect(() => {
    onDirty(dirty);
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (active) {
      loadDraft(active);
      if (type !== '全部' && active.type !== type) setType('全部');
      setExpanded(previous => new Set([...previous, ...noteAncestors(notes, active.id)]));
      if (!active.title) setTimeout(() => titleRef.current?.focus(), 0);
    } else if (filtered[0]) onActiveId(filtered[0].id); else loadDraft(undefined);
    setHistoryOpen(false);
  }, [activeId, currentDomain]);
  useEffect(() => {
    if (active && !dirty) loadDraft(active);
    if (!active && draft && !dirty) { loadDraft(undefined); if (filtered[0]) onActiveId(filtered[0].id); }
  }, [notes]);
  useEffect(() => { try { localStorage.setItem('dn-note-expanded', JSON.stringify([...expanded])); } catch {} }, [expanded]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) menuRef.current?.removeAttribute('open'); };
    document.addEventListener('click', close); return () => document.removeEventListener('click', close);
  }, []);
  const leave = () => !dirty || window.confirm(draftPersisted?'草稿已保留，确定切换笔记吗？':'草稿未能保存，请先导出。仍要离开吗？');
  const choose = (id: string) => { if (leave()) { onDirty(false); loadDraft(notes.find(n => n.id === id)); onActiveId(id); } };
  latestDraft.current=draft;
  const keepDraft=(value:JournalNote,source:JournalNote)=>{
    try{localStorage.setItem(NOTE_DRAFT_PREFIX+value.id+':'+tabKey.current,JSON.stringify({draft:value,base:source,at:new Date().toISOString()}));setDraftPersisted(true);return true;}
    catch{setDraftPersisted(false);setError('本地草稿无法保存，请立即导出，勿关闭页面');return false;}
  };
  const patch = (value: Partial<JournalNote>) => {if(!draft||!base)return;const next={...draft,...value};keepDraft(next,base);latestDraft.current=next;setDraft(next);};
  const add = (parent?: JournalNote) => {
    if (!leave()) return;
    onDirty(false);
    if (parent) setExpanded(previous => new Set([...previous, parent.id]));
    onAddNote(parent?.type || (type === '全部' ? '随手记' : type), parent?.id || null);
  };
  const save = async () => {
    if (!draft || !base || savingRef.current) return;
    const sent={...draft,...(draft.richText!==undefined?{richText:cleanNoteHtml(draft.richText)}:{})};
    if(!keepDraft(sent,base))return;
    savingRef.current=true;setBusy(true);
    try {
      if (await onSave(sent, base)) {
        const saved=StorageService.loadAllData().notes.find(n=>n.id===sent.id)||sent;
        clearCommittedDrafts(localStorage,sent);
        if(latestDraft.current?.id!==sent.id)return;
        setBase(saved);setAutoPaused(false);setError('');
        if(latestDraft.current?.id===sent.id&&JSON.stringify(latestDraft.current)===JSON.stringify(draft)){
          setDraft(saved);latestDraft.current=saved;onDirty(false);
          localStorage.removeItem(NOTE_DRAFT_PREFIX+sent.id+':'+tabKey.current);
        }else if(latestDraft.current?.id===sent.id)keepDraft(latestDraft.current,saved);
      } else {setAutoPaused(true);setError('保存未完成：最新版本可能已变化。草稿已保留，可导出后重新打开核对。');}
    } catch(e){setAutoPaused(true);setError((e as Error).message||'保存失败，草稿已保留');}
    finally {savingRef.current=false;setBusy(false);}
  };
  const restoreVersion=async(targetId:string)=>{
    if(!draft||!base||savingRef.current)return false;
    const sent={...draft,...(draft.richText!==undefined?{richText:cleanNoteHtml(draft.richText)}:{})};
    if(!keepDraft(sent,base))return false;
    savingRef.current=true;setBusy(true);
    try{
      if(!await onRestoreVersion(sent,base,targetId)){setAutoPaused(true);setError('版本已变化或存储空间不足，恢复未完成，草稿已保留');return false;}
      const saved=StorageService.loadAllData().notes.find(n=>n.id===sent.id);
      if(!saved)throw new Error('未能读取恢复结果，草稿已保留');
      localStorage.removeItem(NOTE_DRAFT_PREFIX+sent.id+':'+tabKey.current);
      setBase(saved);setDraft(saved);latestDraft.current=saved;setAutoPaused(false);setError('');setRecovery(null);setDraftPersisted(true);onDirty(false);return true;
    }catch(e){setError((e as Error).message);return false;}finally{savingRef.current=false;setBusy(false);}
  };
  const exportMd = () => {
    if (!draft) return;
    const url = URL.createObjectURL(new Blob([noteMarkdown(draft)], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = (draft.title || '笔记').replace(/[\\/:*?"<>|]/g, '_') + '.md'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); menuRef.current?.removeAttribute('open');
  };
  const remove = async () => {
    if (!draft || !leave() || !window.confirm('删除这篇笔记？子笔记会保留，笔记可从回收站恢复。')) return;
    if (await onDeleteNote(draft.id)) { onDirty(false); loadDraft(undefined); onActiveId(''); }
  };
  const ancestors = draft ? noteAncestors([...notes.filter(n => n.id !== draft.id), draft], draft.id).reverse() : [];
  return (
    <section className="notes-page" onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(dirty&&!busy&&!(e.target as HTMLElement).closest('.chart-composer'))void save();}}}>
      <div className="note-filters">{(['全部', '随手记', '会议记录', '复盘'] as NoteType[]).map(value => (
        <button key={value} aria-pressed={type === value} className={type === value ? 'active' : ''} onClick={() => {
          if (!leave()) return;
          setType(value); onDirty(false);
          const matches = notes.filter(n => !n.deletedAt && (currentDomain === 'all' || n.domain === currentDomain) && (value === '全部' || n.type === value));
          setExpanded(previous => new Set([...previous, ...matches.flatMap(n => noteAncestors(notes, n.id))]));
          const next = notes.find(n => !n.deletedAt && (currentDomain === 'all' || n.domain === currentDomain) && (value === '全部' || n.type === value));
          loadDraft(next); onActiveId(next?.id || '');
        }}>{value}</button>
      ))}</div>
      <div className="notes-workspace">
        <aside className="semi-card note-tree-panel" aria-label="笔记目录">
          <div className="note-tree-header"><span>目录</span><button className="icon-button" aria-label="新建顶层笔记" title="新建笔记" onClick={() => add()}><Plus size={17}/></button></div>
          <div className="note-tree" role="tree" aria-label="笔记层级">
            {rows.map(({ note, depth, hasChildren, contextOnly }) => (
              <div key={note.id} className={'note-tree-row' + (activeId === note.id ? ' active' : '') + (contextOnly ? ' context-only' : '')} style={{ paddingLeft: 8 + depth * 16 }}>
                {hasChildren ? <button className="note-expand" aria-label={(expanded.has(note.id) ? '收起 ' : '展开 ') + (note.title || '未命名笔记')} aria-expanded={expanded.has(note.id)} onClick={() => setExpanded(previous => {
                  const next = new Set(previous); next.has(note.id) ? next.delete(note.id) : next.add(note.id); return next;
                })}>{expanded.has(note.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button> : <FileText size={14} className="note-file-icon"/>}
                <button role="treeitem" aria-level={depth + 1} aria-selected={activeId === note.id} className="note-tree-title" onClick={() => choose(note.id)} title={note.title || '未命名笔记'}>{note.title || '未命名笔记'}</button>
                <button className="note-child-add" aria-label={'在 ' + (note.title || '未命名笔记') + ' 下新建笔记'} title="新建子笔记" onClick={() => add(note)}><Plus size={14}/></button>
              </div>
            ))}
            {!rows.length && <p className="text-sm text-[var(--muted)] p-5">暂无笔记</p>}
          </div>
        </aside>
        <div className="semi-card note-editor">
          {draft ? <>
            <div className="note-toolbar">
              <select aria-label="笔记领域" value={draft.domain} onChange={e => patch({ domain: e.target.value as JournalNote['domain'], parentId: null })}><option value="work">工作</option><option value="life">生活</option></select>
              <select aria-label="笔记类型" value={draft.type} onChange={e => patch({ type: e.target.value as JournalNote['type'] })}>{['随手记', '会议记录', '复盘'].map(t => <option key={t}>{t}</option>)}</select>
              <span role="status" className="note-save-state">{busy?'保存中…':!draftPersisted?'草稿待导出':autoPaused?'冲突待核对':dirty?'草稿已保存':draft.versions?.length?'已保存 V'+draft.versions.at(-1)!.number:'已保存'}</span>
              <button className="note-history-button quiet-button" disabled={busy} aria-label="查看笔记版本" onClick={()=>setHistoryOpen(true)}><History size={15}/>版本记录{active?.versions?.length?` · ${active.versions.length}`:''}</button><button className="btn-primary px-4 py-2" disabled={busy || !dirty} onClick={save} title="保存版本（⌘S / Ctrl+S）">保存版本</button>
              <details className="note-more" ref={menuRef}>
                <summary className="icon-button" aria-label="笔记更多操作"><MoreHorizontal size={20}/></summary>
                <div className="note-menu">
                  <button aria-label="新建子笔记" onClick={() => { menuRef.current?.removeAttribute('open'); add(draft); }}><Plus size={15}/>新建子笔记</button>
                  <button aria-label="移动笔记" onClick={() => { setMoving(v => !v); menuRef.current?.removeAttribute('open'); }}><FolderInput size={15}/>移动笔记</button>
                  <button aria-label="导出 Markdown" onClick={exportMd}><Download size={15}/>导出 Markdown</button>
                  <button aria-label="删除笔记" className="note-delete" onClick={remove}><Trash2 size={15}/>删除笔记</button>
                </div>
              </details>
            </div>
            {moving && <label className="note-location">移动到<select aria-label="笔记父级" value={draft.parentId || ''} onChange={e => { patch({ parentId: e.target.value || null }); setMoving(false); }}><option value="">顶层目录</option>{notes.filter(n => !n.deletedAt && n.id !== draft.id && !isNoteDescendant(notes, n.id, draft.id)).map(n => <option key={n.id} value={n.id}>{n.title || '未命名笔记'}</option>)}</select></label>}
            {!!ancestors.length && <nav className="note-breadcrumb" aria-label="笔记路径">{ancestors.map(id => <React.Fragment key={id}><button onClick={() => choose(id)}>{notes.find(n => n.id === id)?.title || '未命名笔记'}</button><ChevronRight size={12}/></React.Fragment>)}</nav>}
            {recovery&&<div className="note-recovery" role="status"><span>发现 {new Date(recovery.at).toLocaleString('zh-CN')} 的草稿</span><button className="quiet-button" onClick={()=>{setDraft(recovery.draft);setBase(recovery.base);latestDraft.current=recovery.draft;setAutoPaused(JSON.stringify(recovery.base)!==JSON.stringify(active));keepDraft(recovery.draft,recovery.base);if(JSON.stringify(recovery.base)!==JSON.stringify(active))setError('草稿与最新版本存在差异，已暂停自动保存，请核对后导出。');setRecovery(null);}}>恢复草稿</button><button className="quiet-button" onClick={()=>setRecovery(null)}>稍后</button></div>}
            {error && <p role="alert" className="text-red-500 text-sm py-2">{error}</p>}
            <input ref={titleRef} aria-label="笔记标题" placeholder="笔记标题" value={draft.title} onChange={e => patch({ title: e.target.value })} className="note-title-input"/>
            <RichNoteEditor key={draft.id} note={draft} onChange={patch}/>
            <div className="note-editor-footer"><button className="quiet-button inline-flex items-center gap-2" disabled={dirty || busy || !draft.text.trim()} onClick={async () => {
              setBusy(true);
              try { const result = await extractTasksFromNoteWithAI(draft); setCandidates(result.filter(c => !tasks.some(t => !t.deletedAt && t.sourceNoteId === draft.id && t.title.trim() === c.title?.trim()))); }
              catch { setError('提取失败，请重试'); } finally { setBusy(false); }
            }}><Sparkles size={15}/>提取待办</button>{dirty && <span className="text-xs text-[var(--muted)]">保存后可提取</span>}</div>
            {candidates && <div className="note-extraction"><h3 className="font-semibold text-sm mb-3">待办预览</h3>{candidates.map((candidate, index) => <div className="flex gap-2 mb-2" key={index}><input aria-label={'待办标题 ' + (index + 1)} value={candidate.title || ''} onChange={e => setCandidates(list => list!.map((item, i) => i === index ? { ...item, title: e.target.value } : item))}/><button className="quiet-button" onClick={() => setCandidates(list => list!.filter((_, i) => i !== index))}>移除</button></div>)}{!candidates.length && <p className="text-sm py-4">没有新待办</p>}<div className="flex gap-3"><button className="btn-primary px-4 py-2" disabled={busy || !candidates.length || candidates.some(c => !c.title?.trim())} onClick={async () => { setBusy(true); try { if (await onExtractTasks(candidates, draft)) setCandidates(null); } finally { setBusy(false); } }}>创建 {candidates.length} 项</button><button className="quiet-button" onClick={() => setCandidates(null)}>取消</button></div></div>}
            {draft.links.length > 0 && <div className="note-related">{draft.links.map(id => { const task = tasks.find(t => t.id === id && !t.deletedAt); return task ? <button key={id} onClick={() => { if (leave()) onSelectTask(task); }}>↗ {task.title}</button> : null; })}</div>}
          </> : <div className="note-editor-empty"><FileText size={28}/><span>选择或新建笔记</span><button className="btn-primary px-4 py-2" onClick={() => add()}>新建笔记</button></div>}
        </div>
      </div>
      {historyOpen&&draft&&base&&<NoteVersionHistory key={draft.id} note={active||base} draft={draft} busy={busy} onClose={()=>setHistoryOpen(false)} onRestore={restoreVersion}/>}
    </section>
  );
}
