import React, { useEffect, useState } from 'react';
import { WifiOff, HardDrive } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 rounded-2xl bg-zinc-900/90 dark:bg-zinc-100/90 text-white dark:text-zinc-900 px-4 py-2.5 text-xs font-medium shadow-2xl backdrop-blur-md border border-white/10 animate-fade-in">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="flex items-center gap-1.5">
        <span>离线模式 — 正在使用本地电脑 IndexedDB 数据</span>
        <HardDrive className="w-3.5 h-3.5 opacity-70" />
      </div>
    </div>
  );
};
