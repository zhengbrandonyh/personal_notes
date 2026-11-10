import {TASK_STAGES} from '../utils/taskStage';
import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, ArrowUp, Square, RefreshCw, Check, MessageSquare, ChevronDown, History, Search, ChevronLeft } from 'lucide-react';
import { TaskItem, JournalNote, DomainType, ViewMode } from '../types';
import type { DataStore } from '../utils/storage';
import { AssistantAction, normalizeAssistantReply } from '../utils/assistantActions';
import { localDate } from '../utils/date';

import {ChatMessage as Message,ChatHistory,CHAT_HISTORY_KEY,newChatSession,readChatHistory,updateChatMessages} from '../utils/chatHistory';
interface Props {
  isOpen: boolean; onClose: () => void; tasks: TaskItem[]; notes: JournalNote[]; currentDomain: DomainType;
  selectedTask: TaskItem | null; selectedNote: JournalNote | null;
  onExecuteActions: (actions: AssistantAction[], snapshot: DataStore) => Promise<boolean>;
  onNavigate: (view: ViewMode) => void;
}
const id = () => crypto.randomUUID?.() || String(Date.now()) + Math.random();
const fieldLabels: Record<string, string> = {title:'标题',note:'备注',text:'正文',domain:'分类',stage:'工作阶段',status:'完成状态',importance:'重要程度',urgency:'紧急程度',dueAt:'到期',scheduledStart:'开始',scheduledEnd:'结束',tags:'标签',parentId:'父级',type:'类型',milestones:'关键节点',estimatedMinutes:'预计用时（分钟）',scheduleConstraints:'排期约束',plannedFor:'今日行动日期',subtasks:'子事项与节点',planPeriod:'计划周期',sessions:'日程',dailySchedules:'周期内每天'};
const operationLabels = {create:'新建',update:'修改',delete:'删除'};
function display(value: unknown, field: string, notes: JournalNote[]) {
  if (value === null || value === undefined || value === '') return '未设置';
  if (field === 'parentId') return notes.find(n => n.id === value)?.title || '未命名笔记';
  if (field === 'domain') return value === 'work' ? '工作' : '生活';
  if(field==='stage')return TASK_STAGES.find(s=>s.value===value)?.label||String(value);
  if (field === 'status') return value === 'done' ? '已完成' : value === 'in_progress' ? '进行中' : '未完成';
  if (field === 'importance') return value ? '重要' : '不重要';
  if (field === 'urgency') return value ? '紧急' : '不紧急';
  if(field==='milestones')return (value as TaskItem['milestones'])?.map(m=>m.date+' '+m.title).join('；')||'未设置';
  if(field==='scheduleConstraints'){const c=value as NonNullable<TaskItem['scheduleConstraints']>;return c.earliest+'–'+c.latest+(c.weekdaysOnly?' · 仅工作日':'');}
  if(field==='subtasks')return (value as import('../types').SubTask[]).map(s=>(s.done?'✓ ':'')+s.title+(s.at?' · '+s.at.replace('T',' '):'')).join('；')||'未设置';
  if(field==='planPeriod'){const p=value as {start:string;end:string};return p.start+' — '+p.end;}
  if(field==='sessions')return (value as import('../types').TimeSession[]).map(s=>s.start.replace('T',' ')+' — '+s.end.replace('T',' ')).join('；')||'未设置';
  if(field==='dailySchedules')return (value as import('../types').DailySchedule[]).map(g=>'每天 '+g.startTime+' — '+g.endTime).join('；')||'未设置';
  if (Array.isArray(value)) return value.join('、');
  return String(value);
}

