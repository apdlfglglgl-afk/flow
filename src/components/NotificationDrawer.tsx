import React, { useState } from 'react';
import { NotificationItem, WorkOrder } from '../types/mes';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Info, 
  Check, 
  Trash2,
  ExternalLink
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectOrderById?: (orderId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSelectOrderById
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-lg">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>실시간 생산 공정 알림 센터</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold text-white bg-rose-600 px-1.5 py-0.2 rounded-full tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                공정 상태 변화, 지연 및 병목 자동 감지 알림
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar & Filter */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto text-xs no-scrollbar">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilterType('bottleneck_alert')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                filterType === 'bottleneck_alert'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              병목경보
            </button>
            <button
              onClick={() => setFilterType('delay_warning')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                filterType === 'delay_warning'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              지연주의
            </button>
            <button
              onClick={() => setFilterType('process_completed')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                filterType === 'process_completed'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              공정완료
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                title="모두 읽음 표시"
                className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded text-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClearAll}
              title="알림 목록 비우기"
              className="p-1 text-slate-400 hover:text-rose-600 rounded text-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-60" />
              <p className="text-xs">수신된 공정 알림이 없습니다.</p>
            </div>
          ) : (
            filteredNotifications.map((noti) => {
              const isBottleneck = noti.type === 'bottleneck_alert';
              const isDelay = noti.type === 'delay_warning';
              const isDone = noti.type === 'process_completed';

              return (
                <div
                  key={noti.id}
                  onClick={() => {
                    onMarkAsRead(noti.id);
                    if (noti.workOrderId && onSelectOrderById) {
                      onSelectOrderById(noti.workOrderId);
                      onClose();
                    }
                  }}
                  className={`p-3.5 transition-colors cursor-pointer ${
                    !noti.read 
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {isBottleneck ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      ) : isDelay ? (
                        <Clock className="w-4 h-4 text-amber-600" />
                      ) : isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-bold truncate ${
                          isBottleneck ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {noti.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 tabular-nums shrink-0">
                          {new Date(noti.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {noti.message}
                      </p>

                      {noti.orderNumber && (
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                          <span>{noti.orderNumber} 의뢰서 보기</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
