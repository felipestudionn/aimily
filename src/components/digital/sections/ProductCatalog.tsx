'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Grid3X3,
  List,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronUp,
  Palette,
  Tag,
  DollarSign,
  Image as ImageIcon,
  Star,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { AiGeneration } from '@/types/studio';

interface ProductCatalogProps {
  skus: SKU[];
  generations: AiGeneration[];
  loading: boolean;
}

export function ProductCatalog({ skus, generations, loading }: ProductCatalogProps) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Best render per SKU (favorites first, then most recent completed)
  const renderMap = useMemo(() => {
    const map: Record<string, AiGeneration> = {};
    const completed = generations.filter(
      (g) => g.status === 'completed' && g.output_data && g.input_data?.sku_id
    );
    // Sort: favorites first, then by date desc
    const sorted = [...completed].sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    for (const gen of sorted) {
      const skuId = gen.input_data.sku_id!;
      if (!map[skuId]) map[skuId] = gen;
    }
    return map;
  }, [generations]);

  // All renders per SKU for expanded view
  const allRendersMap = useMemo(() => {
    const map: Record<string, AiGeneration[]> = {};
    const completed = generations.filter(
      (g) => g.status === 'completed' && g.output_data && g.input_data?.sku_id
    );
    for (const gen of completed) {
      const skuId = gen.input_data.sku_id!;
      if (!map[skuId]) map[skuId] = [];
      map[skuId].push(gen);
    }
    return map;
  }, [generations]);

  const filteredSkus = useMemo(() => {
    if (!search.trim()) return skus;
    const q = search.toLowerCase();
    return skus.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.family.toLowerCase().includes(q)
    );
  }, [skus, search]);

  function getImageUrl(gen: AiGeneration): string | null {
    const out = gen.output_data as Record<string, unknown> | null;
    if (!out) return null;
    const images = out.images as Array<{ url?: string }> | undefined;
    if (images?.[0]?.url) return images[0].url;
    const imageUrl = out.image_url as string | undefined;
    if (imageUrl) return imageUrl;
    return null;
  }

  async function exportCSV() {
    setExporting(true);
    try {
      const headers = ['Name', 'Category', 'Family', 'Price (EUR)', 'Channel', 'Drop', 'Type', 'Image URL'];
      const rows = filteredSkus.map((s) => {
        const render = renderMap[s.id];
        const imgUrl = render ? getImageUrl(render) || '' : '';
        return [s.name, s.category, s.family, s.pvp.toString(), s.channel, s.drop_number.toString(), s.type, imgUrl];
      });
      const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product-catalog.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (skus.length === 0) {
    return (
      <div className="text-center py-20">
        <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No products yet</h3>
        <p className="text-sm text-gray-500">Add SKUs in the Product module to build your catalog.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={exportCSV}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4" />
          CSV
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{filteredSkus.length} products</span>
        <span>{Object.keys(renderMap).length} with AI renders</span>
        <span>{filteredSkus.filter((s) => s.channel === 'DTC').length} DTC</span>
        <span>{filteredSkus.filter((s) => s.channel === 'WHOLESALE').length} Wholesale</span>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredSkus.map((sku) => {
            const render = renderMap[sku.id];
            const imgUrl = render ? getImageUrl(render) : sku.reference_image_url;
            const renderCount = allRendersMap[sku.id]?.length || 0;

            return (
              <div
                key={sku.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setExpandedSku(expandedSku === sku.id ? null : sku.id)}
              >
                {/* Image */}
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={sku.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-gray-200" />
                    </div>
                  )}
                  {render?.is_favorite && (
                    <div className="absolute top-2 right-2 bg-yellow-400 rounded-full p-1">
                      <Star className="h-3 w-3 text-white fill-white" />
                    </div>
                  )}
                  {renderCount > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                      {renderCount} renders
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-3 opacity-0 group-hover:opacity-100">
                    <div className="text-white text-xs space-y-0.5">
                      <p>{sku.category} / {sku.family}</p>
                      <p>Drop {sku.drop_number} &middot; {sku.channel}</p>
                    </div>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">{sku.name}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-medium text-purple-600">&euro;{sku.pvp}</span>
                    <span className="text-xs text-gray-400">{sku.type}</span>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedSku === sku.id && (
                  <div className="border-t border-gray-100 p-3 space-y-2 text-xs text-gray-600">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-gray-400">Cost:</span> &euro;{sku.cost}</div>
                      <div><span className="text-gray-400">Margin:</span> {sku.margin}%</div>
                      <div><span className="text-gray-400">Units:</span> {sku.buy_units}</div>
                      <div><span className="text-gray-400">Sales %:</span> {sku.sale_percentage}%</div>
                    </div>
                    {sku.notes && <p className="text-gray-500 italic">{sku.notes}</p>}
                    {/* Render gallery */}
                    {allRendersMap[sku.id] && allRendersMap[sku.id].length > 1 && (
                      <div className="flex gap-1 overflow-x-auto pt-1">
                        {allRendersMap[sku.id].slice(0, 6).map((gen) => {
                          const url = getImageUrl(gen);
                          return url ? (
                            <img
                              key={gen.id}
                              src={url}
                              alt=""
                              className="h-12 w-12 rounded-md object-cover flex-shrink-0 border border-gray-200"
                            />
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Product</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Family</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Price</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Channel</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Drop</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Renders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSkus.map((sku) => {
                const render = renderMap[sku.id];
                const imgUrl = render ? getImageUrl(render) : sku.reference_image_url;
                const renderCount = allRendersMap[sku.id]?.length || 0;
                return (
                  <tr key={sku.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {imgUrl ? (
                            <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{sku.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{sku.category}</td>
                    <td className="px-4 py-2.5 text-gray-600">{sku.family}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">&euro;{sku.pvp}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        sku.channel === 'DTC' ? 'bg-blue-50 text-blue-700' :
                        sku.channel === 'WHOLESALE' ? 'bg-green-50 text-green-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>
                        {sku.channel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-600">{sku.drop_number}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{renderCount || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
