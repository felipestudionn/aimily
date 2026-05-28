---
name: Investor / Partner Pitch Deck Architecture
description: Single source of truth for the aimily investor + Zara + partner pitch. Lives at /pitch (gated by ?key=…), canonical Keynote master at docs/aimily-pitch.key, 5 web slides in src/components/pitch/slides. Read before touching the deck.
type: project
---

# Pitch Deck — Architecture Reference

The aimily investor / partner / Zara deck. Built on `pitch/investor-zara-deck`, merged to `main` on **2026-05-28** (commits `283f95b` and `bede8d7`). Two surfaces, one narrative.

## 🚨 Canonical truth

- **The only Keynote that counts is `docs/aimily-pitch.key`** (Felipe, 2026-05-28). All 17 intermediate AZUR drafts (`aimily-pitch-es-AZUR-v1..v17.key`), `aimily-pitch-v2.key`, `aimily-pitch-es.key`, `COLORS-FULL`, `COLORTEST`, and `PRECOLOR-…` were **dropped from `main`** during the merge. Local copies may still live in Felipe's working tree (`docs/aimily-pitch-es-AZUR-v15 copia.key`, `v17-test.key`, the `v7/` exploded bundle, `tmp/`) — those are untracked and stay untracked.
- The web deck at `/pitch` is the **shareable** surface. The Keynote `.key` is the **presented** surface. Both must stay narratively aligned with each other.
- If the two diverge, the **Keynote `aimily-pitch.key` wins** as canonical content; the web deck is the public-shareable mirror.

## File map

```
src/app/(pitch)/
├── layout.tsx                    Minimal shell — no GlobalNav / StudioSwitcher /
│                                 CreditMeter / AssistantMount. Deck owns the
│                                 viewport. `robots: noindex,nofollow`.
└── pitch/
    └── page.tsx                  Soft gate via ?key=… → reads PITCH_KEY env var
                                  (default fallback "aimily-2026"). Wrong key →
                                  redirect to '/'. `?s=N` deep-links to slide N.

src/components/pitch/
├── PitchDeck.tsx                 Client component. Owns slide index, keyboard nav
│                                 (←/→/space/PgUp/PgDn/Home/End/F), URL deep-link
│                                 via history.replaceState, fullscreen toggle.
│                                 mix-blend-difference chrome adapts to dark/light
│                                 slides automatically.
├── SlideShell.tsx                Common wrapper. Props: eyebrow, variant ('light'
│                                 | 'dark'), accentColor (5 brand colors). Enforces
│                                 padding + max-width + 700ms fade-in.
└── slides/
    ├── Slide01Cover.tsx          Dark · hero · "La inteligencia que protege el
    │                             contexto creativo."
    ├── Slide02RelayRace.tsx      Light · Acto I · El problema. 4 dwindling
    │                             buckets (100% → 72% → 48% → 26%) showing
    │                             context loss across blocks.
    ├── Slide03TheCost.tsx        Light · Acto I · El coste. 3 consequence cards
    │                             using the gold standard card pattern.
    ├── Slide04TheQuestion.tsx    Dark · Acto II · "¿Y si el contexto nunca se
    │                             derramara?" — pivots from problem to thesis.
    └── Slide05CISIntro.tsx       Light · Acto II · La tesis. CIS spine diagram
                                  + 3 properties cards. Introduces "Collection
                                  Intelligence Spine" + the In-Season feedback
                                  loop arc.

src/middleware.ts                 `/pitch` added to publicPagePrefixes — bypasses
                                  app auth so partners/investors can hit the URL
                                  without a login.

docs/aimily-pitch.key             Canonical Keynote master (4.4 MB).
```

## How to access

```
https://www.aimily.app/pitch?key=<PITCH_KEY>
https://www.aimily.app/pitch?key=<PITCH_KEY>&s=2     # deep-link slide 3
```

- `PITCH_KEY` env var: set in Vercel for production. Default fallback in code is `aimily-2026` (works locally without env).
- Gate is **soft**: it stops accidental crawlers and casual sharing, not a determined attacker. Real protection = the URL isn't linked anywhere public + `robots: noindex,nofollow` on the layout.
- Middleware whitelists `/pitch` so the route bypasses normal session auth.

## Keyboard / navigation

| Key                              | Action               |
| -------------------------------- | -------------------- |
| `→` · `Space` · `PageDown`       | Next slide           |
| `←` · `PageUp`                   | Previous slide       |
| `Home`                           | First slide          |
| `End`                            | Last slide           |
| `F`                              | Toggle fullscreen    |
| Click progress dot               | Jump to slide        |
| Click left/right circular arrows | Prev / next          |

URL syncs `?s=N` on every navigation via `history.replaceState` (no reload).

## Narrative — 5 slides shipped, Ola 1

The arc is intentionally two acts:

| #  | Slide                | Eyebrow                | Act       | Move                                                                                                                                                  |
| -- | -------------------- | ---------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 01 | **Cover**            | —                      | —         | aimily wordmark + "La inteligencia que **protege** el contexto creativo." Sets tone: aimily protege, NUNCA sustituye.                                  |
| 02 | **El problema**      | `Acto I · El problema` | Acto I    | Fashion is built like a relay race. 4 shrinking buckets visualise context retention: Creative 100% → Merch 72% → Design 48% → Marketing 26%.           |
| 03 | **El coste**         | `Acto I · El coste`    | Acto I    | 3 consequence cards: 01 the idea dilutes · 02 decisions lose their "why" · 03 the collection underperforms its potential.                              |
| 04 | **La pregunta**      | `Acto II · La pregunta`| Acto II   | "¿Y si el contexto **nunca** se derramara?" — single dramatic question, dark slide, pivots problem → thesis.                                           |
| 05 | **CIS · La tesis**   | `Acto II · La tesis`   | Acto II   | Introduces the Collection Intelligence Spine. 4-block diagram threaded by a horizontal spine + In-Season feedback arc. 3 properties cards underneath.  |

