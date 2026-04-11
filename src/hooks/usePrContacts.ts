import { useState, useEffect, useCallback } from 'react';
import type { PrContact } from '@/types/marketing';
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
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setContacts(data as PrContact[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addContact = async (contact: Omit<PrContact, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    const res = await fetch('/api/pr-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as PrContact;
    setContacts((prev) => [data, ...prev]);
    return data;
  };

  const updateContact = async (id: string, updates: Partial<PrContact>) => {
    setError(null);
    const res = await fetch(`/api/pr-contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as PrContact;
    setContacts((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  const deleteContact = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/pr-contacts/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setContacts((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) fetchContacts();
  }, [collectionPlanId, fetchContacts]);

  return { contacts, loading, error, addContact, updateContact, deleteContact, refetch: fetchContacts };
};
