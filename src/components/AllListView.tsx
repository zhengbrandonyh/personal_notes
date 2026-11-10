import {taskSubtasks} from '../utils/subtaskNodes';
import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Trash2,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  Flag,
  Check,
} from 'lucide-react';
import { TaskItem, DomainType, QuadrantId } from '../types';
import { getDueStatusText, calculateSubtaskProgress } from '../utils/quadrant';

interface AllListViewProps {
  items: TaskItem[];
  allSubtasks: TaskItem[];
  currentDomain: DomainType;
  onSelectItem: (item: TaskItem) => void;
  onToggleComplete: (item: TaskItem) => void;
  onBatchComplete: (itemIds: string[]) => void;
  onBatchDelete: (itemIds: string[]) => void;
  onBatchMoveQuadrant: (itemIds: string[], targetQid: QuadrantId) => void;
}

export const AllListView: React.FC<AllListViewProps> = ({
  items,
  allSubtasks,
  currentDomain,
  onSelectItem,
  onToggleComplete,
  onBatchComplete,
  onBatchDelete,
  onBatchMoveQuadrant,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const activeItems = items.filter(
    (i) => !i.deletedAt && !i.parentId && (currentDomain === 'all' || i.domain === currentDomain)
  );

  // Collect all unique tags
  const allTags = Array.from(new Set(activeItems.flatMap((i) => i.tags)));

  const filteredItems = filterTag
    ? activeItems.filter((i) => i.tags.includes(filterTag))
    : activeItems;

  const now = new Date();
  const todayStr = now.toDateString();
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()));

  const groups = {
    today: [] as TaskItem[],
    thisWeek: [] as TaskItem[],
    later: [] as TaskItem[],
    noDate: [] as TaskItem[],
    completed: [] as TaskItem[],
  };

  filteredItems.forEach((item) => {
    if (item.status === 'done' || item.status === 'completed') {
      groups.completed.push(item);
      return;
    }

    const dateToCompare = item.dueAt || item.scheduledStart;
    if (!dateToCompare) {
      groups.noDate.push(item);
      return;
    }

    const d = new Date(dateToCompare);
    if (d.toDateString() === todayStr) {
      groups.today.push(item);
    } else if (d > now && d <= endOfWeek) {
      groups.thisWeek.push(item);
    } else if (d > endOfWeek) {
      groups.later.push(item);
    } else {
      // Overdue or past dates fall into today/urgent bucket
      groups.today.push(item);
    }
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const renderGroup = (title: string, list: TaskItem[], countBadge?: string) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 px-1">
          <span className="font-bold text-sm tracking-tight text-[#181A20] dark:text-[#F3F5F6]">
            {title}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono-code font-bold bg-[#F3F4F8] dark:bg-[#1E222B] text-[#6B7280] dark:text-[#9AA4AD] border border-[#E2E4ED] dark:border-[rgba(255,255,255,0.08)]">
            {list.length}
          </span>
          {countBadge && (
            <span className="text-xs text-[#9CA3AF]">· {countBadge}</span>
          )}
        </div>

        <div className="space-y-2">
          {list.map((item) => {
            const dueInfo = getDueStatusText(item);
            const isSelected = selectedIds.has(item.id);
            const childItems = allSubtasks.filter((s) => s.parentId === item.id).map((s) => ({ id: s.id, title: s.title, done: s.status === 'done' || s.status === 'completed' }));
            const subtasks = [...taskSubtasks(item), ...childItems];
            const progress = calculateSubtaskProgress(subtasks);

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`group flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                  isSelected
                    ? 'border-[#A3E635] bg-[#A3E635]/10 dark:bg-[#A3E635]/15'
                    : dueInfo.isOverdue
                      ? 'border-[#F97316]/50 bg-white dark:bg-[#181B22] hatched-overdue'
                      : 'border-[#E2E4ED] dark:border-[rgba(255,255,255,0.08)] bg-[#F8F9FD] dark:bg-[#181B22] hover:bg-white dark:hover:bg-[#1E222B]'
                }`}
              >
                {/* Multi-select checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelect(item.id);
                  }}
                  className="w-4 h-4 rounded-md border-[#CBD5E1] dark:border-[#38424F] text-[#181A20] dark:text-white focus:ring-0 cursor-pointer"
                  aria-label={`选择事项 ${item.title}`}
                />

                {/* Status toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(item);
                  }}
                  className="text-[#9CA3AF] hover:text-[#A3E635] transition-colors"
                  aria-label={`完成 ${item.title}`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      item.status === 'done' || item.status === 'completed'
                        ? 'text-[#A3E635] fill-[#A3E635]/20'
                        : 'text-[#CBD5E1] dark:text-[#38424F] group-hover:text-[#9CA3AF]'
                    }`}
                  />
                </button>

                {/* Left domain bar in 'all' view */}
                {currentDomain === 'all' && (
                  <span
                    className={`w-1 h-4 rounded-full ${
                      item.domain === 'work' ? 'bg-[#A3E635]' : 'bg-[#F59E0B]'
                    }`}
                  />
                )}

                {/* Title and tags */}
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-semibold truncate ${
                      item.status === 'done' || item.status === 'completed'
                        ? 'line-through text-[#9CA3AF] dark:text-[#626D7A]'
                        : 'text-[#181A20] dark:text-[#F3F5F6]'
                    }`}
                  >
                    {item.title}
                  </span>

                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono-code bg-white dark:bg-[#252A36] text-[#6B7280] dark:text-[#9AA4AD] border border-[#E2E4ED] dark:border-[rgba(255,255,255,0.08)] shadow-2xs"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Metadata: Subtask progress and Due date */}
                <div className="flex items-center gap-3 text-xs font-mono-code shrink-0">
                  {progress.total > 0 && (
                    <div className="flex items-center gap-1 text-[#6B7280] dark:text-[#9AA4AD]">
                      <Layers className="w-3.5 h-3.5 text-[#9CA3AF]" />
                      <span>{progress.completed}/{progress.total}</span>
                    </div>
                  )}

                  {dueInfo.text && (
                    <span
                      className={`flex items-center gap-1 ${
                        dueInfo.isOverdue
                          ? 'text-[#F97316] font-semibold'
                          : 'text-[#6B7280] dark:text-[#9AA4AD]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {dueInfo.text}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full overflow-y-auto">
      <div className="clay-card p-6 min-h-[600px] flex flex-col">
        {/* Top Filter & Batch Action bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-5 border-b border-[#E2E4ED] dark:border-[rgba(255,255,255,0.06)] gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSelectAll}
              className="text-xs font-semibold text-[#6B7280] dark:text-[#9AA4AD] hover:text-[#181A20] dark:hover:text-white flex items-center gap-1 bg-[#F3F4F8] dark:bg-[#1E222B] px-3 py-1.5 rounded-full border border-[#E2E4ED] dark:border-[rgba(255,255,255,0.08)] transition-all"
            >
              {selectedIds.size > 0 && selectedIds.size === filteredItems.length
                ? '取消全选'
                : '全选'}
            </button>

            {/* Tag filter chips */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <span className="text-xs text-[#9CA3AF]">标签:</span>
                <button
                  onClick={() => setFilterTag(null)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    filterTag === null
                      ? 'bg-[#181A20] text-white dark:bg-white dark:text-[#181A20] shadow-xs'
                      : 'text-[#6B7280] dark:text-[#9AA4AD] hover:text-[#181A20] dark:hover:text-white'
                  }`}
                >
                  全部
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterTag(t === filterTag ? null : t)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                      filterTag === t
                        ? 'bg-[#181A20] text-white dark:bg-white dark:text-[#181A20] shadow-xs'
                        : 'text-[#6B7280] dark:text-[#9AA4AD] hover:text-[#181A20] dark:hover:text-white'
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Batch action bar when items are selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2.5 bg-[#181A20] text-white dark:bg-white dark:text-[#181A20] px-4 py-2 rounded-full shadow-lg animate-fadeIn text-xs font-semibold">
              <span>
                已选 <strong>{selectedIds.size}</strong> 项
              </span>
              <button
                onClick={() => {
                  onBatchComplete(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }}
                className="text-[#A3E635] dark:text-[#4D7C0F] hover:underline px-1"
              >
                批量完成
              </button>
              <span className="opacity-30">|</span>
              <button
                onClick={() => {
                  onBatchMoveQuadrant(Array.from(selectedIds), 'q1');
                  setSelectedIds(new Set());
                }}
                className="hover:underline px-1"
              >
                移至Q1
              </button>
              <span className="opacity-30">|</span>
              <button
                onClick={() => {
                  onBatchDelete(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }}
                className="text-[#F97316] hover:underline px-1 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> 删除
              </button>
            </div>
          )}
        </div>

        {/* Render Lists */}
        {renderGroup('今天', groups.today)}
        {renderGroup('本周', groups.thisWeek)}
        {renderGroup('更晚', groups.later)}
        {renderGroup('没有日期', groups.noDate)}

        {/* Completed Group (Collapsible) */}
        {groups.completed.length > 0 && (
          <div className="mt-6 border-t border-[#E2E4ED] dark:border-[rgba(255,255,255,0.06)] pt-4">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] dark:text-[#9AA4AD] hover:text-[#181A20] dark:hover:text-white mb-3"
            >
              {showCompleted ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>已完成事项 ({groups.completed.length})</span>
            </button>
            {showCompleted && renderGroup('已完成', groups.completed)}
          </div>
        )}
      </div>
    </div>
  );
};
