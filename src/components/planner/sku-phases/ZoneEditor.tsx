'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Loader2, Plus, Trash2, Undo2, Redo2, Download, Upload,
  Square, Circle as CircleIcon, MousePointer, Tag, Palette,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useToast } from '@/components/ui/toast';
import { useCanvasHistory } from './useCanvasHistory';
import type { ColorwayZone } from '@/types/design';

/* ── Types ── */
interface ZoneEditorProps {
  /** SVG string with data-zone attributes on elements */
  svgSource: string;
  /** Current zone colors to apply initially */
  zoneColors: ColorwayZone[];
  /** Called when user changes a zone color */
  onZoneColorsChange: (zones: ColorwayZone[]) => void;
  /** Called when SVG structure changes (zones added/removed) */
  onSvgChange?: (svg: string) => void;
  /** Category for default zone names */
  category: string;
}

/* ── Constants ── */
const ZONE_FILL_OPACITY = 0.35;
const ZONE_STROKE_OPACITY = 0.6;

export function ZoneEditor({ svgSource, zoneColors, onZoneColorsChange, onSvgChange, category }: ZoneEditorProps) {
  const t = useTranslation();
  const { toast } = useToast();
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<import('fabric').Canvas | null>(null);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState('#3B3B3B');
  const [activeTool, setActiveTool] = useState<'select' | 'rect' | 'ellipse'>('select');
  const [zones, setZones] = useState<string[]>([]);
  const [renamingZone, setRenamingZone] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { initHistory, undo, redo, canUndo, canRedo } = useCanvasHistory(fabricRef);

  // Build color map from props
  const colorMap = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const m = new Map<string, string>();
    zoneColors.forEach(z => m.set(z.zone, z.hex));
    colorMap.current = m;
  }, [zoneColors]);

  /* ── Load Fabric.js dynamically (no SSR) ── */
  useEffect(() => {
    let mounted = true;
    import('fabric').then((fabric) => {
      if (!mounted || !canvasEl.current) return;

      const container = containerRef.current;
      const w = container?.clientWidth || 600;
      const h = Math.min(w * 0.75, 500);

      const canvas = new fabric.Canvas(canvasEl.current, {
        width: w,
        height: h,
        backgroundColor: '#FFFFFF',
        selection: true,
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;

      // Selection events → React state
      const onSelect = () => {
        const active = canvas.getActiveObject();
        if (active) {
          const zone = (active as any).name || null;
          setSelectedZone(zone);
          setSelectedColor((active.fill as string) || '#3B3B3B');
        }
      };
      canvas.on('selection:created', onSelect);
      canvas.on('selection:updated', onSelect);
      canvas.on('selection:cleared', () => {
        setSelectedZone(null);
      });

      // Load the SVG
      loadSvgIntoCanvas(fabric, canvas, svgSource);
      setFabricLoaded(true);

      return () => {
        canvas.dispose();
        fabricRef.current = null;
      };
    });

    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load SVG into canvas ── */
  const loadSvgIntoCanvas = useCallback(async (
    fabric: typeof import('fabric'),
    canvas: import('fabric').Canvas,
    svg: string
  ) => {
    canvas.clear();
    canvas.backgroundColor = '#FFFFFF';

    const { objects, options } = await fabric.loadSVGFromString(svg, (svgEl, fabricObj) => {
      const zone = svgEl.getAttribute('data-zone') || svgEl.getAttribute('id') || '';
      if (zone && zone !== 'none') {
        (fabricObj as any).name = zone;
        // Apply color from colorMap or keep original
        const hex = colorMap.current.get(zone);
        if (hex) {
          fabricObj.set({
            fill: hex,
            opacity: ZONE_FILL_OPACITY,
            stroke: hex,
            strokeWidth: 1.5,
          });
        } else {
          fabricObj.set({ opacity: ZONE_FILL_OPACITY });
        }
      } else {
        // Construction lines / unlabeled: keep as-is but semi-transparent
        fabricObj.set({
          selectable: true,
          opacity: 0.8,
        });
        (fabricObj as any).name = '';
      }
    });

    // Add objects individually (not grouped)
    const foundZones = new Set<string>();
    objects.forEach(obj => {
      if (obj) {
        obj.set({
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          cornerStyle: 'circle',
          cornerSize: 6,
          transparentCorners: false,
          cornerColor: '#282A29',
          borderColor: '#282A29',
          borderScaleFactor: 1.5,
        });
        canvas.add(obj);
        const name = (obj as any).name;
        if (name) foundZones.add(name);
      }
    });

    // Fit to canvas
    if (options.width && options.height) {
      const scaleX = canvas.getWidth() / options.width;
      const scaleY = canvas.getHeight() / options.height;
      const scale = Math.min(scaleX, scaleY) * 0.9;
      const offsetX = (canvas.getWidth() - options.width * scale) / 2;
      const offsetY = (canvas.getHeight() - options.height * scale) / 2;

      canvas.getObjects().forEach(obj => {
        obj.scaleX = (obj.scaleX || 1) * scale;
        obj.scaleY = (obj.scaleY || 1) * scale;
        obj.left = (obj.left || 0) * scale + offsetX;
        obj.top = (obj.top || 0) * scale + offsetY;
        obj.setCoords();
      });
    }

    canvas.renderAll();
    setZones(Array.from(foundZones));
    initHistory();
  }, [initHistory]);

  /* ── Color change handler ── */
  const handleColorChange = useCallback((color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    setSelectedColor(color);

    const active = canvas.getActiveObject();
    if (!active) return;

    const zoneName = (active as any).name;
    active.set({
      fill: color,
      opacity: ZONE_FILL_OPACITY,
      stroke: color,
      strokeWidth: 1.5,
    });
    canvas.renderAll();
    canvas.fire('object:modified', { target: active });

    // Update parent
    if (zoneName) {
      const updated = [...zoneColors];
      const existing = updated.findIndex(z => z.zone === zoneName);
      if (existing >= 0) {
        updated[existing] = { ...updated[existing], hex: color };
      } else {
        updated.push({ zone: zoneName, hex: color });
      }
      onZoneColorsChange(updated);
      colorMap.current.set(zoneName, color);
    }
  }, [zoneColors, onZoneColorsChange]);

  /* ── Color all objects of a zone ── */
  const colorEntireZone = useCallback((zoneName: string, color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj) => {
      if ((obj as any).name === zoneName) {
        obj.set({
          fill: color,
          opacity: ZONE_FILL_OPACITY,
          stroke: color,
          strokeWidth: 1.5,
        });
      }
    });
    canvas.renderAll();
    colorMap.current.set(zoneName, color);

    const updated = [...zoneColors];
    const existing = updated.findIndex(z => z.zone === zoneName);
    if (existing >= 0) {
      updated[existing] = { ...updated[existing], hex: color };
    } else {
      updated.push({ zone: zoneName, hex: color });
    }
    onZoneColorsChange(updated);
  }, [zoneColors, onZoneColorsChange]);

  /* ── Delete selected ── */
  const handleDelete = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    const zoneName = (active as any).name;
    canvas.remove(active);
    canvas.renderAll();

    if (zoneName) {
      setZones(prev => {
        const remaining = canvas.getObjects().some((o: any) => o.name === zoneName);
        return remaining ? prev : prev.filter(z => z !== zoneName);
      });
    }
    toast(stepLabel('zoneDeleted') || 'Zone deleted', 'info');
  }, [toast, t.skuPhases]);

  /* ── Add shape ── */
  const addShape = useCallback(async (type: 'rect' | 'ellipse') => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const fabric = await import('fabric');
    const zoneName = `Zone ${zones.length + 1}`;
    const color = '#808080';

    let shape: import('fabric').FabricObject;
    if (type === 'rect') {
      shape = new fabric.Rect({
        left: canvas.getWidth() / 2 - 40,
        top: canvas.getHeight() / 2 - 25,
        width: 80,
        height: 50,
        fill: color,
        opacity: ZONE_FILL_OPACITY,
        stroke: color,
        strokeWidth: 1.5,
        cornerStyle: 'circle',
        cornerSize: 6,
        transparentCorners: false,
        cornerColor: '#282A29',
        borderColor: '#282A29',
      } as any);
    } else {
      shape = new fabric.Ellipse({
        left: canvas.getWidth() / 2 - 35,
        top: canvas.getHeight() / 2 - 25,
        rx: 35,
        ry: 25,
        fill: color,
        opacity: ZONE_FILL_OPACITY,
        stroke: color,
        strokeWidth: 1.5,
        cornerStyle: 'circle',
        cornerSize: 6,
        transparentCorners: false,
        cornerColor: '#282A29',
        borderColor: '#282A29',
      } as any);
    }

    (shape as any).name = zoneName;
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();

    setZones(prev => [...prev, zoneName]);
    setSelectedZone(zoneName);

    const updated = [...zoneColors, { zone: zoneName, hex: color }];
    onZoneColorsChange(updated);
  }, [zones, zoneColors, onZoneColorsChange]);

  /* ── Rename zone ── */
  const handleRename = useCallback((oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) {
      setRenamingZone(null);
      return;
    }

    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj: any) => {
      if (obj.name === oldName) obj.name = newName;
    });

    setZones(prev => prev.map(z => z === oldName ? newName : z));
    setRenamingZone(null);

    const updated = zoneColors.map(z => z.zone === oldName ? { ...z, zone: newName } : z);
    onZoneColorsChange(updated);

    if (colorMap.current.has(oldName)) {
      const hex = colorMap.current.get(oldName)!;
      colorMap.current.delete(oldName);
      colorMap.current.set(newName, hex);
    }
  }, [zoneColors, onZoneColorsChange]);

  /* ── Download SVG ── */
  const handleDownload = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const svg = canvas.toSVG({
      suppressPreamble: false,
      width: `${canvas.getWidth()}`,
      height: `${canvas.getHeight()}`,
    });

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sketch-zones.svg';
    a.click();
    URL.revokeObjectURL(url);
    toast(stepLabel('svgDownloaded') || 'SVG downloaded', 'success');
  }, [toast, t.skuPhases]);

  /* ── Upload SVG ── */
  const handleUpload = useCallback(async (file: File) => {
    const text = await file.text();

    const fabric = await import('fabric');
    const canvas = fabricRef.current;
    if (!canvas || !fabric) return;

    await loadSvgIntoCanvas(fabric, canvas, text);

    // Extract colors from uploaded SVG
    const { extractZoneColors } = await import('@/lib/zone-detection');
    const extracted = extractZoneColors(text);
    if (extracted.length > 0) {
      onZoneColorsChange(extracted);
      extracted.forEach(z => colorMap.current.set(z.zone, z.hex));
    }

    toast(stepLabel('svgUploaded') || 'SVG imported', 'success');
    onSvgChange?.(text);
  }, [loadSvgIntoCanvas, onZoneColorsChange, onSvgChange, toast, t.skuPhases]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!(e.target instanceof HTMLInputElement)) {
          handleDelete();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, handleDelete]);

  /* ── Responsive canvas ── */
  useEffect(() => {
    const container = containerRef.current;
    const canvas = fabricRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const newHeight = Math.min(width * 0.75, 500);
      const scaleRatio = width / canvas.getWidth();

      canvas.setDimensions({ width, height: newHeight });
      canvas.setZoom(canvas.getZoom() * scaleRatio);
      canvas.renderAll();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [fabricLoaded]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stepLabel = (key: string): string => (t.skuPhases as any)?.[key] || key;

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Tool selector */}
        <div className="flex items-center border border-carbon/[0.08] divide-x divide-carbon/[0.06]">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-1.5 transition-colors ${activeTool === 'select' ? 'bg-carbon text-crema' : 'text-carbon/40 hover:text-carbon/60'}`}
            title={stepLabel('toolSelect') || 'Select'}
          >
            <MousePointer className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setActiveTool('rect'); addShape('rect'); setActiveTool('select'); }}
            className="p-1.5 text-carbon/40 hover:text-carbon/60 transition-colors"
            title={stepLabel('addRect') || 'Add rectangle zone'}
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setActiveTool('ellipse'); addShape('ellipse'); setActiveTool('select'); }}
            className="p-1.5 text-carbon/40 hover:text-carbon/60 transition-colors"
            title={stepLabel('addEllipse') || 'Add ellipse zone'}
          >
            <CircleIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-carbon/[0.06]" />

        {/* Color picker — always visible */}
        <div className="flex items-center gap-1.5">
          <Palette className="h-3 w-3 text-carbon/25" />
          <div className="relative">
            <div
              className="w-6 h-6 border border-carbon/[0.12] cursor-pointer hover:ring-1 hover:ring-carbon/20"
              style={{ backgroundColor: selectedColor }}
            />
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
          {selectedZone && (
            <span className="text-[9px] text-carbon/40 font-medium uppercase tracking-wider">{selectedZone}</span>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-carbon/[0.06]" />

        {/* Actions */}
        <button onClick={handleDelete} className="p-1.5 text-carbon/30 hover:text-[#A0463C]/60 transition-colors" title={stepLabel('deleteZone') || 'Delete'}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={undo} disabled={!canUndo} className="p-1.5 text-carbon/30 hover:text-carbon/60 transition-colors disabled:opacity-20" title="Undo (Ctrl+Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={redo} disabled={!canRedo} className="p-1.5 text-carbon/30 hover:text-carbon/60 transition-colors disabled:opacity-20" title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Import/Export */}
        <button onClick={handleDownload} className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium tracking-[0.08em] uppercase text-carbon/35 border border-carbon/[0.06] hover:border-carbon/15 transition-colors">
          <Download className="h-3 w-3" /> SVG
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium tracking-[0.08em] uppercase text-carbon/35 border border-carbon/[0.06] hover:border-carbon/15 transition-colors"
        >
          <Upload className="h-3 w-3" /> {stepLabel('importSvg') || 'Import'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
        />
      </div>

      {/* ── Canvas ── */}
      <div ref={containerRef} className="border border-carbon/[0.08] bg-white overflow-hidden">
        <canvas ref={canvasEl} />
      </div>

      {/* ── Zone list (below canvas) ── */}
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
                    // Select all objects of this zone on canvas
                    const canvas = fabricRef.current;
                    if (!canvas) return;
                    const zoneObjs = canvas.getObjects().filter((o: any) => o.name === zone);
                    if (zoneObjs.length > 0) {
                      canvas.setActiveObject(zoneObjs[0]);
                      canvas.renderAll();
                    }
                    setSelectedZone(zone);
                    setSelectedColor(hex);
                  }}
                >
                  {/* Color swatch with inline picker */}
                  <div className="relative">
                    <div className="w-4 h-4 border border-carbon/[0.1]" style={{ backgroundColor: hex }} />
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => colorEntireZone(zone, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>

                  {/* Zone name — editable on double-click */}
                  {renamingZone === zone ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(zone, renameValue)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(zone, renameValue); if (e.key === 'Escape') setRenamingZone(null); }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-carbon bg-transparent border-b border-carbon/20 focus:outline-none w-20"
                    />
                  ) : (
                    <span
                      className="text-[10px] text-carbon/50 font-medium"
                      onDoubleClick={(e) => { e.stopPropagation(); setRenamingZone(zone); setRenameValue(zone); }}
                    >
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
