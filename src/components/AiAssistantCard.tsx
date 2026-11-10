import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Check,
  CheckSquare,
  Square,
  RotateCcw,
  Bot,
  HelpCircle,
  Settings,
  Paperclip,
  Mic,
} from 'lucide-react';
import { TaskItem, JournalEntry, DomainType, AIPreviewBatch } from '../types';
import { AIService, AIChatMessage } from '../utils/ai';

interface AiAssistantCardProps {
  items: TaskItem[];
  journals: JournalEntry[];
  currentDomain: DomainType;
  selectedItem: TaskItem | null;
  onExecuteBatchActions: (batch: AIPreviewBatch) => void;
  onUndoLastAction: () => void;
}

export const AiAssistantCard: React.FC<AiAssistantCardProps> = ({
  items,
  journals,
  currentDomain,
  selectedItem,
  onExecuteBatchActions,
  onUndoLastAction,
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'init_welcome',
      role: 'assistant',
      content:
        '早安！我是你的事项规划助理。今天有几件核心要事，要我帮你排进今日活动时间轴吗？',
      createdAt: '09:30',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt || inputVal).trim();
    if (!text || loading) return;

    const userMsg: AIChatMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: text,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    try {
      const resp = await AIService.processPrompt(
        text,
        items,
        journals,
        currentDomain,
        selectedItem?.id
      );
      setMessages((prev) => [...prev, resp]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: '服务暂时不可用，你的草稿依然保留在本地。',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActionSelect = (msgId: string, actionId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.previewBatch) return m;
        return {
          ...m,
          previewBatch: {
            ...m.previewBatch,
            actions: m.previewBatch.actions.map((act) =>
              act.id === actionId ? { ...act, selected: !act.selected } : act
            ),
          },
        };
      })
    );
  };

  const handleConfirmBatch = (msgId: string, batch: AIPreviewBatch) => {
    const selectedActions = batch.actions.filter((a) => a.selected);
    if (selectedActions.length === 0) return;

    onExecuteBatchActions({
      ...batch,
      actions: selectedActions,
      status: 'executed',
    });

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.previewBatch
          ? {
              ...m,
              previewBatch: { ...m.previewBatch, status: 'executed' },
            }
          : m
      )
    );
  };

  return (
    <div className="clay-card p-5 flex flex-col h-[340px] md:h-[380px] relative overflow-hidden">
      {/* Top Bar of the Assistant Card (matching reference icons) */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E4ED] dark:border-[rgba(255,255,255,0.06)] shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-full bg-[#181A20] dark:bg-white text-white dark:text-[#181A20] flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-[#A3E635] dark:text-[#181A20]" />
          </div>
          <div className="flex flex-col ml-1">
            <span className="font-bold text-xs text-[#181A20] dark:text-[#F3F5F6]">
              AI 规划助手
            </span>
            <span className="text-[10px] text-[#9CA3AF]">确认前零写入</span>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => handleSend('拆解当前选中的事项为具体步骤')}
            className="px-2.5 py-1 text-[11px] font-medium bg-[#F3F4F8] dark:bg-[#232832] hover:bg-[#E5E7EB] dark:hover:bg-[#2C323F] text-[#4B5563] dark:text-[#9AA4AD] rounded-full transition-all"
          >
            拆解步骤
          </button>
          <button
            onClick={() => handleSend('安排未排期的重要事项到今天日程')}
            className="px-2.5 py-1 text-[11px] font-medium bg-[#F3F4F8] dark:bg-[#232832] hover:bg-[#E5E7EB] dark:hover:bg-[#2C323F] text-[#4B5563] dark:text-[#9AA4AD] rounded-full transition-all"
          >
            排定今日
          </button>
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Bubble */}
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#181A20] dark:bg-white text-white dark:text-[#181A20] rounded-br-none shadow-sm'
                  : 'bg-[#F3F4F8] dark:bg-[#232832] text-[#181A20] dark:text-[#F3F5F6] rounded-tl-none border border-[#E2E4ED]/50 dark:border-[rgba(255,255,255,0.04)]'
              }`}
            >
              <p>{msg.content}</p>

              {/* Interactive Preview Card before writing (PRD 7.9.3) */}
              {msg.previewBatch && (
                <div className="mt-3 p-3 bg-white dark:bg-[#181B22] rounded-xl border border-[#E2E4ED] dark:border-[rgba(255,255,255,0.08)] shadow-sm space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[rgba(255,255,255,0.06)] pb-1.5">
                    <span className="font-bold text-[11px] text-[#181A20] dark:text-white flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#A3E635]" />
                      {msg.previewBatch.summary}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">
                      共 {msg.previewBatch.actions.length} 项
                    </span>
                  </div>

                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {msg.previewBatch.actions.map((act) => (
                      <div
                        key={act.id}
                        onClick={() =>
                          msg.previewBatch?.status === 'pending' &&
                          handleToggleActionSelect(msg.id, act.id)
                        }
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg text-[11px] transition-all ${
                          msg.previewBatch?.status === 'pending' ? 'cursor-pointer' : ''
                        } ${
                          act.selected
                            ? 'bg-[#F3F4F8] dark:bg-[#232832] text-[#181A20] dark:text-white font-medium'
                            : 'opacity-40 text-[#9CA3AF]'
                        }`}
                      >
                        <button type="button" className="text-[#A3E635] dark:text-[#C8FF3D]">
                          {act.selected ? (
                            <CheckSquare className="w-3.5 h-3.5" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          )}
                        </button>
                        <span className="truncate">{act.title}</span>
                      </div>
                    ))}
                  </div>

                  {msg.previewBatch.status === 'pending' ? (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmBatch(msg.id, msg.previewBatch!)}
                        className="flex-1 py-1.5 bg-[#181A20] dark:bg-white text-white dark:text-[#181A20] hover:opacity-90 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>确认执行</span>
                      </button>
                      <button
                        onClick={() =>
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.id === msg.id && m.previewBatch
                                ? { ...m, previewBatch: { ...m.previewBatch, status: 'cancelled' } }
                                : m
                            )
                          )
                        }
                        className="px-2.5 py-1.5 text-[11px] text-[#9CA3AF] hover:text-[#181A20] bg-[#F3F4F8] dark:bg-[#232832] rounded-lg"
                      >
                        取消
                      </button>
                    </div>
                  ) : msg.previewBatch.status === 'executed' ? (
                    <div className="flex items-center justify-between text-[11px] text-[#16A34A] dark:text-[#A3E635] pt-1">
                      <span>✓ 已成功写入数据</span>
                      <button
                        onClick={onUndoLastAction}
                        className="text-[11px] text-[#6B7280] dark:text-[#9AA4AD] hover:underline flex items-center gap-0.5"
                      >
                        <RotateCcw className="w-3 h-3" /> 撤销
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#9CA3AF] block pt-1">已取消本次建议变更</span>
                  )}
                </div>
              )}
            </div>

            <span className="text-[9px] text-[#9CA3AF] px-1 mt-0.5 font-mono-code">
              {msg.createdAt || '刚刚'}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] p-2">
            <span className="w-2 h-2 rounded-full bg-[#A3E635] animate-ping" />
            <span>AI 正在分析并起草方案…</span>
          </div>
        )}
      </div>

      {/* Input box matching reference: "Write a message" with clip and mic */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-2 border-t border-[#E2E4ED] dark:border-[rgba(255,255,255,0.06)] shrink-0"
      >
        <div className="relative flex items-center bg-[#F3F4F8] dark:bg-[#232832] rounded-full px-4 py-2 border border-[#E2E4ED] dark:border-transparent focus-within:ring-2 focus-within:ring-[#181A20]/10 transition-all">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="告诉 AI 你想规划或拆解什么…"
            className="flex-1 bg-transparent text-xs text-[#181A20] dark:text-[#F3F5F6] placeholder-[#9CA3AF] focus:outline-none"
          />

          <div className="flex items-center gap-1.5 text-[#9CA3AF]">
            <button
              type="submit"
              disabled={!inputVal.trim() || loading}
              className="p-1 rounded-full bg-[#181A20] dark:bg-white text-white dark:text-[#181A20] disabled:opacity-40 hover:scale-105 transition-all shadow-sm"
              aria-label="发送消息"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
