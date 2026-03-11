import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TechPack } from '@/types/tech-pack';

export function useTechPacks(userId: string | undefined) {
  const supabase = createClient();
  const [techPacks, setTechPacks] = useState<TechPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTechPacks = useCallback(async () => {
    if (!userId) {
      setTechPacks([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('tech_packs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTechPacks((data as TechPack[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tech packs';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveTechPack = useCallback(async (techPack: Partial<TechPack>) => {
    try {
      const { data, error: saveError } = await supabase
        .from('tech_packs')
        .insert({ ...techPack, user_id: userId })
        .select()
        .single();

      if (saveError) throw saveError;
      setTechPacks((prev) => [data as TechPack, ...prev]);
      return data as TechPack;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save tech pack';
      setError(message);
      return null;
    }
  }, [userId]);

  const updateTechPack = useCallback(async (id: string, updates: Partial<TechPack>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('tech_packs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      setTechPacks((prev) =>
        prev.map((tp) => (tp.id === id ? (data as TechPack) : tp))
      );
      return data as TechPack;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update tech pack';
      setError(message);
      return null;
    }
  }, []);

  const deleteTechPack = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('tech_packs')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setTechPacks((prev) => prev.filter((tp) => tp.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete tech pack';
      setError(message);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchTechPacks();
  }, [fetchTechPacks]);

  return {
    techPacks,
    loading,
    error,
    saveTechPack,
    updateTechPack,
    deleteTechPack,
    refetch: fetchTechPacks,
  };
}
