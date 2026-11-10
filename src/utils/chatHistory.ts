import type { AssistantAction } from './assistantActions';
import type { DataStore } from './storage';
export interface ChatMessage { id:string;role:'user'|'assistant';content:string;actions?:AssistantAction[];snapshot?:DataStore;status?:'pending'|'executed'|'cancelled' }
export interface ChatSession {id:string;title:string;messages:ChatMessage[];draft:string;updatedAt:string}
export interface ChatHistory {sessions:ChatSession[];activeId:string}
export const CHAT_HISTORY_KEY='dn-assistant-history-v1';
export function newChatSession():ChatSession {return {id:crypto.randomUUID?.()||'chat_'+Date.now()+'_'+Math.random(),title:'新对话',messages:[],draft:'',updatedAt:new Date().toISOString()};}
export function readChatHistory(raw:string|null):ChatHistory {
 if(!raw){const session=newChatSession();return {sessions:[session],activeId:session.id};}
 const data=JSON.parse(raw);
 if(data.version!==1||!Array.isArray(data.sessions)||!data.sessions.length)throw new Error('历史对话格式不正确');
 const ids=new Set();
 const sessions=data.sessions.map((s:any)=>{
  if(!s||typeof s.id!=='string'||ids.has(s.id)||typeof s.title!=='string'||typeof s.updatedAt!=='string'||!Array.isArray(s.messages)||s.messages.some((m:any)=>!m||typeof m.id!=='string'||!['user','assistant'].includes(m.role)||typeof m.content!=='string'))throw new Error('历史对话格式不正确');
  ids.add(s.id);
  return {...s,draft:typeof s.draft==='string'?s.draft:'',messages:s.messages.map((m:ChatMessage)=>({...m,status:m.status==='pending'?'cancelled':m.status}))};
 });
 return {sessions,activeId:sessions.some((s:ChatSession)=>s.id===data.activeId)?data.activeId:sessions[0].id};
}
export function updateChatMessages(history:ChatHistory,change:ChatMessage[]|((messages:ChatMessage[])=>ChatMessage[])):ChatHistory {
 return {...history,sessions:history.sessions.map(session=>{
  if(session.id!==history.activeId)return session;
  const messages=typeof change==='function'?change(session.messages):change;
  const first=messages.find(m=>m.role==='user');
  return {...session,messages,title:first?.content.replace(/\s+/g,' ').slice(0,28)||'新对话',updatedAt:new Date().toISOString()};
 })};
}
