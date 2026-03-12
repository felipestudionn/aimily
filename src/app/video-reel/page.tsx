'use client';

import { useState, useEffect, useCallback } from 'react';

/* ══════════════════════════════════════════════════════════════
   VIDEO REEL — "From Idea to Runway"
   75-second auto-playing cinematic sequence.
   Record with OBS/Screen Studio at 1920×1080 for the final video.

   Controls:
   - Space: play/pause
   - R: restart
   - Click: play/pause
   ══════════════════════════════════════════════════════════════ */

// ─── Timing constants (milliseconds) ───
const TIMINGS = {
  // Act 1 — Opening
  ACT1_START: 0,
  ACT1_TEXT1: 500,       // "Every collection starts with..."
  ACT1_TEXT2: 3000,      // "...an idea."
  ACT1_SPARK: 5000,      // Spark effect
  ACT1_END: 8000,

  // Act 2 — Creative Vision
  ACT2_START: 8000,
  ACT2_LABEL: 8000,
  ACT2_MOODBOARD: 10000,
  ACT2_TRENDS: 14000,
  ACT2_PALETTE: 17000,
  ACT2_END: 20000,

  // Act 3 — Merchandising
  ACT3_START: 20000,
  ACT3_LABEL: 20000,
  ACT3_PRICING: 22000,
  ACT3_CHANNELS: 26000,
  ACT3_BUDGET: 28000,
  ACT3_END: 32000,

  // Act 4 — Design & Development
  ACT4_START: 32000,
  ACT4_LABEL: 32000,
  ACT4_SKETCH: 34000,
  ACT4_PROTO: 38000,
  ACT4_CATALOG: 42000,
  ACT4_GRID: 45000,
  ACT4_END: 48000,

  // Act 5 — Marketing & Launch
  ACT5_START: 48000,
  ACT5_LABEL: 48000,
  ACT5_CALENDAR: 50000,
  ACT5_CAMPAIGNS: 53000,
  ACT5_LAUNCH: 55000,
  ACT5_END: 58000,

  // Act 6 — The Orchestrator
  ACT6_START: 58000,
  ACT6_PULLBACK: 58000,
  ACT6_GANTT: 60000,
  ACT6_END: 65000,

  // Act 7 — Closing
  ACT7_START: 65000,
  ACT7_FADE: 65000,
  ACT7_LOGO: 67000,
  ACT7_THATSALL: 70000,
  ACT7_CTA: 72000,
  ACT7_END: 75000,
};

// ─── Fake data ───
const MOODBOARD_IMAGES = [
  { color: '#8B4513', label: 'Tuscan Leather' },
  { color: '#2F4F4F', label: 'Deep Forest' },
  { color: '#D2691E', label: 'Burnt Sienna' },
  { color: '#1a1a2e', label: 'Midnight Velvet' },
  { color: '#c9b99a', label: 'Sand Dune' },
  { color: '#6B3A2A', label: 'Mahogany' },
  { color: '#3d5a80', label: 'Atlantic Blue' },
  { color: '#dda15e', label: 'Amber Gold' },
  { color: '#bc6c25', label: 'Terracotta' },
];

const TREND_DATA = [
  { label: 'Quiet Luxury', value: 87, delta: '+12%' },
  { label: 'Earth Tones', value: 74, delta: '+23%' },
  { label: 'Oversized Tailoring', value: 69, delta: '+8%' },
  { label: 'Minimalist Hardware', value: 61, delta: '+15%' },
  { label: 'Sustainable Fabrics', value: 58, delta: '+31%' },
];

const PALETTE_COLORS = ['#2F4F4F', '#8B4513', '#D2691E', '#c9b99a', '#dda15e', '#1a1a2e'];

const PRICING_ITEMS = [
  { family: 'Outerwear', sku: 12, wholesale: '€185', retail: '€420', margin: '56%' },
  { family: 'Knitwear', sku: 18, wholesale: '€75', retail: '€195', margin: '62%' },
  { family: 'Trousers', sku: 15, wholesale: '€65', retail: '€165', margin: '61%' },
  { family: 'Accessories', sku: 24, wholesale: '€35', retail: '€95', margin: '63%' },
  { family: 'Dresses', sku: 10, wholesale: '€120', retail: '€295', margin: '59%' },
  { family: 'Footwear', sku: 8, wholesale: '€95', retail: '€245', margin: '61%' },
];

const CHANNELS = [
  { name: 'DTC E-commerce', pct: 35 },
  { name: 'Wholesale Partners', pct: 28 },
  { name: 'Department Stores', pct: 20 },
  { name: 'Pop-up Retail', pct: 12 },
  { name: 'Marketplace', pct: 5 },
];

const CATALOG_ITEMS = [
  { name: 'Tuscan Trench', ref: 'AW26-OW-001', price: '€420', color: '#8B4513' },
  { name: 'Forest Knit Crew', ref: 'AW26-KN-003', price: '€195', color: '#2F4F4F' },
  { name: 'Sand Wide Trouser', ref: 'AW26-TR-007', price: '€165', color: '#c9b99a' },
  { name: 'Midnight Blazer', ref: 'AW26-OW-004', price: '€385', color: '#1a1a2e' },
  { name: 'Amber Silk Dress', ref: 'AW26-DR-002', price: '€295', color: '#dda15e' },
  { name: 'Sienna Boot', ref: 'AW26-FW-001', price: '€245', color: '#D2691E' },
  { name: 'Velvet Crossbody', ref: 'AW26-AC-005', price: '€95', color: '#6B3A2A' },
  { name: 'Atlantic Scarf', ref: 'AW26-AC-008', price: '€85', color: '#3d5a80' },
];

const CAMPAIGN_POSTS = [
  { day: 'Mon', type: 'IG Reel', title: 'Collection Reveal' },
  { day: 'Tue', type: 'LinkedIn', title: 'Behind the Vision' },
  { day: 'Wed', type: 'TikTok', title: 'Design Process' },
  { day: 'Thu', type: 'Email', title: 'Early Access' },
  { day: 'Fri', type: 'IG Story', title: 'BTS Atelier' },
  { day: 'Sat', type: 'Pinterest', title: 'Lookbook Boards' },
];