**Tone rules (locked in feedback memory)**:
- `aimily protege, NUNCA sustituye` — the deck never says aimily "generates / designs / produces / does". The person directs; aimily is the strategic layer that protects the vision.
- `Español peninsular` — no latam vocabulary.
- `Typography: weight contrast, never italic` — `font-light` headings + `font-extrabold` inline emphasis. No italics.
- Voice pulled from the existing aimily.app + wizard copy. No cheap metaphors, no effectism.

## Design system — slide-specific

Same tokens as the app, plus a slide-only variant on `SlideShell`.

```ts
// SlideShell props
variant?: 'light' | 'dark';        // light = bg-shade + carbon; dark = bg-carbon + crema
eyebrow?: string;                  // top-center · 10px · 0.22em tracking · uppercase
accentColor?: 'sea-foam' | 'moss' | 'clay' | 'citronella' | 'midnight';
```

**Reused gold-standard patterns** (see `design-components-canonical.md`):
- Slide 03's 3-card grid uses the canonical card recipe: `bg-white rounded-[20px] p-10 md:p-14 min-h-[420px] hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]`, ghost number (`text-[72px] font-bold text-carbon/[0.05]`), semibold title, light body.
- Slide 05's 3 properties cards: same family, smaller (`p-8`).
- Slide 05's 4-block diagram: same `bg-white rounded-[14px]` block cards used in CollectionOverview.

**Chrome adapts via `mix-blend-difference`**: top-left wordmark, fullscreen toggle, bottom progress dots all use `style={{ mixBlendMode: 'difference' }}` so they remain readable on both light and dark slides without per-slide branching.

## Bilingual scope

- Current live: Spanish-peninsular. File names of the dropped Keynote drafts (`aimily-pitch-es-AZUR-*.key`) carried the `es` suffix; the canonical `docs/aimily-pitch.key` is also Spanish.
- An English edition is on the roadmap (feedback memory `pitch-bilingue-es-en` — quotable taglines may stay in English even inside the ES deck).
- File-naming convention going forward: `aimily-pitch.key` (canonical · ES) and, when shipped, `aimily-pitch-en.key` (English). Versioned drafts do **not** belong on `main`.

## Adding more slides (Ola 2+)

1. Create `src/components/pitch/slides/SlideNN<Name>.tsx`. Use `<SlideShell variant="…" eyebrow="…">` and reuse canonical card / typography tokens.
2. Import in `PitchDeck.tsx` and append to the `SLIDES` array with `id`, `label`, `Component`.
3. URL deep-link via `?s=N` is automatic — index is 0-based.
4. Update this doc's narrative table.
5. Keep the canonical Keynote `docs/aimily-pitch.key` in sync (export from Keynote, replace the binary in a single commit, don't leave intermediate versions).

## Hard rules (do not break)

- ❌ Don't ship intermediate `.key` drafts to `main`. The only Keynote on `main` is `docs/aimily-pitch.key`. Iterate locally; replace the canonical file in a single commit when the new version is the new truth.
- ❌ Don't link `/pitch?key=…` from any public page, sitemap, robots, or social card.
- ❌ Don't add the `/pitch` route to the main sidebar or any app nav.
- ❌ Don't import `(app)` layout chrome (GlobalNav / StudioSwitcher / CreditMeter / AssistantMount) into a slide. The deck owns the viewport.
- ❌ Don't introduce new card variants for slides. Reuse the canonical gold-standard pattern.
- ❌ Don't write "aimily generates / aimily designs / aimily produces / aimily does X". aimily **protege**.
- ❌ Don't use italic for emphasis. Use weight contrast (`font-light` + `font-extrabold`).

## Commits of record

| Hash       | Date       | What                                                                                                       |
| ---------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `cbbfa51`  | 2026-05-27 | Ola 1 — original branch commit: deck shell + 5 slides + middleware whitelist. (Now superseded.)           |
| `cb7a5d5`  | 2026-05-28 | Original branch commit: iteration day with 17 Keynote drafts + final + slide refinements. (Now superseded.)|
| `283f95b`  | 2026-05-28 | **Merged to main.** Cherry-picked from `cbbfa51`: deck shell + 5 slides + middleware.                      |
| `bede8d7`  | 2026-05-28 | **Merged to main.** Cleaned version of `cb7a5d5`: slide refinements + canonical `aimily-pitch.key` only.   |

The duplicate protocol commit from the branch (`f249d77`) was dropped during the merge because the same change was already in `main` as `a3a57f6`.

## Out of scope (call this out fast)

- `/pitch` is **not** the base of how the application works. It's a marketing/fundraising surface. The base of the app is the 4 blocks (Creative · Merchandising · Design · Marketing) + the In-Season feedback loop + CIS — documented in `architecture-tree-rubik-cube.md`, `architecture_in-season-feedback-loop.md`, and the per-block redesign docs. If anyone (incl. Felipe) asks the deck team to make app changes "to match the deck", route to the right block doc — the deck mirrors the product, not the other way around.
