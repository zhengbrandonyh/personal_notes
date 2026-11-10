import {validateNoteVersions} from './noteVersions';
import {taskOptionsError} from './taskWorkflow';
import {validateNoteExtras} from './noteRichText';
import { milestoneError } from './milestones';
import { TaskItem, JournalNote, OperationLog } from '../types';
import { validateNoteParents } from './noteTree';

const STORAGE_KEY_TASKS = 'daynight_tasks_v1';
const STORAGE_KEY_NOTES = 'daynight_notes_v1';
const STORAGE_KEY_LOGS = 'daynight_op_logs_v1';

export const SEED_TASKS: TaskItem[] = [
  {
    id: 't1',
    parentId: null,
    title: '跟王工对接接口评审与验收',
    note: '带上接口字段表和验收用例，确认剩余问题与负责人。',
    domain: 'work',
    status: 'todo',
    importance: true,
    urgency: true,
    dueAt: '2026-10-29',
    scheduledStart: '2026-10-26T09:00:00',
    scheduledEnd: '2026-10-29T18:00:00',
    tags: ['工作', '紧急', '评审', '架构'],
    subtasks: [
      { id: 's1', title: '梳理数据字段字典', done: true },
      { id: 's2', title: '准备联调测试用例', done: false },
    ],
    sourceNoteId: 'n2',
    order: 1,
    createdAt: '2026-10-26T09:00:00.000Z',
    updatedAt: '2026-10-26T09:00:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
  {
    id: 't_span_mid',
    parentId: null,
    title: '核心系统跨端联调与发布 (攻坚周)',
    note: '多端协同联调，包括离线同步与幂等测试。',
    domain: 'work',
    status: 'todo',
    importance: true,
    urgency: false,
    dueAt: '2026-10-14',
    scheduledStart: '2026-10-11T09:00:00',
    scheduledEnd: '2026-10-14T18:00:00',
    tags: ['架构', '评审'],
    subtasks: [
      { id: 'sm1', title: '全链路压测', done: true },
      { id: 'sm2', title: '应急演练预案', done: true },
    ],
    order: 1.5,
    createdAt: '2026-10-10T09:00:00.000Z',
    updatedAt: '2026-10-10T09:00:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
  {
    id: 't2',
    parentId: null,
    title: '制定下季度架构规划与技术重构计划',
    note: '先梳理关键依赖，产出一页讨论稿。',
    domain: 'work',
    status: 'todo',
    importance: true,
    urgency: false,
    dueAt: '2026-10-30',
    scheduledStart: '2026-10-27T14:00:00',
    scheduledEnd: '2026-10-27T15:30:00',
    tags: ['架构', '规划'],
    subtasks: [],
    order: 2,
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
  {
    id: 't3',
    parentId: null,
    title: '回复商务合作团队周报',
    note: '确认本周进度与下周交付。',
    domain: 'work',
    status: 'todo',
    importance: false,
    urgency: true,
    dueAt: '2026-10-26', // 逾期（对比今天 10/27）
    scheduledStart: null,
    scheduledEnd: null,
    tags: ['周报'],
    subtasks: [],
    order: 3,
    createdAt: '2026-10-23T11:00:00.000Z',
    updatedAt: '2026-10-23T11:00:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
  {
    id: 't4',
    parentId: null,
    title: '归档上月报销单据发票',
    note: '',
    domain: 'work',
    status: 'todo',
    importance: false,
    urgency: false,
    dueAt: null,
    scheduledStart: null,
    scheduledEnd: null,
    tags: ['行政'],
    subtasks: [],
    order: 4,
    createdAt: '2026-10-26T14:00:00.000Z',
    updatedAt: '2026-10-26T14:00:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
  {
    id: 't5',
    parentId: null,
    title: '调研离线同步方案',
    note: '比较本地单机和云端同步的断点策略。',
    domain: 'work',
    status: 'todo',
    importance: null,
    urgency: null,
    dueAt: null,
    scheduledStart: null,
    scheduledEnd: null,
    tags: ['技术调研'],
    subtasks: [],
    sourceNoteId: 'n1',
    order: 5,
    createdAt: '2026-10-26T15:00:00.000Z',
    updatedAt: '2026-10-26T15:00:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
  {
    id: 't6',
    parentId: null,
    title: '傍晚散步，给自己留一点空白',
    note: '',
    domain: 'life',
    status: 'todo',
    importance: true,
    urgency: false,
    dueAt: null,
    scheduledStart: '2026-10-27T18:30:00',
    scheduledEnd: '2026-10-27T19:00:00',
    tags: ['健康'],
    subtasks: [],
    order: 6,
    createdAt: '2026-10-27T08:00:00.000Z',
    updatedAt: '2026-10-27T08:00:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
  {
    id: 't7',
    parentId: null,
    title: '整理评审结论',
    note: '',
    domain: 'work',
    status: 'done',
    importance: true,
    urgency: false,
    dueAt: '2026-10-26',
    scheduledStart: '2026-10-26T16:00:00',
    scheduledEnd: '2026-10-26T16:30:00',
    tags: [],
    subtasks: [],
    order: 7,
    createdAt: '2026-10-25T09:00:00.000Z',
    updatedAt: '2026-10-26T16:30:00.000Z',
    completedAt: '2026-10-26T16:30:00.000Z',
    deletedAt: null,
  },
  {
    id: 't8',
    parentId: null,
    title: '采购本周水果',
    note: '',
    domain: 'life',
    status: 'done',
    importance: false,
    urgency: false,
    dueAt: '2026-10-25',
    scheduledStart: null,
    scheduledEnd: null,
    tags: [],
    subtasks: [],
    order: 8,
    createdAt: '2026-10-24T10:00:00.000Z',
    updatedAt: '2026-10-25T18:00:00.000Z',
    completedAt: '2026-10-25T18:00:00.000Z',
    deletedAt: null,
  },
  {
    id: 't9',
    parentId: null,
    title: '完成设计方案初稿',
    note: '',
    domain: 'work',
    status: 'done',
    importance: true,
    urgency: false,
    dueAt: '2026-10-23',
    scheduledStart: null,
    scheduledEnd: null,
    tags: [],
    subtasks: [],
    order: 9,
    createdAt: '2026-10-21T09:00:00.000Z',
    updatedAt: '2026-10-23T20:00:00.000Z',
    completedAt: '2026-10-23T20:00:00.000Z',
    deletedAt: null,
  },
  {
    id: 't10',
    parentId: null,
    title: '阅读与记录',
    note: '',
    domain: 'life',
    status: 'done',
    importance: false,
    urgency: false,
    dueAt: null,
    scheduledStart: null,
    scheduledEnd: null,
    tags: [],
    subtasks: [],
    order: 10,
    createdAt: '2026-10-23T10:00:00.000Z',
    updatedAt: '2026-10-24T21:00:00.000Z',
    completedAt: '2026-10-24T21:00:00.000Z',
    deletedAt: null,
  },
];

export const SEED_NOTES: JournalNote[] = [
  {
    id: 'n1',
    title: '关于离线同步的一点想法',
    text: '上午与王工交流了本地单机与云端同步的断点策略。\n\n把复杂度放在本地是可行的方向，但需要进一步明确数据冲突的处理规则。\n\n下一步：调研离线同步方案，比较实现成本与维护成本。',
    domain: 'work',
    type: '随手记',
    date: '2026-10-26',
    links: ['t5'],
    updatedAt: '2026-10-26 15:11',
    deletedAt: null,
  },
  {
    id: 'n2',
    title: '接口评审准备',
    text: '讨论目标：确认接口字段与验收范围。\n\n待讨论\n• 字段是否完整\n• 异常返回如何提示\n• 未完成部分由谁跟进',
    domain: 'work',
    type: '会议记录',
    date: '2026-10-27',
    links: ['t1'],
    updatedAt: '2026-10-27 09:20',
    deletedAt: null,
  },
  {
    id: 'n3',
    title: '这一周，慢一点也没关系',
    text: '本周做得好的：留了两段时间出门走走。\n\n需要调整的：减少睡前无目的浏览。\n\n下周尝试：每晚留出半小时散步。',
    domain: 'life',
    type: '复盘',
    date: '2026-10-25',
    links: [],
    updatedAt: '2026-10-25 21:00',
    deletedAt: null,
  },
];


export type DataStore = {tasks: TaskItem[]; notes: JournalNote[]};
export const DATA_KEY = 'daynight_data_v2';
export const BACKUP_KEY = 'daynight_before_replace_v2';
let memory: DataStore = {tasks: structuredClone(SEED_TASKS), notes: structuredClone(SEED_NOTES)};
let _memLogs: OperationLog[] = [];
const nullableString = (v: unknown) => v === null || typeof v === 'string';
export function validateData(value: any): DataStore {
  if (!value || !Array.isArray(value.tasks) || !Array.isArray(value.notes)) throw new Error('备份必须包含事项和笔记数组');
  for (const list of [value.tasks, value.notes]) {
    const ids = new Set();
    for (const item of list) {
      if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new Error('记录 ID 缺失或重复');
      ids.add(item.id);
      if (typeof item.title !== 'string' || !['work','life'].includes(item.domain) || typeof item.updatedAt !== 'string' || !nullableString(item.deletedAt)) throw new Error('记录字段缺失或类型错误');
    }
  }
  for (const t of value.tasks) {
    if (t.milestones !== undefined && !Array.isArray(t.milestones)) throw new Error('关键节点格式不正确');
    const optionsError=taskOptionsError(t);if(optionsError)throw new Error(optionsError);
    const nodeError=milestoneError(t); if(nodeError) throw new Error(nodeError);
    if (typeof t.note !== 'string' || !['todo','done','completed','in_progress'].includes(t.status) || ![true,false,null].includes(t.importance) || ![true,false,null].includes(t.urgency) || !Array.isArray(t.tags) || t.tags.some((v:any)=>typeof v!=='string') || !Array.isArray(t.subtasks) || t.subtasks.some((v:any)=>!v || typeof v.id!=='string' || typeof v.title!=='string' || typeof v.done!=='boolean')) throw new Error('事项字段格式不正确');
    for(const field of ['dueAt','scheduledStart','scheduledEnd','completedAt']) if(!nullableString(t[field]) || (t[field] && isNaN(Date.parse(t[field])))) throw new Error('事项日期格式不正确');
    if(t.scheduledStart && t.scheduledEnd && new Date(t.scheduledStart)>new Date(t.scheduledEnd)) throw new Error('事项结束时间早于开始时间');
  }
  for (const n of value.notes) if(typeof n.text!=='string' || !Array.isArray(n.links) || n.links.some((v:any)=>typeof v!=='string') || !['随手记','会议记录','复盘'].includes(n.type) || typeof n.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(n.date) || isNaN(Date.parse(n.date))) throw new Error('笔记字段格式不正确');
  for(const n of value.notes) {validateNoteExtras(n);validateNoteVersions(n);}
  validateNoteParents(value.notes);
  return {tasks:value.tasks, notes:value.notes};
}
export function parseBackup(text: string): DataStore {
 const v=JSON.parse(text);
 if (v.schemaVersion !== undefined && v.schemaVersion !== 1 && v.schemaVersion !== 2) throw new Error('不支持的备份版本');
 if (v.version !== undefined && !['0.9','1.0','2.0'].includes(String(v.version))) throw new Error('不支持的备份版本');
 return validateData({tasks:v.tasks ?? v.items, notes:v.notes ?? v.journals});
}
export class StorageService {
 static loadAllData(): DataStore {
  if(typeof localStorage==='undefined') return structuredClone(memory);
  const raw=localStorage.getItem(DATA_KEY);
  if(raw) return validateData(JSON.parse(raw));
  const t=localStorage.getItem(STORAGE_KEY_TASKS), n=localStorage.getItem(STORAGE_KEY_NOTES);
  return validateData({tasks:t?JSON.parse(t):structuredClone(SEED_TASKS),notes:n?JSON.parse(n):structuredClone(SEED_NOTES)});
 }
 static write(data: DataStore) {
  const clean=validateData(data);
  if(typeof localStorage!=='undefined') localStorage.setItem(DATA_KEY,JSON.stringify({...clean,schemaVersion:2}));
  memory=structuredClone(clean);
 }
 static async transact(change: (data: DataStore)=>DataStore): Promise<DataStore> {
  const run=()=>{const next=change(structuredClone(this.loadAllData()));this.write(next);return next;};
  if(typeof navigator!=='undefined' && navigator.locks) return navigator.locks.request('daynight-write',run);
  if(typeof window!=='undefined') throw new Error('安全保存需要 HTTPS 和支持 Web Locks 的浏览器。请使用正式 HTTPS 网址或新版浏览器；可先导出草稿');
  return run();
 }
 static saveTasks(tasks:TaskItem[]) {this.write({...this.loadAllData(),tasks});}
 static saveNotes(notes:JournalNote[]) {this.write({...this.loadAllData(),notes});}
 static getRecentLogs(): OperationLog[] {return _memLogs;}
 static saveLog(log:OperationLog) {_memLogs=[log,..._memLogs].slice(0,50);}
 static resetToDemoData() {this.write({tasks:structuredClone(SEED_TASKS),notes:structuredClone(SEED_NOTES)});_memLogs=[];}
 static async replace(data:DataStore) {
  validateData(data);
  return this.transact(current=>{
   if(typeof localStorage!=='undefined') localStorage.setItem(BACKUP_KEY,JSON.stringify({...current,schemaVersion:2}));
   return data;
  });
 }
 static download(data:DataStore, filename='daynight-backup.json') {
  const url=URL.createObjectURL(new Blob([JSON.stringify({...data,schemaVersion:2,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 static async exportFullBackup():Promise<string> {this.download(this.loadAllData());return new Date().toISOString().slice(0,10);}
 static async importFullBackup(text:string) {const data=parseBackup(text);await this.replace(data);return {items:data.tasks,journals:data.notes};}
}
