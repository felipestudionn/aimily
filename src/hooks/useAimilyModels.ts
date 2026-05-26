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
  family_slug?: string;
}

export interface AimilyModelFamily {
  slug: string;
  name: string;
  description?: string;
  sort_order?: number;
}

/**
 * Fetch the aimily model roster for editorial casting.
 * Optional gender filter ('female' | 'male') and family filter
 * ('sophisticated' | 'strong'). Family defaults to 'sophisticated'
 * on the API side.
 */
export function useAimilyModels(gender?: 'female' | 'male', family?: string) {
  const [models, setModels] = useState<AimilyModel[]>([]);
  const [families, setFamilies] = useState<AimilyModelFamily[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (gender) params.set('gender', gender);
      if (family) params.set('family', family);
      const res = await fetch(`/api/aimily-models?${params}`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
        setFamilies(data.families || []);
      }
    } catch {
      // Read op — degrade gracefully
    } finally {
      setLoading(false);
    }
  }, [gender, family]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, families, loading, refetch: fetchModels };
}
