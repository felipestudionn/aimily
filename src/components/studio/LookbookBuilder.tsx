'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Layout,
  Type,
  Image,
  Columns,
  Grid3x3,
  Quote,
  Loader2,
  GripVertical,
  Download,
} from 'lucide-react';
import { useLookbookPages } from '@/hooks/useLookbookPages';
import { useAiGenerations } from '@/hooks/useAiGenerations';
import type { LookbookLayout, LookbookPage } from '@/types/studio';

const LAYOUT_OPTIONS: { id: LookbookLayout; label: string; icon: React.ElementType }[] = [
  { id: 'cover', label: 'Cover', icon: BookOpen },
  { id: 'full_bleed', label: 'Full Bleed', icon: Image },
  { id: 'two_column', label: 'Two Column', icon: Columns },
  { id: 'grid_4', label: 'Grid', icon: Grid3x3 },
  { id: 'text_image', label: 'Text + Image', icon: Type },
  { id: 'quote', label: 'Quote', icon: Quote },
];

interface LookbookBuilderProps {
  collectionName: string;
  season: string;
}

export function LookbookBuilder({ collectionName, season }: LookbookBuilderProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const { pages, loading, addPage, updatePage, deletePage } = useLookbookPages(collectionId);
  const { generations } = useAiGenerations(collectionId);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [editingContent, setEditingContent] = useState<{ pageId: string; field: string; value: string } | null>(null);
  const [showImagePicker, setShowImagePicker] = useState<string | null>(null);

  const completedImages = generations
    .filter((g) => g.status === 'completed' && g.output_data?.images?.length)
    .flatMap((g) =>
      (g.output_data?.images || []).map((img) => ({
        url: img.url,
        label: g.input_data?.sku_name || g.generation_type,
      }))
    );

  const currentPage = pages[currentPageIdx];

  const handleAddPage = async (layout: LookbookLayout) => {
    const defaultContent = getDefaultContent(layout);
    await addPage({
      layout_type: layout,
      content: defaultContent,
      background_color: layout === 'cover' ? '#1a1a1a' : '#ffffff',
    });
  };

  const handleUpdateContent = async (pageId: string, content: LookbookPage['content']) => {
    await updatePage(pageId, { content });
  };

  const handleSetImage = (pageId: string, contentIdx: number, imageUrl: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    const newContent = [...page.content];
    newContent[contentIdx] = { ...newContent[contentIdx], asset_url: imageUrl };
    handleUpdateContent(pageId, newContent);
    setShowImagePicker(null);
  };

  const handleSetText = (pageId: string, contentIdx: number, text: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    const newContent = [...page.content];
    newContent[contentIdx] = { ...newContent[contentIdx], text };
    handleUpdateContent(pageId, newContent);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/collection/${collectionId}/studio`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lookbook Builder</h1>
            <p className="text-sm text-gray-500">{collectionName} {season && `— ${season}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{pages.length} pages</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Page List */}
        <div className="col-span-3 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Pages</h3>

          {/* Page Thumbnails */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {pages.map((page, idx) => (
              <button
                key={page.id}
                onClick={() => setCurrentPageIdx(idx)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                  currentPageIdx === idx
                    ? 'bg-purple-50 border border-purple-200'
                    : 'bg-white border border-gray-100 hover:border-gray-200'
                }`}
              >
                <div
                  className="w-12 h-16 rounded flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0"
                  style={{ backgroundColor: page.background_color || '#fff' }}
                >
                  <PageMiniPreview page={page} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700">Page {page.page_number}</p>
                  <p className="text-[10px] text-gray-400 capitalize">
                    {page.layout_type.replace('_', ' ')}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePage(page.id);
                    if (currentPageIdx >= pages.length - 1) setCurrentPageIdx(Math.max(0, pages.length - 2));
                  }}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>

          {/* Add Page */}
          <div className="bg-white border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Add Page</p>
            <div className="grid grid-cols-3 gap-1.5">
              {LAYOUT_OPTIONS.map((layout) => {
                const Icon = layout.icon;
                return (
                  <button
                    key={layout.id}
                    onClick={() => handleAddPage(layout.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[9px]">{layout.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Page Preview */}
        <div className="col-span-6">
          {currentPage ? (
            <div className="bg-white border border-gray-100 overflow-hidden">
              {/* Page Navigation */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                <button
                  onClick={() => setCurrentPageIdx(Math.max(0, currentPageIdx - 1))}
                  disabled={currentPageIdx === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-500">
                  Page {currentPage.page_number} of {pages.length}
                </span>
                <button
                  onClick={() => setCurrentPageIdx(Math.min(pages.length - 1, currentPageIdx + 1))}
                  disabled={currentPageIdx === pages.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Page Canvas */}
              <div
                className="aspect-[3/4] relative overflow-hidden"
                style={{ backgroundColor: currentPage.background_color || '#ffffff' }}
              >
                <PageRenderer
                  page={currentPage}
                  collectionName={collectionName}
                  season={season}
                  onClickImage={(contentIdx) =>
                    setShowImagePicker(`${currentPage.id}:${contentIdx}`)
                  }
                  onEditText={(contentIdx, text) =>
                    handleSetText(currentPage.id, contentIdx, text)
                  }
                />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 p-16 text-center aspect-[3/4] flex flex-col items-center justify-center">
              <BookOpen className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-600">No pages yet</p>
              <p className="text-xs text-gray-400 mt-1">Add a page to start building your lookbook</p>
            </div>
          )}
        </div>

        {/* Right: Image Picker / Properties */}
        <div className="col-span-3 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Image Library</h3>

          {completedImages.length === 0 ? (
            <div className="bg-white border border-gray-100 p-6 text-center">
              <Image className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Generate some renders in the Studio to use here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[600px] overflow-y-auto">
              {completedImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (showImagePicker) {
                      const [pageId, contentIdxStr] = showImagePicker.split(':');
                      handleSetImage(pageId, parseInt(contentIdxStr), img.url);
                    }
                  }}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    showImagePicker
                      ? 'border-purple-200 hover:border-purple-400 cursor-pointer'
                      : 'border-gray-100'
                  }`}
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {showImagePicker && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
              Click an image to place it on the page
              <button
                onClick={() => setShowImagePicker(null)}
                className="ml-2 underline"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Page Settings */}
          {currentPage && (
            <div className="bg-white border border-gray-100 p-3 space-y-3">
              <h4 className="text-xs font-semibold text-gray-600">Page Settings</h4>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentPage.background_color || '#ffffff'}
                    onChange={(e) => updatePage(currentPage.id, { background_color: e.target.value })}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentPage.background_color || '#ffffff'}
                    onChange={(e) => updatePage(currentPage.id, { background_color: e.target.value })}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Layout</label>
                <div className="grid grid-cols-3 gap-1">
                  {LAYOUT_OPTIONS.map((layout) => {
                    const Icon = layout.icon;
                    return (
                      <button
                        key={layout.id}
                        onClick={() => {
                          const newContent = getDefaultContent(layout.id);
                          updatePage(currentPage.id, {
                            layout_type: layout.id,
                            content: newContent,
                          });
                        }}
                        className={`p-1.5 rounded text-center transition-all ${
                          currentPage.layout_type === layout.id
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 mx-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function getDefaultContent(layout: LookbookLayout) {
  switch (layout) {
    case 'cover':
      return [
        { type: 'image' as const, position: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
        { type: 'text' as const, text: 'COLLECTION NAME', position: { x: 10, y: 40 }, size: { width: 80, height: 20 } },
      ];
    case 'full_bleed':
      return [
        { type: 'image' as const, position: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
      ];
    case 'two_column':
      return [
        { type: 'image' as const, position: { x: 0, y: 0 }, size: { width: 50, height: 100 } },
        { type: 'image' as const, position: { x: 50, y: 0 }, size: { width: 50, height: 100 } },
      ];
    case 'grid_4':
      return [
        { type: 'image' as const, position: { x: 0, y: 0 }, size: { width: 50, height: 50 } },
        { type: 'image' as const, position: { x: 50, y: 0 }, size: { width: 50, height: 50 } },
        { type: 'image' as const, position: { x: 0, y: 50 }, size: { width: 50, height: 50 } },
        { type: 'image' as const, position: { x: 50, y: 50 }, size: { width: 50, height: 50 } },
      ];
    case 'text_image':
      return [
        { type: 'text' as const, text: 'Your text here...', position: { x: 0, y: 0 }, size: { width: 40, height: 100 } },
        { type: 'image' as const, position: { x: 40, y: 0 }, size: { width: 60, height: 100 } },
      ];
    case 'quote':
      return [
        { type: 'text' as const, text: '"Your quote here"', position: { x: 10, y: 30 }, size: { width: 80, height: 40 } },
      ];
    default:
      return [];
  }
}

function PageRenderer({
  page,
  collectionName,
  season,
  onClickImage,
  onEditText,
}: {
  page: LookbookPage;
  collectionName: string;
  season: string;
  onClickImage: (contentIdx: number) => void;
  onEditText: (contentIdx: number, text: string) => void;
}) {
  return (
    <div className="absolute inset-0">
      {page.content.map((item, idx) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          left: `${item.position.x}%`,
          top: `${item.position.y}%`,
          width: `${item.size.width}%`,
          height: `${item.size.height}%`,
        };

        if (item.type === 'image') {
          return (
            <div
              key={idx}
              style={style}
              className="cursor-pointer group"
              onClick={() => onClickImage(idx)}
            >
              {item.asset_url ? (
                <img src={item.asset_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200 group-hover:border-purple-300 transition-colors">
                  <div className="text-center text-gray-400">
                    <Image className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-[10px]">Click to add</span>
                  </div>
                </div>
              )}
            </div>
          );
        }

        if (item.type === 'text') {
          const isDark = page.background_color && parseInt(page.background_color.replace('#', ''), 16) < 0x808080;
          return (
            <div key={idx} style={style} className="flex items-center justify-center p-4">
              <textarea
                value={item.text || ''}
                onChange={(e) => onEditText(idx, e.target.value)}
                className={`w-full h-full bg-transparent resize-none text-center font-serif text-lg leading-relaxed focus:outline-none ${
                  isDark ? 'text-white placeholder-white/40' : 'text-gray-800 placeholder-gray-300'
                }`}
                placeholder="Type here..."
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

function PageMiniPreview({ page }: { page: LookbookPage }) {
  const layoutIcons: Record<string, React.ElementType> = {
    cover: BookOpen,
    full_bleed: Image,
    two_column: Columns,
    grid_4: Grid3x3,
    text_image: Type,
    quote: Quote,
  };
  const Icon = layoutIcons[page.layout_type] || Layout;
  return <Icon className="h-4 w-4" />;
}