const GANTT_MILESTONES = [
  // Creative (green-ish)
  { label: 'Trend Research', block: 0, start: 0, width: 15, color: '#4a7c59' },
  { label: 'Moodboard', block: 0, start: 10, width: 12, color: '#4a7c59' },
  { label: 'Color Palette', block: 0, start: 18, width: 8, color: '#4a7c59' },
  { label: 'Creative Brief', block: 0, start: 22, width: 10, color: '#4a7c59' },
  // Merchandising (blue-ish)
  { label: 'Product Families', block: 1, start: 20, width: 12, color: '#3d5a80' },
  { label: 'Pricing Strategy', block: 1, start: 28, width: 10, color: '#3d5a80' },
  { label: 'Channel Plan', block: 1, start: 32, width: 8, color: '#3d5a80' },
  { label: 'Budget Approval', block: 1, start: 38, width: 5, color: '#3d5a80' },
  // Design (amber)
  { label: 'Sketch Generation', block: 2, start: 30, width: 14, color: '#bc6c25' },
  { label: 'Prototyping', block: 2, start: 40, width: 12, color: '#bc6c25' },
  { label: 'Selection', block: 2, start: 48, width: 8, color: '#bc6c25' },
  { label: 'Catalog Build', block: 2, start: 52, width: 10, color: '#bc6c25' },
  // Marketing (rose)
  { label: 'Content Strategy', block: 3, start: 50, width: 12, color: '#9b2226' },
  { label: 'Campaign Briefs', block: 3, start: 58, width: 10, color: '#9b2226' },
  { label: 'Pre-Launch', block: 3, start: 65, width: 12, color: '#9b2226' },
  { label: 'Launch Day', block: 3, start: 75, width: 5, color: '#9b2226' },
];

const BLOCK_LABELS = ['Creative', 'Merchandising', 'Design & Dev', 'Marketing'];

// ─── Utility: check if a time has been reached ───
function after(now: number, time: number) {
  return now >= time;
}
function between(now: number, start: number, end: number) {
  return now >= start && now < end;
}
function progress(now: number, start: number, end: number) {
  if (now < start) return 0;
  if (now >= end) return 1;
  return (now - start) / (end - start);
}

