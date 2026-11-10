import {isFinished} from './taskWorkflow';
import {TaskItem,JournalNote,DomainType,AIPreviewBatch} from '../types';
export async function extractTasksFromNoteWithAI(note:JournalNote):Promise<Array<Partial<TaskItem>>> {
  // Smart regex / line-based extraction fallback
  const lines = note.text.split('\n');
  const candidates: Array<Partial<TaskItem>> = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed) || trimmed.includes('下一步') || trimmed.includes('待办')) {
      const cleanTitle = trimmed.replace(/^[•\-\*\d\.]+\s*/, '').trim();
      if (cleanTitle.length >= 2) {
        candidates.push({
          title: cleanTitle,
          note: `提炼自笔记《${note.title || '未命名笔记'}》`,
          domain: note.domain,
          importance: null,
          urgency: null,
        });
      }
    }
  });

  if (candidates.length === 0 && note.text.trim()) {
    candidates.push({
      title: note.title ? `推进：${note.title}` : note.text.slice(0, 30),
      note: note.text,
      domain: note.domain,
      importance: null,
      urgency: null,
    });
  }

  return candidates;
}

export async function generateWeeklyReviewWithAI(tasks:TaskItem[],notes:JournalNote[]):Promise<string>{return tasks.filter(t=>!t.deletedAt&&isFinished(t)&&t.completedAt&&new Date(t.completedAt)>=new Date(Date.now()-7*86400000)).map(t=>'✓ '+t.title).join('\n')||'最近 7 天尚无完成记录。';}
export interface AIChatMessage{id:string;role:'user'|'assistant'|'model';content:string;createdAt:string;previewBatch?:AIPreviewBatch}
export async function processPrompt(promptText:string,items:TaskItem[],journals:JournalNote[],domain:DomainType,selectedItemId?:string):Promise<AIChatMessage>{return {id:crypto.randomUUID(),role:'assistant',content:'当前未接入模型。请使用规则排期、提取待办或手动编辑事项。',createdAt:new Date().toISOString()};}
export const AIService={getAiClient:()=>null,extractTasksFromNoteWithAI,generateWeeklyReviewWithAI,processPrompt};
