'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Palette, Shuffle, Copy, Check, ArrowLeft, Search, X } from 'lucide-react';
import palettesData from '@/data/sanzo-palettes.json';
import { useTranslation } from '@/i18n';

interface SanzoColor {
  name: string;
  hex: string;
}

type SanzoPalette = SanzoColor[];

export default function ColorPalettesPage() {
  const t = useTranslation();
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [randomPalette, setRandomPalette] = useState<SanzoPalette | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPalette, setSelectedPalette] = useState<{ palette: SanzoPalette; index: number } | null>(null);
  
  const palettes = palettesData as SanzoPalette[];

  const filteredPalettes = useMemo(() => {
    if (!searchQuery.trim()) return palettes;
    
    const query = searchQuery.toLowerCase().trim();
    return palettes.filter(palette => 
      palette.some(color => 
        color.name.toLowerCase().includes(query) ||
        color.hex.toLowerCase().includes(query)
      )
    );
  }, [palettes, searchQuery]);

  const getRandomPalette = () => {
    const source = filteredPalettes.length > 0 ? filteredPalettes : palettes;
    const randomIndex = Math.floor(Math.random() * source.length);
    setRandomPalette(source[randomIndex]);
  };

  const copyToClipboard = async (hex: string) => {
    await navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const displayedPalette = randomPalette;

  return (
    <div className="min-h-screen bg-[#fff6dc]">
      <Navbar />
      
      <main className="pt-32 pb-16 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Link 
                    href="/"
                    className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </Link>
                  <h1 className="text-3xl font-bold text-gray-900">{t.colorPalettesPage.title}</h1>
                </div>
                <p className="text-gray-600 ml-12">
                  {t.colorPalettesPage.subtitle.replace('{count}', String(palettes.length))}
                </p>
              </div>
              <button
                onClick={getRandomPalette}
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium transition-all hover:bg-gray-800"
              >
                <Shuffle className="mr-2 h-4 w-4" />
                {t.colorPalettesPage.randomPalette}
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.colorPalettesPage.searchPlaceholder}
                className="w-full pl-11 pr-10 py-3 rounded-full bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            
            {/* Search Results Info */}
            {searchQuery && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">
                  {t.colorPalettesPage.foundPalettes} <span className="font-semibold text-gray-900">{filteredPalettes.length}</span> {t.colorPalettesPage.palettesContaining} &quot;{searchQuery}&quot;
                </span>
                {filteredPalettes.length === 0 && (
                  <span className="text-orange-600">{t.colorPalettesPage.tryAnotherColor}</span>
                )}
              </div>
            )}
          </div>

          {/* Random Palette Display */}
          {displayedPalette && (
            <div className="mb-12 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Palette className="h-5 w-5 text-orange-500" />
                {t.colorPalettesPage.featuredPalette}
              </h2>
              <div className="flex gap-4 flex-wrap">
                {displayedPalette.map((color, index) => (
                  <div key={index} className="flex-1 min-w-[150px]">
                    <div
                      className="h-32 rounded-xl shadow-md cursor-pointer transition-transform hover:scale-105 relative group"
                      style={{ backgroundColor: color.hex }}
                      onClick={() => copyToClipboard(color.hex)}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
                        {copiedColor === color.hex ? (
                          <Check className="h-6 w-6 text-white" />
                        ) : (
                          <Copy className="h-6 w-6 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-sm font-medium text-gray-900">{color.name}</p>
                      <p className="text-xs text-gray-500 uppercase">{color.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Palettes Grid */}
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {searchQuery ? t.colorPalettesPage.matchingPalettes : t.colorPalettesPage.browseAllPalettes}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPalettes.map((palette, paletteIndex) => (
              <div
                key={paletteIndex}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedPalette({ palette, index: paletteIndex })}
              >
                <div className="flex h-24">
                  {palette.map((color, colorIndex) => (
                    <div
                      key={colorIndex}
                      className="flex-1"
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
                <div className="flex border-t border-gray-100">
                  {palette.map((color, colorIndex) => (
                    <div key={colorIndex} className="flex-1 p-2 text-center border-r border-gray-100 last:border-r-0">
                      <p className="text-[11px] text-gray-700 truncate">{color.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase">{color.hex}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Full Screen Palette Modal */}
      {selectedPalette && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPalette(null)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t.colorPalettesPage.paletteNumber} #{selectedPalette.index + 1}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedPalette.palette.length} {t.colorPalettesPage.colorsBySanzo}</p>
              </div>
              <button
                onClick={() => setSelectedPalette(null)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Large Color Display */}
            <div className="flex h-48 md:h-64">
              {selectedPalette.palette.map((color, index) => (
                <div
                  key={index}
                  className="flex-1 relative cursor-pointer group"
                  style={{ backgroundColor: color.hex }}
                  onClick={() => copyToClipboard(color.hex)}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    {copiedColor === color.hex ? (
                      <Check className="h-8 w-8 text-white" />
                    ) : (
                      <Copy className="h-8 w-8 text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Color Details */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedPalette.palette.map((color, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => copyToClipboard(color.hex)}
                  >
                    <div 
                      className="w-16 h-16 rounded-xl shadow-md flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{color.name}</p>
                      <p className="text-sm text-gray-500 uppercase mt-1">{color.hex}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {copiedColor === color.hex ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <Copy className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
