import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  ArrowUpRight,
  Clock,
  Layers,
  Flag,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { TaskItem, DomainType, QuadrantId } from '../types';
import {
  getQuadrantId,
  getDueStatusText,
  calculateSubtaskProgress,
} from '../utils/quadrant';

interface TodoQuadrantCardProps {
  items: TaskItem[];
  allSubtasks: TaskItem[];
  currentDomain: DomainType;
  onSelectItem: (item: TaskItem) => void;
  onToggleComplete: (item: TaskItem) => void;
  onQuickAddItem: (quadrantId: QuadrantId, title: string) => void;
  onNavigateToQuadrant: () => void;
  onAddSubtask?: (parentId: string, title: string) => void;
  onToggleSubtask?: (subtask: TaskItem) => void;
  onDeleteSubtask?: (id: string) => void;
}

export const TodoQuadrantCard: React.FC<TodoQuadrantCardProps> = ({
  items,
  allSubtasks,
  currentDomain,
  onSelectItem,
  onToggleComplete,
  onQuickAddItem,
  onNavigateToQuadrant,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | QuadrantId>('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [expandedSubtaskItemIds, setExpandedSubtaskItemIds] = useState<Set<string>>(new Set());
  const [newSubtaskInputMap, setNewSubtaskInputMap] = useState<Record<string, string>>({});

  const toggleExpandSubtasks = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubtaskItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const activeItems = items.filter(
    (i) => !i.deletedAt && !i.parentId && (currentDomain === 'all' || i.domain === currentDomain)
  );

  const filteredItems = selectedFilter === 'all'
    ? activeItems
    : activeItems.filter((i) => getQuadrantId(i) === selectedFilter);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) {
      setShowInput(false);
      return;
    }
    const targetQid = selectedFilter === 'all' ? 'q1' : selectedFilter;
    onQuickAddItem(targetQid, quickTitle.trim());
    setQuickTitle('');
    setShowInput(false);
  };

  const todayStr = new Date().toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="clay-card p-5 flex flex-col h-[340px] md:h-[380px] relative overflow-hidden">
      {/* Header matching reference: "To-do list" with date & arrow */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E4ED] dark:border-[rgba(255,255,255,0.06)] shrink-0">
        <div>
          <h3 className="font-extrabold text-sm text-[#181A20] dark:text-[#F3F5F6]">
            待办清单与四象限 (To-do list)
          </h3>
          <p className="text-[11px] text-[#9CA3AF]">{todayStr}</p>
        </div>

        <button
          onClick={onNavigateToQuadrant}
          className="w-8 h-8 rounded-full bg-[#F3F4F8] dark:bg-[#232832] hover:bg-[#E5E7EB] dark:hover:bg-[#2C323F] text-[#181A20] dark:text-white flex items-center justify-center transition-all shadow-sm"
          title="全屏四象限看板"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs matching reference pill styles */}
      <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto shrink-0 text-xs">
        {[
          { id: 'all', label: '全部待办' },
          { id: 'q1', label: 'Q1 立刻做' },
          { id: 'q2', label: 'Q2 规划做' },
          { id: 'q3', label: 'Q3 快速清' },
          { id: 'q4', label: 'Q4 可以等' },
          { id: 'unclassified', label: '待分类' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id as any)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
              selectedFilter === tab.id
                ? 'bg-[#181A20] text-white dark:bg-white dark:text-[#181A20] shadow-sm'
                : 'bg-[#F3F4F8] dark:bg-[#232832] text-[#6B7280] dark:text-[#9AA4AD] hover:text-[#181A20] dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* To-Do Items List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 text-xs scrollbar-thin">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#9CA3AF]">
            <p className="text-xs mb-1 font-medium">当前分类下没有待办事项</p>
            <button
              onClick={() => setShowInput(true)}
              className="text-xs text-[#16A34A] dark:text-[#A3E635] font-semibold underline"
            >
              + 点击添加一条
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const dueInfo = getDueStatusText(item);
            const isCompleted = item.status === 'done' || item.status === 'completed';
            const subtasks = allSubtasks.filter((s) => s.parentId === item.id);
            const isExpanded = expandedSubtaskItemIds.has(item.id);

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                  isCompleted
                    ? 'bg-[#F9FAFB] dark:bg-[#1E222B] border-[#E5E7EB] dark:border-transparent opacity-60'
                    : 'bg-[#FFFFFF] dark:bg-[#181B22] border-[#E2E4ED] dark:border-[rgba(255,255,255,0.06)] shadow-sm hover:border-[#CBD5E1] dark:hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Green check button (matching reference image) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(item);
                      }}
                      className="shrink-0 text-[#9CA3AF] hover:text-[#16A34A] transition-colors"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] fill-[#D9F99D]/50" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#CBD5E1] dark:text-[#475569]" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <h4
                        className={`font-semibold text-xs truncate ${
                          isCompleted
                            ? 'line-through text-[#9CA3AF]'
                            : 'text-[#181A20] dark:text-[#F3F5F6]'
                        }`}
                      >
                        {item.title}
                      </h4>

                      <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF] mt-0.5 flex-wrap">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.domain === 'work' ? 'bg-[#A3E635]' : 'bg-[#F59E0B]'
                          }`}
                        />
                        <span>{item.domain === 'work' ? '工作' : '生活'}</span>

                        {dueInfo.text && (
                          <span className="flex items-center gap-0.5 text-[#F97316]">
                            <Clock className="w-2.5 h-2.5" />
                            {dueInfo.text}
                          </span>
                        )}

                        {/* Subtasks dropdown toggle */}
                        <button
                          type="button"
                          onClick={(e) => toggleExpandSubtasks(item.id, e)}
                          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#F3F4F8] dark:bg-[#232832] text-zinc-700 dark:text-zinc-300 font-medium"
                          title="展开/收起子事项"
                        >
                          <Layers className="w-2.5 h-2.5 text-lime-600 dark:text-lime-400" />
                          <span>
                            子事项 ({subtasks.filter((s) => s.status === 'done' || s.status === 'completed').length}/{subtasks.length})
                          </span>
                          {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="px-2 py-0.5 text-[10px] font-mono-code font-bold rounded-full bg-[#F3F4F8] dark:bg-[#232832] text-[#6B7280] dark:text-[#9AA4AD]">
                      {getQuadrantId(item).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Subtask dropdown section */}
                {isExpanded && (
                  <div
                    className="pt-2 border-t border-[#E2E4ED] dark:border-zinc-800 space-y-1 animate-fadeIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {subtasks.length === 0 ? (
                      <p className="text-[10px] text-zinc-400 italic">暂无子事项</p>
                    ) : (
                      subtasks.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between gap-2 p-1 rounded bg-zinc-50 dark:bg-zinc-800/80 text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => onToggleSubtask?.(st)}
                              className="text-zinc-400 hover:text-lime-600"
                            >
                              <CheckCircle2
                                className={`w-3 h-3 ${
                                  st.status === 'done' || st.status === 'completed' ? 'text-lime-600 fill-lime-100' : 'text-zinc-300 dark:text-zinc-600'
                                }`}
                              />
                            </button>
                            <span
                              className={`truncate ${
                                st.status === 'done' || st.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              {st.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteSubtask?.(st.id)}
                            className="text-zinc-400 hover:text-red-500 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const title = (newSubtaskInputMap[item.id] || '').trim();
                        if (title && onAddSubtask) {
                          onAddSubtask(item.id, title);
                          setNewSubtaskInputMap((prev) => ({ ...prev, [item.id]: '' }));
                        }
                      }}
                      className="pt-1 flex items-center gap-1"
                    >
                      <input
                        type="text"
                        value={newSubtaskInputMap[item.id] || ''}
                        onChange={(e) =>
                          setNewSubtaskInputMap({ ...newSubtaskInputMap, [item.id]: e.target.value })
                        }
                        placeholder="+ 子事项…"
                        className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-[10px] focus:outline-none dark:text-white"
                      />
                      <button
                        type="submit"
                        className="px-2 py-0.5 bg-zinc-900 dark:bg-lime-400 text-white dark:text-zinc-950 font-bold text-[9px] rounded"
                      >
                        加
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Form or Trigger button */}
      <div className="pt-2 border-t border-[#E2E4ED] dark:border-[rgba(255,255,255,0.06)] shrink-0">
        {showInput ? (
          <form onSubmit={handleAddSubmit} className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="输入待办标题回车保存…"
              className="flex-1 bg-[#F3F4F8] dark:bg-[#232832] border border-[#E2E4ED] dark:border-transparent rounded-full px-3.5 py-1.5 text-xs text-[#181A20] dark:text-white placeholder-[#9CA3AF] focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#181A20] dark:bg-white text-white dark:text-[#181A20] text-xs font-bold rounded-full"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setShowInput(false)}
              className="px-2 py-1.5 text-xs text-[#9CA3AF] hover:text-[#181A20]"
            >
              取消
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="w-full py-1.5 text-xs font-semibold text-[#6B7280] dark:text-[#9AA4AD] hover:text-[#181A20] dark:hover:text-white flex items-center justify-center gap-1 rounded-full hover:bg-[#F3F4F8] dark:hover:bg-[#232832] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>加一条待办事项</span>
          </button>
        )}
      </div>
    </div>
  );
};
