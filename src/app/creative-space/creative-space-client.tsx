'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Sparkles,
  Lock,
  ImageIcon,
} from 'lucide-react';
import { saveCreativeSpaceData, type CreativeSpaceData } from '@/lib/data-sync';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { imageToBase64 } from '@/lib/image-utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { MoodboardUploader } from '@/components/creative/MoodboardUploader';
import { InsightsPanel } from '@/components/creative/InsightsPanel';
import { PinterestImporter } from '@/components/creative/PinterestImporter';
import type { MoodImage, MoodboardAnalysis } from '@/types/creative';

export function CreativeSpaceClient() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Core state
  const [images, setImages] = useState<MoodImage[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<MoodboardAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Persist data
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const summary = {
        count: images.length,
        names: images.map((img) => img.name).slice(0, 20),
      };
      window.localStorage.setItem('aimily_moodboard_summary', JSON.stringify(summary));

      const creativeData: CreativeSpaceData = {
        moodboardImages: images.map((img) => ({
          id: img.id,
          name: img.name,
          url: img.src,
        })),
        keyColors: aiAnalysis?.keyColors || [],
        keyTrends: aiAnalysis?.keyTrends || [],
        keyItems: aiAnalysis?.keyItems || [],
        keyStyles: aiAnalysis?.keyStyles || [],
      };
      saveCreativeSpaceData(creativeData);
    } catch {
      // ignore storage errors
    }
  }, [images, aiAnalysis]);

  // Analyze moodboard with AI
  const analyzeMoodboard = useCallback(async () => {
    if (images.length === 0) return;
    setIsAnalyzing(true);
    try {
      const base64Images = await Promise.all(images.map((img) => imageToBase64(img.src)));
      const validImages = base64Images.filter(
        (img): img is { base64: string; mimeType: string } => img !== null
      );
      if (validImages.length === 0) return;

      const response = await fetch('/api/ai/analyze-moodboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: validImages, language }),
      });
      const data = await response.json();
      if (response.ok && data && (data.keyColors || data.keyTrends || data.keyItems)) {
        setAiAnalysis(data);
      }
    } catch (error) {
      console.error('Error analyzing moodboard:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [images]);

  // Pinterest import — merge avoiding duplicates
  const handlePinterestImport = useCallback(
    (newImages: MoodImage[]) => {
      setImages((prev) => {
        const existingIds = new Set(prev.map((img) => img.id));
        const unique = newImages.filter((img) => !existingIds.has(img.id));
        return [...prev, ...unique];
      });
    },
    []
  );

  /* ── Auth gates ── */

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-3">Sign in to Create</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Create an account or sign in to start building your collection moodboard.
          </p>
          <Button size="lg" onClick={() => setShowAuthModal(true)} className="rounded-full px-8">
            <Sparkles className="h-5 w-5 mr-2" />
            Sign In to Get Started
          </Button>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  /* ── Main render ── */

  return (
    <div className="space-y-6">
      {/* Moodboard with integrated Pinterest */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Your Creative Moodboard
              </CardTitle>
              <CardDescription>
                Upload images or import from Pinterest to define your collection&apos;s visual direction
              </CardDescription>
            </div>
            {images.length > 0 && (
              <Button
                onClick={analyzeMoodboard}
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
        <CardContent className="space-y-4">
          {/* Pinterest — inline, minimal */}
          <PinterestImporter onImportImages={handlePinterestImport} />

          {/* Upload + image grid */}
          <MoodboardUploader
            images={images}
            onImagesChange={setImages}
            isAnalyzing={isAnalyzing}
            compact
          />
        </CardContent>
      </Card>

      {/* AI Analysis Results */}
      {aiAnalysis && (
        <InsightsPanel
          analysis={aiAnalysis}
          onAnalysisChange={setAiAnalysis}
        />
      )}
    </div>
  );
}
