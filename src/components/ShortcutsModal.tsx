import React, { useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'N 或 /', desc: '聚焦顶栏快速捕获输入框' },
    { key: 'Enter', desc: '立即记下事项（保持焦点，支持连续输入）' },
    { key: '⌘K / Ctrl+K', desc: '打开全局搜索与命令面板' },
    { key: '⌘J / Ctrl+J', desc: '打开 / 关闭 AI 助手抽屉' },
    { key: '⌘Z / Ctrl+Z', desc: '撤销上一步操作（支持连续撤销 50 步）' },
    { key: '1 / 2 / 3', desc: '切换 工作 / 生活 / 全部 域' },
    { key: 'Q / C / L / R', desc: '切换 四象限 / 日历 / 全部 / 记录 视图' },
    { key: 'Esc', desc: '关闭详情抽屉 / 取消弹窗 / 取消拖拽' },
    { key: '?', desc: '显示本快捷键帮助' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#181B22] border border-[#E2E4ED] dark:border-[rgba(255,255,255,0.08)] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-[#E2E4ED] dark:border-[rgba(255,255,255,0.06)] pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#A3E635]" />
            <h3 className="font-bold text-base tracking-tight text-[#181A20] dark:text-[#F3F5F6]">
              键盘快捷键速查
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-[#181A20] dark:hover:text-white rounded-full hover:bg-[#F3F4F8] dark:hover:bg-[#252A36]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F9FD] dark:bg-[#1E222B] border border-[#E2E4ED] dark:border-[rgba(255,255,255,0.06)] shadow-xs"
            >
              <span className="font-medium text-[#4B5563] dark:text-[#CBD5E1]">{sc.desc}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono-code font-bold text-[#181A20] dark:text-white bg-white dark:bg-[#252A36] border border-[#E2E4ED] dark:border-[rgba(255,255,255,0.08)] rounded-lg shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
