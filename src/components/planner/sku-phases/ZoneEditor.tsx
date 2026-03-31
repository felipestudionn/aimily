'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Loader2, Plus, Trash2, Undo2, Redo2, Download, Upload,
  Square, Circle as CircleIcon, MousePointer, Palette,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useToast } from '@/components/ui/toast';
import { useCanvasHistory } from './useCanvasHistory';
import type { ColorwayZone } from '@/types/design';

/* ── Types ── */
interface ZoneRegion {
  zone: string;
  x: number; y: number; width: number; height: number;
  confidence: 'high' | 'medium' | 'low';
}

interface ZoneEditorProps {
  /** URL or base64 of the sketch image (raster — used as background) */
  sketchImageUrl: string;
  /** Zone regions detected by AI (bounding boxes as % of image) */
  zoneRegions: ZoneRegion[];
  /** Current zone colors */
  zoneColors: ColorwayZone[];
  /** Called when zone colors change */
  onZoneColorsChange: (zones: ColorwayZone[]) => void;
  /** Category for context */
  category: string;
}

const ZONE_FILL_OPACITY = 0.3;

export function ZoneEditor({ sketchImageUrl, zoneRegions, zoneColors, onZoneColorsChange, category }: ZoneEditorProps) {
  const t = useTranslation();
  const { toast } = useToast();
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<import('fabric').Canvas | null>(null);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState('#3B3B3B');
  const [zones, setZones] = useState<string[]>([]);
  const [renamingZone, setRenamingZone] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { initHistory, undo, redo, canUndo, canRedo } = useCanvasHistory(fabricRef);

  // Color map from props
  const colorMap = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const m = new Map<string, string>();
    zoneColors.forEach(z => m.set(z.zone, z.hex));
    colorMap.current = m;
  }, [zoneColors]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stepLabel = (key: string): string => (t.skuPhases as any)?.[key] || key;

  /* ── Initialize Fabric.js ── */
  useEffect(() => {
    let mounted = true;
    import('fabric').then((fabric) => {
      if (!mounted || !canvasEl.current) return;

      const container = containerRef.current;
      const w = container?.clientWidth || 700;
      const h = Math.min(w * 0.65, 480);

      const canvas = new fabric.Canvas(canvasEl.current, {
        width: w,
        height: h,
        backgroundColor: '#FFFFFF',
        selection: true,
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;

      // Selection → React state
      canvas.on('selection:created', () => syncSelection(canvas));
      canvas.on('selection:updated', () => syncSelection(canvas));
      canvas.on('selection:cleared', () => { setSelectedZone(null); });

      // Load sketch as background + overlay zones
      loadSketchAndZones(fabric, canvas, sketchImageUrl, zoneRegions);
      setFabricLoaded(true);
    });

    return () => {
      mounted = false;
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const syncSelection = (canvas: import('fabric').Canvas) => {
    const active = canvas.getActiveObject();
    if (active) {
      const zone = (active as any).name || null;
      setSelectedZone(zone);
      setSelectedColor((active.fill as string) || '#3B3B3B');
    }
  };

  /* ── Load sketch image as background, add zone shapes ── */
  const loadSketchAndZones = useCallback(async (
    fabric: typeof import('fabric'),
    canvas: import('fabric').Canvas,
    imageUrl: string,
    regions: ZoneRegion[]
  ) => {
    // Resolve image source
    let src = imageUrl;
    if (src.length > 500 && !src.startsWith('data:') && !src.startsWith('http')) {
      src = `data:image/png;base64,${src}`;
    }

    // Load image as background
    const img = await fabric.FabricImage.fromURL(src, { crossOrigin: 'anonymous' });
    const cw = canvas.getWidth();
    const ch = canvas.getHeight();
    const scale = Math.min(cw / img.width!, ch / img.height!) * 0.95;
    img.set({
      scaleX: scale,
      scaleY: scale,
      left: (cw - img.width! * scale) / 2,
      top: (ch - img.height! * scale) / 2,
      selectable: false,
      evented: false,
      excludeFromExport: false,
    });
    canvas.add(img);
    canvas.sendObjectToBack(img);

    // Image bounds for positioning zone shapes
    const imgLeft = img.left!;
    const imgTop = img.top!;
    const imgW = img.width! * scale;
    const imgH = img.height! * scale;

    // Create zone shapes from AI-detected regions
    const foundZones: string[] = [];
    regions.forEach((region) => {
      const hex = colorMap.current.get(region.zone) || '#3B3B3B';
      const rect = new fabric.Rect({
        left: imgLeft + (region.x / 100) * imgW,
        top: imgTop + (region.y / 100) * imgH,
        width: (region.width / 100) * imgW,
        height: (region.height / 100) * imgH,
        fill: hex,
        opacity: ZONE_FILL_OPACITY,
        stroke: hex,
        strokeWidth: 1.5,
        rx: 3,
        ry: 3,
        hasControls: true,
        hasBorders: true,
        lockRotation: true,
        cornerStyle: 'circle',
        cornerSize: 6,
        transparentCorners: false,
        cornerColor: '#282A29',
        borderColor: '#282A29',
      } as any);
      (rect as any).name = region.zone;
      canvas.add(rect);
      foundZones.push(region.zone);
    });

    canvas.renderAll();
    setZones(foundZones);
    initHistory();
  }, [initHistory]);

  /* ── Change color of selected object ── */
  const handleColorChange = useCallback((color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setSelectedColor(color);

    const active = canvas.getActiveObject();
    if (!active) return;

    const zoneName = (active as any).name;
    active.set({ fill: color, stroke: color, opacity: ZONE_FILL_OPACITY, strokeWidth: 1.5 });
    canvas.renderAll();
    canvas.fire('object:modified', { target: active });

    if (zoneName) {
      colorMap.current.set(zoneName, color);
      syncColorsToParent();
    }
  }, []);

  /* ── Color all objects of a zone ── */
  const colorEntireZone = useCallback((zoneName: string, color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((obj) => {
      if ((obj as any).name === zoneName) {
        obj.set({ fill: color, stroke: color, opacity: ZONE_FILL_OPACITY, strokeWidth: 1.5 });
      }
    });
    canvas.renderAll();
    colorMap.current.set(zoneName, color);
    syncColorsToParent();
  }, []);

  /* ── Sync colors from canvas to parent ── */
  const syncColorsToParent = useCallback(() => {
    const updated: ColorwayZone[] = [];
    colorMap.current.forEach((hex, zone) => {
      updated.push({ zone, hex });
    });
    onZoneColorsChange(updated);
  }, [onZoneColorsChange]);

  /* ── Delete selected ── */
  const handleDelete = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || !(active as any).name) return; // Don't delete background image

    const zoneName = (active as any).name;
    canvas.remove(active);
    canvas.renderAll();

    if (zoneName) {
      const remaining = canvas.getObjects().some((o: any) => o.name === zoneName);
      if (!remaining) {
        setZones(prev => prev.filter(z => z !== zoneName));
        colorMap.current.delete(zoneName);
        syncColorsToParent();
      }
    }
    toast(stepLabel('zoneDeleted') || 'Zone deleted', 'info');
  }, [toast, syncColorsToParent]);

  /* ── Add shape ── */
  const addShape = useCallback(async (type: 'rect' | 'ellipse') => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const fabric = await import('fabric');
    const zoneName = `Zone ${zones.length + 1}`;
    const color = '#808080';

    const props = {
      left: canvas.getWidth() / 2 - 40,
      top: canvas.getHeight() / 2 - 25,
      fill: color,
      opacity: ZONE_FILL_OPACITY,
      stroke: color,
      strokeWidth: 1.5,
      hasControls: true,
      cornerStyle: 'circle' as const,
      cornerSize: 6,
      transparentCorners: false,
      cornerColor: '#282A29',
      borderColor: '#282A29',
      lockRotation: true,
    };

    const shape = type === 'rect'
      ? new fabric.Rect({ ...props, width: 80, height: 50, rx: 3, ry: 3 } as any)
      : new fabric.Ellipse({ ...props, rx: 40, ry: 25 } as any);

    (shape as any).name = zoneName;
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();

    setZones(prev => [...prev, zoneName]);
    setSelectedZone(zoneName);
    colorMap.current.set(zoneName, color);
    syncColorsToParent();
  }, [zones, syncColorsToParent]);

  /* ── Rename zone ── */
  const handleRename = useCallback((oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) { setRenamingZone(null); return; }
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj: any) => {
      if (obj.name === oldName) obj.name = newName;
    });
    setZones(prev => prev.map(z => z === oldName ? newName : z));
    setRenamingZone(null);

    if (colorMap.current.has(oldName)) {
      const hex = colorMap.current.get(oldName)!;
      colorMap.current.delete(oldName);
      colorMap.current.set(newName, hex);
    }
    syncColorsToParent();
  }, [syncColorsToParent]);

  /* ── Download SVG ── */
  const handleDownload = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const svg = canvas.toSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sketch-zones.svg'; a.click();
    URL.revokeObjectURL(url);
    toast(stepLabel('svgDownloaded') || 'SVG downloaded', 'success');
  }, [toast]);

  /* ── Upload SVG ── */
  const handleUpload = useCallback(async (file: File) => {
    const text = await file.text();
    const fabric = await import('fabric');
    const canvas = fabricRef.current;
    if (!canvas || !fabric) return;

    // Parse SVG and add objects on top of background
    const { objects } = await fabric.loadSVGFromString(text);
    const newZones: string[] = [];
    objects.forEach(obj => {
      if (!obj) return;
      const zone = (obj as any).name || obj.fill?.toString() || '';
      if (zone) {
        (obj as any).name = zone;
        newZones.push(zone);
      }
      obj.set({ hasControls: true, cornerStyle: 'circle', cornerSize: 6, lockRotation: true } as any);
      canvas.add(obj);
    });
    canvas.renderAll();
    if (newZones.length > 0) setZones(prev => Array.from(new Set([...prev, ...newZones])));
    toast(stepLabel('svgUploaded') || 'SVG imported', 'success');
  }, [toast]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!(e.target instanceof HTMLInputElement)) handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, handleDelete]);

  /* ── Responsive ── */
  useEffect(() => {
    const container = containerRef.current;
    const canvas = fabricRef.current;
    if (!container || !canvas) return;
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const newH = Math.min(width * 0.65, 480);
      const ratio = width / canvas.getWidth();
      canvas.setDimensions({ width, height: newH });
      canvas.setZoom(canvas.getZoom() * ratio);
      canvas.renderAll();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [fabricLoaded]);

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center border border-carbon/[0.08] divide-x divide-carbon/[0.06]">
          <button className="p-1.5 bg-carbon text-crema" title={stepLabel('toolSelect') || 'Select'}>
            <MousePointer className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => addShape('rect')} className="p-1.5 text-carbon/40 hover:text-carbon/60 transition-colors" title={stepLabel('addRect') || 'Add rectangle zone'}>
            <Square className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => addShape('ellipse')} className="p-1.5 text-carbon/40 hover:text-carbon/60 transition-colors" title={stepLabel('addEllipse') || 'Add ellipse zone'}>
            <CircleIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="w-px h-5 bg-carbon/[0.06]" />

        <div className="flex items-center gap-1.5">
          <Palette className="h-3 w-3 text-carbon/25" />
          <div className="relative">
            <div className="w-6 h-6 border border-carbon/[0.12] cursor-pointer hover:ring-1 hover:ring-carbon/20" style={{ backgroundColor: selectedColor }} />
            <input type="color" value={selectedColor} onChange={(e) => handleColorChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          </div>
          {selectedZone && <span className="text-[9px] text-carbon/40 font-medium uppercase tracking-wider">{selectedZone}</span>}
        </div>

        <div className="w-px h-5 bg-carbon/[0.06]" />

        <button onClick={handleDelete} className="p-1.5 text-carbon/30 hover:text-[#A0463C]/60 transition-colors" title={stepLabel('deleteZone') || 'Delete'}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={undo} disabled={!canUndo} className="p-1.5 text-carbon/30 hover:text-carbon/60 transition-colors disabled:opacity-20" title="Undo (Ctrl+Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={redo} disabled={!canRedo} className="p-1.5 text-carbon/30 hover:text-carbon/60 transition-colors disabled:opacity-20" title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1" />

        <button onClick={handleDownload} className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium tracking-[0.08em] uppercase text-carbon/35 border border-carbon/[0.06] hover:border-carbon/15 transition-colors">
          <Download className="h-3 w-3" /> SVG
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium tracking-[0.08em] uppercase text-carbon/35 border border-carbon/[0.06] hover:border-carbon/15 transition-colors">
          <Upload className="h-3 w-3" /> {stepLabel('importSvg') || 'Import'}
        </button>
        <input ref={fileInputRef} type="file" accept=".svg" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
      </div>

      {/* ── Canvas ── */}
      <div ref={containerRef} className="border border-carbon/[0.08] bg-white overflow-hidden">
        <canvas ref={canvasEl} />
      </div>

      {/* ── Zone list ── */}
      {zones.length > 0 && (
        <div className="space-y-1">
          <p className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('zones') || 'Zones'} ({zones.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {zones.map(zone => {
              const hex = colorMap.current.get(zone) || '#808080';
              const isSelected = selectedZone === zone;
              return (
                <div
                  key={zone}
                  className={`flex items-center gap-1.5 px-2 py-1 border transition-colors cursor-pointer ${
                    isSelected ? 'border-carbon/30 bg-carbon/[0.03]' : 'border-carbon/[0.06] hover:border-carbon/15'
                  }`}
                  onClick={() => {
                    const canvas = fabricRef.current;
                    if (!canvas) return;
                    const obj = canvas.getObjects().find((o: any) => o.name === zone);
                    if (obj) { canvas.setActiveObject(obj); canvas.renderAll(); }
                    setSelectedZone(zone);
                    setSelectedColor(hex);
                  }}
                >
                  <div className="relative">
                    <div className="w-4 h-4 border border-carbon/[0.1]" style={{ backgroundColor: hex }} />
                    <input type="color" value={hex} onChange={(e) => colorEntireZone(zone, e.target.value)}
                      onClick={(e) => e.stopPropagation()} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  </div>
                  {renamingZone === zone ? (
                    <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(zone, renameValue)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(zone, renameValue); if (e.key === 'Escape') setRenamingZone(null); }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-carbon bg-transparent border-b border-carbon/20 focus:outline-none w-20" />
                  ) : (
                    <span className="text-[10px] text-carbon/50 font-medium"
                      onDoubleClick={(e) => { e.stopPropagation(); setRenamingZone(zone); setRenameValue(zone); }}>
                      {zone}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[8px] text-carbon/15 italic">{stepLabel('doubleClickRename') || 'Double-click zone name to rename'}</p>
        </div>
      )}
    </div>
  );
}
