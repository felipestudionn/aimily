'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * SketchColorPreview — Client-side canvas tinting of a sketch with zone colors.
 * Uses multiply blend mode: white areas take the tint color, black lines stay.
 * Cost: €0.00 — zero API calls, instant rendering.
 *
 * For a rough approximation, we divide the sketch into horizontal bands
 * matching typical product anatomy (top → bottom) and overlay each zone color.
 */

interface SketchColorPreviewProps {
  /** Sketch image URL or base64 */
  sketchUrl: string;
  /** Colors to apply — array of hex codes (mapped top-to-bottom as horizontal bands) */
  colors: string[];
  /** Optional zone layout hints: array of { zone, hex, yStart%, yEnd% } */
  zoneLayout?: { zone: string; hex: string; yStart: number; yEnd: number }[];
  /** CSS class for the container */
  className?: string;
}

// Default zone layouts by product type (% from top)
const FOOTWEAR_LAYOUT = [
  { yStart: 0, yEnd: 25 },    // Tongue / Laces area (top)
  { yStart: 10, yEnd: 60 },   // Upper (main body)
  { yStart: 55, yEnd: 78 },   // Midsole
  { yStart: 75, yEnd: 95 },   // Outsole
];

export function SketchColorPreview({ sketchUrl, colors, zoneLayout, className }: SketchColorPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ w: 400, h: 400 });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const maxW = 500;
      const scale = Math.min(maxW / img.naturalWidth, 1);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      canvas.width = w;
      canvas.height = h;
      setDimensions({ w, h });

      const ctx = canvas.getContext('2d')!;

      // Step 1: Draw white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);

      // Step 2: Apply zone colors as horizontal gradient bands
      ctx.globalCompositeOperation = 'multiply';

      if (zoneLayout && zoneLayout.length > 0) {
        // Use provided zone layout
        zoneLayout.forEach(zone => {
          ctx.fillStyle = zone.hex;
          const y = (zone.yStart / 100) * h;
          const height = ((zone.yEnd - zone.yStart) / 100) * h;
          // Soft edges with gradient
          const grad = ctx.createLinearGradient(0, y, 0, y + height);
          grad.addColorStop(0, hexWithAlpha(zone.hex, 0.6));
          grad.addColorStop(0.2, zone.hex);
          grad.addColorStop(0.8, zone.hex);
          grad.addColorStop(1, hexWithAlpha(zone.hex, 0.6));
          ctx.fillStyle = grad;
          ctx.fillRect(0, y, w, height);
        });
      } else if (colors.length > 0) {
        // Auto-layout: map colors to default bands
        const layout = colors.length <= FOOTWEAR_LAYOUT.length
          ? FOOTWEAR_LAYOUT.slice(0, colors.length)
          : colors.map((_, i) => ({
              yStart: (i / colors.length) * 90,
              yEnd: ((i + 1) / colors.length) * 90 + 5,
            }));

        colors.forEach((hex, i) => {
          if (i >= layout.length) return;
          const band = layout[i];
          const y = (band.yStart / 100) * h;
          const height = ((band.yEnd - band.yStart) / 100) * h;
          // Gradient for soft transitions
          const grad = ctx.createLinearGradient(0, y, 0, y + height);
          grad.addColorStop(0, hexWithAlpha(hex, 0.4));
          grad.addColorStop(0.15, hex);
          grad.addColorStop(0.85, hex);
          grad.addColorStop(1, hexWithAlpha(hex, 0.4));
          ctx.fillStyle = grad;
          ctx.fillRect(0, y, w, height);
        });
      }

      // Step 3: Draw sketch on top with multiply — lines stay, white takes color
      ctx.drawImage(img, 0, 0, w, h);

      // Reset composite
      ctx.globalCompositeOperation = 'source-over';

      setLoaded(true);
    };

    img.onerror = () => setLoaded(true); // Show empty on error

    // Handle all URL formats
    let src = sketchUrl;
    if (src.length > 500 && !src.startsWith('data:') && !src.startsWith('http')) {
      src = `data:image/png;base64,${src}`;
    }
    img.src = src;
  }, [sketchUrl, colors, zoneLayout]);

  return (
    <div className={`relative bg-white overflow-hidden ${className || ''}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-carbon/15" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={dimensions.w}
        height={dimensions.h}
        style={{ width: '100%', height: 'auto', display: loaded ? 'block' : 'none' }}
      />
    </div>
  );
}

/** Convert hex to hex with alpha for CSS gradients */
function hexWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
