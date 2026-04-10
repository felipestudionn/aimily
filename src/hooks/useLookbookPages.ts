import { useState, useEffect, useCallback } from 'react';
import type { LookbookPage } from '@/types/studio';

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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch pages');
      }
      const data = await res.json();
      setPages(data as LookbookPage[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId, lookbookName, storyId]);

  const addPage = async (page: Partial<LookbookPage>) => {
    try {
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
        const err = await res.json();
        throw new Error(err.error || 'Failed to create page');
      }
      const data = await res.json();
      setPages((prev) => [...prev, data as LookbookPage].sort((a, b) => a.page_number - b.page_number));
      return data as LookbookPage;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  };

  const updatePage = async (id: string, updates: Partial<LookbookPage>) => {
    try {
      setError(null);
      const res = await fetch(`/api/lookbook-pages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update page');
      }
      const data = await res.json();
      setPages((prev) =>
        prev.map((p) => (p.id === id ? (data as LookbookPage) : p)).sort((a, b) => a.page_number - b.page_number)
      );
      return data as LookbookPage;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  };

  const deletePage = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/lookbook-pages/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete page');
      }
      setPages((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    }
  };

  /**
   * Bulk-create pages from an AI lookbook compose (B6). Runs addPage in
   * sequence so page_number assignment stays monotonic.
   */
  const bulkAddPages = async (newPages: Array<Partial<LookbookPage>>) => {
    const created: LookbookPage[] = [];
    for (const p of newPages) {
      const res = await addPage(p);
      if (res) created.push(res);
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
