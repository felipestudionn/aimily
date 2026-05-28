'use client';

/* ═══════════════════════════════════════════════════════════════════
   PitchDeck — investor / Zara deck shell.

   Owns: slide index, keyboard nav, URL deep-link, fullscreen toggle.
   Slides themselves are dumb display components in ./slides/*.

   Ola 1 — 5 slides: Cover · Relay race · The cost · The question ·
   CIS intro. More slides added in subsequent olas.
   ═══════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from 'react';
import Slide01Cover from './slides/Slide01Cover';
import Slide02RelayRace from './slides/Slide02RelayRace';
import Slide03TheCost from './slides/Slide03TheCost';
import Slide04TheQuestion from './slides/Slide04TheQuestion';
import Slide05CISIntro from './slides/Slide05CISIntro';

const SLIDES = [
  { id: '01-cover', label: 'Cover', Component: Slide01Cover },
  { id: '02-relay', label: 'El problema', Component: Slide02RelayRace },
  { id: '03-cost', label: 'El coste', Component: Slide03TheCost },
  { id: '04-question', label: 'La pregunta', Component: Slide04TheQuestion },
  { id: '05-cis', label: 'CIS', Component: Slide05CISIntro },
];

export function PitchDeck({ initialSlide = 0 }: { initialSlide?: number }) {
  const [index, setIndex] = useState(initialSlide);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const total = SLIDES.length;
  const Current = SLIDES[index].Component;

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, total - 1));
      setIndex(clamped);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('s', String(clamped));
        window.history.replaceState({}, '', url.toString());
      }
    },
    [total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        go(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        go(total - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, go, total]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-shade">
      {/* Slide canvas */}
      <div className="h-full w-full">
        <Current />
      </div>

      {/* Top-left brand mark — mix-blend-difference adapts to dark/light slides */}
      <div
        className="absolute top-6 left-8 z-50 flex items-center gap-3 pointer-events-none text-white"
        style={{ mixBlendMode: 'difference' }}
      >
        <div className="text-[13px] font-semibold tracking-[-0.02em]">
          aimily
        </div>
        <div className="text-[11px] opacity-50 tracking-[0.18em] uppercase font-medium">
          investor deck · 2026
        </div>
      </div>

      {/* Bottom progress indicator + slide label — mix-blend-difference adapts */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 text-white"
        style={{ mixBlendMode: 'difference' }}
      >
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => go(i)}
              aria-label={`Ir a slide ${i + 1}: ${s.label}`}
              className={`h-1.5 rounded-full transition-all duration-300 bg-white ${
                i === index ? 'w-8 opacity-100' : 'w-1.5 opacity-30 hover:opacity-60'
              }`}
            />
          ))}
        </div>
        <div className="text-[11px] opacity-55 tracking-[-0.01em] tabular-nums font-medium">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
      </div>

      {/* Right-side nav arrows */}
      <button
        onClick={() => go(index - 1)}
        disabled={index === 0}
        aria-label="Anterior"
        className="absolute left-6 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-white/60 backdrop-blur-sm border border-carbon/[0.06] flex items-center justify-center text-carbon/40 hover:text-carbon hover:bg-white transition-all disabled:opacity-0 disabled:pointer-events-none"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={() => go(index + 1)}
        disabled={index === total - 1}
        aria-label="Siguiente"
        className="absolute right-6 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-white/60 backdrop-blur-sm border border-carbon/[0.06] flex items-center justify-center text-carbon/40 hover:text-carbon hover:bg-white transition-all disabled:opacity-0 disabled:pointer-events-none"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Top-right fullscreen toggle — adapts via mix-blend-difference */}
      <button
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        className="absolute top-6 right-8 z-50 text-[11px] tracking-[0.18em] uppercase font-medium opacity-40 hover:opacity-80 transition-opacity text-white"
        style={{ mixBlendMode: 'difference' }}
      >
        {isFullscreen ? 'esc' : 'F · fullscreen'}
      </button>
    </div>
  );
}
