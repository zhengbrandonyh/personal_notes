export type DomainType = 'all' | 'work' | 'life';

export type ViewMode = 'today' | 'quadrant' | 'calendar' | 'journal' | 'review';

export type ThemeMode = 'light' | 'dark';

export type TaskStatus = 'todo' | 'done' | 'completed' | 'in_progress';
export type TaskStage = 'not_started' | 'preparing' | 'developing' | 'testing' | 'observing';

export type QuadrantId = 'q1' | 'q2' | 'q3' | 'q4' | 'unclassified';

export type CalendarSubView = 'month' | 'week' | 'agenda';

export type NoteType = '全部' | '随手记' | '会议记录' | '复盘';

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
  at?: string | null;
  legacyMilestoneId?: string;
}

export interface TaskMilestone { id: string; title: string; date: string; }

export interface TimeSession {id:string;start:string;end:string;}
export interface DailySchedule {id:string;startTime:string;endTime:string;overrides:Record<string,{start:string;end:string}>;excluded:string[];}
export interface TimeReminder {id:string;target:'deadline'|'session'|'daily'|'subtask'|'absolute';targetId?:string;offsetMinutes:number;at?:string;clock?:string;createdAt:string;}
export interface TaskTimePlan {period:{start:string;end:string}|null;sessions:TimeSession[];daily:DailySchedule[];reminders:TimeReminder[];recurrence?:{basis:'plan'|'completion';interval:number;weekdays:number[];until:string|null;count:number|null;index:number};}
export interface CalendarEntry {sourceId:string;kind:'period'|'session'|'deadline'|'subtask';sessionId?:string;dailyId?:string;date?:string;subtaskId?:string;}
export interface TaskItem {
  id: string;
  parentId: string | null;
  title: string;
  note: string; // desc
  domain: 'work' | 'life';
  status: TaskStatus;
  stage?: TaskStage;
  importance: boolean | null; // true: 重要, false: 不重要, null: 未判定
  urgency: boolean | null;    // true: 紧急, false: 不紧急, null: 未判定
  dueAt: string | null;       // YYYY-MM-DD or ISO
  dueAllDay?: boolean;
  scheduledStart: string | null; // ISO string
  scheduledEnd: string | null;   // ISO string
  milestones?: TaskMilestone[];
  plannedFor?: string | null;
  estimatedMinutes?: number | null;
  scheduleConstraints?: {earliest:string;latest:string;weekdaysOnly:boolean} | null;
  repeat?: 'daily'|'weekdays'|'weekly'|'monthly' | null;
  repeatAnchorDay?: number;
  recurrenceOf?: string;
  remindAt?: string | null;
  timePlan?:TaskTimePlan;
  subtaskNodesVersion?:1;
  calendarEntry?:CalendarEntry;
  tags: string[];
  subtasks: SubTask[];
  sourceNoteId?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
}

export interface NoteChart { id: string; title: string; type: 'bar'|'line'; points: {label:string;value:number}[]; }
export interface NoteContent {title:string;text:string;richText?:string;charts?:NoteChart[];}
export interface NoteVersion {id:string;number:number;savedAt:string;reason:'baseline'|'save'|'recovery'|'restore';restoredFrom?:string;content:NoteContent;}

export interface JournalNote {
  versions?: NoteVersion[];
  richText?: string;
  charts?: NoteChart[];
  id: string;
  parentId?: string | null;
  title: string;
  text: string;
  domain: 'work' | 'life';
  type: '随手记' | '会议记录' | '复盘';
  date: string; // YYYY-MM-DD
  links: string[]; // task ids
  updatedAt: string;
  deletedAt: string | null;
}

export type JournalEntry = JournalNote;

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'model';
  content: string;
  createdAt: string;
  previewBatch?: AIPreviewBatch;
}

export interface ParsedQuickCapture {
  title: string;
  rawTitle?: string;
  domain?: 'work' | 'life';
  importance?: boolean | null;
  urgency?: boolean | null;
  dueAt?: string | null;
  dueAllDay?: boolean;
  isEstimatedTime?: boolean;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  tags?: string[];
  parentPlanName?: string;
  pills?: Array<{ id: string; type: string; label: string; value: any; isEstimated?: boolean }>;
}



export interface OperationLog {
  opId: string;
  batchId: string;
  entityType: 'item' | 'journal';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'restore';
  patchBefore: any;
  patchAfter: any;
  description: string;
  at: string;
}

export interface AIPreviewAction {
  id: string;
  actionType: 'create' | 'update' | 'batch_create' | 'batch_update' | 'delete';
  title: string;
  targetItemId?: string;
  targetTitle?: string;
  selected: boolean;
  itemData: Partial<TaskItem>;
  oldData?: Partial<TaskItem>;
  conflictNote?: string;
}

export interface AIPreviewBatch {
  batchId: string;
  summary: string;
  actions: AIPreviewAction[];
  status: 'pending' | 'executed' | 'cancelled';
  createdAt: string;
}

