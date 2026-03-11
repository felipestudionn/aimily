'use client';

import { useCallback } from 'react';
import { Plus, X, Loader2, Sparkles, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { MoodImage } from '@/types/creative';

interface MoodboardUploaderProps {
  images: MoodImage[];
  onImagesChange: (images: MoodImage[]) => void;
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
  /** Render without Card wrapper (for embedding in other layouts) */
  compact?: boolean;
}

export function MoodboardUploader({
  images,
  onImagesChange,
  isAnalyzing = false,
  onAnalyze,
  compact = false,
}: MoodboardUploaderProps) {
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const newImages: MoodImage[] = Array.from(files).map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        src: URL.createObjectURL(file),
        name: file.name,
        source: 'upload' as const,
      }));
      onImagesChange([...images, ...newImages]);
    },
    [images, onImagesChange]
  );

  const removeImage = useCallback(
    (id: string) => {
      onImagesChange(images.filter((img) => img.id !== id));
    },
    [images, onImagesChange]
  );

  const grid = (
    <>
      {/* Masonry Grid */}
      {images.length > 0 && (
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="relative group overflow-hidden rounded-lg border bg-background break-inside-avoid"
            >
              <img
                src={img.src}
                alt={img.name}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform"
                style={{
                  minHeight: index % 3 === 0 ? '200px' : index % 3 === 1 ? '150px' : '180px',
                }}
              />
              <button
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                onClick={() => removeImage(img.id)}
              >
                <X className="h-4 w-4" />
              </button>
              {img.source === 'pinterest' && (
                <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Pinterest
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      <label
        className={`flex items-center justify-center gap-3 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all ${
          images.length > 0 ? 'p-4' : 'p-8'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div
          className={`rounded-full bg-primary/10 flex items-center justify-center ${
            images.length > 0 ? 'w-8 h-8' : 'w-12 h-12'
          }`}
        >
          <Plus className={`text-primary ${images.length > 0 ? 'h-4 w-4' : 'h-6 w-6'}`} />
        </div>
        <div className="text-center">
          <p className={`font-medium ${images.length > 0 ? 'text-sm' : ''}`}>
            {images.length > 0 ? 'Add more images' : 'Drop images here or click to upload'}
          </p>
          {images.length === 0 && (
            <p className="text-sm text-muted-foreground">Supports JPG, PNG, GIF up to 10MB each</p>
          )}
        </div>
      </label>
    </>
  );

  if (compact) {
    return <div className="flex flex-col gap-4">{grid}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Your Creative Moodboard
            </CardTitle>
            <CardDescription>
              Upload images or connect Pinterest to define your collection&apos;s visual direction
            </CardDescription>
          </div>
          {images.length > 0 && onAnalyze && (
            <Button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze with AI
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">{grid}</div>
      </CardContent>
    </Card>
  );
}
