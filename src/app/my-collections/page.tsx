'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { FolderOpen, Plus, Calendar, Euro, Loader2, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CollectionPlan {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  setup_data: {
    totalSalesTarget?: number;
    productCategory?: string;
  };
}

export default function MyCollectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchCollections();
    }
  }, [user]);

  const fetchCollections = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collection_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    
    try {
      const { error } = await supabase
        .from('collection_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCollections(collections.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#fff6dc] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff6dc]">
      <Navbar />
      
      <main className="pt-32 pb-16 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Collections</h1>
              <p className="text-gray-600 mt-1">Manage your collection plans</p>
            </div>
            <Link href="/creative-space">
              <Button className="bg-gray-900 hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                New Collection
              </Button>
            </Link>
          </div>

          {/* Collections Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-20">
              <FolderOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No collections yet</h2>
              <p className="text-gray-500 mb-6">Start by creating your first collection plan</p>
              <Link href="/creative-space">
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Collection
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                        <FolderOpen className="h-6 w-6 text-white" />
                      </div>
                      <button
                        onClick={() => handleDelete(collection.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete collection"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{collection.name}</h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(collection.updated_at).toLocaleDateString('es-ES')}</span>
                      </div>
                      {collection.setup_data?.totalSalesTarget && (
                        <div className="flex items-center gap-1">
                          <Euro className="h-4 w-4" />
                          <span>€{collection.setup_data.totalSalesTarget.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {collection.setup_data?.productCategory && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full mb-4">
                        {collection.setup_data.productCategory}
                      </span>
                    )}
                    
                    <Link
                      href={`/collection/${collection.id}`}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                    >
                      Continue Working
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
