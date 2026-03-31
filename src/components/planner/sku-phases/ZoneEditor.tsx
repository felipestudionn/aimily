'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PaintBucket, Eraser, Pencil, Undo2, Redo2, Download, Upload,
  Loader2,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useToast } from '@/components/ui/toast';
import { prepareForFloodFill, extractFillMask, applyMaskColor, hexToRgba } from '@/lib/canvas-utils';
import type { ColorwayZone } from '@/types/design';

/* ── Types ── */
type Tool = 'fill' | 'eraser' | 'pen';

interface ZoneEditorProps {
  /** URL or base64 of the sketch image */
  sketchImageUrl: string;
  /** Current zone colors */
  zoneColors: ColorwayZone[];
  /** Called when zone colors change */
  onZoneColorsChange: (zones: ColorwayZone[]) => void;
  /** Category for zone names */
  category: string;
}

const FILL_ALPHA = 90; // ~35% opacity
const FILL_TOLERANCE = 32;
const PEN_WIDTH = 3;
const ERASER_WIDTH = 20;

export function ZoneEditor({ sketchImageUrl, zoneColors, onZoneColorsChange, category }: ZoneEditorProps) {
  const t = useTranslation();
  const { toast } = useToast();

  // Canvas refs
  const containerRef = useRef<HTMLDivElement>(null);
  const sketchCanvasRef = useRef<HTMLCanvasElement>(null);   // Layer 2: sketch lines (top, non-interactive)
  const colorCanvasRef = useRef<HTMLCanvasElement>(null);     // Layer 1: user colors (interactive)
  const boundaryRef = useRef<ImageData | null>(null);         // Processed boundaries for flood fill

  // State
  const [tool, setTool] = useState<Tool>('fill');
  const [color, setColor] = useState('#3B3B3B');
  const [zoneName, setZoneName] = useState('Upper');
  const [loaded, setLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 700, h: 500 });

  // Undo history
  const historyRef = useRef<ImageData[]>([]);
  const redoRef = useRef<ImageData[]>([]);
  const [historyLen, setHistoryLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);

  // Pen drawing state
  const isPenDown = useRef(false);
  const lastPenPos = useRef<{ x: number; y: number } | null>(null);

  // Zone fills tracking
  const zoneFills = useRef<Map<string, string>>(new Map());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stepLabel = (key: string): string => (t.skuPhases as any)?.[key] || key;

  // Default zones for the zone picker
  const defaultZones = useRef<string[]>([]);
  useEffect(() => {
    import('@/lib/product-zones').then(m => {
      defaultZones.current = m.getDefaultZones(category).map(z => z.zone);
      if (defaultZones.current.length > 0 && !zoneName) setZoneName(defaultZones.current[0]);
    });
  }, [category]);

  /* ── Save undo state ── */
  const saveHistory = useCallback(() => {
    const ctx = colorCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvasSize.w, canvasSize.h);
    historyRef.current.push(data);
    redoRef.current = [];
    setHistoryLen(historyRef.current.length);
    setRedoLen(0);
  }, [canvasSize]);

  const undo = useCallback(() => {
    if (historyRef.current.length <= 1) return;
    const ctx = colorCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const current = historyRef.current.pop()!;
    redoRef.current.push(current);
    const prev = historyRef.current[historyRef.current.length - 1];
    ctx.putImageData(prev, 0, 0);
    setHistoryLen(historyRef.current.length);
    setRedoLen(redoRef.current.length);
  }, []);

  const redo = useCallback(() => {
    if (redoRef.current.length === 0) return;
    const ctx = colorCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const next = redoRef.current.pop()!;
    historyRef.current.push(next);
    ctx.putImageData(next, 0, 0);
    setHistoryLen(historyRef.current.length);
    setRedoLen(redoRef.current.length);
  }, []);

  /* ── Load sketch image ── */
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const container = containerRef.current;
      const maxW = container?.clientWidth || 700;
      const scale = Math.min(maxW / img.naturalWidth, 550 / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      setCanvasSize({ w, h });

      // Draw sketch on the top canvas — extract lines only (remove white background)
      const sketchCtx = sketchCanvasRef.current?.getContext('2d');
      if (sketchCtx && sketchCanvasRef.current) {
        sketchCanvasRef.current.width = w;
        sketchCanvasRef.current.height = h;
        sketchCtx.drawImage(img, 0, 0, w, h);

        // Prepare boundary map for flood fill (gap closing) — from ORIGINAL image
        const rawData = sketchCtx.getImageData(0, 0, w, h);
        boundaryRef.current = prepareForFloodFill(rawData, 2);

        // Now make the sketch layer transparent except for dark lines
        // This lets colors show through cleanly underneath
        const lineData = sketchCtx.getImageData(0, 0, w, h);
        const d = lineData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (gray > 200) {
            // White/light pixel → make transparent
            d[i + 3] = 0;
          } else {
            // Dark pixel (line) → keep opaque, make pure black
            d[i] = 0;
            d[i + 1] = 0;
            d[i + 2] = 0;
            d[i + 3] = Math.min(255, (200 - gray) * 2); // Smooth edge antialiasing
          }
        }
        sketchCtx.putImageData(lineData, 0, 0);
      }

      // Initialize color canvas (transparent)
      const colorCtx = colorCanvasRef.current?.getContext('2d');
      if (colorCtx && colorCanvasRef.current) {
        colorCanvasRef.current.width = w;
        colorCanvasRef.current.height = h;
        colorCtx.clearRect(0, 0, w, h);

        // Save initial empty state
        historyRef.current = [colorCtx.getImageData(0, 0, w, h)];
        setHistoryLen(1);
      }

      setLoaded(true);
    };
    img.onerror = () => toast('Failed to load sketch image', 'error');

    // Handle all URL formats
    let src = sketchImageUrl;
    if (src.length > 500 && !src.startsWith('data:') && !src.startsWith('http')) {
      src = `data:image/png;base64,${src}`;
    }
    img.src = src;
  }, [sketchImageUrl, toast]);

  /* ── Flood fill handler ── */
  const handleFill = useCallback((x: number, y: number) => {
    const colorCtx = colorCanvasRef.current?.getContext('2d');
    const boundary = boundaryRef.current;
    if (!colorCtx || !boundary) return;

    // Create a temp canvas with boundary lines + current colors merged
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasSize.w;
    tempCanvas.height = canvasSize.h;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Start with boundary map (dilated lines)
    tempCtx.putImageData(boundary, 0, 0);

    // Overlay current colors (so we don't fill over already-colored areas)
    tempCtx.globalCompositeOperation = 'darken';
    tempCtx.drawImage(colorCanvasRef.current!, 0, 0);
    tempCtx.globalCompositeOperation = 'source-over';

    // Get merged pixel data for flood fill
    const mergedData = tempCtx.getImageData(0, 0, canvasSize.w, canvasSize.h);
    const beforeData = new ImageData(
      new Uint8ClampedArray(mergedData.data),
      canvasSize.w, canvasSize.h
    );

    // Run flood fill on merged canvas
    import('q-floodfill').then(({ default: FloodFill }) => {
      const ff = new FloodFill(mergedData);
      const rgba = hexToRgba(color, 255); // Fill opaque on temp, apply with alpha later
      ff.fill(`rgba(${rgba.r},${rgba.g},${rgba.b},255)`, x, y, FILL_TOLERANCE);

      // Extract mask of what changed
      const mask = extractFillMask(beforeData, ff.imageData);

      // Apply color with alpha to the actual color canvas
      saveHistory();
      applyMaskColor(colorCtx, mask, canvasSize.w, hexToRgba(color, FILL_ALPHA));

      // Track zone
      zoneFills.current.set(zoneName, color);
      syncZonesToParent();
    });
  }, [color, zoneName, canvasSize, saveHistory]);

  /* ── Pen drawing (for closing gaps) ── */
  const handlePenStart = useCallback((x: number, y: number) => {
    isPenDown.current = true;
    lastPenPos.current = { x, y };

    if (tool === 'pen') {
      // Draw on the SKETCH canvas (closing gaps in line art)
      const ctx = sketchCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(x, y, PEN_WIDTH / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
    } else if (tool === 'eraser') {
      saveHistory();
      const ctx = colorCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, ERASER_WIDTH / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [tool, saveHistory]);

  const handlePenMove = useCallback((x: number, y: number) => {
    if (!isPenDown.current || !lastPenPos.current) return;

    if (tool === 'pen') {
      const ctx = sketchCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(lastPenPos.current.x, lastPenPos.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = PEN_WIDTH;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (tool === 'eraser') {
      const ctx = colorCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(lastPenPos.current.x, lastPenPos.current.y);
      ctx.lineTo(x, y);
      ctx.lineWidth = ERASER_WIDTH;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    lastPenPos.current = { x, y };
  }, [tool]);

  const handlePenEnd = useCallback(() => {
    if (isPenDown.current && tool === 'pen') {
      // Regenerate boundary map after drawing new lines
      const sketchCtx = sketchCanvasRef.current?.getContext('2d');
      if (sketchCtx) {
        const rawData = sketchCtx.getImageData(0, 0, canvasSize.w, canvasSize.h);
        boundaryRef.current = prepareForFloodFill(rawData, 2);
      }
    }
    isPenDown.current = false;
    lastPenPos.current = null;
  }, [tool, canvasSize]);

  /* ── Canvas mouse events ── */
  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) * (canvasSize.w / rect.width)),
      y: Math.round((e.clientY - rect.top) * (canvasSize.h / rect.height)),
    };
  }, [canvasSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPos(e);
    if (tool === 'fill') {
      handleFill(x, y);
    } else {
      handlePenStart(x, y);
    }
  }, [tool, getCanvasPos, handleFill, handlePenStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPos(e);
    handlePenMove(x, y);
  }, [getCanvasPos, handlePenMove]);

  /* ── Sync zone colors to parent ── */
  const syncZonesToParent = useCallback(() => {
    const zones: ColorwayZone[] = [];
    zoneFills.current.forEach((hex, zone) => {
      zones.push({ zone, hex });
    });
    if (zones.length > 0) onZoneColorsChange(zones);
  }, [onZoneColorsChange]);

  /* ── Download SVG (sketch + color overlay) ── */
  const handleDownload = useCallback(() => {
    const sketchCanvas = sketchCanvasRef.current;
    const colorCanvas = colorCanvasRef.current;
    if (!sketchCanvas || !colorCanvas) return;

    // Composite: color layer + sketch layer on top
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasSize.w;
    exportCanvas.height = canvasSize.h;
    const ctx = exportCanvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
    ctx.drawImage(colorCanvas, 0, 0);
    ctx.drawImage(sketchCanvas, 0, 0);

    // Create SVG with embedded image
    const dataUrl = exportCanvas.toDataURL('image/png');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize.w}" height="${canvasSize.h}" viewBox="0 0 ${canvasSize.w} ${canvasSize.h}">
  <image href="${dataUrl}" width="${canvasSize.w}" height="${canvasSize.h}"/>
</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'colored-sketch.svg'; a.click();
    URL.revokeObjectURL(url);
    toast(stepLabel('svgDownloaded') || 'SVG downloaded', 'success');
  }, [canvasSize, toast]);

  /* ── Upload SVG/PNG ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUpload = useCallback(async (file: File) => {
    // Load as image overlay on color canvas
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ctx = colorCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      saveHistory();
      ctx.drawImage(img, 0, 0, canvasSize.w, canvasSize.h);
      URL.revokeObjectURL(url);
      toast(stepLabel('svgUploaded') || 'File imported', 'success');
    };
    img.src = url;
  }, [canvasSize, saveHistory, toast]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if (e.key === 'b' || e.key === 'B') setTool('fill');
      if (e.key === 'e' || e.key === 'E') setTool('eraser');
      if (e.key === 'p' || e.key === 'P') setTool('pen');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const cursor = tool === 'fill' ? 'crosshair' : tool === 'eraser' ? 'cell' : 'default';

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Tools */}
        <div className="flex items-center border border-carbon/[0.08] divide-x divide-carbon/[0.06]">
          <button onClick={() => setTool('fill')} title="Paint Bucket (B)"
            className={`p-2 transition-colors ${tool === 'fill' ? 'bg-carbon text-crema' : 'text-carbon/40 hover:text-carbon/60'}`}>
            <PaintBucket className="h-4 w-4" />
          </button>
          <button onClick={() => setTool('pen')} title="Pen — close gaps (P)"
            className={`p-2 transition-colors ${tool === 'pen' ? 'bg-carbon text-crema' : 'text-carbon/40 hover:text-carbon/60'}`}>
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setTool('eraser')} title="Eraser (E)"
            className={`p-2 transition-colors ${tool === 'eraser' ? 'bg-carbon text-crema' : 'text-carbon/40 hover:text-carbon/60'}`}>
            <Eraser className="h-4 w-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-carbon/[0.06]" />

        {/* Color picker */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-7 h-7 border-2 border-carbon/[0.15] cursor-pointer hover:ring-2 hover:ring-carbon/20 transition-shadow" style={{ backgroundColor: color }} />
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          </div>
          {/* Zone selector */}
          <select
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            className="text-[10px] font-medium uppercase bg-transparent border border-carbon/[0.08] px-2 py-1.5 text-carbon/50 focus:outline-none tracking-wider"
          >
            {(defaultZones.current.length > 0 ? defaultZones.current : ['Upper', 'Midsole', 'Outsole', 'Tongue', 'Laces']).map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>

        <div className="w-px h-6 bg-carbon/[0.06]" />

        {/* Undo/Redo */}
        <button onClick={undo} disabled={historyLen <= 1} title="Undo (Ctrl+Z)"
          className="p-1.5 text-carbon/30 hover:text-carbon/60 transition-colors disabled:opacity-20">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={redo} disabled={redoLen === 0} title="Redo (Ctrl+Shift+Z)"
          className="p-1.5 text-carbon/30 hover:text-carbon/60 transition-colors disabled:opacity-20">
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="flex-1" />

        {/* Export/Import */}
        <button onClick={handleDownload} className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase text-carbon/35 border border-carbon/[0.06] hover:border-carbon/15 transition-colors">
          <Download className="h-3 w-3" /> SVG
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase text-carbon/35 border border-carbon/[0.06] hover:border-carbon/15 transition-colors">
          <Upload className="h-3 w-3" /> {stepLabel('importSvg') || 'Import'}
        </button>
        <input ref={fileInputRef} type="file" accept=".svg,.png,.jpg" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
      </div>

      {/* ── Canvas stack (coloring book pattern) ── */}
      <div ref={containerRef} className="relative border border-carbon/[0.08] bg-white overflow-hidden" style={{ width: '100%' }}>
        {!loaded && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-carbon/15" />
          </div>
        )}
        {/* Layer 1: Color canvas (bottom — where fills go) */}
        <canvas
          ref={colorCanvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          style={{ display: loaded ? 'block' : 'none', width: '100%', height: 'auto' }}
        />
        {/* Layer 2: Sketch lines (top — always visible, non-interactive) */}
        <canvas
          ref={sketchCanvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="absolute top-0 left-0"
          style={{
            display: loaded ? 'block' : 'none',
            width: '100%',
            height: 'auto',
            pointerEvents: tool === 'pen' ? 'auto' : 'none',
            cursor: tool === 'pen' ? 'crosshair' : undefined,
          }}
          onMouseDown={tool === 'pen' ? handleMouseDown : undefined}
          onMouseMove={tool === 'pen' ? handleMouseMove : undefined}
          onMouseUp={tool === 'pen' ? handlePenEnd : undefined}
          onMouseLeave={tool === 'pen' ? handlePenEnd : undefined}
        />
        {/* Interaction layer (for fill + eraser — sits on top but transparent) */}
        <canvas
          width={canvasSize.w}
          height={canvasSize.h}
          className="absolute top-0 left-0"
          style={{
            display: loaded ? 'block' : 'none',
            width: '100%',
            height: 'auto',
            pointerEvents: tool !== 'pen' ? 'auto' : 'none',
            cursor,
            opacity: 0,
          }}
          onMouseDown={tool !== 'pen' ? handleMouseDown : undefined}
          onMouseMove={tool !== 'pen' ? handleMouseMove : undefined}
          onMouseUp={() => { isPenDown.current = false; lastPenPos.current = null; }}
          onMouseLeave={() => { isPenDown.current = false; lastPenPos.current = null; }}
        />
      </div>

      {/* ── Zone fills summary ── */}
      {zoneFills.current.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from(zoneFills.current.entries()).map(([zone, hex]) => (
            <div key={zone} className="flex items-center gap-1.5 px-2 py-1 border border-carbon/[0.06]">
              <div className="w-3.5 h-3.5 border border-carbon/[0.1]" style={{ backgroundColor: hex }} />
              <span className="text-[9px] text-carbon/40 font-medium uppercase tracking-wider">{zone}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Instructions ── */}
      <p className="text-[8px] text-carbon/15 italic leading-relaxed">
        {tool === 'fill' && (stepLabel('fillInstructions') || 'Click on an area to fill it with the selected color. Select the zone name before filling.')}
        {tool === 'pen' && (stepLabel('penInstructions') || 'Draw lines to close gaps in the sketch. The fill tool will respect these new boundaries.')}
        {tool === 'eraser' && (stepLabel('eraserInstructions') || 'Drag over colored areas to erase them.')}
      </p>
    </div>
  );
}
