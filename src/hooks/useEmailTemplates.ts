import { useState, useEffect, useCallback } from 'react';
import type { EmailTemplateContent } from '@/types/digital';

export const useEmailTemplates = (collectionPlanId: string) => {
  const [templates, setTemplates] = useState<EmailTemplateContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/email-templates?planId=${collectionPlanId}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch');
      setTemplates((await res.json()) as EmailTemplateContent[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addTemplate = async (tpl: Omit<EmailTemplateContent, 'id' | 'created_at'>) => {
    try {
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tpl),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
      const data = (await res.json()) as EmailTemplateContent;
      setTemplates(prev => [data, ...prev]);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const bulkSaveTemplates = async (items: Omit<EmailTemplateContent, 'id' | 'created_at'>[]) => {
    try {
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: items }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to bulk save');
      const data = (await res.json()) as EmailTemplateContent[];
      setTemplates(prev => [...data, ...prev]);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<EmailTemplateContent>) => {
    try {
      const res = await fetch(`/api/email-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      const data = (await res.json()) as EmailTemplateContent;
      setTemplates(prev => prev.map(t => (t.id === id ? data : t)));
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/email-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      setTemplates(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  useEffect(() => {
    if (collectionPlanId) fetchTemplates();
  }, [collectionPlanId, fetchTemplates]);

  return { templates, loading, error, addTemplate, bulkSaveTemplates, updateTemplate, deleteTemplate, refetch: fetchTemplates };
};
