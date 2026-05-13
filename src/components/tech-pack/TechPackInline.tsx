'use client';

/* ═══════════════════════════════════════════════════════════════════
   TechPackInline — wraps the standalone TechPackSheet for use INSIDE
   the SKU modal (no page navigation, keeps the user in the SkuDetailView
   flow). Loads tech_pack_data + comments client-side, and on first open
   for an empty SKU pre-fills every section with everything we already
   know from CIS + Block 1+2 outputs (Sketch + Colorways + Materials +
   Sourcing + Brand DNA + pricing + category templates).

   Felipe's rule: the canonical pattern. Pre-fill everything we already
   know; let the user edit the rest. The Tech Pack is the SKU's full
   spec, not a separate world.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { SkuColorway } from '@/types/design';
import { closestPantone } from '@/lib/pantone-library';
import { TechPackSheet } from './TechPackSheet';

interface Props {
  sku: SKU;
  collectionId: string;
  collectionName: string;
  season: string;
  /** Active colorway zones (used for hex → Pantone mapping per zone). */
  colorways?: SkuColorway[];
  /** Currently signed-in user, for header.designer auto-fill. */
  designerName?: string;
}

interface MaterialZoneJSON {
  name: string;
  pantone: string;
  supplier: string;
  swatchUrl: string;
  notes: string;
  hex?: string;
  material_id?: string;
}
interface BomLineJSON {
  type: string;
  material: string;
  qty: string;
  unit: string;
  supplier: string;
  cost: string;
  cost_currency?: string;
}
interface TechPackData {
  header?: Record<string, string>;
  drawings?: Record<string, unknown>;
  materials?: { zones?: MaterialZoneJSON[] };
  bom?: { lines?: BomLineJSON[] };
  measurements?: { rows?: unknown[]; notes?: string };
  grading?: Record<string, string>;
  factory_notes?: Record<string, string>;
  construction_details?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CommentRow {
  id: string;
  block: string;
  body: string;
  author_id: string | null;
  author_name: string | null;
  drawing_slot: string | null;
  pin_x: number | null;
  pin_y: number | null;
  created_at: string;
  updated_at: string;
}

/* ── Category-specific defaults ────────────────────────────────────── */
function gradingDefaultsFor(category?: string): Record<string, string> {
  if (category === 'CALZADO') {
    // Unisex EU sizing (36-45). User edits to womens (35-42) or mens (39-46).
    return {
      sizeRange: 'Unisex EU 36–45',
      sizes: '36, 37, 38, 39, 40, 41, 42, 43, 44, 45',
      grade_rule: 'Standard footwear grading: +6.66 mm length per size · ±2 mm width step · ±1.5 mm girth step',
      base_size: '40',
      notes: 'Edit the size range to Womens (35–42), Mens (39–46) or Kids (28–34) if applicable.',
    };
  }
  if (category === 'ROPA') {
    return {
      sizeRange: 'Womens XXS–XXL',
      sizes: 'XXS, XS, S, M, L, XL, XXL',
      grade_rule: 'Standard apparel grading: +4 cm chest · +4 cm waist · +4 cm hip per size step',
      base_size: 'M',
      notes: 'Adjust the size range if the product is Mens (XS–XXL) or Kids (3Y–14Y).',
    };
  }
  return {
    sizeRange: 'One-size',
    sizes: 'One-size',
    grade_rule: 'No grading required.',
    base_size: '—',
    notes: '',
  };
}

/* Extract recognisable construction techniques from material zone finishes
   so the Construction Details section starts with sensible defaults. */
function constructionDefaultsFromZones(matZones: { zone?: string; finish?: string; composition?: string }[]): Record<string, string> {
  const all = matZones.map(z => `${z.finish || ''} ${z.composition || ''}`).join(' · ').toLowerCase();
  const techniques: string[] = [];
  if (all.includes('blake stitch')) techniques.push('Blake stitch construction');
  if (all.includes('goodyear')) techniques.push('Goodyear welt');
  if (all.includes('french seam')) techniques.push('French seam finish');
  if (all.includes('flatlock')) techniques.push('Flatlock seams');
  if (all.includes('vegetal') || all.includes('curtido vegetal')) techniques.push('Vegetable-tanned leather throughout');
  if (all.includes('vulcaniz')) techniques.push('Vulcanised rubber sole');
  if (all.includes('cement')) techniques.push('Cemented sole construction');
  if (all.includes('overlock')) techniques.push('Overlocked seams');
  return {
    notes: techniques.length ? techniques.join(' · ') : '',
    seam_type: techniques.find(t => /seam|stitch|flatlock|overlock/i.test(t)) || '',
    sole_type: techniques.find(t => /sole|welt|cement|vulcanis/i.test(t)) || '',
  };
}

/* Compliance: derive certifications + sustainability flags from the
   composite of finish + composition strings. */
function complianceDerivedFromZones(matZones: { finish?: string; composition?: string }[]): Record<string, string> {
  const all = matZones.map(z => `${z.finish || ''} ${z.composition || ''}`).join(' · ');
  const lower = all.toLowerCase();
  const flags: string[] = [];
  if (/gots/i.test(all)) flags.push('GOTS organic cotton');
  if (/oeko-?tex|oekotex/i.test(all)) flags.push('OEKO-TEX certified');
  if (/recycl/i.test(all)) flags.push('Recycled content');
  if (/vegetal|vegan/i.test(lower)) flags.push('Vegetable-tanned / vegan-friendly');
  if (/biodegrad/i.test(lower)) flags.push('Biodegradable');
  if (/sustain/i.test(lower)) flags.push('Sustainable sourcing claimed');
  if (/no\s*pvc|no-pvc/i.test(lower)) flags.push('PVC-free');
  return {
    flags: flags.join(' · '),
    rsl_status: flags.length > 0 ? 'OK (auto-derived)' : 'Pending review',
  };
}

/* Multi-view drawings hint — the two BASE slots (viewA/viewB) already
   cover the canonical pair (apparel: front+back, footwear: side+top),
   so the auto-suggested extras must NEVER duplicate them. Felipe spotted
   "Back view" appearing twice + a stranded "Detail / closure" empty
   placeholder because this seeded apparel with a redundant back slot. */
function suggestedExtraSlots(category?: string): Array<{ slot: string; label: string }> {
  if (category === 'CALZADO') return [{ slot: 'viewC', label: 'Heel detail' }];
  if (category === 'ROPA') return []; // base front+back already cover the essentials
  return [];
}

export function TechPackInline({ sku, collectionId, collectionName, season, colorways = [], designerName }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TechPackData | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) Load existing tech pack data + comments in parallel.
        const [tpRes, cRes] = await Promise.all([
          fetch(`/api/tech-pack?skuId=${sku.id}`),
          fetch(`/api/tech-pack/comments?skuId=${sku.id}`),
        ]);
        const tpJson: { data: TechPackData | null } = tpRes.ok ? await tpRes.json() : { data: null };
        const cJson: { comments: CommentRow[] } = cRes.ok ? await cRes.json() : { comments: [] };
        if (cancelled) return;

