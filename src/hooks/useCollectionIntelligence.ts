import { useState, useEffect, useCallback } from 'react';
import type { Decision } from '@/lib/collection-intelligence';

/**
 * Hook to read Collection Intelligence decisions.
 *
 * Usage:
 *   const { decisions, loading } = useCollectionIntelligence(planId);
 *   const { decisions } = useCollectionIntelligence(planId, { domain: 'creative' });
 *   const { decisions } = useCollectionIntelligence(planId, { tags: ['affects_photography'] });
 */
export function useCollectionIntelligence(
  collectionPlanId: string,
  filter?: { domain?: string; tags?: string[] }
) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDecisions = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ planId: collectionPlanId });
      if (filter?.domain) params.set('domain', filter.domain);
      if (filter?.tags?.length) params.set('tags', filter.tags.join(','));

      const res = await fetch(`/api/collection-intelligence?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDecisions(data.decisions || []);
      }
    } catch {
      // Read op — degrade gracefully, don't throw
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId, filter?.domain, filter?.tags?.join(',')]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  /**
   * Get a specific decision value by domain/subdomain/key.
   */
  const getValue = useCallback(
    (domain: string, subdomain: string, key: string): unknown => {
      const found = decisions.find(
        (d) => d.domain === domain && d.subdomain === subdomain && d.key === key
      );
      return found?.value ?? null;
    },
    [decisions]
  );

  return { decisions, loading, refetch: fetchDecisions, getValue };
}
