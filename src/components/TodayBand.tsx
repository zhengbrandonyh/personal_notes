import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Clock, CalendarDays, ArrowRight } from 'lucide-react';
import { TaskItem, DomainType } from '../types';
import { isItemImpending, isItemOverdue, getDueStatusText } from '../utils/quadrant';

interface TodayBandProps {
  items: TaskItem[];
  currentDomain: DomainType;
  onSelectItem: (item: TaskItem) => void;
  onToggleComplete: (item: TaskItem) => void;
  onNavigateToCalendar: () => void;
}

export const TodayBand: React.FC<TodayBandProps> = ({
  items,
  currentDomain,
  onSelectItem,
  onToggleComplete,
  onNavigateToCalendar,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Active items within domain
  const activeItems = items.filter(
    (i) => !i.deletedAt && !i.parentId && (currentDomain === 'all' || i.domain === currentDomain)
  );

  // Important incomplete items
  const importantItems = activeItems.filter(
    (i) => i.importance === true && i.status !== 'done' && i.status !== 'completed'
  );

  // Impending items (<= 48h or overdue)
  const impendingItems = activeItems.filter((i) => isItemImpending(i));

  // Unscheduled items (no scheduledStart)
  const unscheduledItems = activeItems.filter(
    (i) => !i.scheduledStart && i.status !== 'done' && i.status !== 'completed'
  );

  const top3 = importantItems.slice(0, 3);

  return (
    <div className="border-b border-[#23282F] bg-[#0D0F12]/80 backdrop-blur-sm transition-all duration-300">
      <div className="max-w-[1700px] mx-auto px-4 py-1.5 flex items-center justify-between text-xs">
        {/* Left summary counter */}
        <div className="flex items-center gap-2 text-[#9AA4AD]">
          <span className="font-medium text-[#F3F5F6]">今日带：</span>
          <span className="inline-flex items-center gap-1">
            <span className="text-[#C8FF3D] font-mono-code font-semibold">
              {importantItems.length}
            </span>{' '}
            件要事
          </span>
          <span className="text-[#38424F]">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="text-[#FF8A3D] font-mono-code font-semibold">
              {impendingItems.length}
            </span>{' '}
            件临期
          </span>
          <span className="text-[#38424F]">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="text-[#9AA4AD] font-mono-code font-semibold">
              {unscheduledItems.length}
            </span>{' '}
            件未安排
          </span>
        </div>

        {/* Right expand toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[#9AA4AD] hover:text-[#F3F5F6] transition-colors py-0.5 px-2 rounded hover:bg-[#14171C]"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? '收起今日清单' : '展开今日清单'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Today Drawer */}
      {isExpanded && (
        <div className="border-t border-[#1C2027] bg-[#0A0C0E] px-4 py-3 animate-fadeIn">
          <div className="max-w-[1700px] mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5C666F]">
                今日优先聚焦（前 3 项要事）
              </span>
              <button
                onClick={onNavigateToCalendar}
                className="text-xs text-[#9AA4AD] hover:text-[#C8FF3D] flex items-center gap-1 transition-colors"
              >
                在日历中排期 <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {top3.length === 0 ? (
              <p className="text-xs text-[#5C666F] py-2">
                今天没有待处理的重要事项。保持平稳节奏，或从待分类中挑选事项。
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {top3.map((item) => {
                  const dueInfo = getDueStatusText(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      className={`group relative flex items-start gap-2.5 p-2.5 rounded-lg border bg-[#14171C] hover:bg-[#1C2027] transition-all cursor-pointer ${
                        dueInfo.isOverdue
                          ? 'border-[#FF8A3D]/40 hatched-overdue'
                          : 'border-[#23282F] hover:border-[#38424F]'
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(item);
                        }}
                        className="mt-0.5 text-[#5C666F] hover:text-[#C8FF3D] transition-colors"
                        aria-label={`标记完成 ${item.title}`}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            item.status === 'done' || item.status === 'completed' ? 'text-[#C8FF3D]' : 'text-[#5C666F]'
                          }`}
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.domain === 'work' ? 'bg-[#C8FF3D]' : 'bg-[#FFB03A]'
                            }`}
                          />
                          <h4 className="text-xs font-medium text-[#F3F5F6] truncate group-hover:text-white">
                            {item.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#5C666F]">
                          {dueInfo.text && (
                            <span
                              className={`flex items-center gap-1 ${
                                dueInfo.isOverdue ? 'text-[#FF8A3D]' : 'text-[#9AA4AD]'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {dueInfo.text}
                            </span>
                          )}
                          {item.scheduledStart && (
                            <span className="flex items-center gap-1 text-[#9AA4AD]">
                              <CalendarDays className="w-3 h-3" />
                              已排期
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