        let current = tpJson.data;

        const matZones = sku.material_zones || [];
        const skuRender = sku as { render_url?: string; sourcing_data?: Record<string, string> };
        const renderUrl = skuRender.render_url || '';
        const sourcingData = skuRender.sourcing_data || {};

        // Build zone → hex map from the active colorway (first one).
        // Material zones from the Materials sub-step often use slightly
        // different names than colorway zones (e.g. material "Heel Counter"
        // ↔ colorway "Heel Cup"; material "Outsole" / "Midsole" both ↔
        // colorway "Sole"). We try exact match first, then a token-based
        // fallback so the visual mapping doesn't lose 80% of the zones.
        const activeColorway = colorways[0];
        const cwZones: { zone: string; hex: string }[] = [];
        if (activeColorway?.zones?.length) {
          for (const z of activeColorway.zones) {
            if (z.zone && z.hex) cwZones.push({ zone: z.zone, hex: z.hex });
          }
        }
        const ZONE_TOKEN_GROUPS: Record<string, string[]> = {
          sole: ['sole', 'midsole', 'outsole'],
          heel: ['heel', 'counter', 'cup'],
          upper: ['upper', 'vamp', 'quarter'],
          interior: ['lining', 'insole', 'footbed', 'tongue', 'eyelet'],
          accent: ['stitching', 'topline', 'branding', 'logo', 'lace'],
        };
        const findHexFor = (zoneName: string): string => {
          const lower = zoneName.toLowerCase();
          // Exact substring match first (case-insensitive)
          for (const cw of cwZones) {
            const cwLower = cw.zone.toLowerCase();
            if (cwLower === lower || cwLower.includes(lower) || lower.includes(cwLower)) {
              return cw.hex;
            }
          }
          // Token-group fallback: which family does this zone belong to,
          // and is there a colorway zone in the same family?
          const matKey = Object.entries(ZONE_TOKEN_GROUPS).find(([, tokens]) =>
            tokens.some(t => lower.includes(t)),
          )?.[0];
          if (!matKey) return '';
          const matTokens = ZONE_TOKEN_GROUPS[matKey];
          const cwMatch = cwZones.find(cw => matTokens.some(t => cw.zone.toLowerCase().includes(t)));
          return cwMatch?.hex || '';
        };
        const zoneHexMap = {
          size: cwZones.length,
          get: (zoneName: string) => findHexFor(zoneName),
        };

