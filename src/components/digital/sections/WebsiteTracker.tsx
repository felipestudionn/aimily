'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  CheckCircle2,
  Circle,
  Server,
  FileText,
  Search,
  Gauge,
  Rocket,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { DEFAULT_WEBSITE_CHECKLIST } from '@/types/digital';
import type { WebsiteChecklistItem } from '@/types/digital';

const CATEGORY_META: Record<string, { label: string; labelEs: string; icon: React.ElementType; color: string }> = {
  platform: { label: 'Platform & Infrastructure', labelEs: 'Plataforma e Infraestructura', icon: Server, color: 'text-blue-600' },
  content: { label: 'Content & Pages', labelEs: 'Contenido y Páginas', icon: FileText, color: 'text-green-600' },
  seo: { label: 'SEO & Analytics', labelEs: 'SEO y Analytics', icon: Search, color: 'text-orange-600' },
  performance: { label: 'Performance & Mobile', labelEs: 'Rendimiento y Móvil', icon: Gauge, color: 'text-purple-600' },
  launch: { label: 'Pre-Launch Checks', labelEs: 'Verificaciones Pre-Lanzamiento', icon: Rocket, color: 'text-red-600' },
};

const CATEGORIES = ['platform', 'content', 'seo', 'performance', 'launch'];

interface WebsiteTrackerProps {
  collectionId: string;
}

interface TrackerData {
  checklist: Record<string, boolean>;
  platformChoice: string;
  domainName: string;
  websiteUrl: string;
  notes: string;
}

export function WebsiteTracker({ collectionId }: WebsiteTrackerProps) {
  const storageKey = `digital-tracker-${collectionId}`;

  const [data, setData] = useState<TrackerData>({
    checklist: {},
    platformChoice: '',
    domainName: '',
    websiteUrl: '',
    notes: '',
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, [storageKey]);

  // Auto-save to localStorage
  const save = useCallback(
    (newData: TrackerData) => {
      setData(newData);
      localStorage.setItem(storageKey, JSON.stringify(newData));
    },
    [storageKey]
  );

  function toggleCheck(itemId: string) {
    save({
      ...data,
      checklist: { ...data.checklist, [itemId]: !data.checklist[itemId] },
    });
  }

  const totalItems = DEFAULT_WEBSITE_CHECKLIST.length;
  const checkedCount = DEFAULT_WEBSITE_CHECKLIST.filter((i) => data.checklist[i.id]).length;
  const overallProgress = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Website & E-commerce Readiness</h3>
              <p className="text-xs text-gray-500">{checkedCount} of {totalItems} tasks completed</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600">{overallProgress}%</div>
        </div>
        <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Quick config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Platform</label>
          <select
            value={data.platformChoice}
            onChange={(e) => save({ ...data, platformChoice: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select platform...</option>
            <option value="shopify">Shopify</option>
            <option value="woocommerce">WooCommerce</option>
            <option value="squarespace">Squarespace</option>
            <option value="custom">Custom / Headless</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Domain</label>
          <input
            type="text"
            placeholder="yourbrand.com"
            value={data.domainName}
            onChange={(e) => save({ ...data, domainName: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Live URL</label>
          <div className="flex gap-1">
            <input
              type="url"
              placeholder="https://..."
              value={data.websiteUrl}
              onChange={(e) => save({ ...data, websiteUrl: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {data.websiteUrl && (
              <a
                href={data.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Checklist by category */}
      {CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        const items = DEFAULT_WEBSITE_CHECKLIST.filter((i) => i.category === cat);
        const catChecked = items.filter((i) => data.checklist[i.id]).length;

        return (
          <div key={cat} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${meta.color}`} />
                <h4 className="text-sm font-semibold text-gray-900">{meta.label}</h4>
              </div>
              <span className="text-xs text-gray-500">
                {catChecked}/{items.length}
              </span>
            </div>
            {/* Items */}
            <div className="divide-y divide-gray-100">
              {items.map((item) => {
                const checked = !!data.checklist[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    {checked ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
        <textarea
          placeholder="Platform credentials, integration notes, launch plan..."
          value={data.notes}
          onChange={(e) => save({ ...data, notes: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] resize-y"
        />
      </div>
    </div>
  );
}
