'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PhaseAccordionProps {
  title: string;
  icon?: LucideIcon;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function PhaseAccordion({ title, icon: Icon, badge, defaultOpen = false, children }: PhaseAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-carbon/[0.06] bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-carbon/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-carbon/30" />}
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/50">
            {title}
          </span>
          {badge && (
            <span className="text-[9px] text-carbon/25 font-light">{badge}</span>
          )}
        </div>
        <ChevronDown className={`h-3 w-3 text-carbon/25 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 border-t border-carbon/[0.04]">
          {children}
        </div>
      )}
    </div>
  );
}
