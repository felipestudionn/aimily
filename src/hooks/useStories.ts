import { useState, useEffect, useCallback } from 'react';
import { backendError } from './hook-errors';

export interface StoryContentDirection {
  setting?: string;
  lighting?: string;
  styling?: string;
  model_attitude?: string;
  camera_approach?: string;
}

export interface StoryPriorityBreakdown {
  customer_impact?: number;
  commercial_fit?: number;
  visual_differentiation?: number;
  rationale?: string;
}

export interface Story {
  id: string;
  collection_plan_id: string;
  name: string;
  narrative: string | null;
  mood: string[] | null;
  tone: string | null;
  color_palette: string[] | null;
  hero_sku_id: string | null;
  /** Legacy free-text field. Kept for backward compat. New flows write content_direction_structured. */
  content_direction: string | null;
  /** B3 enrichment — structured 5-field direction. */
  content_direction_structured?: StoryContentDirection | null;
  /** B3 enrichment — 0-10 commercial priority score. */
  priority_score_total?: number | null;
  /** B3 enrichment — breakdown with customer_impact/commercial_fit/visual_differentiation/rationale. */
  priority_score_breakdown?: StoryPriorityBreakdown | null;
  /** B3 enrichment — 15-25 word editorial hook (the tension that makes this story shareable). */
  editorial_hook?: string | null;
  /** B3 enrichment — consumer voice phrases that informed this story. */
  consumer_signals?: string[] | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export const useStories = (collectionPlanId: string) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stories?planId=${collectionPlanId}`);
      if (!res.ok) throw await backendError(res);
      setStories((await res.json()) as Story[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addStory = async (story: Omit<Story, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(story),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as Story;
    setStories((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    return data;
  };

  const updateStory = async (id: string, updates: Partial<Story>) => {
    setError(null);
    const res = await fetch(`/api/stories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as Story;
    setStories((prev) => prev.map((s) => (s.id === id ? data : s)));
    return data;
  };

  const deleteStory = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/stories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setStories((prev) => prev.filter((s) => s.id !== id));
    return true;
  };

  /** Bulk-save stories from AI generation (replaces all) */
  const bulkSaveStories = async (
    newStories: Omit<Story, 'id' | 'created_at' | 'updated_at'>[],
    skuAssignments?: Record<string, string[]>
  ) => {
    setError(null);
    // Delete existing stories first. We intentionally swallow per-delete errors
    // here because a partial delete still lets the new POST run — the POST
    // then runs the clean-slate reset on the backend side.
    await Promise.all(
      stories.map((s) => fetch(`/api/stories/${s.id}`, { method: 'DELETE' }))
    );

    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stories: newStories, sku_assignments: skuAssignments }),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    // Response shape: either legacy Story[] OR new { stories, assignment_summary }
    const raw = (await res.json()) as
      | Story[]
      | { stories: Story[]; assignment_summary?: unknown };
    const stories_ = Array.isArray(raw) ? raw : raw.stories;
    setStories(stories_.sort((a, b) => a.sort_order - b.sort_order));
    return stories_;
  };

  /** Assign a SKU to a story (updates collection_skus.story_id) */
  const assignSku = async (skuId: string, storyId: string | null) => {
    setError(null);
    const res = await fetch(`/api/skus/${skuId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId }),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) fetchStories();
  }, [collectionPlanId, fetchStories]);

  return {
    stories,
    loading,
    error,
    addStory,
    updateStory,
    deleteStory,
    bulkSaveStories,
    assignSku,
    refetch: fetchStories,
  };
};
