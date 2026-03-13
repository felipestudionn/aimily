import { useState, useEffect, useCallback, useRef } from 'react';

type WorkspaceType = 'creative' | 'merchandising' | 'design';

export function useWorkspaceData<T extends object>(
  collectionPlanId: string,
  workspace: WorkspaceType,
  defaultData: T
) {
  const [data, setData] = useState<T>(defaultData);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [saving, setSaving] = useState(false);
  const dataRef = useRef<T>(defaultData);
  const loadedRef = useRef(false);

  // Keep ref in sync
  dataRef.current = data;
  loadedRef.current = loaded;

  // Load on mount
  useEffect(() => {
    if (!collectionPlanId) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/workspace-data?planId=${collectionPlanId}&workspace=${workspace}`
        );
        if (res.ok) {
          const result = await res.json();
          if (result.data) {
            const merged = { ...defaultData, ...result.data } as T;
            setData(merged);
            dataRef.current = merged;
          }
        }
      } catch {
        // ignore — use default
      } finally {
        setLoading(false);
        setLoaded(true);
        loadedRef.current = true;
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPlanId, workspace]);

  // Debounced persist to DB
  const persistToDb = useCallback(
    (newData: T) => {
      if (!collectionPlanId || !loadedRef.current) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await fetch('/api/workspace-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planId: collectionPlanId,
              workspace,
              data: newData,
            }),
          });
        } catch {
          // silent fail — data is still in state
        } finally {
          setSaving(false);
        }
      }, 1000);
    },
    [collectionPlanId, workspace]
  );

  // Save: accepts new data OR an updater function (like setState)
  const save = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const newData = typeof updater === 'function'
        ? (updater as (prev: T) => T)(dataRef.current)
        : updater;
      setData(newData);
      dataRef.current = newData;
      persistToDb(newData);
    },
    [persistToDb]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { data, save, loading, saving, loaded };
}
