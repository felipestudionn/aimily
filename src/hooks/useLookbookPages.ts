import { useState, useEffect, useCallback } from 'react';
import type { LookbookPage } from '@/types/studio';
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

export const useLookbookPages = (collectionPlanId: string, lookbookName?: string, storyId?: string | null) => {
  const [pages, setPages] = useState<LookbookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      let url = `/api/lookbook-pages?planId=${collectionPlanId}`;
      if (lookbookName) url += `&lookbookName=${encodeURIComponent(lookbookName)}`;
      if (storyId) url += `&storyId=${storyId}`;
      const res = await fetch(url);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setPages(data as LookbookPage[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId, lookbookName, storyId]);

  const addPage = async (page: Partial<LookbookPage>) => {
    setError(null);
    const nextPageNumber = pages.length > 0
      ? Math.max(...pages.map((p) => p.page_number)) + 1
      : 1;

    const res = await fetch('/api/lookbook-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection_plan_id: collectionPlanId,
        page_number: nextPageNumber,
        lookbook_name: lookbookName || 'Main Lookbook',
        content: [],
        ...page,
      }),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as LookbookPage;
    setPages((prev) => [...prev, data].sort((a, b) => a.page_number - b.page_number));
    return data;
  };

  const updatePage = async (id: string, updates: Partial<LookbookPage>) => {
    setError(null);
    const res = await fetch(`/api/lookbook-pages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as LookbookPage;
    setPages((prev) =>
      prev.map((p) => (p.id === id ? data : p)).sort((a, b) => a.page_number - b.page_number)
    );
    return data;
  };

  const deletePage = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/lookbook-pages/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
    return true;
  };

  /**
   * Bulk-create pages from an AI lookbook compose (B6). Runs addPage in
   * sequence so page_number assignment stays monotonic. Propagates the
   * first failure so callers can surface it; pages created up to that
   * point are already in state.
   */
  const bulkAddPages = async (newPages: Array<Partial<LookbookPage>>) => {
    const created: LookbookPage[] = [];
    for (const p of newPages) {
      const res = await addPage(p);
      created.push(res);
    }
    return created;
  };

  useEffect(() => {
    if (collectionPlanId) fetchPages();
  }, [collectionPlanId, fetchPages]);

  return {
    pages,
    loading,
    error,
    addPage,
    bulkAddPages,
    updatePage,
    deletePage,
    refetch: fetchPages,
  };
};
