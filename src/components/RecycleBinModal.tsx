import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, X } from 'lucide-react';
import { TaskItem } from '../types';

interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedItems: TaskItem[];
  onRestoreItem: (id: string) => void;
  onPermanentlyDeleteOld: () => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  isOpen,
  onClose,
  deletedItems,
  onRestoreItem,
  onPermanentlyDeleteOld,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#181B22] border border-[#E2E4ED] dark:border-[rgba(255,255,255,0.08)] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-[#E2E4ED] dark:border-[rgba(255,255,255,0.06)] pb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[#F97316]" />
            <h3 className="font-bold text-base tracking-tight text-[#181A20] dark:text-[#F3F5F6]">
              回收站 ({deletedItems.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-[#181A20] dark:hover:text-white rounded-full hover:bg-[#F3F4F8] dark:hover:bg-[#252A36]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#6B7280] dark:text-[#9AA4AD]">
          删除的事项在此保留 30 天，可随时一键恢复。30 天后系统自动彻底清理。
        </p>

        {/* Deleted List */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {deletedItems.length === 0 ? (
            <p className="text-center text-xs text-[#9CA3AF] py-10 font-medium">
              回收站为空，没有任何已删除事项。
            </p>
          ) : (
            deletedItems.map((item) => {
              const daysLeft = item.deletedAt
                ? Math.max(
                    0,
                    30 -
                      Math.floor(
                        (Date.now() - new Date(item.deletedAt).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                  )
                : 30;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-[#E2E4ED] dark:border-[rgba(255,255,255,0.08)] bg-[#F8F9FD] dark:bg-[#1E222B] flex items-center justify-between gap-3 text-xs shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-[#181A20] dark:text-[#F3F5F6] truncate">
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-[#6B7280] dark:text-[#9AA4AD] font-mono-code">
                      剩余 {daysLeft} 天自动清除 · {item.domain === 'work' ? '工作域' : '生活域'}
                    </span>
                  </div>

                  <button
                    onClick={() => onRestoreItem(item.id)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs bg-white dark:bg-[#252A36] hover:bg-[#F3F4F8] dark:hover:bg-[#2D3342] text-[#181A20] dark:text-white rounded-full border border-[#E2E4ED] dark:border-[rgba(255,255,255,0.08)] transition-all font-semibold shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3 text-[#A3E635]" />
                    <span>恢复</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Permanent Clear option */}
        {deletedItems.length > 0 && (
          <div className="pt-3 border-t border-[#E2E4ED] dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs">
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="text-[#F97316] hover:underline font-medium"
              >
                清理 30 天以上的历史数据…
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[#F97316] flex items-center gap-1 text-[11px] font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> 确认不可逆物理清除？
                </span>
                <button
                  onClick={() => {
                    onPermanentlyDeleteOld();
                    setConfirmClear(false);
                  }}
                  className="px-2.5 py-1 bg-[#F97316]/15 text-[#C2410C] dark:text-[#FDBA74] border border-[#F97316]/30 rounded-full font-semibold hover:bg-[#F97316]/25"
                >
                  确定彻底清除
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 text-[#6B7280] dark:text-[#9AA4AD] hover:text-[#181A20]"
                >
                  取消
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#181A20] text-white dark:bg-white dark:text-[#181A20] rounded-full font-semibold shadow-xs hover:opacity-90 transition-all"
            >
              完成
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
