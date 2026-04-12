import { useState, useEffect, useCallback } from 'react';

export interface AimilyModel {
  id: string;
  name: string;
  gender: 'female' | 'male';
  headshot_url: string;
  complexion: string;
  hair_style: string;
  hair_color: string;
  age_range: string;
  ethnicity: string;
  description: string;
  sort_order: number;
}

/**
 * Fetch the aimily model roster for editorial casting.
 * Optional gender filter ('female' | 'male').
 */
export function useAimilyModels(gender?: 'female' | 'male') {
  const [models, setModels] = useState<AimilyModel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (gender) params.set('gender', gender);
      const res = await fetch(`/api/aimily-models?${params}`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      }
    } catch {
      // Read op — degrade gracefully
    } finally {
      setLoading(false);
    }
  }, [gender]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, loading, refetch: fetchModels };
}
