'use client';

import { useState, useRef, useCallback } from 'react';
import { Navbar } from '@/components/layout/navbar';
import ImageUploader from '@/components/sketch-flow/ImageUploader';
import PhotoCard from '@/components/sketch-flow/PhotoCard';
import GarmentDetailsForm from '@/components/sketch-flow/GarmentDetailsForm';
import TechPackPreview from '@/components/sketch-flow/TechPackPreview';
import CommentSelector from '@/components/sketch-flow/CommentSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useTechPacks } from '@/hooks/useTechPacks';
import { exportTechPackPDF, exportTechPackPNG } from '@/lib/export-pdf';
import {
  UploadedImage,
  GarmentDetails,
  SketchOption,
  ProposedNote,
  ConstructionNote,
  SuggestedMeasurements,
  FlowStep,
} from '@/types/tech-pack';
import SubscriptionGate from '@/components/billing/SubscriptionGate';
import {
  PenTool,
  Loader2,
  Download,
  Image as ImageIcon,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  FileDown,
  ChevronDown,
  ArrowRight,
  Check,
} from 'lucide-react';

export default function SketchFlowPage() {
  const { user } = useAuth();
  const { saveTechPack } = useTechPacks(user?.id);
  const techPackRef = useRef<HTMLDivElement>(null);

  // Flow state
  const [flowStep, setFlowStep] = useState<FlowStep>('input');

  // Input state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [garmentDetails, setGarmentDetails] = useState<GarmentDetails>({
    garmentType: '',
    season: '',
    styleName: '',
    fabric: '',
    additionalNotes: '',
  });

  // Sketch selection state
  const [sketchOptions, setSketchOptions] = useState<SketchOption[]>([]);
  const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null);

  // Comments state
  const [proposedNotes, setProposedNotes] = useState<ProposedNote[]>([]);
  const [suggestedMeasurements, setSuggestedMeasurements] = useState<SuggestedMeasurements>({
    bust: '', waist: '', seat: '', totalLength: '', sleeveLength: '',
  });

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [saved, setSaved] = useState(false);

  const canGenerate = images.length >= 1 && garmentDetails.garmentType !== '';
  const selectedSketch = sketchOptions.find((o) => o.id === selectedSketchId) || null;

  // Generate sketch + comments in one flow (skip selection step)
  const handleGenerateSketches = useCallback(async () => {
    if (!canGenerate) return;
    setFlowStep('generating-sketches');
    setError(null);
    setSketchOptions([]);
    setSelectedSketchId(null);

    try {
      setGenerationStep('Analizando fotos de referencia...');

      const payload = {
        images: images.map((img) => ({
          base64: img.base64,
          mimeType: img.mimeType,
          instructions: img.instructions,
        })),
        garmentType: garmentDetails.garmentType,
        season: garmentDetails.season,
        styleName: garmentDetails.styleName,
        fabric: garmentDetails.fabric,
        additionalNotes: garmentDetails.additionalNotes,
      };

      setGenerationStep('Generando sketch técnico...');

      const sketchResponse = await fetch('/api/ai/generate-sketch-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!sketchResponse.ok) {
        const data = await sketchResponse.json();
        throw new Error(data.error || 'Error en la generación');
      }

      const sketchResult = await sketchResponse.json();
      const sketch = sketchResult.sketchOptions[0];
      setSketchOptions(sketchResult.sketchOptions);
      setSelectedSketchId(sketch.id);

      // Auto-proceed to comments generation
      setGenerationStep('Generando propuestas de comentarios...');

      const commentsResponse = await fetch('/api/ai/propose-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentType: garmentDetails.garmentType,
          conceptDescription: sketch.description,
          fabric: garmentDetails.fabric,
          additionalNotes: garmentDetails.additionalNotes,
        }),
      });

      if (!commentsResponse.ok) {
        const data = await commentsResponse.json();
        throw new Error(data.error || 'Error al generar comentarios');
      }

      const commentsResult = await commentsResponse.json();
      setProposedNotes(commentsResult.proposedNotes);
      setSuggestedMeasurements(commentsResult.suggestedMeasurements);
      setFlowStep('comments');
      setGenerationStep('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ha ocurrido un error inesperado';
      setError(message);
      setFlowStep('input');
      setGenerationStep('');
    }
  }, [canGenerate, images, garmentDetails]);

  // Step 4 → 5: Compose final tech pack
  const handleConfirmComments = useCallback(async () => {
    setFlowStep('final');
    setSaved(false);

    // Auto-save if authenticated
    if (user && selectedSketch) {
      try {
        const selectedNotes = proposedNotes
          .filter((n) => n.selected)
          .map(({ text, position, x, y }) => ({ text, position, x, y }));

        await saveTechPack({
          season: garmentDetails.season || 'N/A',
          style_name: garmentDetails.styleName || 'Sin título',
          garment_type: garmentDetails.garmentType,
          fabric: garmentDetails.fabric,
          additional_notes: garmentDetails.additionalNotes,
          reference_images: [],
          sketch_front_image: selectedSketch.frontImageBase64,
          sketch_back_image: null,
          construction_notes: selectedNotes,
          suggested_measurements: suggestedMeasurements,
          status: 'complete',
        });
        setSaved(true);
      } catch {
        console.warn('Error al guardar automáticamente');
      }
    }
  }, [user, selectedSketch, proposedNotes, garmentDetails, suggestedMeasurements, saveTechPack]);

  // Navigation
  const handleBackToInput = useCallback(() => {
    setFlowStep('input');
    setError(null);
  }, []);

  const handleBackToComments = useCallback(() => {
    setFlowStep('comments');
  }, []);

  // Export
  const handleExportPDF = useCallback(async () => {
    if (!techPackRef.current) return;
    const name = garmentDetails.styleName || 'ficha-tecnica';
    await exportTechPackPDF(techPackRef.current, `${name}.pdf`);
    setShowExportMenu(false);
  }, [garmentDetails.styleName]);

  const handleExportPNG = useCallback(async () => {
    if (!techPackRef.current) return;
    const name = garmentDetails.styleName || 'ficha-tecnica';
    await exportTechPackPNG(techPackRef.current, `${name}.png`);
    setShowExportMenu(false);
  }, [garmentDetails.styleName]);

  const handleInstructionChange = useCallback((index: number, instruction: string) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, instructions: instruction } : img))
    );
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Get selected notes for final tech pack
  const finalNotes: ConstructionNote[] = proposedNotes
    .filter((n) => n.selected)
    .map(({ text, position, x, y }) => ({ text, position, x, y }));

  const isGenerating = flowStep === 'generating-sketches' || flowStep === 'generating-comments';

  return (
    <SubscriptionGate>
    <div className="min-h-screen bg-[#fff6dc]">
      <Navbar />
      <main className="pt-28 pb-16 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                <PenTool className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SketchFlow</h1>
            </div>
            <p className="text-gray-500 text-sm max-w-xl">
              Sube fotos de referencia y la IA generará un sketch técnico fiel al original para tu ficha.
            </p>
          </div>

          {/* Step indicator */}
          {flowStep !== 'input' && !isGenerating && (
            <div className="flex items-center gap-2 mb-6 text-xs text-gray-400">
              <span className="text-gray-400">1. Datos</span>
              <ChevronDown className="h-3 w-3 -rotate-90" />
              <span className={flowStep === 'comments' ? 'text-gray-900 font-medium' : 'text-gray-400'}>2. Comentarios</span>
              <ChevronDown className="h-3 w-3 -rotate-90" />
              <span className={flowStep === 'final' ? 'text-gray-900 font-medium' : 'text-gray-400'}>3. Ficha final</span>
            </div>
          )}

          {/* === STEP 1: INPUT === */}
          {flowStep === 'input' && (
            <div className="space-y-8">
              {/* Upload photos */}
              <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">1</div>
                  <span className="text-sm font-medium text-gray-500">Fotos de referencia</span>
                </div>
                <ImageUploader images={images} onImagesChange={setImages} />
              </section>

              {/* Instructions per photo */}
              {images.length > 0 && (
                <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">2</div>
                    <span className="text-sm font-medium text-gray-500">¿Qué quieres de cada foto?</span>
                  </div>
                  <div className="space-y-3">
                    {images.map((img, i) => (
                      <PhotoCard
                        key={i}
                        image={img}
                        index={i}
                        onInstructionChange={handleInstructionChange}
                        onRemove={handleRemoveImage}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Garment details */}
              <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">3</div>
                  <span className="text-sm font-medium text-gray-500">Detalles generales</span>
                </div>
                <GarmentDetailsForm details={garmentDetails} onChange={setGarmentDetails} />
              </section>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Generate button */}
              <div className="flex justify-center">
                <button
                  onClick={handleGenerateSketches}
                  disabled={!canGenerate || isGenerating}
                  className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-medium transition-all shadow-lg
                    ${canGenerate && !isGenerating
                      ? 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-xl'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <Sparkles className="h-5 w-5" />
                  Generar sketch técnico
                </button>
              </div>
            </div>
          )}

          {/* === GENERATING === */}
          {isGenerating && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-900 mx-auto mb-3" />
              <p className="text-gray-900 font-medium">{generationStep}</p>
              <p className="text-gray-500 text-sm mt-1">
                {flowStep === 'generating-sketches'
                  ? 'Esto puede tardar 30-60 segundos...'
                  : 'Un momento...'}
              </p>
            </div>
          )}

          {/* === STEP 2: COMMENT SELECTION === */}
          {flowStep === 'comments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToInput}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver a editar
                </button>
                <button
                  onClick={handleGenerateSketches}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerar sketch
                </button>
              </div>

              <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Notas de construcción</h2>
                <CommentSelector
                  proposedNotes={proposedNotes}
                  onNotesChange={setProposedNotes}
                />
              </section>

              {/* Next button */}
              <div className="flex justify-center">
                <button
                  onClick={handleConfirmComments}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-medium bg-gray-900 text-white hover:bg-gray-800 hover:shadow-xl transition-all shadow-lg"
                >
                  <Check className="h-5 w-5" />
                  Generar ficha técnica
                </button>
              </div>
            </div>
          )}

          {/* === STEP 4: FINAL TECH PACK === */}
          {flowStep === 'final' && selectedSketch && (
            <div>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6 bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                <button
                  onClick={handleBackToComments}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Editar comentarios
                </button>
                <div className="flex items-center gap-2">
                  {saved && (
                    <span className="text-xs text-green-600 font-medium">Guardado</span>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exportar
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                        <button
                          onClick={handleExportPDF}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          Descargar PDF
                        </button>
                        <button
                          onClick={handleExportPNG}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Descargar PNG
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tech Pack Preview */}
              <div className="overflow-x-auto pb-4">
                <div className="mx-auto" style={{ width: 794 }}>
                  <TechPackPreview
                    ref={techPackRef}
                    selectedSketch={selectedSketch}
                    selectedNotes={finalNotes}
                    suggestedMeasurements={suggestedMeasurements}
                    season={garmentDetails.season}
                    styleName={garmentDetails.styleName}
                    fabric={garmentDetails.fabric}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
    </SubscriptionGate>
  );
}
