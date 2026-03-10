'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  Circle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { EMAIL_FLOW_TEMPLATES } from '@/types/marketing';

interface EmailListItem {
  id: string;
  label: string;
  labelEs: string;
  checked: boolean;
}

const DEFAULT_CHECKLIST: Omit<EmailListItem, 'checked'>[] = [
  { id: 'em-1', label: 'Choose email platform (Klaviyo / Mailchimp / Other)', labelEs: 'Elegir plataforma de email' },
  { id: 'em-2', label: 'Create account & connect domain', labelEs: 'Crear cuenta y conectar dominio' },
  { id: 'em-3', label: 'Design email templates with brand fonts & colors', labelEs: 'Diseñar plantillas con fuentes y colores de marca' },
  { id: 'em-4', label: 'Set up signup form / landing page', labelEs: 'Configurar formulario de suscripción' },
  { id: 'em-5', label: 'Add popup to website', labelEs: 'Añadir popup al sitio web' },
  { id: 'em-6', label: 'Create welcome flow', labelEs: 'Crear flujo de bienvenida' },
  { id: 'em-7', label: 'Create launch announcement sequence', labelEs: 'Crear secuencia de anuncio de lanzamiento' },
  { id: 'em-8', label: 'Create abandoned cart flow', labelEs: 'Crear flujo de carrito abandonado' },
  { id: 'em-9', label: 'Create post-purchase flow', labelEs: 'Crear flujo post-compra' },
  { id: 'em-10', label: 'Test all flows with preview sends', labelEs: 'Probar todos los flujos con envíos de prueba' },
  { id: 'em-11', label: 'Build initial subscriber list (friends, family, early fans)', labelEs: 'Construir lista inicial de suscriptores' },
  { id: 'em-12', label: 'Launch pre-launch landing page to collect emails', labelEs: 'Lanzar landing page pre-launch para captar emails' },
];

interface Props {
  collectionId: string;
}

export function EmailMarketingSection({ collectionId }: Props) {
  const storageKey = `email-marketing-${collectionId}`;
  const [checklist, setChecklist] = useState<EmailListItem[]>([]);
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);
  const [platformUrl, setPlatformUrl] = useState('');

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChecklist(parsed.checklist || DEFAULT_CHECKLIST.map((i) => ({ ...i, checked: false })));
        setPlatformUrl(parsed.platformUrl || '');
      } catch {
        setChecklist(DEFAULT_CHECKLIST.map((i) => ({ ...i, checked: false })));
      }
    } else {
      setChecklist(DEFAULT_CHECKLIST.map((i) => ({ ...i, checked: false })));
    }
  }, [storageKey]);

  // Save to localStorage
  useEffect(() => {
    if (checklist.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify({ checklist, platformUrl }));
    }
  }, [checklist, platformUrl, storageKey]);

  const toggleCheck = (id: string) => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  };

  const completedCount = checklist.filter((i) => i.checked).length;
  const progress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Progress Bar */}
      <div className="bg-white border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Email Marketing Setup</h3>
          </div>
          <span className="text-sm font-bold text-orange-600">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-carbon transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{completedCount} of {checklist.length} tasks done</span>
          {platformUrl && (
            <a
              href={platformUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Open platform
            </a>
          )}
        </div>
      </div>

      {/* Platform URL */}
      <div className="bg-white border border-gray-100 p-4">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Platform URL</label>
        <input
          type="url"
          value={platformUrl}
          onChange={(e) => setPlatformUrl(e.target.value)}
          placeholder="https://app.klaviyo.com/..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      {/* Setup Checklist */}
      <div className="bg-white border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Setup Checklist</h3>
        <div className="space-y-2">
          {checklist.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className="flex items-center gap-3 w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {item.checked ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-gray-400">{item.labelEs}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Email Flow Templates */}
      <div className="bg-white border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Email Flow Templates</h3>
        <p className="text-xs text-gray-500 mb-4">
          Reference templates for your email flows. Build these in your email platform.
        </p>
        <div className="space-y-2">
          {EMAIL_FLOW_TEMPLATES.map((flow) => {
            const isExpanded = expandedFlow === flow.id;
            return (
              <div key={flow.id} className="border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpandedFlow(isExpanded ? null : flow.id)}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{flow.label}</p>
                    <p className="text-xs text-gray-400">{flow.description}</p>
                  </div>
                  <span className="text-xs text-gray-400">{flow.emails.length} emails</span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t border-gray-50">
                    <div className="relative pl-6">
                      {/* Timeline line */}
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />
                      {flow.emails.map((email, idx) => (
                        <div key={idx} className="relative pb-3 last:pb-0">
                          <div className="absolute left-[-16px] top-1.5 w-2 h-2 rounded-full bg-orange-400" />
                          <div>
                            <p className="text-sm text-gray-800">{email.subject}</p>
                            <p className="text-xs text-gray-400">{email.timing}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
