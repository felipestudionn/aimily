'use client';

import { useState } from 'react';
import {
  Video,
  Sparkles,
  Loader2,
  Download,
  ChevronDown,
  Play,
} from 'lucide-react';
import type { AiGeneration } from '@/types/studio';
import { MOTION_TYPES } from '@/types/studio';
import { useAuth } from '@/contexts/AuthContext';

interface VideoGeneratorProps {
  collectionId: string;
  generations: AiGeneration[];
  allGenerations: AiGeneration[];
  onGenerate: (gen: Partial<AiGeneration>) => Promise<AiGeneration | null>;
  onUpdate: (id: string, updates: Partial<AiGeneration>) => Promise<AiGeneration | null>;
  onRefetch: () => void;
}

export function VideoGenerator({
  collectionId,
  generations,
  allGenerations,
  onGenerate,
  onUpdate,
  onRefetch,
}: VideoGeneratorProps) {
  const { user } = useAuth();
  const [sourceImage, setSourceImage] = useState<string>('');
  const [motionType, setMotionType] = useState('subtle');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const completedRenders = allGenerations.filter(
    (g) => g.status === 'completed' && g.output_data?.images?.length
  );

  const handleGenerate = async () => {
    if (!sourceImage || !user) return;
    setGenerating(true);
    setError(null);

    try {
      const prompt = customPrompt || `Fashion video with ${MOTION_TYPES.find((m) => m.id === motionType)?.label || motionType} motion`;

      const genRecord = await onGenerate({
        user_id: user.id,
        generation_type: 'video',
        prompt,
        model_used: 'kling-3.0',
        status: 'processing',
        input_data: {
          garment_image_url: sourceImage,
          motion_type: motionType,
        },
      });

      if (!genRecord) throw new Error('Failed to create generation record');

      const res = await fetch('/api/ai/fal/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: sourceImage,
          motion_type: motionType,
          prompt: customPrompt || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Video generation failed');
      }

      const result = await res.json();

      await onUpdate(genRecord.id, {
        status: 'completed',
        output_data: { video_url: result.video_url },
        completed_at: new Date().toISOString(),
      });

      onRefetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Video generation failed';
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Controls */}
        <div className="col-span-4 space-y-4">
          {/* Source Image */}
          <div className="bg-white border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Source Image</label>
            {sourceImage ? (
              <div className="relative">
                <img src={sourceImage} alt="Source" className="w-full rounded-lg object-cover aspect-square" />
                <button
                  onClick={() => setSourceImage('')}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full text-xs"
                >
                  x
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowSourcePicker(!showSourcePicker)}
                  className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-400 hover:border-gray-300"
                >
                  Select from renders...
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showSourcePicker && completedRenders.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto p-2">
                    <div className="grid grid-cols-3 gap-2">
                      {completedRenders.slice(0, 12).map((g) => {
                        const img = g.output_data?.images?.[0];
                        if (!img) return null;
                        return (
                          <button
                            key={g.id}
                            onClick={() => {
                              setSourceImage(img.url);
                              setShowSourcePicker(false);
                            }}
                            className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-400"
                          >
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Motion Type */}
          <div className="bg-white border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Motion Type</label>
            <div className="space-y-2">
              {MOTION_TYPES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMotionType(m.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                    motionType === m.id
                      ? 'bg-purple-50 border border-purple-200 text-purple-700'
                      : 'border border-gray-100 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="bg-white border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Prompt (optional)</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe the video motion..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={!sourceImage || generating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Video
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="col-span-8">
          <div className="bg-white border border-gray-100 p-4 min-h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Generated Videos</h3>
              <span className="text-xs text-gray-400">{generations.length} videos</span>
            </div>

            {generations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Video className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No videos yet</p>
                <p className="text-xs mt-1">Select a render and generate a fashion video</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {generations.map((gen) => {
                  const videoUrl = gen.output_data?.video_url;
                  const isProcessing = gen.status === 'processing';

                  return (
                    <div key={gen.id} className="rounded-xl overflow-hidden border border-gray-100">
                      {isProcessing ? (
                        <div className="aspect-video bg-gray-50 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Generating video...</p>
                            <p className="text-[10px] text-gray-400 mt-1">This may take 1-2 minutes</p>
                          </div>
                        </div>
                      ) : videoUrl ? (
                        <div className="relative group">
                          <video
                            src={videoUrl}
                            className="w-full aspect-video object-cover"
                            controls
                            loop
                            muted
                            playsInline
                          />
                          <a
                            href={videoUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ) : (
                        <div className="aspect-video bg-red-50 flex items-center justify-center">
                          <p className="text-xs text-red-500">Failed: {gen.error || 'Unknown error'}</p>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-xs text-gray-600 truncate">{gen.prompt}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                            {gen.input_data?.motion_type || 'video'}
                          </span>
                          <span className="text-[10px] text-gray-400">Kling 3.0</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