export function AiDrawer({isOpen,onClose,tasks,notes,currentDomain,selectedTask,selectedNote,onExecuteActions,onNavigate}: Props) {
  const [operationScope,setOperationScope]=useState<'domain'|'chat'>('domain');
  const [initialHistory]=useState(()=>{
    try{return {history:readChatHistory(localStorage.getItem(CHAT_HISTORY_KEY)),error:''};}
    catch{const session=newChatSession();return {history:{sessions:[session],activeId:session.id},error:'历史对话暂时无法读取，原记录已保留。'};}
  });
  const [historyError,setHistoryError]=useState(initialHistory.error);
  const historyWritable=!initialHistory.error;
  const [chatHistory,setChatHistory]=useState<ChatHistory>(initialHistory.history);
  const [historyOpen,setHistoryOpen]=useState(false),[historyQuery,setHistoryQuery]=useState('');
  const activeChat=chatHistory.sessions.find(session=>session.id===chatHistory.activeId)!;
  const messages=activeChat.messages,input=activeChat.draft;
  const setMessages=(change:React.SetStateAction<Message[]>)=>setChatHistory(previous=>updateChatMessages(previous,change));
  const setInput=(value:string)=>setChatHistory(previous=>({...previous,sessions:previous.sessions.map(session=>session.id===previous.activeId?{...session,draft:value}:session)}));
  useEffect(()=>{
    if(!historyWritable)return;
    try{localStorage.setItem(CHAT_HISTORY_KEY,JSON.stringify({version:1,...chatHistory}));setHistoryError('');}
    catch{setHistoryError('历史对话未能保存，请检查浏览器存储空间。');}
  },[chatHistory,historyWritable]);
  const startChat=()=>{
    if(busy||applying)return;
    if(!messages.length&&!input.trim()){setHistoryOpen(false);return;}
    const session=newChatSession();
    setChatHistory(previous=>({...previous,sessions:[session,...previous.sessions],activeId:session.id}));setHistoryOpen(false);setError('');
    setTimeout(()=>textRef.current?.focus(),0);
  };
  const [busy,setBusy] = useState(false),[applying,setApplying] = useState(false),[error,setError] = useState('');
  const [connection,setConnection] = useState<'checking'|'ready'|'sign_in'|'error'>('checking');
  const textRef = useRef<HTMLTextAreaElement>(null),bottomRef = useRef<HTMLDivElement>(null),controller = useRef<AbortController | null>(null);
  const check = async () => {
    setConnection('checking'); setError('');
    try {
      if (location.protocol === 'file:') throw new Error('AI 助手需要在在线网站中使用');
      const response = await fetch('/api/assistant/status');
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('AI 接口暂不可用，请在正式网站重试');
      const result = await response.json();
      if (!response.ok) { setConnection(result.code === 'sign_in' ? 'sign_in' : 'error'); setError(result.error || 'AI 连接失败'); }
      else {setConnection('ready');setTimeout(() => textRef.current?.focus(),0);}
    } catch (e) {setConnection('error');setError((e as Error).message || 'AI 连接失败，请重试');}
  };
  useEffect(() => {if(isOpen)check();else controller.current?.abort();},[isOpen]);
  useEffect(() => {bottomRef.current?.scrollIntoView({block:'nearest'});},[messages,busy,isOpen,error]);
  const send = async (prompt = input) => {
    if (!prompt.trim() || busy || applying || connection !== 'ready') return;
    const question: Message = {id:id(),role:'user',content:prompt.trim()};
    const history = [...messages.map(m => ({...m,status:m.status === 'pending' ? 'cancelled' as const : m.status})),question];
    setMessages(history);setInput('');setError('');setBusy(true);
    const snapshot: DataStore = structuredClone({tasks:tasks.filter(t=>!t.deletedAt&&(currentDomain==='all'||t.domain===currentDomain)),notes:notes.filter(n=>!n.deletedAt&&(currentDomain==='all'||n.domain===currentDomain))});
    const context = {
      operationScope,now:new Date().toISOString(),localDate:localDate(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,domain:currentDomain,
      selectedTaskId:selectedTask?.id,selectedNoteId:selectedNote?.id,
      tasks:[...snapshot.tasks].sort((a,b)=>Number(b.id===selectedTask?.id)-Number(a.id===selectedTask?.id)).slice(0,300).map(t=>({...t,note:t.note.slice(0,1500)})),
      notes:[...snapshot.notes].sort((a,b)=>Number(b.id===selectedNote?.id)-Number(a.id===selectedNote?.id)).slice(0,100).map(({versions,...n})=>({...n,text:n.text.slice(0,n.id===selectedNote?.id?50000:6000)})),
      truncated:snapshot.tasks.length>300 || snapshot.notes.length>100
    };
    while(JSON.stringify(context).length>175000 && (context.notes.length>1||context.tasks.length>1)) {
      if(context.notes.length>1)context.notes.pop();else context.tasks.pop();context.truncated=true;
    }
    const turns=history.slice(-12).map(m=>({role:m.role,content:m.content+(m.status==='executed'?'\n[上述操作已执行]':'')}));
    while(JSON.stringify(turns).length>45000 && turns.length>1)turns.shift();
    controller.current = new AbortController();
    try {
      const response = await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.current.signal,body:JSON.stringify({messages:turns,context})});
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('AI 接口暂不可用，请在正式网站重试');
      const result = await response.json();
      if(!response.ok) {if(result.code==='sign_in')setConnection('sign_in');throw new Error(result.error || 'AI 请求失败，请重试');}
      const reply = normalizeAssistantReply(result,snapshot);
      if(operationScope==='chat'&&reply.actions.length)throw new Error('当前仅聊天，已阻止修改操作');
      if(currentDomain!=='all'&&reply.actions.some(a=>a.data.domain&&a.data.domain!==currentDomain))throw new Error('操作超出当前分类范围，请切换范围后重试');
      setMessages(previous=>[...previous,{id:id(),role:'assistant',content:reply.message,actions:reply.actions,snapshot:{tasks:snapshot.tasks.filter(t=>reply.actions.some(a=>a.entity==='task'&&a.targetId===t.id)),notes:snapshot.notes.filter(n=>reply.actions.some(a=>a.entity==='note'&&a.targetId===n.id))},status:reply.actions.length?'pending':undefined}]);
      if(reply.navigate)onNavigate(reply.navigate);
    } catch(e) {if((e as Error).name!=='AbortError')setError((e as Error).message || 'AI 请求失败，请重试');}
    finally {setBusy(false);controller.current=null;}
  };
  const execute = async (message: Message) => {
    if(!message.actions || !message.snapshot || applying)return;
    setApplying(true);setError('');
    try {
      if(await onExecuteActions(message.actions,message.snapshot))setMessages(previous=>previous.map(m=>m.id===message.id?{...m,status:'executed'}:m));
      else setError('未能执行，数据可能已变化，请重新生成方案');
    } finally {setApplying(false);}
  };
  if(!isOpen)return null;
  return <div className="assistant-backdrop" onClick={onClose}><section role="dialog" aria-modal="true" aria-label="AI 助手" className="assistant-drawer" onClick={e=>e.stopPropagation()}>
    <header className="assistant-header"><div className="flex gap-2 items-center"><Sparkles size={19}/><h2>AI 助手</h2></div><div className="flex items-center gap-1"><button className={'icon-button'+(historyOpen?' history-active':'')} aria-label="历史聊天" title="历史聊天" aria-expanded={historyOpen} onClick={()=>setHistoryOpen(value=>!value)}><History size={18}/></button><button className="icon-button" aria-label="新对话" title="新对话" disabled={busy||applying} onClick={startChat}><MessageSquare size={17}/></button><button className="icon-button" aria-label="关闭 AI 助手" onClick={onClose}><X size={19}/></button></div></header>
    {historyOpen?<div className="chat-history-panel">
      <div className="chat-history-heading"><button className="icon-button" aria-label="返回聊天" onClick={()=>setHistoryOpen(false)}><ChevronLeft size={18}/></button><h3>历史聊天</h3><button className="quiet-button ml-auto" disabled={busy||applying} onClick={startChat}>新对话</button></div>
      <label className="chat-history-search"><Search size={15}/><input aria-label="搜索历史聊天" placeholder="搜索对话" value={historyQuery} onChange={e=>setHistoryQuery(e.target.value)}/></label>
      {historyError&&<p role="alert" className="assistant-error">{historyError}</p>}
      <div className="chat-history-list">{chatHistory.sessions.filter(session=>session.messages.length&&(!historyQuery.trim()||session.title.toLowerCase().includes(historyQuery.toLowerCase())||session.messages.some(message=>message.content.toLowerCase().includes(historyQuery.toLowerCase())))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(session=><button key={session.id} className={'chat-history-item'+(session.id===chatHistory.activeId?' active':'')} aria-current={session.id===chatHistory.activeId?'true':undefined} disabled={busy||applying} onClick={()=>{setChatHistory(previous=>({...previous,activeId:session.id}));setHistoryOpen(false);setError('');}}><strong>{session.title}</strong><p>{session.messages.at(-1)?.content}</p><small>{new Date(session.updatedAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}<span>{session.messages.length} 条消息</span></small></button>)}{!chatHistory.sessions.some(session=>session.messages.length)&&<div className="chat-history-empty">暂无历史对话</div>}{historyQuery&&chatHistory.sessions.some(session=>session.messages.length)&&!chatHistory.sessions.some(session=>session.messages.length&&(session.title.toLowerCase().includes(historyQuery.toLowerCase())||session.messages.some(message=>message.content.toLowerCase().includes(historyQuery.toLowerCase()))))&&<div className="chat-history-empty">未找到对话</div>}</div>
    </div>:<>
    <div className="assistant-context"><label>操作范围 <select aria-label="AI 操作范围" disabled={busy||applying} value={operationScope} onChange={e=>{setOperationScope(e.target.value as 'domain'|'chat');setMessages(previous=>previous.map(m=>m.status==='pending'?{...m,status:'cancelled'}:m));}}><option value="domain">当前分类的事项与笔记</option><option value="chat">仅聊天</option></select></label><span> · </span>{currentDomain==='all'?'全部':currentDomain==='work'?'工作':'生活'}{selectedNote&&<span> · {selectedNote.title||'未命名笔记'}</span>}</div>
    <div className="assistant-conversation" aria-live="polite" aria-busy={busy}>
      {!messages.length&&<div className="assistant-welcome"><Sparkles size={30}/><h3>有什么想一起推进的？</h3><p>聊想法、写笔记，或直接告诉我要做什么。</p><div className="assistant-suggestions">{[selectedNote?'整理当前笔记':'帮我梳理待办优先级','安排明天的日程','帮我新建一个事项','总结最近7天的进展'].map(prompt=><button key={prompt} disabled={connection!=='ready'||busy} onClick={()=>send(prompt)}>{prompt}</button>)}</div></div>}
      {messages.map(message=><article key={message.id} className={'assistant-message '+message.role}><div className="assistant-message-text">{message.content}</div>{!!message.actions?.length&&<div className="assistant-plan"><div className="assistant-plan-header">操作预览 <span>{message.actions.filter(a=>a.selected).length} 项</span></div>{message.actions.map(action=>{
        const before=(action.entity==='task'?message.snapshot?.tasks:message.snapshot?.notes)?.find(record=>record.id===action.targetId);
        return <div className="assistant-action" key={action.id}><label><input aria-label={'选择操作 '+(action.data.title||before?.title||'未命名记录')} type="checkbox" checked={action.selected} disabled={message.status!=='pending'||applying||busy} onChange={e=>setMessages(previous=>previous.map(m=>m.id===message.id?{...m,actions:m.actions!.map(a=>a.id===action.id?{...a,selected:e.target.checked}:a)}:m))}/><strong>{operationLabels[action.operation]}{action.entity==='task'?'事项':'笔记'}：{action.data.title||before?.title||'未命名记录'}</strong></label>{action.reason&&<p className="assistant-action-reason">原因：{action.reason}</p>}{action.operation==='delete'?<p className="text-xs text-[var(--muted)]">移至回收站，子记录保留。</p>:<details><summary>查看内容<ChevronDown size={13}/></summary><dl>{Object.entries(action.data).map(([field,value])=><div key={field}><dt>{fieldLabels[field]||field}</dt>{action.operation==='update'&&before&&<dd className="before-value">{display((before as any)[field],field,notes)}</dd>}<dd>{display(value,field,notes)}</dd></div>)}</dl></details>}</div>;
      })}{message.status==='pending'?<div className="assistant-plan-footer"><button className="btn-primary px-4 py-2" disabled={busy||applying||!message.actions.some(a=>a.selected)} onClick={()=>execute(message)}>{applying?'执行中…':'执行所选操作'}</button><button className="quiet-button" disabled={applying} onClick={()=>setMessages(previous=>previous.map(m=>m.id===message.id?{...m,status:'cancelled'}:m))}>取消</button></div>:<div role="status" className="assistant-plan-status">{message.status==='executed'?<><Check size={14}/>已执行</>:'方案已取消'}</div>}</div>}</article>)}
      {busy&&<div className="assistant-thinking" role="status"><RefreshCw size={15} className="animate-spin"/>正在思考…</div>}
      {error&&<div role="alert" className="assistant-error">{error}{connection==='sign_in'?<a href="/signin-with-chatgpt?returnTo=%2F" target="_top">登录 ChatGPT</a>:connection==='error'?<button onClick={check}>重新连接</button>:!busy&&messages.at(-1)?.role==='user'?<button onClick={()=>{const last=messages.at(-1)!;setMessages(previous=>previous.slice(0,-1));setInput(last.content);textRef.current?.focus();}}>重新编辑</button>:null}</div>}
      <div ref={bottomRef}/>
    </div>
    {historyError&&<p role="alert" className="chat-history-save-error">{historyError}</p>}
    <form className="assistant-composer" onSubmit={e=>{e.preventDefault();send();}}><textarea ref={textRef} aria-label="发送给 AI 助手" value={input} onChange={e=>setInput(e.target.value)} disabled={connection!=='ready'||applying} placeholder={connection==='checking'?'正在连接…':'告诉我你想做什么…'} rows={3} maxLength={10000} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><div className="assistant-composer-tools"><span>修改内容前会先预览</span>{busy?<button type="button" className="assistant-send" aria-label="停止生成" onClick={()=>controller.current?.abort()}><Square size={15}/></button>:<button className="assistant-send" type="submit" aria-label="发送消息" disabled={!input.trim()||connection!=='ready'||applying}><ArrowUp size={18}/></button>}</div></form>
  </>}
  </section></div>;
}
