import { useState, useEffect, useCallback } from 'react';
import type { PrContact } from '@/types/marketing';

export const usePrContacts = (collectionPlanId: string) => {
  const [contacts, setContacts] = useState<PrContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/pr-contacts?planId=${collectionPlanId}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch');
      const data = await res.json();
      setContacts(data as PrContact[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addContact = async (contact: Omit<PrContact, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/pr-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
      const data = await res.json();
      setContacts(prev => [data as PrContact, ...prev]);
      return data as PrContact;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const updateContact = async (id: string, updates: Partial<PrContact>) => {
    try {
      const res = await fetch(`/api/pr-contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      const data = await res.json();
      setContacts(prev => prev.map(c => (c.id === id ? (data as PrContact) : c)));
      return data as PrContact;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const res = await fetch(`/api/pr-contacts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      setContacts(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  useEffect(() => {
    if (collectionPlanId) fetchContacts();
  }, [collectionPlanId, fetchContacts]);

  return { contacts, loading, error, addContact, updateContact, deleteContact, refetch: fetchContacts };
};
