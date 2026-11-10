import React, { useRef, useState } from 'react';
import { X, Download, Upload, Laptop, Smartphone, CheckCircle2, ShieldCheck, HardDriveDownload, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { StorageService } from '../utils/storage';
import { TaskItem, JournalEntry } from '../types';

interface LocalAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (items: TaskItem[], journals: JournalEntry[]) => void;
  showToast: (msg: string) => void;
}

export const LocalAppModal: React.FC<LocalAppModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  showToast,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleDownloadStandaloneHtml = async () => {
    try {
      const { STANDALONE_HTML } = await import('../utils/standaloneHtml');
      const blob = new Blob([STANDALONE_HTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DayNight_昼夜簿_单文件本地版.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('已开始下载单文件离线版！双击即可在本地电脑运行。');
    } catch (err) {
      console.error(err);
      showToast('下载失败，请重试');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dateStr = await StorageService.exportFullBackup();
      showToast(`已成功导出本地全量数据备份文件 (${dateStr}.json)`);
    } catch (e) {
      console.error(e);
      showToast('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const { items, journals } = await StorageService.importFullBackup(content);
        onImportSuccess(items, journals);
        showToast('已成功导入恢复本地数据文件！');
        onClose();
      } catch (err) {
        console.error(err);
        showToast('导入失败：格式不正确');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lime-400/20 text-lime-700 dark:text-lime-400 flex items-center justify-center font-bold">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                本地独立应用与数据安全
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                支持一键下载本地单文件应用，每一步数据 100% 自动保存在本地
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Status banner */}
          <div className="p-4 rounded-2xl bg-lime-50 dark:bg-lime-950/30 border border-lime-200 dark:border-lime-900/40 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-lime-600 dark:text-lime-400 shrink-0 mt-0.5" />
            <div className="text-xs text-lime-900 dark:text-lime-200 leading-relaxed">
              <strong>本地存储保护机制：</strong> 您的所有待办、四象限分类、日记和日志均使用浏览器原生的 <strong>IndexedDB 离线数据库</strong> 自动实时保存。无需网络、无服务器上传风险，即使断网或重启电脑，数据依然完好如初。
            </div>
          </div>

          {/* Action 1: Download Standalone Single HTML File (Double-click & run offline) */}
          <div className="p-5 rounded-2xl border-2 border-lime-400/80 bg-lime-400/10 dark:bg-lime-400/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HardDriveDownload className="w-5 h-5 text-lime-700 dark:text-lime-400" />
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  一键下载双击即用单文件 (.html)
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-lime-400 text-zinc-950 font-extrabold text-[10px]">
                推荐：本地直接双击运行
              </span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              下载保存到电脑后，<strong>在本地双击打开此 HTML 文件</strong>，即可直接在 Chrome/Edge/Safari 中零延迟运行，完全无需安装任何依赖或服务器！您的每一个待办事项与日记都会<strong>100% 自动保存在您电脑的本地数据库</strong>中。
            </p>

            <button
              onClick={handleDownloadStandaloneHtml}
              className="w-full py-3 px-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              点击下载单文件本地版 (DayNight_昼夜簿_单文件本地版.html)
            </button>
          </div>

          {/* Action 2: Install Desktop PWA App */}
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Laptop className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  方式二：生成桌面独立窗口应用 (PWA)
                </span>
              </div>
              {isInstalled && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 已在本地运行
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              生成本地独立窗口与桌面图标，像原生桌面软件一样点击即开，无浏览器地址栏，离线零延迟运行。
            </p>

            {isInstallable ? (
              <button
                onClick={install}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black dark:bg-lime-400 dark:hover:bg-lime-300 text-white dark:text-zinc-950 font-semibold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                点击直接安装到电脑桌面 / 应用程序列表
              </button>
            ) : isIOS ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                <strong>iPhone / iPad 安装说明：</strong> 点击 Safari 底部分享按钮 ➔ 选择「添加到主屏幕」即可生成独立 App。
              </div>
            ) : isInstalled ? (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                您当前正运行在本地 PWA 独立窗口中，拥有最佳的性能与自动本地存储体验。
              </div>
            ) : (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <p className="font-medium text-zinc-700 dark:text-zinc-300">浏览器手动生成桌面应用：</p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-500 dark:text-zinc-400">
                  <li><strong>Chrome / Edge：</strong> 点击地址栏右侧小图标或菜单 ➔ 「保存和分享」 ➔ 「安装为应用」。</li>
                  <li><strong>Safari：</strong> 点击菜单栏「文件」 ➔ 「添加到 Dock 栏」。</li>
                </ol>
              </div>
            )}
          </div>

          {/* Action 2: Backup & Export File */}
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Download className="w-5 h-5 text-lime-600 dark:text-lime-400" />
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  导出为物理文件 (.json 备份)
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              将本地所有任务、四象限分类、日记与撤销日志打包打包为一个 JSON 备份文件，存放在您电脑的任何文件夹或 U 盘中。
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium text-xs transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                {isExporting ? '导出中...' : '一键导出本地备份文件'}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                {isImporting ? '导入中...' : '从本地备份文件恢复'}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
