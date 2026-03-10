'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, X, AlertTriangle, Clock, Rocket, CheckCheck } from 'lucide-react';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';

const TYPE_CONFIG: Record<AppNotification['type'], { icon: React.ElementType; color: string; bgColor: string }> = {
  overdue: { icon: AlertTriangle, color: '#EF4444', bgColor: '#FEE2E2' },
  due_soon: { icon: Clock, color: '#F59E0B', bgColor: '#FEF3C7' },
  launch_approaching: { icon: Rocket, color: '#3B82F6', bgColor: '#DBEAFE' },
  in_progress: { icon: Clock, color: '#8B5CF6', bgColor: '#EDE9FE' },
};

export function NotificationBell() {
  const { notifications, unreadCount, dismiss, dismissAll, loading } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
        title="Notifications"
      >
        <Bell className="h-4 w-4 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[28rem] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={dismissAll}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[22rem]">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">All caught up!</p>
                <p className="text-xs text-gray-300 mt-0.5">Al dia con todo</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => {
                  const config = TYPE_CONFIG[notif.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={notif.id}
                      className="group flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: config.bgColor }}
                      >
                        <Icon className="h-4 w-4" style={{ color: config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/collection/${notif.collection_id}`}
                          onClick={() => setOpen(false)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-1"
                        >
                          {notif.title}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{notif.body}</p>
                      </div>
                      <button
                        onClick={() => dismiss(notif.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded-md"
                      >
                        <X className="h-3 w-3 text-gray-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
