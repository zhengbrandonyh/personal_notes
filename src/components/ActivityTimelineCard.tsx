import React from 'react';
import { Calendar, ChevronRight, Clock, Flag } from 'lucide-react';
import { TaskItem, DomainType } from '../types';

interface ActivityTimelineCardProps {
  items: TaskItem[];
  currentDomain: DomainType;
  onSelectItem: (item: TaskItem) => void;
  onNavigateToCalendar: () => void;
}

export const ActivityTimelineCard: React.FC<ActivityTimelineCardProps> = ({
  items,
  currentDomain,
  onSelectItem,
  onNavigateToCalendar,
}) => {
  const activeItems = items.filter(
    (i) => !i.deletedAt && (currentDomain === 'all' || i.domain === currentDomain)
  );

  // Time slots for today's timeline: 08:00 to 24:00 (strictly 8:00-24:00)
  const timeHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

  // Helper to format hour labels
  const formatHourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

  // Find scheduled items for today
  const scheduledItems = activeItems.filter((i) => i.scheduledStart);
  const displayItems = scheduledItems.length > 0 ? scheduledItems : activeItems.slice(0, 3);

  return (
    <div className="semi-card p-5 flex flex-col h-[340px] md:h-[380px] relative overflow-hidden bg-white dark:bg-[#232326] border border-[#e5e6eb] dark:border-[#333336] rounded-xl shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e5e6eb] dark:border-[#333336] shrink-0">
        <div>
          <h3 className="font-bold text-sm text-[#1d2129] dark:text-[#f2f3f5]">
            今日排期活动 (08:00—24:00)
          </h3>
          <p className="text-[11px] text-[#86909c]">
            当日专注排期时间轴与事件分布
          </p>
        </div>

        <button
          onClick={onNavigateToCalendar}
          className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-[#165dff] bg-[#e8f3ff] hover:bg-[#d0e6ff] dark:bg-[#165dff]/20 dark:text-[#4080ff] rounded-lg transition-all"
          title="打开全屏日历"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>全景日历</span>
        </button>
      </div>

      {/* Horizontal Gantt / Timeline Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pt-4 pb-2 relative">
        <div className="relative min-w-[850px] h-full flex flex-col justify-between">
          {/* Time axis header */}
          <div className="grid grid-cols-17 border-b border-[#e5e6eb] dark:border-[#333336] pb-2 text-[10px] font-mono text-[#86909c]">
            {timeHours.map((h) => (
              <div key={h} className="text-center relative">
                <span>{formatHourLabel(h)}</span>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-[#e5e6eb] dark:border-[#333336]" />
              </div>
            ))}
          </div>

          {/* Vertical grid lines */}
          <div className="absolute inset-x-0 top-7 bottom-0 grid grid-cols-17 pointer-events-none">
            {timeHours.map((h) => (
              <div
                key={h}
                className="border-r border-dashed border-[#e5e6eb]/60 dark:border-[#333336]/60 h-full"
              />
            ))}
          </div>

          {/* Current time vertical indicator line (at 12:00) */}
          <div className="absolute top-0 bottom-0 left-[25%] z-20 pointer-events-none flex flex-col items-center">
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#165dff] text-white shadow-xs -mt-1">
              12:00
            </span>
            <div className="w-[1.5px] flex-1 bg-[#165dff] opacity-80" />
          </div>

          {/* Scheduled activity blocks */}
          <div className="relative flex-1 py-4 space-y-3 z-10">
            {displayItems.map((item, idx) => {
              const colors = [
                {
                  bg: 'bg-[#e8f3ff] dark:bg-[#165dff]/20',
                  text: 'text-[#165dff] dark:text-[#4080ff]',
                  border: 'border-[#165dff]/30',
                },
                {
                  bg: 'bg-[#fff7e8] dark:bg-[#ff7d00]/20',
                  text: 'text-[#ff7d00] dark:text-[#ffa940]',
                  border: 'border-[#ff7d00]/30',
                },
                {
                  bg: 'bg-[#f2f3f5] dark:bg-[#2e2e33]',
                  text: 'text-[#1d2129] dark:text-[#f2f3f5]',
                  border: 'border-[#c9cdd4] dark:border-[#4e4e52]',
                },
              ];

              const scheme = colors[idx % colors.length];
              const leftOffsets = ['4%', '32%', '60%'];
              const widths = ['26%', '26%', '26%'];

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className={`absolute rounded-xl p-2.5 border shadow-2xs cursor-pointer hover:scale-[1.01] transition-all flex items-center justify-between ${scheme.bg} ${scheme.border} ${scheme.text}`}
                  style={{
                    top: `${idx * 52 + 8}px`,
                    left: leftOffsets[idx % leftOffsets.length],
                    width: widths[idx % widths.length],
                  }}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-bold text-xs truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] opacity-80 font-mono truncate">
                      {item.scheduledStart?.slice(11, 16) || '排期'} {item.scheduledEnd ? `~ ${item.scheduledEnd.slice(11, 16)}` : ''}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/70 dark:bg-black/30 font-semibold shrink-0">
                    {item.domain === 'work' ? '工作' : '生活'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom legend */}
          <div className="flex items-center justify-between pt-2 border-t border-[#e5e6eb] dark:border-[#333336] text-[10px] text-[#86909c]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#165dff]" />
                今日时间段排期 (8:00~24:00)
              </span>
            </div>
            <span>点击可直接编辑起止时间</span>
          </div>
        </div>
      </div>
    </div>
  );
};
