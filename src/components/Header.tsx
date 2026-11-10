import React from 'react';
import { DomainType, ViewMode, ThemeMode } from '../types';
import { Search, Sparkles, Plus, Download, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  currentDomain: DomainType;
  currentView: ViewMode;
  currentTheme?: ThemeMode;
  onToggleTheme?: () => void;
  onDomainChange: (domain: DomainType) => void;
  onOpenSearch: () => void;
  onOpenAi: () => void;
  onQuickCreate: () => void;
  onOpenLocalModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDomain,
  currentView,
  currentTheme = 'dark',
  onToggleTheme,
  onDomainChange,
  onOpenSearch,
  onOpenAi,
  onQuickCreate,
  onOpenLocalModal,
}) => {
  const domains: Array<{ id: DomainType; label: string }> = [
    { id: 'all', label: '全部' },
    { id: 'work', label: '工作' },
    { id: 'life', label: '生活' },
  ];

  return (
    <header className="app-header min-h-[80px] py-3 flex flex-wrap items-center justify-between border-b border-[var(--line)] dark:border-[var(--line)] gap-4 mb-2">
      <strong className="mobile-brand">江明川冲冲冲</strong>
      {/* Global Action Tools - Semi Design Buttons */}
      <div className="header-actions flex items-center gap-1.5 flex-wrap ml-auto">
        <select className="domain-select" aria-label="事项分类" value={currentDomain} onChange={e=>onDomainChange(e.target.value as DomainType)}>{domains.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select>
        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[var(--line)] dark:border-[var(--line)] rounded-lg bg-[var(--card)] dark:bg-[var(--card)] text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-[var(--raised)] dark:hover:bg-[var(--raised)] transition-all"
        >
          <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
          <span>搜索</span>
          <kbd className="hidden lg:block text-[10px] text-[var(--muted)] bg-[var(--raised)] dark:bg-[var(--bg)] px-1.5 py-0.5 rounded border border-[var(--line)] dark:border-[var(--line)] font-mono">
            ⌘ K
          </kbd>
        </button>

        {/* AI Assistant Button */}
        <button
          onClick={onOpenAi}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--line)] dark:border-[var(--line)] rounded-lg bg-[var(--card)] dark:bg-[var(--card)] text-xs font-medium text-[var(--ink)] dark:text-[var(--ink)] hover:bg-[var(--raised)] dark:hover:bg-[var(--raised)] transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>AI 助手</span>
        </button>

        {/* Download Standalone HTML Button */}
        {onOpenLocalModal && (
          <button
            onClick={onOpenLocalModal}
            title="下载为单文件离线 HTML 应用，在电脑上双击即可直接运行，数据 100% 自动保存在本地"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--primary-light)] dark:border-[var(--primary)]/30 bg-[var(--primary-light)] dark:bg-[var(--action)]/20 text-[var(--primary)] dark:text-[var(--primary-hover)] hover:bg-[#d0e6ff] rounded-lg text-xs font-medium shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span><span className="hidden sm:inline">下载为 </span>HTML</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--line)] dark:border-[var(--line)] rounded-lg bg-[var(--card)] dark:bg-[var(--card)] text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-[var(--raised)] dark:hover:bg-[var(--raised)] transition-all cursor-pointer"
            title={currentTheme === 'dark' ? '切换浅色' : '切换深色'}
            aria-label="切换明暗主题"
          >
            {currentTheme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-[var(--primary)]" />
                
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-[#ff7d00]" />
                
              </>
            )}
          </button>
        )}

        {/* Global Main Create Button - Semi Primary Blue */}
        <button
          onClick={onQuickCreate}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[var(--action)] hover:bg-[var(--action-hover)] text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{currentView === 'journal' ? '新建笔记' : '新建事项'}</span>
        </button>
      </div>
    </header>
  );
};
