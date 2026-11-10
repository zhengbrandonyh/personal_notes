import React, { useState } from 'react';
import { TaskItem, JournalNote, ViewMode, DomainType } from '../types';
import { Search, X, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  notes: JournalNote[];
  currentDomain: DomainType;
  onSelectTask: (task: TaskItem) => void;
  onSelectNote: (note: JournalNote) => void;
  onViewChange: (view: ViewMode) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tasks,
  notes,
  currentDomain,
  onSelectTask,
  onSelectNote,
  onViewChange,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const scopedTasks = tasks.filter(
    (t) => !t.deletedAt && (currentDomain === 'all' || t.domain === currentDomain)
  );
  const scopedNotes = notes.filter(
    (n) => !n.deletedAt && (currentDomain === 'all' || n.domain === currentDomain)
  );

  const matchedTasks = query.trim()
    ? scopedTasks.filter(
        (t) => t.title.toLowerCase().includes(query.trim().toLowerCase()) || (t.note && t.note.toLowerCase().includes(query.trim().toLowerCase()))
      )
    : scopedTasks.slice(0, 5);

  const matchedNotes = query.trim()
    ? scopedNotes.filter(
        (n) => n.title.toLowerCase().includes(query.trim().toLowerCase()) || n.text.toLowerCase().includes(query.trim().toLowerCase())
      )
    : scopedNotes.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-xs" />

      {/* Modal */}
      <div role="dialog" aria-modal="true" aria-label="搜索" className="relative w-full max-w-[600px] clay-card bg-[var(--card)] p-4 z-10 space-y-4 animate-fadeIn">
        {/* Search Bar */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--line)] dark:border-[#3d4939]">
          <Search className="w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            aria-label="搜索事项与笔记"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索事项与笔记…"
            autoFocus
            className="flex-1 text-sm bg-transparent outline-none text-[var(--ink)] dark:text-[var(--ink)]"
          />
          <button aria-label="关闭搜索" onClick={onClose} className="icon-button">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--muted)]">范围：{currentDomain==='all'?'全部':currentDomain==='work'?'工作':'生活'} · 含已完成事项</p>
        {!matchedTasks.length&&!matchedNotes.length&&<p role="status" className="py-8 text-center text-sm">未找到结果</p>}
        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto space-y-4">
          {/* Matched Tasks */}
          {matchedTasks.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block px-2">
                事项
              </span>
              {matchedTasks.map((t) => (
                <div
                  key={t.id}
                  role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'){onSelectTask(t);onClose();}}}
                  onClick={() => {
                    onSelectTask(t);
                    onClose();
                  }}
                  className="p-2.5 rounded-xl hover:bg-[#f0f7e7] dark:hover:bg-[#35442c] cursor-pointer flex items-center justify-between text-xs transition-all"
                >
                  <span className="font-semibold text-[var(--ink)] dark:text-[var(--ink)] truncate">
                    {t.title}
                  </span>
                  <span className="text-[10px] text-[var(--muted)] font-mono shrink-0 ml-2">
                    {t.domain === 'work' ? '工作' : '生活'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Matched Notes */}
          {matchedNotes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block px-2">
                笔记
              </span>
              {matchedNotes.map((n) => (
                <div
                  key={n.id}
                  role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'){onSelectNote(n);onClose();}}}
                  onClick={() => {
                    onSelectNote(n);
                    onViewChange('journal');
                    onClose();
                  }}
                  className="p-2.5 rounded-xl hover:bg-[#f0f7e7] dark:hover:bg-[#35442c] cursor-pointer flex items-center justify-between text-xs transition-all"
                >
                  <span className="font-semibold text-[var(--ink)] dark:text-[var(--ink)] truncate">
                    {n.title || '未命名笔记'}
                  </span>
                  <span className="text-[10px] text-[var(--muted)] font-mono shrink-0 ml-2">
                    {n.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
