import { useState, useEffect, useCallback } from 'react';
import type { EmailTemplateContent } from '@/types/digital';
import { backendError } from './hook-errors';

/**
 * Contract (enterprise-ready, applies to every *.ts hook in this folder):
 *
 *  - Read operations (fetch*) set `error` on failure and degrade gracefully
 *    (loading flag flips, data stays empty). They never throw.
 *
 *  - Write operations (add/update/delete/toggle/bulkSave) set `error` AND
 *    throw a structured Error built from the backend envelope via
 *    backendError(res). Callers must wrap them in try/catch and surface
 *    err.message to the user. Silent "return null" is no longer acceptable:
 *    it masked every persistence failure and was the root cause of the
 *    2026-04-11 Still Life / stories regression.
 */

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
      if (!res.ok) throw await backendError(res);
      setTemplates((await res.json()) as EmailTemplateContent[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addTemplate = async (tpl: Omit<EmailTemplateContent, 'id' | 'created_at'>) => {
    setError(null);
    const res = await fetch('/api/email-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tpl),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as EmailTemplateContent;
    setTemplates((prev) => [data, ...prev]);
    return data;
  };

  const bulkSaveTemplates = async (items: Omit<EmailTemplateContent, 'id' | 'created_at'>[]) => {
    setError(null);
    const res = await fetch('/api/email-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates: items }),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as EmailTemplateContent[];
    setTemplates((prev) => [...data, ...prev]);
    return data;
  };

  const updateTemplate = async (id: string, updates: Partial<EmailTemplateContent>) => {
    setError(null);
    const res = await fetch(`/api/email-templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as EmailTemplateContent;
    setTemplates((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  };

  const deleteTemplate = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/email-templates/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) fetchTemplates();
  }, [collectionPlanId, fetchTemplates]);

  return { templates, loading, error, addTemplate, bulkSaveTemplates, updateTemplate, deleteTemplate, refetch: fetchTemplates };
};
