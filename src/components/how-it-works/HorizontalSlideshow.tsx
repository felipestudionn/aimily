'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { SLIDES } from './slides-data';
import { Slide } from './Slide';
import { SlideNavigation } from './SlideNavigation';
import type { Dictionary } from '@/i18n';

interface HorizontalSlideshowProps {
  mode: 'page' | 'onboarding';
  t: Dictionary['howItWorksPage'];
  onSkip?: () => void;
}

const AUTO_ADVANCE_MS = 6000;
const IDLE_RESUME_MS = 10000;

export function HorizontalSlideshow({ mode, t, onSkip }: HorizontalSlideshowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndexRef = useRef(0);

  const total = SLIDES.length;

  // Keep ref in sync with state
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  const scrollToSlide = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const slideWidth = window.innerWidth;
    container.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
    setActiveIndex(index);
  }, []);

  const goNext = useCallback(() => {
    const next = activeIndexRef.current < total - 1 ? activeIndexRef.current + 1 : 0;
    scrollToSlide(next);
  }, [total, scrollToSlide]);

  const goPrev = useCallback(() => {
    const next = activeIndexRef.current > 0 ? activeIndexRef.current - 1 : total - 1;
    scrollToSlide(next);
  }, [total, scrollToSlide]);

  // Detect active slide from manual scroll (swipe)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const slideWidth = window.innerWidth;
        if (slideWidth > 0) {
          const newIndex = Math.round(container.scrollLeft / slideWidth);
          const clamped = Math.max(0, Math.min(newIndex, total - 1));
          if (clamped !== activeIndexRef.current) {
            setActiveIndex(clamped);
          }
        }
        ticking = false;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [total]);

  // Auto-advance
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(goNext, AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [isPaused, goNext]);

  // Pause on user interaction, resume after idle
  const pauseAutoAdvance = useCallback(() => {
    setIsPaused(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsPaused(false), IDLE_RESUME_MS);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { goNext(); pauseAutoAdvance(); }
      if (e.key === 'ArrowLeft') { goPrev(); pauseAutoAdvance(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, pauseAutoAdvance]);

  // Pause on touch
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouch = () => pauseAutoAdvance();
    container.addEventListener('touchstart', handleTouch, { passive: true });
    return () => container.removeEventListener('touchstart', handleTouch);
  }, [pauseAutoAdvance]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Scroll-snap container */}
      <div
        ref={containerRef}
        className="flex w-full h-full overflow-x-auto scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
        onMouseEnter={pauseAutoAdvance}
      >
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className="shrink-0 w-screen h-screen"
            style={{ scrollSnapAlign: 'start' }}
          >
            <Slide slide={slide} index={i} t={t} isActive={i === activeIndex} />
          </div>
        ))}
      </div>

      {/* Navigation */}
      <SlideNavigation
        current={activeIndex}
        total={total}
        onPrev={() => { goPrev(); pauseAutoAdvance(); }}
        onNext={() => { goNext(); pauseAutoAdvance(); }}
        onDotClick={(i) => { scrollToSlide(i); pauseAutoAdvance(); }}
        showSkip={mode === 'onboarding'}
        onSkip={onSkip}
        skipLabel={t.skipOnboarding}
      />
    </div>
  );
}