        const headerNeeded = !current?.header || !current.header.brand;
        const preferredViewA = renderUrl || sku.sketch_url || '';
        // Footwear keeps top-down as viewB; apparel + accessories use the
        // back sketch generated by /api/ai/generate-sketch-options. Before
        // this fix the apparel back panel was reading sketch_top_url which
        // is footwear-only, so it stayed empty even when a back sketch
        // existed on the SKU.
        const preferredViewB = sku.category === 'CALZADO'
          ? (sku.sketch_top_url || '')
          : (sku.sketch_back_url || '');
        const currentViewA = (current?.drawings as { viewA?: string } | undefined)?.viewA || '';
        const currentViewB = (current?.drawings as { viewB?: string } | undefined)?.viewB || '';
        const drawingsNeeded = !current?.drawings ||
          (preferredViewA && currentViewA !== preferredViewA) ||
          (preferredViewB && currentViewB !== preferredViewB);
        // Materials need a back-fill if either:
        //   • there are no zones yet (first-time open), or
        //   • zones exist but the Pantone/hex columns are empty AND we have a
        //     colorway to map from (e.g. user opened tech pack before
        //     confirming colorways, then came back).
        const existingZones = current?.materials?.zones || [];
        const haveColorway = cwZones.length > 0;
        // Re-fill whenever ANY zone is missing both hex and pantone AND we
        // have a colorway to map from (some zones may already be filled —
        // we leave those alone via the per-zone preserve below).
        const someZoneMissesColor = haveColorway && existingZones.some(z => !z.pantone && !z.hex);
        const materialsNeeded = (!existingZones.length && matZones.length > 0) || someZoneMissesColor;
        // BOM is stale if any zone has a cost_total but the BOM line cost
        // doesn't match (e.g. user re-ran the cost-aware materials AI but the
        // BOM still has the old proportional split). Triggers a refill that
        // pulls cost_total per line from material_zones.
        const existingBomLines = (current?.bom as { lines?: Array<{ type?: string; cost?: string }> } | undefined)?.lines || [];
        const bomStale = existingBomLines.length > 0 && matZones.some(z => {
          const realCost = (z as { cost_total?: number }).cost_total;
          if (realCost == null) return false;
          const line = existingBomLines.find(l => (l.type || '').toLowerCase() === (z.zone || '').toLowerCase());
          if (!line) return false;
          const lineCost = Number(String(line.cost || '0').replace(/[^0-9.\-]/g, ''));
          return Math.abs(lineCost - realCost) > 0.01;
        });
        const bomNeeded = (!current?.bom?.lines?.length && matZones.length > 0) || bomStale;
        const gradingNeeded = !current?.grading || Object.keys(current.grading).length === 0;
        const constructionNeeded = !current?.construction_details ||
          Object.keys(current.construction_details as Record<string, unknown>).length === 0;
        const factoryNeeded = (!current?.factory_notes ||
          Object.keys(current.factory_notes).length === 0) &&
          Object.keys(sourcingData).length > 0;
        const measurementsNeeded = !current?.measurements?.rows?.length;

        const patches: Array<{ section: string; data: unknown }> = [];

