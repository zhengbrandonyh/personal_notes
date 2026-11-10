import React from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  canUndo?: boolean;
}

interface ToastContainerProps {
  toast: ToastMessage | null;
  onUndo?: () => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toast, onUndo }) => {
  if (!toast) return null;

  return (
    <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 bg-[#28392c] text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-3 animate-fadeIn">
      <span>{toast.text}</span>
      {toast.canUndo && onUndo && (
        <button
          onClick={onUndo}
          className="text-[#c5ed91] underline hover:opacity-80 transition-opacity"
        >
          撤销
        </button>
      )}
    </div>
  );
};
