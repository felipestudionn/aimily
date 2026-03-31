'use client';

import React from 'react';

/**
 * SketchColorPreview — Pure CSS color tinting on a sketch image.
 * Uses mix-blend-mode: multiply on colored overlay divs.
 * No canvas, no Image(), no CORS issues. Just HTML + CSS.
 *
 * Multiply blend: white × color = color, black × color = stays dark.
 * So white areas of the sketch take the tint, lines stay visible.
 */

interface SketchColorPreviewProps {
  /** Sketch image URL or base64 (any format — rendered as normal <img>) */
  sketchUrl: string;
  /** Colors to apply as horizontal bands (top to bottom) */
  colors: string[];
  /** CSS class for the container */
  className?: string;
}

export function SketchColorPreview({ sketchUrl, colors, className }: SketchColorPreviewProps) {
  if (!colors || colors.length === 0) return null;

  // Build color bands — distribute colors as horizontal regions
  // Primary color gets the most area (upper body), rest split the bottom
  const bands = buildBands(colors);

  return (
    <div className={`relative overflow-hidden ${className || ''}`}>
      {/* Sketch image — normal rendering, no canvas */}
      <img
        src={sketchUrl}
        alt=""
        className="w-full h-full object-contain relative z-[1]"
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* Color bands underneath — visible through multiply blend */}
      <div className="absolute inset-0 z-[0]">
        {bands.map((band, i) => (
          <div
            key={i}
            className="absolute left-0 right-0"
            style={{
              top: `${band.top}%`,
              height: `${band.height}%`,
              background: band.gradient,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface Band {
  top: number;
  height: number;
  gradient: string;
}

function buildBands(colors: string[]): Band[] {
  if (colors.length === 1) {
    return [{ top: 0, height: 100, gradient: colors[0] }];
  }

  if (colors.length === 2) {
    return [
      { top: 0, height: 60, gradient: buildGradient(colors[0], 'down') },
      { top: 55, height: 45, gradient: buildGradient(colors[1], 'up') },
    ];
  }

  if (colors.length === 3) {
    return [
      { top: 0, height: 45, gradient: buildGradient(colors[0], 'down') },
      { top: 40, height: 30, gradient: buildGradient(colors[1], 'both') },
      { top: 65, height: 35, gradient: buildGradient(colors[2], 'up') },
    ];
  }

  // 4+ colors: distribute evenly with overlap for smooth transitions
  const count = Math.min(colors.length, 6);
  const segmentH = 100 / count;
  return colors.slice(0, count).map((hex, i) => ({
    top: Math.max(0, i * segmentH - 5),
    height: segmentH + 10,
    gradient: buildGradient(hex, i === 0 ? 'down' : i === count - 1 ? 'up' : 'both'),
  }));
}

function buildGradient(hex: string, edge: 'up' | 'down' | 'both'): string {
  if (edge === 'down') {
    return `linear-gradient(to bottom, ${hex} 70%, ${hex}00 100%)`;
  }
  if (edge === 'up') {
    return `linear-gradient(to bottom, ${hex}00 0%, ${hex} 30%)`;
  }
  // both
  return `linear-gradient(to bottom, ${hex}00 0%, ${hex} 15%, ${hex} 85%, ${hex}00 100%)`;
}