        if (headerNeeded) {
          const categoryLabel = sku.category === 'CALZADO' ? 'Calzado' : sku.category === 'ROPA' ? 'Ropa' : 'Accesorios';
          patches.push({
            section: 'header',
            data: {
              brand: collectionName,
              season,
              drop: sku.drop_number ? String(sku.drop_number) : '',
              sku_code: sku.id.slice(0, 8).toUpperCase(),
              name: sku.name,
              family: sku.family || '',
              category: categoryLabel,
              pvp: sku.pvp != null ? `€${sku.pvp}` : '',
              cogs: sku.cost != null ? `€${sku.cost}` : '',
              units: sku.buy_units != null ? String(sku.buy_units) : '',
              designer: designerName || '',
            },
          });
        }

        if (drawingsNeeded) {
          const existingDrawings = (current?.drawings || {}) as Record<string, unknown>;
          const existingExtra = (existingDrawings.extraSlots as Array<{ slot: string; label: string }> | undefined) || [];
          const suggested = suggestedExtraSlots(sku.category);
          // Only seed the suggestions when we don't already have any extras.
          const extraSlots = existingExtra.length > 0 ? existingExtra : suggested;
          patches.push({
            section: 'drawings',
            data: {
              ...existingDrawings,
              viewA: preferredViewA,
              viewB: preferredViewB,
              callouts: (existingDrawings.callouts as unknown[]) || [],
              extraSlots,
            },
          });
        }

        if (materialsNeeded) {
          // If zones already exist (e.g. seeded by an earlier open before the
          // colorway was ready), preserve their identity + supplier + swatch
          // overrides — only fill in pantone/hex/notes from the new context.
          const baseZones = existingZones.length > 0
            ? existingZones.map(z => ({ ...z }))
            : matZones.map(z => ({
                name: z.zone || '',
                pantone: '',
                supplier: '',
                swatchUrl: '',
                hex: '',
                notes: [z.composition, z.finish].filter(Boolean).join(' · '),
              }));
          patches.push({
            section: 'materials',
            data: {
              zones: baseZones.map(z => {
                const hex = z.hex || zoneHexMap.get(z.name || '') || '';
                const pantoneMatch = !z.pantone && hex ? closestPantone(hex, 1)[0] : null;
                const pantone = z.pantone || (pantoneMatch ? `${pantoneMatch.code} ${pantoneMatch.name}` : '');
                return { ...z, hex, pantone };
              }),
            },
          });
        }

        if (bomNeeded) {
          // Cost source of truth: per-zone cost_total returned by the
          // cost-aware materials-suggest AI. Falls back to a proportional
          // split of sku.cost × MATERIALS_RATIO if the AI didn't supply
          // one (e.g. legacy SKU pre-cost-aware proposal).
          const MATERIALS_RATIO_BY_CATEGORY: Record<string, number> = {
            CALZADO: 0.50, ROPA: 0.55, ACCESORIOS: 0.45,
          };
          const totalCogs = Number(sku.cost) || 0;
          const ratio = MATERIALS_RATIO_BY_CATEGORY[sku.category || ''] ?? 0.50;
          const materialsBudget = totalCogs * ratio;
          const fallbackShare = matZones.length > 0 ? materialsBudget / matZones.length : 0;
          patches.push({
            section: 'bom',
            data: {
              /* CRITICAL: BOM line `cost` is PER UNIT, not total — landed-cost
               * rollup does `qty × cost`. The cost-aware materials AI returns
               * BOTH cost_per_unit ("€9.80 / m²") AND cost_total ("€5.39"),
               * and the BOM must use cost_per_unit. The previous seeder stored
               * cost_total (already qty-included) under `cost`, then the
               * rollup multiplied by qty AGAIN → e.g. 120 trims × €9.60 total
               * = €1152 fake materials, blowing the margin to -341%. */
              lines: matZones.map(z => {
                const costPerUnitRaw = (z as { cost_per_unit?: string }).cost_per_unit || '';
                const costTotalRaw = (z as { cost_total?: number }).cost_total;
                const consumption = (z as { consumption?: string }).consumption || '';
                const consumptionMatch = consumption.match(/^([\d.]+)\s*(.+)?$/);
                const qtyNum = Number(consumptionMatch?.[1] || '1') || 1;
                const unit = consumptionMatch?.[2]?.trim() || 'pcs';

                /* Resolve per-unit cost in priority order:
                 *   1. cost_per_unit string (e.g. "€9.80 / m²") — primary AI signal
                 *   2. cost_total / qty — derive if AI only supplied total
                 *   3. fallback proportional share / qty — last-resort default */
                let costPerUnit = 0;
                const cpuMatch = costPerUnitRaw.match(/([\d.]+)/);
                if (cpuMatch) {
                  costPerUnit = Number(cpuMatch[1]);
                } else if (costTotalRaw != null && qtyNum > 0) {
                  costPerUnit = costTotalRaw / qtyNum;
                } else if (fallbackShare > 0 && qtyNum > 0) {
                  costPerUnit = fallbackShare / qtyNum;
                }

                return {
                  type: z.zone || '',
                  material: z.material || '',
                  qty: String(qtyNum),
                  unit,
                  supplier: (z as { supplier?: string }).supplier || '',
                  cost: costPerUnit > 0 ? costPerUnit.toFixed(2) : '',
                  cost_currency: (z as { cost_currency?: string }).cost_currency || 'EUR',
                };
              }),
            },
          });
        }

