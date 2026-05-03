'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, X, AlertTriangle, Clock, Rocket, CheckCheck } from 'lucide-react';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';
import { useTranslation } from '@/i18n';

// Editorial palette — terracotta for urgency, carbon at varying opacity for
// the calm states. No bright SaaS reds/blues — those break the brand.
const TYPE_CONFIG: Record<AppNotification['type'], { icon: React.ElementType; color: string; bgColor: string }> = {
  overdue: { icon: AlertTriangle, color: '#A0463C', bgColor: 'rgba(160,70,60,0.08)' },
  due_soon: { icon: Clock, color: 'rgba(0,0,0,0.7)', bgColor: 'rgba(0,0,0,0.04)' },
  launch_approaching: { icon: Rocket, color: 'rgba(0,0,0,0.7)', bgColor: 'rgba(0,0,0,0.04)' },
  in_progress: { icon: Clock, color: 'rgba(0,0,0,0.55)', bgColor: 'rgba(0,0,0,0.03)' },
};

export function NotificationBell() {
  const t = useTranslation();
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
      {/* Bell button — editorial pill, matches AssistantHeaderButton */}
      <button
        onClick={() => setOpen(!open)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-carbon/[0.04] hover:bg-carbon/[0.08] transition-colors"
        title={t.misc.notifications}
        aria-label={t.misc.notifications}
      >
        <Bell className="h-4 w-4 text-carbon/65" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#A0463C] text-white text-[10px] font-semibold leading-none px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — editorial shell */}
      {open && (
        <div className="fixed top-[64px] right-3 left-3 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-[400px] max-h-[28rem] bg-white rounded-[16px] shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-carbon/[0.06] overflow-hidden z-50 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-carbon/[0.06]">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-carbon">{t.misc.notifications}</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-carbon/[0.06] text-carbon/70 font-semibold tabular-nums">
                  {unreadCount}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={dismissAll}
                className="flex items-center gap-1 text-[11px] text-carbon/55 hover:text-carbon transition-colors"
              >
                <CheckCheck className="h-3 w-3" strokeWidth={1.75} />
                {t.misc.clearAll}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[22rem]">
            {loading && notifications.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-carbon/35">{t.misc.loadingEllipsis}</div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center px-6">
                <Bell className="h-8 w-8 mx-auto text-carbon/15 mb-3" strokeWidth={1.5} />
                <p className="text-[13px] text-carbon/55">{t.misc.allCaughtUp}</p>
                <p className="text-[11px] text-carbon/30 mt-1">{t.misc.allCaughtUpDesc}</p>
              </div>
            ) : (
              <div className="divide-y divide-carbon/[0.04]">
                {notifications.map((notif) => {
                  const config = TYPE_CONFIG[notif.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={notif.id}
                      className="group flex items-start gap-3 px-5 py-3.5 hover:bg-carbon/[0.02] transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: config.bgColor }}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} style={{ color: config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/collection/${notif.collection_id}`}
                          onClick={() => setOpen(false)}
                          className="text-[13px] font-medium text-carbon hover:text-carbon/70 line-clamp-1 tracking-[-0.01em]"
                        >
                          {notif.title}
                        </Link>
                        <p className="text-[11px] text-carbon/55 mt-0.5 line-clamp-1 leading-[1.45]">{notif.body}</p>
                      </div>
                      <button
                        onClick={() => dismiss(notif.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-carbon/[0.05] rounded-full"
                        aria-label={t.common.delete}
                      >
                        <X className="h-3 w-3 text-carbon/45" strokeWidth={1.75} />
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
