import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './apple-theme.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DayNight Root caught error:', error, errorInfo);
  }

  handleReset = () => {
    const snapshot: Record<string,string|null>={};
    for(const key of ['daynight_data_v2','daynight_tasks_v1','daynight_notes_v1','daynight_before_replace_v2'])snapshot[key]=localStorage.getItem(key);
    const a=document.createElement('a');const u=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));a.href=u;a.download='daynight-recovery-raw.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f6f3] text-[#202822] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#222e27] text-[#d5f6b1] text-2xl font-bold flex items-center justify-center mb-4 shadow-sm">
            ◐
          </div>
          <h2 className="text-xl font-bold mb-2">暂时无法打开</h2>
          <p className="text-xs text-[#7c847c] max-w-md mb-6 leading-relaxed">
            检测到本地存储或界面状态异常（{this.state.error?.message || '未知异常'}）。请先导出原始数据用于恢复，再尝试重新加载。系统不会自动清空记录。
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#28392c] text-white text-xs font-semibold rounded-xl hover:bg-[#1e2c22] transition-colors"
            >
              重新加载
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-white text-[#bd5144] border border-[#e5e9e0] text-xs font-semibold rounded-xl hover:bg-[#faf2e7] transition-colors"
            >
              导出原始数据
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);