        if (gradingNeeded) {
          patches.push({ section: 'grading', data: gradingDefaultsFor(sku.category) });
        }

        if (constructionNeeded) {
          patches.push({
            section: 'construction_details',
            data: {
              ...constructionDefaultsFromZones(matZones),
              ...complianceDerivedFromZones(matZones),
            },
          });
        }

        if (factoryNeeded) {
          patches.push({
            section: 'factory_notes',
            data: {
              factory: sourcingData.factory || '',
              origin: sourcingData.origin || '',
              contact: sourcingData.contact || '',
              notes: sourcingData.notes || '',
            },
          });
        }

        // 3) Fire patches sequentially so the server merges cleanly.
        for (const p of patches) {
          await fetch('/api/tech-pack', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skuId: sku.id, section: p.section, data: p.data }),
          });
        }

        // 4) Auto-fire AI measurements on first open if they're still empty.
        //    Runs through /api/ai/tech-pack/generate which already loads
        //    full CIS context server-side. Non-blocking: persists itself
        //    via the standard PATCH path inside the endpoint.
        if (measurementsNeeded && sku.category) {
          try {
            const aiRes = await fetch('/api/ai/tech-pack/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ skuId: sku.id, scope: 'measurements' }),
            });
            if (aiRes.ok) {
              const aiJson = await aiRes.json().catch(() => null);
              const measRows = aiJson?.measurements?.rows;
              if (Array.isArray(measRows) && measRows.length > 0) {
                await fetch('/api/tech-pack', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    skuId: sku.id,
                    section: 'measurements',
                    data: { rows: measRows, notes: aiJson.measurements.notes || '' },
                  }),
                });
              }
            }
          } catch (err) {
            console.warn('[TechPackInline] measurements auto-gen failed', err);
          }
        }

        // 5) Re-fetch the merged row if anything changed.
        if (patches.length > 0 || measurementsNeeded) {
          const refreshed = await fetch(`/api/tech-pack?skuId=${sku.id}`);
          if (refreshed.ok) {
            const j: { data: TechPackData | null } = await refreshed.json();
            current = j.data;
          }
        }

        if (!cancelled) {
          setData(current);
          setComments(cJson.comments || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('[TechPackInline] load failed', err);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku.id, colorways.length, designerName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-carbon/40">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-[12px]">Cargando ficha técnica…</p>
      </div>
    );
  }

  // Key TechPackSheet on the loaded sections so it remounts cleanly after
  // the canonical back-fill applies (TechPackSheet caches initialData in
  // its own useState, so without a key swap stale state would persist).
  const dataKey = JSON.stringify({
    drawings: data?.drawings || {},
    materials: data?.materials || {},
    bom: data?.bom || {},
    measurements: data?.measurements || {},
    grading: data?.grading || {},
    factory: data?.factory_notes || {},
    construction: data?.construction_details || {},
  });
  return (
    <TechPackSheet
      key={`${sku.id}-${dataKey.length}`}
      collectionId={collectionId}
      collectionName={collectionName}
      season={season}
      sku={sku}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialData={data as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialComments={comments as any}
    />
  );
}
