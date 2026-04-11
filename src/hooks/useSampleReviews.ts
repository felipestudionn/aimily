import { useState, useEffect, useCallback } from 'react';
import type { SampleReview, ReviewType } from '@/types/prototyping';
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

export const useSampleReviews = (
  collectionPlanId: string,
  reviewType?: ReviewType
) => {
  const [reviews, setReviews] = useState<SampleReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      let url = `/api/sample-reviews?planId=${collectionPlanId}`;
      if (reviewType) url += `&reviewType=${reviewType}`;
      const res = await fetch(url);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setReviews(data as SampleReview[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching sample reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId, reviewType]);

  const addReview = async (review: Partial<SampleReview>) => {
    setError(null);
    const res = await fetch('/api/sample-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection_plan_id: collectionPlanId,
        ...review,
      }),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as SampleReview;
    setReviews((prev) => [data, ...prev]);
    return data;
  };

  const updateReview = async (id: string, updates: Partial<SampleReview>) => {
    setError(null);
    const res = await fetch(`/api/sample-reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as SampleReview;
    setReviews((prev) => prev.map((r) => (r.id === id ? data : r)));
    return data;
  };

  const deleteReview = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/sample-reviews/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) fetchReviews();
  }, [collectionPlanId, fetchReviews]);

  return {
    reviews,
    loading,
    error,
    addReview,
    updateReview,
    deleteReview,
    refetch: fetchReviews,
  };
};
