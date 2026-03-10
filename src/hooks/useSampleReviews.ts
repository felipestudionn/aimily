import { useState, useEffect, useCallback } from 'react';
import type { SampleReview, ReviewType } from '@/types/prototyping';

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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch reviews');
      }
      const data = await res.json();
      setReviews(data as SampleReview[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching sample reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId, reviewType]);

  const addReview = async (review: Partial<SampleReview>) => {
    try {
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
        const err = await res.json();
        throw new Error(err.error || 'Failed to add review');
      }
      const data = await res.json();
      setReviews((prev) => [data as SampleReview, ...prev]);
      return data as SampleReview;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  };

  const updateReview = async (id: string, updates: Partial<SampleReview>) => {
    try {
      setError(null);
      const res = await fetch(`/api/sample-reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update review');
      }
      const data = await res.json();
      setReviews((prev) => prev.map((r) => (r.id === id ? (data as SampleReview) : r)));
      return data as SampleReview;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  };

  const deleteReview = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/sample-reviews/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete review');
      }
      setReviews((prev) => prev.filter((r) => r.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    }
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
