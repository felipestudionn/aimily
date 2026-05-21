---
name: DB Tables Dropped — Backup (2026-05-21)
description: Data snapshots from tables dropped during the cleanup sweep. Restore SQL included if the feature ever returns.
type: reference
---

# Tables dropped in cleanup migration `2026_05_21_drop_orphan_tables`

Dropped at 2026-05-21 evening during the senior-dev pre-ship audit. All tables had:
- Zero refs in `src/` code
- Zero foreign keys from other tables (besides internal ones inside this set)
- Zero views / functions / triggers / RLS dependencies in remaining schema
- Zero pg_cron jobs targeting them
- No reader anywhere else in the codebase

If any of these features come back: re-create the schema from the migration history (Supabase `supabase migrations` folder) and reload the seed data below.

---

## Wave 1 — Social trends pipeline (5 tables) + asset_reviews

Feature: scraping Reddit/YouTube/Pinterest engagement → aggregating "trend signals" → producing weekly PDF reports per city.
Status: never shipped to users. Schema + cron jobs existed; UI was never built.

**`raw_content`** — Posts crudos de Reddit/YouTube/Pinterest. 0 rows at drop time.

**`analyzed_content`** — Análisis IA del raw_content (locations, fashion_items, brands, sentiment). 0 rows.

**`signals`** — Señales agregadas con composite_score + acceleration_factor cruzando plataformas. **3 demo rows preserved below.**

**`reports`** — Reportes semanales PDF con top_signals por ciudad. 0 rows.

**`processing_jobs`** — Job tracker del pipeline. 0 rows.

**`asset_reviews`** — Reviews de assets digitales (distinto de `sample_reviews` que sigue activo para muestras físicas). 0 rows.

### `signals` seed data (3 rows · all Shoreditch · Oct-Nov 2025)

```json
[
  {
    "id": "ceece4f2-b20c-4927-bfe4-22ab9a7d2c89",
    "signal_name": "Oversized Linen Shirts",
    "signal_type": "item",
    "location": "Shoreditch",
    "period_start": "2025-10-25",
    "period_end": "2025-11-24",
    "reddit_mentions": 15,
    "reddit_avg_engagement": 120,
    "youtube_video_count": 3,
    "youtube_total_views": 5400,
    "pinterest_pin_count": 25,
    "pinterest_total_saves": 310,
    "composite_score": 88,
    "acceleration_factor": 1.35,
    "platforms_present": 3
  },
  {
    "id": "fbfe006d-96da-4958-9b99-725c791576f9",
    "signal_name": "Platform Sandals",
    "signal_type": "item",
    "location": "Shoreditch",
    "period_start": "2025-10-25",
    "period_end": "2025-11-24",
    "reddit_mentions": 9,
    "reddit_avg_engagement": 95,
    "youtube_video_count": 5,
    "youtube_total_views": 8700,
    "pinterest_pin_count": 18,
    "pinterest_total_saves": 220,
    "composite_score": 82,
    "acceleration_factor": 1.28,
    "platforms_present": 3
  },
  {
    "id": "5ac9c94b-a4fc-4abc-a25f-062c3f229a3e",
    "signal_name": "Crochet Bags",
    "signal_type": "style",
    "location": "Shoreditch",
    "period_start": "2025-10-25",
    "period_end": "2025-11-24",
    "reddit_mentions": 7,
    "reddit_avg_engagement": 105,
    "youtube_video_count": 2,
    "youtube_total_views": 3100,
    "pinterest_pin_count": 30,
    "pinterest_total_saves": 410,
    "composite_score": 79,
    "acceleration_factor": 1.22,
    "platforms_present": 2
  }
]
```

---

## Wave 2 — Replaced by current journey (2 tables)

**`tech_packs`** — Old flat tech-pack table (one row per tech pack with brand_name, designer_name, sketch_front_svg, suggested_measurements…). 0 rows at drop time. **Replaced by**: `tech_pack_data` (5 rows) + `tech_pack_revisions` (28 rows) + `tech_pack_comments` (10 rows) — Phase 3 PLM parity with snapshot history.

**`sales_entries`** — Manual sales entry per date/channel/sku. 0 rows. **Replaced by**: aimily In-Season's automatic Shopify-driven sales tracking: `in_season_raw_records` + `in_season_sales_windows` + `in_season_efficiency_facts`.

---

## Audit history
This cleanup was prompted by Felipe's directive "no quiero que haya puertas falsas, errores, landings que no existen" on 2026-05-21. Full audit chain:

1. `src/` grep for `.from('table')` patterns
2. Information schema FK constraints (cero external)
3. `pg_views` + `pg_matviews` (cero)
4. `pg_proc` functions and procedures (cero)
5. `information_schema.triggers` (cero)
6. `pg_policies` RLS (dropped CASCADE with tables)
7. `cron.job` pg_cron schedules (cero referencing these)
8. Dynamic table-name string in code arrays (`/api/account/export/route.ts` — none of these in the array after additional grep)