// ─── Animated counter display ───
function AnimatedNumber({ value, now, start, duration = 1500 }: { value: number; now: number; start: number; duration?: number }) {
  const p = progress(now, start, start + duration);
  const eased = 1 - Math.pow(1 - p, 3);
  return <>{Math.round(eased * value).toLocaleString()}</>;
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function VideoReelPage() {
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setNow(prev => {
        if (prev >= TIMINGS.ACT7_END) {
          setPlaying(false);
          return prev;
        }
        return prev + 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [playing]);

  const handlePlayPause = useCallback(() => {
    if (!started) {
      setStarted(true);
      setPlaying(true);
      setNow(0);
    } else {
      setPlaying(p => !p);
    }
  }, [started]);

  const handleRestart = useCallback(() => {
    setNow(0);
    setStarted(true);
    setPlaying(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handlePlayPause(); }
      if (e.code === 'KeyR') { e.preventDefault(); handleRestart(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePlayPause, handleRestart]);

  // Current act for background transitions
  const currentAct = now < TIMINGS.ACT2_START ? 1
    : now < TIMINGS.ACT3_START ? 2
    : now < TIMINGS.ACT4_START ? 3
    : now < TIMINGS.ACT5_START ? 4
    : now < TIMINGS.ACT6_START ? 5
    : now < TIMINGS.ACT7_START ? 6
    : 7;

  return (
    <div
      className="fixed inset-0 overflow-hidden cursor-pointer select-none"
      onClick={handlePlayPause}
      style={{ backgroundColor: '#282A29', fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
    >
      {/* ─── Grid background (subtle) ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: between(now, TIMINGS.ACT2_START, TIMINGS.ACT7_FADE) ? 0.025 : 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          transition: 'opacity 1s ease',
        }}
      />

      {/* ─── Progress bar ─── */}
      {started && (
        <div className="absolute top-0 left-0 right-0 z-50 h-[2px] bg-white/5">
          <div
            className="h-full bg-white/30"
            style={{ width: `${(now / TIMINGS.ACT7_END) * 100}%`, transition: 'width 0.1s linear' }}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════
          START SCREEN (before playing)
         ════════════════════════════════════════════ */}
      {!started && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-8">
          <p style={{ color: '#FAEFE0', fontSize: '14px', fontWeight: 300, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.4 }}>
            AIMILY PRESENTS
          </p>
          <h1 style={{ color: '#FAEFE0', fontSize: '48px', fontWeight: 300, letterSpacing: '-0.02em' }}>
            From Idea to Runway
          </h1>
          <p style={{ color: '#D8D8D8', fontSize: '14px', fontWeight: 300, opacity: 0.5 }}>
            Click anywhere or press Space to play
          </p>
          <div style={{ display: 'flex', gap: '6px', marginTop: '20px' }}>
            {PALETTE_COLORS.map((c, i) => (
              <div key={i} style={{ width: '32px', height: '4px', backgroundColor: c, opacity: 0.6 }} />
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          ACT 1 — OPENING (0:00 - 0:08)
         ════════════════════════════════════════════ */}
      {between(now, TIMINGS.ACT1_START, TIMINGS.ACT2_START + 1000) && started && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-10"
          style={{
            opacity: now < TIMINGS.ACT2_START ? 1 : Math.max(0, 1 - progress(now, TIMINGS.ACT2_START, TIMINGS.ACT2_START + 1000)),
          }}
        >
          {/* "Every collection starts with..." */}
          <p
            style={{
              color: '#FAEFE0',
              fontSize: '42px',
              fontWeight: 300,
              letterSpacing: '-0.01em',
              opacity: after(now, TIMINGS.ACT1_TEXT1) ? Math.min(1, progress(now, TIMINGS.ACT1_TEXT1, TIMINGS.ACT1_TEXT1 + 1000)) : 0,
              transform: `translateY(${after(now, TIMINGS.ACT1_TEXT1) ? 0 : 20}px)`,
              transition: 'opacity 1s ease, transform 1s ease',
            }}
          >
            Every collection starts with...
          </p>

          {/* "...an idea." */}
          <p
            style={{
              color: '#FAEFE0',
              fontSize: '56px',
              fontWeight: 300,
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
              marginTop: '16px',
              opacity: after(now, TIMINGS.ACT1_TEXT2) ? Math.min(1, progress(now, TIMINGS.ACT1_TEXT2, TIMINGS.ACT1_TEXT2 + 800)) : 0,
              transform: `translateY(${after(now, TIMINGS.ACT1_TEXT2) ? 0 : 20}px) scale(${after(now, TIMINGS.ACT1_TEXT2) ? 1 : 0.95})`,
              transition: 'opacity 0.8s ease, transform 0.8s ease',
            }}
          >
            ...an idea.
          </p>

          {/* Spark effect */}
          {after(now, TIMINGS.ACT1_SPARK) && (
            <div
              style={{
                position: 'absolute',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(250,239,224,0.15) 0%, transparent 70%)',
                opacity: Math.max(0, 1 - progress(now, TIMINGS.ACT1_SPARK, TIMINGS.ACT1_SPARK + 2500)),
                transform: `scale(${1 + progress(now, TIMINGS.ACT1_SPARK, TIMINGS.ACT1_SPARK + 2500) * 3})`,
              }}
            />
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          ACT 2 — CREATIVE VISION (0:08 - 0:20)
         ════════════════════════════════════════════ */}
      {between(now, TIMINGS.ACT2_START - 500, TIMINGS.ACT3_START + 1000) && started && (
        <div
          className="absolute inset-0 z-10"
          style={{
            opacity: between(now, TIMINGS.ACT2_START - 500, TIMINGS.ACT2_START + 500)
              ? progress(now, TIMINGS.ACT2_START - 500, TIMINGS.ACT2_START + 500)
              : now >= TIMINGS.ACT3_START ? Math.max(0, 1 - progress(now, TIMINGS.ACT3_START, TIMINGS.ACT3_START + 1000))
              : 1,
          }}
        >
          {/* Step label */}
          <div
            className="absolute top-16 left-16"
            style={{
              opacity: after(now, TIMINGS.ACT2_LABEL) ? 1 : 0,
              transform: `translateY(${after(now, TIMINGS.ACT2_LABEL) ? 0 : 10}px)`,
              transition: 'all 0.6s ease',
            }}
          >
            <span style={{ color: '#FAEFE0', fontSize: '11px', fontWeight: 500, letterSpacing: '0.3em', opacity: 0.4 }}>01</span>
            <span style={{ color: '#FAEFE0', fontSize: '11px', fontWeight: 500, letterSpacing: '0.3em', marginLeft: '12px', opacity: 0.7 }}>CREATIVE VISION</span>
          </div>

          {/* Moodboard grid — builds up progressively */}
          <div className="absolute top-28 left-16 right-16 bottom-32" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {MOODBOARD_IMAGES.map((img, i) => {
              const showTime = TIMINGS.ACT2_MOODBOARD + i * 350;
              return (
                <div
                  key={i}
                  style={{
                    backgroundColor: img.color,
                    opacity: after(now, showTime) ? Math.min(1, progress(now, showTime, showTime + 600)) : 0,
                    transform: `scale(${after(now, showTime) ? 1 : 0.9})`,
                    transition: 'all 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '12px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {img.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Trend analysis overlay */}
          {after(now, TIMINGS.ACT2_TRENDS) && (
            <div
              className="absolute bottom-32 right-16"
              style={{
                backgroundColor: 'rgba(40,42,41,0.95)',
                border: '1px solid rgba(216,216,216,0.1)',
                padding: '20px 24px',
                width: '320px',
                opacity: Math.min(1, progress(now, TIMINGS.ACT2_TRENDS, TIMINGS.ACT2_TRENDS + 600)),
                transform: `translateX(${after(now, TIMINGS.ACT2_TRENDS + 300) ? 0 : 20}px)`,
                transition: 'transform 0.6s ease',
              }}
            >
              <p style={{ color: 'rgba(216,216,216,0.4)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 500 }}>
                TREND ANALYSIS — AW 2026
              </p>
              <p style={{ color: '#FAEFE0', fontSize: '16px', fontWeight: 300, letterSpacing: '-0.01em', marginBottom: '16px' }}>
                See what&apos;s next
              </p>
              {TREND_DATA.map((t, i) => {
                const barTime = TIMINGS.ACT2_TRENDS + 400 + i * 200;
                const barProgress = progress(now, barTime, barTime + 800);
                return (
                  <div key={i} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'rgba(216,216,216,0.6)', fontSize: '11px', fontWeight: 300 }}>{t.label}</span>
                      <span style={{ color: '#4a7c59', fontSize: '10px', fontWeight: 500 }}>{t.delta}</span>
                    </div>
                    <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.05)', width: '100%' }}>
                      <div style={{ height: '100%', backgroundColor: '#4a7c59', width: `${barProgress * t.value}%`, transition: 'width 0.1s linear' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Palette generation */}
          {after(now, TIMINGS.ACT2_PALETTE) && (
            <div
              className="absolute bottom-12 left-16"
              style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'flex-end',
                opacity: Math.min(1, progress(now, TIMINGS.ACT2_PALETTE, TIMINGS.ACT2_PALETTE + 500)),
              }}
            >
              {PALETTE_COLORS.map((color, i) => {
                const colorTime = TIMINGS.ACT2_PALETTE + i * 150;
                return (
                  <div
                    key={i}
                    style={{
                      width: '48px',
                      height: `${40 + i * 8}px`,
                      backgroundColor: color,
                      opacity: after(now, colorTime) ? 1 : 0,
                      transform: `translateY(${after(now, colorTime) ? 0 : 10}px)`,
                      transition: 'all 0.4s ease',
                    }}
                  />
                );
              })}
              <span style={{ color: 'rgba(250,239,224,0.4)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', marginLeft: '16px', fontWeight: 500 }}>
                AW26 PALETTE
              </span>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          ACT 3 — MERCHANDISING (0:20 - 0:32)
         ════════════════════════════════════════════ */}
      {between(now, TIMINGS.ACT3_START - 500, TIMINGS.ACT4_START + 1000) && started && (
        <div
          className="absolute inset-0 z-10"
          style={{
            opacity: between(now, TIMINGS.ACT3_START - 500, TIMINGS.ACT3_START + 500)
              ? progress(now, TIMINGS.ACT3_START - 500, TIMINGS.ACT3_START + 500)
              : now >= TIMINGS.ACT4_START ? Math.max(0, 1 - progress(now, TIMINGS.ACT4_START, TIMINGS.ACT4_START + 1000))
              : 1,
          }}
        >
          {/* Label */}
          <div
            className="absolute top-16 left-16"
            style={{
              opacity: after(now, TIMINGS.ACT3_LABEL) ? 1 : 0,
              transform: `translateX(${after(now, TIMINGS.ACT3_LABEL + 200) ? 0 : -20}px)`,
              transition: 'all 0.6s ease',
            }}
          >
            <span style={{ color: '#FAEFE0', fontSize: '11px', fontWeight: 500, letterSpacing: '0.3em', opacity: 0.4 }}>02</span>
            <span style={{ color: '#FAEFE0', fontSize: '11px', fontWeight: 500, letterSpacing: '0.3em', marginLeft: '12px', opacity: 0.7 }}>MERCHANDISING</span>
          </div>

          {/* Pricing matrix */}
          <div
            className="absolute top-28 left-16"
            style={{
              width: 'calc(55% - 32px)',
              opacity: after(now, TIMINGS.ACT3_PRICING) ? Math.min(1, progress(now, TIMINGS.ACT3_PRICING, TIMINGS.ACT3_PRICING + 600)) : 0,
              transform: `translateY(${after(now, TIMINGS.ACT3_PRICING + 200) ? 0 : 15}px)`,
              transition: 'transform 0.6s ease',
            }}
          >
            <p style={{ color: 'rgba(216,216,216,0.4)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 500 }}>
              PRICING MATRIX — 87 SKUs
            </p>
            <p style={{ color: '#FAEFE0', fontSize: '20px', fontWeight: 300, marginBottom: '20px' }}>
              Plan every unit
            </p>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.5fr 0.8fr 0.8fr 0.6fr', gap: '0', borderBottom: '1px solid rgba(216,216,216,0.1)', paddingBottom: '8px', marginBottom: '4px' }}>
              {['Family', 'SKUs', 'Wholesale', 'Retail', 'Margin'].map(h => (
                <span key={h} style={{ color: 'rgba(216,216,216,0.3)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500 }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {PRICING_ITEMS.map((item, i) => {
              const rowTime = TIMINGS.ACT3_PRICING + 600 + i * 250;
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 0.5fr 0.8fr 0.8fr 0.6fr',
                    gap: '0',
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(216,216,216,0.05)',
                    opacity: after(now, rowTime) ? Math.min(1, progress(now, rowTime, rowTime + 400)) : 0,
                    transform: `translateX(${after(now, rowTime) ? 0 : 10}px)`,
                    transition: 'transform 0.3s ease',
                  }}
                >
                  <span style={{ color: '#FAEFE0', fontSize: '13px', fontWeight: 400 }}>{item.family}</span>
                  <span style={{ color: 'rgba(216,216,216,0.5)', fontSize: '13px', fontWeight: 300 }}>{item.sku}</span>
                  <span style={{ color: 'rgba(216,216,216,0.5)', fontSize: '13px', fontWeight: 300 }}>{item.wholesale}</span>
                  <span style={{ color: '#FAEFE0', fontSize: '13px', fontWeight: 400 }}>{item.retail}</span>
                  <span style={{ color: '#3d5a80', fontSize: '13px', fontWeight: 500 }}>{item.margin}</span>
                </div>
              );
            })}

            {/* Total */}
            {after(now, TIMINGS.ACT3_PRICING + 2400) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(216,216,216,0.15)' }}>
                <span style={{ color: '#FAEFE0', fontSize: '14px', fontWeight: 400 }}>Total Revenue Target</span>
                <span style={{ color: '#FAEFE0', fontSize: '20px', fontWeight: 300 }}>
                  €<AnimatedNumber value={2480000} now={now} start={TIMINGS.ACT3_PRICING + 2400} duration={1200} />
                </span>
              </div>
            )}
          </div>

          {/* Channel distribution */}
          {after(now, TIMINGS.ACT3_CHANNELS) && (
            <div
              className="absolute top-28 right-16"
              style={{
                width: 'calc(40% - 32px)',
                opacity: Math.min(1, progress(now, TIMINGS.ACT3_CHANNELS, TIMINGS.ACT3_CHANNELS + 600)),
              }}
            >
              <p style={{ color: 'rgba(216,216,216,0.4)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 500 }}>
                CHANNEL DISTRIBUTION
              </p>
              {CHANNELS.map((ch, i) => {
                const chTime = TIMINGS.ACT3_CHANNELS + 300 + i * 200;
                const barProg = progress(now, chTime, chTime + 800);
                return (
                  <div key={i} style={{ marginBottom: '16px', opacity: after(now, chTime) ? 1 : 0, transition: 'opacity 0.4s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'rgba(216,216,216,0.6)', fontSize: '12px', fontWeight: 300 }}>{ch.name}</span>
                      <span style={{ color: '#FAEFE0', fontSize: '12px', fontWeight: 400 }}>{Math.round(barProg * ch.pct)}%</span>
                    </div>
                    <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', width: '100%' }}>
                      <div style={{ height: '100%', backgroundColor: '#3d5a80', width: `${barProg * ch.pct}%`, transition: 'width 0.1s linear' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Budget pie / margin indicator */}
          {after(now, TIMINGS.ACT3_BUDGET) && (
            <div
              className="absolute bottom-16 right-16"
              style={{
                opacity: Math.min(1, progress(now, TIMINGS.ACT3_BUDGET, TIMINGS.ACT3_BUDGET + 600)),
                backgroundColor: 'rgba(40,42,41,0.95)',
                border: '1px solid rgba(216,216,216,0.1)',
                padding: '20px 24px',
              }}
            >
              <p style={{ color: 'rgba(216,216,216,0.4)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 500 }}>
                GROSS MARGIN
              </p>
              <p style={{ color: '#FAEFE0', fontSize: '48px', fontWeight: 300, lineHeight: 1 }}>
                <AnimatedNumber value={61} now={now} start={TIMINGS.ACT3_BUDGET} duration={1000} />%
              </p>
              <p style={{ color: '#FAEFE0', fontSize: '14px', fontWeight: 300, marginTop: '8px', opacity: 0.5 }}>
                Know your margins
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          ACT 4 — DESIGN & DEVELOPMENT (0:32 - 0:48)
         ════════════════════════════════════════════ */}
      {between(now, TIMINGS.ACT4_START - 500, TIMINGS.ACT5_START + 1000) && started && (
        <div
          className="absolute inset-0 z-10"
          style={{
            opacity: between(now, TIMINGS.ACT4_START - 500, TIMINGS.ACT4_START + 500)
              ? progress(now, TIMINGS.ACT4_START - 500, TIMINGS.ACT4_START + 500)
              : now >= TIMINGS.ACT5_START ? Math.max(0, 1 - progress(now, TIMINGS.ACT5_START, TIMINGS.ACT5_START + 1000))
              : 1,
          }}
        >
          {/* Label */}
          <div
            className="absolute top-16 left-16"
            style={{
              opacity: after(now, TIMINGS.ACT4_LABEL) ? 1 : 0,
              transition: 'opacity 0.6s ease',
            }}
          >
            <span style={{ color: '#FAEFE0', fontSize: '11px', fontWeight: 500, letterSpacing: '0.3em', opacity: 0.4 }}>03</span>
            <span style={{ color: '#FAEFE0', fontSize: '11px', fontWeight: 500, letterSpacing: '0.3em', marginLeft: '12px', opacity: 0.7 }}>DESIGN & DEVELOPMENT</span>
          </div>

          {/* Phase: Sketch → Prototype → Catalog → Grid */}
          <div className="absolute inset-0 flex items-center justify-center">

            {/* SKETCH phase */}
            {between(now, TIMINGS.ACT4_SKETCH, TIMINGS.ACT4_PROTO + 500) && (
              <div
                className="text-center"
                style={{
                  opacity: now < TIMINGS.ACT4_PROTO ? 1 : Math.max(0, 1 - progress(now, TIMINGS.ACT4_PROTO, TIMINGS.ACT4_PROTO + 500)),
                }}
              >
                <p style={{ color: 'rgba(216,216,216,0.4)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '24px', fontWeight: 500 }}>
                  AI SKETCH GENERATION
                </p>
                {/* Fake sketch — lines drawing */}
                <div style={{ width: '280px', height: '380px', border: '1px solid rgba(216,216,216,0.1)', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
                  {/* Sketch lines animating in */}
                  <svg viewBox="0 0 280 380" style={{ width: '100%', height: '100%' }}>
                    {/* Head */}
                    <ellipse cx="140" cy="50" rx="25" ry="30" fill="none" stroke="rgba(250,239,224,0.4)" strokeWidth="1.5"
                      strokeDasharray="200"
                      strokeDashoffset={200 - progress(now, TIMINGS.ACT4_SKETCH, TIMINGS.ACT4_SKETCH + 1000) * 200}
                    />
                    {/* Torso */}
                    <path d="M115 80 L100 180 L180 180 L165 80 Z" fill="none" stroke="rgba(250,239,224,0.5)" strokeWidth="1.5"
                      strokeDasharray="400"
                      strokeDashoffset={400 - progress(now, TIMINGS.ACT4_SKETCH + 500, TIMINGS.ACT4_SKETCH + 2000) * 400}
                    />
                    {/* Trench coat outline */}
                    <path d="M95 140 L80 320 L90 320 L100 180 M180 180 L190 320 L200 320 L185 140" fill="none" stroke="rgba(250,239,224,0.4)" strokeWidth="1.5"
                      strokeDasharray="600"
                      strokeDashoffset={600 - progress(now, TIMINGS.ACT4_SKETCH + 1000, TIMINGS.ACT4_SKETCH + 3000) * 600}
                    />
                    {/* Belt */}
                    <line x1="95" y1="195" x2="185" y2="195" stroke="rgba(250,239,224,0.3)" strokeWidth="2"
                      strokeDasharray="90"
                      strokeDashoffset={90 - progress(now, TIMINGS.ACT4_SKETCH + 1500, TIMINGS.ACT4_SKETCH + 2500) * 90}
                    />
                    {/* Legs */}
                    <line x1="120" y1="320" x2="115" y2="370" stroke="rgba(250,239,224,0.3)" strokeWidth="1.5"
                      strokeDasharray="60"
                      strokeDashoffset={60 - progress(now, TIMINGS.ACT4_SKETCH + 2000, TIMINGS.ACT4_SKETCH + 3000) * 60}
                    />
                    <line x1="160" y1="320" x2="165" y2="370" stroke="rgba(250,239,224,0.3)" strokeWidth="1.5"
                      strokeDasharray="60"
                      strokeDashoffset={60 - progress(now, TIMINGS.ACT4_SKETCH + 2000, TIMINGS.ACT4_SKETCH + 3000) * 60}
                    />
                  </svg>
                </div>
                <p style={{ color: '#FAEFE0', fontSize: '24px', fontWeight: 300, fontStyle: 'italic', marginTop: '24px',
                  opacity: after(now, TIMINGS.ACT4_SKETCH + 1500) ? 1 : 0, transition: 'opacity 0.6s ease' }}>
                  Imagine it
                </p>
              </div>
            )}

            {/* PROTOTYPE phase */}
            {between(now, TIMINGS.ACT4_PROTO, TIMINGS.ACT4_CATALOG + 500) && (
              <div
                className="text-center"
                style={{
                  opacity: between(now, TIMINGS.ACT4_PROTO, TIMINGS.ACT4_PROTO + 500) ? progress(now, TIMINGS.ACT4_PROTO, TIMINGS.ACT4_PROTO + 500)
                    : now < TIMINGS.ACT4_CATALOG ? 1 : Math.max(0, 1 - progress(now, TIMINGS.ACT4_CATALOG, TIMINGS.ACT4_CATALOG + 500)),
                }}
              >
                <p style={{ color: 'rgba(216,216,216,0.4)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '24px', fontWeight: 500 }}>
                  PROTOTYPE — TUSCAN TRENCH
                </p>
                {/* Colored version of the sketch */}
                <div style={{ width: '280px', height: '380px', border: '1px solid rgba(216,216,216,0.1)', margin: '0 auto', position: 'relative', overflow: 'hidden', backgroundColor: 'rgba(139,69,19,0.08)' }}>
                  <svg viewBox="0 0 280 380" style={{ width: '100%', height: '100%' }}>
                    <ellipse cx="140" cy="50" rx="25" ry="30" fill="rgba(200,180,160,0.3)" stroke="rgba(139,69,19,0.6)" strokeWidth="1.5" />
                    <path d="M115 80 L100 180 L180 180 L165 80 Z" fill="rgba(139,69,19,0.3)" stroke="rgba(139,69,19,0.6)" strokeWidth="1.5" />
                    <path d="M95 140 L80 320 L90 320 L100 180 M180 180 L190 320 L200 320 L185 140" fill="none" stroke="rgba(139,69,19,0.5)" strokeWidth="1.5" />
                    <line x1="95" y1="195" x2="185" y2="195" stroke="rgba(139,69,19,0.7)" strokeWidth="2.5" />
                    <line x1="120" y1="320" x2="115" y2="370" stroke="rgba(139,69,19,0.4)" strokeWidth="1.5" />
                    <line x1="160" y1="320" x2="165" y2="370" stroke="rgba(139,69,19,0.4)" strokeWidth="1.5" />
                  </svg>
                  {/* Material labels */}
                  <div style={{ position: 'absolute', top: '100px', right: '16px', backgroundColor: 'rgba(40,42,41,0.9)', padding: '6px 10px', border: '1px solid rgba(139,69,19,0.3)' }}>
                    <span style={{ color: 'rgba(250,239,224,0.7)', fontSize: '9px', letterSpacing: '0.1em' }}>WOOL BLEND 70/30</span>
                  </div>
                  <div style={{ position: 'absolute', top: '200px', left: '16px', backgroundColor: 'rgba(40,42,41,0.9)', padding: '6px 10px', border: '1px solid rgba(139,69,19,0.3)' }}>
                    <span style={{ color: 'rgba(250,239,224,0.7)', fontSize: '9px', letterSpacing: '0.1em' }}>ITALIAN LEATHER BELT</span>
                  </div>
                </div>
                <p style={{ color: '#FAEFE0', fontSize: '24px', fontWeight: 300, fontStyle: 'italic', marginTop: '24px' }}>
                  Build it
                </p>
              </div>
            )}

            {/* CATALOG phase */}
            {between(now, TIMINGS.ACT4_CATALOG, TIMINGS.ACT4_GRID + 500) && (
              <div
                style={{
                  width: '500px',
                  opacity: between(now, TIMINGS.ACT4_CATALOG, TIMINGS.ACT4_CATALOG + 500) ? progress(now, TIMINGS.ACT4_CATALOG, TIMINGS.ACT4_CATALOG + 500)
                    : now < TIMINGS.ACT4_GRID ? 1 : Math.max(0, 1 - progress(now, TIMINGS.ACT4_GRID, TIMINGS.ACT4_GRID + 500)),
                }}
              >
                <p style={{ color: 'rgba(216,216,216,0.4)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 500 }}>
                  TECH PACK — AW26-OW-001
                </p>
                <div style={{ border: '1px solid rgba(216,216,216,0.1)', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(216,216,216,0.08)' }}>
                    <div>
                      <p style={{ color: '#FAEFE0', fontSize: '18px', fontWeight: 400 }}>Tuscan Trench</p>
                      <p style={{ color: 'rgba(216,216,216,0.4)', fontSize: '11px', marginTop: '4px' }}>AW26-OW-001 · Outerwear</p>
                    </div>
                    <p style={{ color: '#FAEFE0', fontSize: '24px', fontWeight: 300 }}>€420</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { l: 'Composition', v: '70% Wool, 30% Cashmere' },
                      { l: 'Lining', v: '100% Cupro' },
                      { l: 'Sizes', v: 'XS — XXL (6 sizes)' },
                      { l: 'Colorways', v: 'Tuscan, Midnight, Forest' },
                      { l: 'Lead Time', v: '12 weeks' },
                      { l: 'MOQ', v: '150 units' },
                    ].map((spec, i) => (
                      <div key={i}>
                        <p style={{ color: 'rgba(216,216,216,0.3)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>{spec.l}</p>
                        <p style={{ color: 'rgba(250,239,224,0.7)', fontSize: '12px', fontWeight: 300 }}>{spec.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p style={{ color: '#FAEFE0', fontSize: '24px', fontWeight: 300, fontStyle: 'italic', marginTop: '24px', textAlign: 'center' }}>
                  Perfect it
                </p>
              </div>
            )}

            {/* GRID — full catalog */}
            {after(now, TIMINGS.ACT4_GRID) && between(now, TIMINGS.ACT4_GRID, TIMINGS.ACT5_START + 1000) && (
              <div
                style={{
                  width: '90%',
                  maxWidth: '900px',
                  opacity: between(now, TIMINGS.ACT4_GRID, TIMINGS.ACT4_GRID + 500) ? progress(now, TIMINGS.ACT4_GRID, TIMINGS.ACT4_GRID + 500) : 1,
                }}
              >
                <p style={{ color: 'rgba(216,216,216,0.4)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 500, textAlign: 'center' }}>
                  COLLECTION CATALOG — AW 2026 &quot;TERRA&quot;
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {CATALOG_ITEMS.map((item, i) => {
                    const itemTime = TIMINGS.ACT4_GRID + 200 + i * 150;
                    return (
                      <div
                        key={i}
                        style={{
                          border: '1px solid rgba(216,216,216,0.08)',
                          overflow: 'hidden',
                          opacity: after(now, itemTime) ? Math.min(1, progress(now, itemTime, itemTime + 400)) : 0,
                          transform: `scale(${after(now, itemTime) ? 1 : 0.95})`,
                          transition: 'transform 0.4s ease',
                        }}
                      >
                        <div style={{ height: '120px', backgroundColor: item.color, opacity: 0.6 }} />
                        <div style={{ padding: '10px 12px', backgroundColor: 'rgba(40,42,41,0.8)' }}>
                          <p style={{ color: '#FAEFE0', fontSize: '11px', fontWeight: 400 }}>{item.name}</p>
                          <p style={{ color: 'rgba(216,216,216,0.3)', fontSize: '9px', marginTop: '2px' }}>{item.ref}</p>
                          <p style={{ color: 'rgba(250,239,224,0.6)', fontSize: '12px', fontWeight: 300, marginTop: '4px' }}>{item.price}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{ color: '#FAEFE0', fontSize: '24px', fontWeight: 300, fontStyle: 'italic', marginTop: '24px', textAlign: 'center' }}>
                  Launch it
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          ACT 5 — MARKETING & LAUNCH (0:48 - 0:58)
         ════════════════════════════════════════════ */}
      {between(now, TIMINGS.ACT5_START - 500, TIMINGS.ACT6_START + 1000) && started && (
        <div
          className="absolute inset-0 z-10"
          style={{
            opacity: between(now, TIMINGS.ACT5_START - 500, TIMINGS.ACT5_START + 500)
              ? progress(now, TIMINGS.ACT5_START - 500, TIMINGS.ACT5_START + 500)
              : now >= TIMINGS.ACT6_START ? Math.max(0, 1 - progress(now, TIMINGS.ACT6_START, TIMINGS.ACT6_START + 1000))
              : 1,
          }}
        >
          {/* Label */}
          <div
            className="absolute top-16 left-16"
            style={{
              opacity: after(now, TIMINGS.ACT5_LABEL) ? 1 : 0,
              transition: 'opacity 0.6s ease',
            }}
          >
            <span style={{ color: '#FAEFE0', fontSize: '11px', fontWeight: 500, letterSpacing: '0.3em', opacity: 0.4 }}>04</span>
            <span style={{ color: '#FAEFE0', fontSize: '11px', fontWeight: 500, letterSpacing: '0.3em', marginLeft: '12px', opacity: 0.7 }}>MARKETING & LAUNCH</span>
          </div>

          {/* Content calendar */}
          <div className="absolute top-28 left-16 right-16">
            <p style={{ color: 'rgba(216,216,216,0.4)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '20px', fontWeight: 500 }}>
              CONTENT CALENDAR — LAUNCH WEEK
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
              {CAMPAIGN_POSTS.map((post, i) => {
                const postTime = TIMINGS.ACT5_CALENDAR + i * 300;
                return (
                  <div
                    key={i}
                    style={{
                      border: '1px solid rgba(216,216,216,0.08)',
                      padding: '16px',
                      opacity: after(now, postTime) ? Math.min(1, progress(now, postTime, postTime + 400)) : 0,
                      transform: `translateY(${after(now, postTime) ? 0 : 15}px)`,
                      transition: 'transform 0.4s ease',
                      backgroundColor: 'rgba(40,42,41,0.5)',
                    }}
                  >
                    <p style={{ color: 'rgba(216,216,216,0.3)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>{post.day}</p>
                    <p style={{ color: '#9b2226', fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', marginBottom: '6px' }}>{post.type}</p>
                    <p style={{ color: '#FAEFE0', fontSize: '12px', fontWeight: 300 }}>{post.title}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campaign cards */}
          {after(now, TIMINGS.ACT5_CAMPAIGNS) && (
            <div
              className="absolute bottom-32 left-16 right-16"
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                opacity: Math.min(1, progress(now, TIMINGS.ACT5_CAMPAIGNS, TIMINGS.ACT5_CAMPAIGNS + 600)),
              }}
            >
              {[
                { title: 'Instagram Reels', metric: '50K views', status: 'Scheduled' },
                { title: 'LinkedIn Series', metric: '6 posts', status: 'Ready' },
                { title: 'Email Sequence', metric: '12 emails', status: 'Drafted' },
                { title: 'Press Outreach', metric: '15 outlets', status: 'In Progress' },
              ].map((card, i) => {
                const cardTime = TIMINGS.ACT5_CAMPAIGNS + 200 + i * 200;
                return (
                  <div
                    key={i}
                    style={{
                      border: '1px solid rgba(216,216,216,0.1)',
                      padding: '20px',
                      flex: 1,
                      maxWidth: '220px',
                      opacity: after(now, cardTime) ? Math.min(1, progress(now, cardTime, cardTime + 400)) : 0,
                      transform: `translateY(${after(now, cardTime) ? 0 : 10}px)`,
                      transition: 'transform 0.4s ease',
                    }}
                  >
                    <p style={{ color: '#FAEFE0', fontSize: '13px', fontWeight: 400, marginBottom: '4px' }}>{card.title}</p>
                    <p style={{ color: 'rgba(216,216,216,0.4)', fontSize: '11px', fontWeight: 300, marginBottom: '8px' }}>{card.metric}</p>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontWeight: 500,
                      color: card.status === 'Scheduled' ? '#4a7c59' : card.status === 'Ready' ? '#3d5a80' : card.status === 'Drafted' ? '#bc6c25' : '#9b2226',
                      border: `1px solid ${card.status === 'Scheduled' ? 'rgba(74,124,89,0.3)' : card.status === 'Ready' ? 'rgba(61,90,128,0.3)' : card.status === 'Drafted' ? 'rgba(188,108,37,0.3)' : 'rgba(155,34,38,0.3)'}`,
                    }}>
                      {card.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Every channel. Every message. */}
          {after(now, TIMINGS.ACT5_CAMPAIGNS + 800) && (
            <p
              className="absolute bottom-14 w-full text-center"
              style={{
                color: '#FAEFE0',
                fontSize: '16px',
                fontWeight: 300,
                letterSpacing: '0.05em',
                opacity: Math.min(1, progress(now, TIMINGS.ACT5_CAMPAIGNS + 800, TIMINGS.ACT5_CAMPAIGNS + 1200)),
              }}
            >
              Every channel. Every message.
            </p>
          )}

          {/* Launch countdown */}
          {after(now, TIMINGS.ACT5_LAUNCH) && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                opacity: Math.min(1, progress(now, TIMINGS.ACT5_LAUNCH, TIMINGS.ACT5_LAUNCH + 300)),
                backgroundColor: 'rgba(40,42,41,0.7)',
                zIndex: 5,
              }}
            >
              <div className="text-center">
                <p style={{
                  color: '#FAEFE0',
                  fontSize: '120px',
                  fontWeight: 200,
                  lineHeight: 1,
                }}>
                  {now < TIMINGS.ACT5_LAUNCH + 700 ? '3' : now < TIMINGS.ACT5_LAUNCH + 1400 ? '2' : now < TIMINGS.ACT5_LAUNCH + 2100 ? '1' : ''}
                </p>
                {now >= TIMINGS.ACT5_LAUNCH + 2100 && (
                  <p style={{
                    color: '#FAEFE0',
                    fontSize: '48px',
                    fontWeight: 300,
                    fontStyle: 'italic',
                    letterSpacing: '0.1em',
                  }}>
                    Launch.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          ACT 6 — THE ORCHESTRATOR (0:58 - 1:05)
         ════════════════════════════════════════════ */}
      {between(now, TIMINGS.ACT6_START - 500, TIMINGS.ACT7_START + 1000) && started && (
        <div
          className="absolute inset-0 z-10"
          style={{
            opacity: between(now, TIMINGS.ACT6_START - 500, TIMINGS.ACT6_START + 500)
              ? progress(now, TIMINGS.ACT6_START - 500, TIMINGS.ACT6_START + 500)
              : now >= TIMINGS.ACT7_START ? Math.max(0, 1 - progress(now, TIMINGS.ACT7_START, TIMINGS.ACT7_START + 1000))
              : 1,
          }}
        >
          {/* Title */}
          <div className="absolute top-12 w-full text-center">
            <p style={{ color: 'rgba(250,239,224,0.4)', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 500 }}>
              THE ORCHESTRATOR
            </p>
            <p style={{ color: '#FAEFE0', fontSize: '20px', fontWeight: 300 }}>
              One timeline. <span style={{ fontStyle: 'italic' }}>Every step.</span>
            </p>
          </div>

          {/* Gantt chart */}
          <div
            className="absolute left-12 right-12"
            style={{
              top: '100px',
              bottom: '40px',
              transform: `scale(${0.9 + progress(now, TIMINGS.ACT6_PULLBACK, TIMINGS.ACT6_GANTT) * 0.1})`,
              transition: 'transform 0.5s ease',
            }}
          >
            {/* Block rows */}
            {BLOCK_LABELS.map((label, blockIdx) => (
              <div
                key={blockIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 'calc(25% - 8px)',
                  marginBottom: '8px',
                }}
              >
                {/* Block label */}
                <div style={{ width: '130px', flexShrink: 0 }}>
                  <p style={{ color: 'rgba(250,239,224,0.5)', fontSize: '11px', fontWeight: 400, letterSpacing: '0.05em' }}>{label}</p>
                </div>
                {/* Timeline area */}
                <div style={{ flex: 1, position: 'relative', height: '100%', backgroundColor: 'rgba(255,255,255,0.02)', borderLeft: '1px solid rgba(216,216,216,0.06)' }}>
                  {/* Month markers */}
                  {[0, 20, 40, 60, 80].map(pos => (
                    <div key={pos} style={{ position: 'absolute', left: `${pos}%`, top: 0, bottom: 0, borderLeft: '1px solid rgba(216,216,216,0.04)' }} />
                  ))}
                  {/* Milestones */}
                  {GANTT_MILESTONES.filter(m => m.block === blockIdx).map((milestone, mi) => {
                    const msTime = TIMINGS.ACT6_GANTT + blockIdx * 400 + mi * 250;
                    const msProgress = progress(now, msTime, msTime + 600);
                    return (
                      <div
                        key={mi}
                        style={{
                          position: 'absolute',
                          left: `${milestone.start}%`,
                          width: `${milestone.width * msProgress}%`,
                          top: `${mi * 28 + 8}%`,
                          height: '22%',
                          backgroundColor: milestone.color,
                          opacity: after(now, msTime) ? 0.7 * Math.min(1, msProgress * 2) : 0,
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '8px',
                          overflow: 'hidden',
                          transition: 'opacity 0.3s ease',
                        }}
                      >
                        <span style={{
                          color: 'rgba(255,255,255,0.9)',
                          fontSize: '9px',
                          fontWeight: 500,
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                        }}>
                          {milestone.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Month labels at bottom */}
            <div style={{ display: 'flex', marginLeft: '130px', marginTop: '4px' }}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May'].map((m, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ color: 'rgba(216,216,216,0.2)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{m}</span>
                </div>
              ))}
            </div>

            {/* Dependency lines — subtle */}
            <svg style={{ position: 'absolute', inset: 0, left: '130px', width: 'calc(100% - 130px)', height: '100%', pointerEvents: 'none' }}>
              {after(now, TIMINGS.ACT6_GANTT + 2000) && (
                <>
                  <line x1="32%" y1="20%" x2="25%" y2="28%" stroke="rgba(216,216,216,0.08)" strokeWidth="1" strokeDasharray="4,4" />
                  <line x1="50%" y1="28%" x2="37%" y2="48%" stroke="rgba(216,216,216,0.08)" strokeWidth="1" strokeDasharray="4,4" />
                  <line x1="62%" y1="55%" x2="62%" y2="72%" stroke="rgba(216,216,216,0.08)" strokeWidth="1" strokeDasharray="4,4" />
                </>
              )}
            </svg>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          ACT 7 — CLOSING (1:05 - 1:15)
         ════════════════════════════════════════════ */}
      {after(now, TIMINGS.ACT7_START) && started && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center"
          style={{
            backgroundColor: '#282A29',
            opacity: Math.min(1, progress(now, TIMINGS.ACT7_START, TIMINGS.ACT7_FADE + 500)),
          }}
        >
          {/* Logo */}
          {after(now, TIMINGS.ACT7_LOGO) && (
            <p
              style={{
                color: '#FAEFE0',
                fontSize: '56px',
                fontWeight: 300,
                letterSpacing: '0.1em',
                opacity: Math.min(1, progress(now, TIMINGS.ACT7_LOGO, TIMINGS.ACT7_LOGO + 800)),
                transform: `translateY(${after(now, TIMINGS.ACT7_LOGO + 400) ? 0 : 10}px)`,
                transition: 'transform 0.6s ease',
              }}
            >
              aimily
            </p>
          )}

          {/* "That's all." */}
          {after(now, TIMINGS.ACT7_THATSALL) && (
            <p
              style={{
                color: '#FAEFE0',
                fontSize: '28px',
                fontWeight: 300,
                fontStyle: 'italic',
                marginTop: '32px',
                opacity: Math.min(1, progress(now, TIMINGS.ACT7_THATSALL, TIMINGS.ACT7_THATSALL + 600)),
                letterSpacing: '0.02em',
              }}
            >
              That&apos;s all.
            </p>
          )}

          {/* CTA */}
          {after(now, TIMINGS.ACT7_CTA) && (
            <div
              className="text-center"
              style={{
                marginTop: '48px',
                opacity: Math.min(1, progress(now, TIMINGS.ACT7_CTA, TIMINGS.ACT7_CTA + 800)),
              }}
            >
              <p style={{ color: 'rgba(216,216,216,0.5)', fontSize: '14px', fontWeight: 300, letterSpacing: '0.1em' }}>
                Your AI-powered fashion collection assistant
              </p>
              <p style={{ color: 'rgba(250,239,224,0.7)', fontSize: '16px', fontWeight: 400, letterSpacing: '0.15em', marginTop: '16px' }}>
                aimily.app
              </p>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '24px' }}>
                {PALETTE_COLORS.map((c, i) => (
                  <div key={i} style={{ width: '24px', height: '3px', backgroundColor: c, opacity: 0.5 }} />
                ))}
              </div>
            </div>
          )}

          {/* Replay button */}
          {now >= TIMINGS.ACT7_END - 1000 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRestart(); }}
              style={{
                marginTop: '48px',
                padding: '10px 32px',
                border: '1px solid rgba(250,239,224,0.2)',
                backgroundColor: 'transparent',
                color: 'rgba(250,239,224,0.5)',
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                opacity: Math.min(1, progress(now, TIMINGS.ACT7_END - 1000, TIMINGS.ACT7_END)),
              }}
            >
              Replay
            </button>
          )}
        </div>
      )}

      {/* ─── Keyboard hint ─── */}
      {started && (
        <div
          className="absolute bottom-4 right-4 z-50"
          style={{
            color: 'rgba(216,216,216,0.15)',
            fontSize: '10px',
            letterSpacing: '0.1em',
          }}
        >
          SPACE: play/pause · R: restart
        </div>
      )}

      {/* ─── Collection name watermark ─── */}
      {between(now, TIMINGS.ACT2_START, TIMINGS.ACT6_START) && started && (
        <div
          className="absolute bottom-6 left-16 z-30"
          style={{
            color: 'rgba(250,239,224,0.08)',
            fontSize: '12px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          AW 2026 — &quot;TERRA&quot; COLLECTION
        </div>
      )}
    </div>
  );
}
