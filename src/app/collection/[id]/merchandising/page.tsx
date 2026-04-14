'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, Lock, ShoppingBag, DollarSign, Store, Calculator, LayoutGrid, X, Loader2, Sparkles, Plus, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { SegmentedPill } from '@/components/ui/segmented-pill';
import { DecisionCard } from '@/components/workspace/DecisionCard';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

/* ─── AI generation helper ─── */
async function generateMerch(
  type: string,
  input: Record<string, string>,
  language?: string,
): Promise<{ result: unknown; error?: string }> {
  const res = await fetch('/api/ai/merch-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, input, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    return { result: null, error: err.error || 'AI generation failed' };
  }
  return res.json();
}

/* ═══════════════════════════════════════════════════════════
   Merchandising & Planning Block — 4 Cards + Collection Builder
   Expand/collapse: click START → card fills grid,
   others collapse to icons. Confirm → back to 2x2.
   ═══════════════════════════════════════════════════════════ */

type InputMode = 'free' | 'assisted' | 'ai';

interface MerchCard {
  id: string;
  icon: React.ElementType;
  lockedBy?: string;
}

interface CardData {
  [cardId: string]: {
    mode: InputMode;
    confirmed: boolean;
    data: Record<string, unknown>;
  };
}

const MERCH_CARDS: MerchCard[] = [
  { id: 'families', icon: ShoppingBag },
  { id: 'pricing', icon: DollarSign, lockedBy: 'families' },
  { id: 'channels', icon: Store },
  { id: 'budget', icon: Calculator },
];

/* Maps card id to its translation keys */
const CARD_KEYS: Record<string, { name: string; nameEs: string; desc: string }> = {
  families: { name: 'productFamilies', nameEs: 'productFamiliesEs', desc: 'productFamiliesDesc' },
  pricing: { name: 'pricing', nameEs: 'pricingEs', desc: 'pricingDesc' },
  channels: { name: 'channelsMarkets', nameEs: 'channelsMarketsEs', desc: 'channelsMarketsDesc' },
  budget: { name: 'budgetFinancials', nameEs: 'budgetFinancialsEs', desc: 'budgetFinancialsDesc' },
};

const INPUT_MODE_IDS: InputMode[] = ['free', 'assisted', 'ai'];
const INPUT_MODE_KEYS: Record<InputMode, { label: string; desc: string }> = {
  free: { label: 'modeFree', desc: 'modeFreeDesc' },
  assisted: { label: 'modeAssisted', desc: 'modeAssistedDesc' },
  ai: { label: 'modeAI', desc: 'modeAIDesc' },
};

/* ─── Family type for structured data ─── */
interface Family {
  name: string;
  subcategories: string[];
  priority?: 'core' | 'strategic' | 'complementary';
}

/* ─── Priority badge + selector ─── */
const PRIORITY_STYLES = {
  core: 'bg-carbon text-crema',
  strategic: 'bg-carbon/[0.15] text-carbon',
  complementary: 'bg-carbon/[0.06] text-carbon/50',
} as const;

const PRIORITY_KEYS = {
  core: 'priorityCore',
  strategic: 'priorityStrategic',
  complementary: 'priorityComplementary',
} as const;

type Priority = 'core' | 'strategic' | 'complementary';

function PriorityBadge({ priority, onCycle }: { priority?: Priority | string; onCycle: () => void }) {
  const t = useTranslation();
  const validPriorities: Priority[] = ['core', 'strategic', 'complementary'];
  const p: Priority = validPriorities.includes(priority as Priority) ? (priority as Priority) : 'core';
  const label = t.merchandising[PRIORITY_KEYS[p] as keyof typeof t.merchandising] as string;
  const variant = p === 'core' ? 'default' : 'outline';
  return (
    <Badge
      variant={variant as 'default' | 'outline'}
      className={`cursor-pointer shrink-0 rounded-full text-[10px] uppercase tracking-wide hover:opacity-80 transition-opacity ${
        p === 'complementary' ? 'bg-muted text-muted-foreground border-0' : ''
      }`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCycle(); }}
    >
      {label}
    </Badge>
  );
}

function cyclePriority(current?: Priority): Priority {
  const order: Priority[] = ['core', 'strategic', 'complementary'];
  const idx = order.indexOf(current || 'core');
  return order[(idx + 1) % order.length];
}

/* ─── Pricing row type (shared) ─── */
type PricingRow = { family: string; subcategories: { name: string; minPrice: number; maxPrice: number; rationale?: string }[] };

/* ─── Content Components ─── */

function FamiliesContent({ mode, data, onChange, collectionContext, pricingData, onPricingChange }: {
  mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  collectionContext: Record<string, string>;
  pricingData?: PricingRow[]; onPricingChange?: (rows: PricingRow[]) => void;
}) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const families = (data.families as Family[]) || [];
  const pricing = pricingData || [];

  const addFamily = () => onChange({ ...data, families: [...families, { name: '', subcategories: [''], priority: 'core' as Priority }] });
  const cycleFamilyPriority = (i: number) => {
    const updated = [...families];
    updated[i] = { ...updated[i], priority: cyclePriority(updated[i].priority) };
    onChange({ ...data, families: updated });
  };
  const removeFamily = (i: number) => onChange({ ...data, families: families.filter((_, j) => j !== i) });
  const updateFamilyName = (i: number, name: string) => {
    const updated = [...families];
    updated[i] = { ...updated[i], name };
    onChange({ ...data, families: updated });
  };
  const addSubcategory = (i: number) => {
    const updated = [...families];
    updated[i] = { ...updated[i], subcategories: [...updated[i].subcategories, ''] };
    onChange({ ...data, families: updated });
  };
  const updateSubcategory = (fi: number, si: number, val: string) => {
    const updated = [...families];
    const subs = [...updated[fi].subcategories];
    subs[si] = val;
    updated[fi] = { ...updated[fi], subcategories: subs };
    onChange({ ...data, families: updated });
  };
  const removeSubcategory = (fi: number, si: number) => {
    const updated = [...families];
    updated[fi] = { ...updated[fi], subcategories: updated[fi].subcategories.filter((_, j) => j !== si) };
    onChange({ ...data, families: updated });
  };

  /* ── Pricing helpers ── */
  const getPrice = (famName: string, subName: string) => {
    const fam = pricing.find(p => p.family === famName);
    const sub = fam?.subcategories.find(s => s.name === subName);
    return { min: sub?.minPrice || 0, max: sub?.maxPrice || 0 };
  };
  const setPrice = (famName: string, subName: string, field: 'minPrice' | 'maxPrice', val: number) => {
    if (!onPricingChange) return;
    let updated = [...pricing];
    let famIdx = updated.findIndex(p => p.family === famName);
    if (famIdx < 0) { updated.push({ family: famName, subcategories: [{ name: subName, minPrice: 0, maxPrice: 0 }] }); famIdx = updated.length - 1; }
    let subIdx = updated[famIdx].subcategories.findIndex(s => s.name === subName);
    if (subIdx < 0) { updated[famIdx].subcategories.push({ name: subName, minPrice: 0, maxPrice: 0 }); subIdx = updated[famIdx].subcategories.length - 1; }
    const subs = [...updated[famIdx].subcategories];
    subs[subIdx] = { ...subs[subIdx], [field]: val };
    updated[famIdx] = { ...updated[famIdx], subcategories: subs };
    onPricingChange(updated);
  };

  /* ── Shared family card grid — ALWAYS 4 cols like dashboard ── */
  const FamilyCardGrid = () => (
    <>
      <div className="grid grid-cols-4 gap-5">
        {families.map((fam, fi) => (
          <div
            key={fi}
            className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
          >
            {/* Family name — THE title */}
            <Input
              value={fam.name}
              onChange={(e) => updateFamilyName(fi, e.target.value)}
              placeholder={t.merchandising.familyNamePlaceholder}
              className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 h-auto mb-3 placeholder:text-carbon/10"
            />

            {/* Priority — subtle clickable text, not a loud badge */}
            <button
              onClick={() => cycleFamilyPriority(fi)}
              className="text-[11px] text-carbon/30 tracking-[0.05em] uppercase hover:text-carbon/50 transition-colors mb-8 text-left w-fit"
            >
              {t.merchandising[PRIORITY_KEYS[
                (['core', 'strategic', 'complementary'].includes(fam.priority || '') ? fam.priority : 'core') as Priority
              ] as keyof typeof t.merchandising] as string}
            </button>

            {/* Subcategories with pricing */}
            <div className="space-y-3 flex-1">
              {fam.subcategories.map((sub, si) => {
                const price = getPrice(fam.name, sub);
                return (
                  <div key={si} className="group/row">
                    <div className="flex items-center gap-2 mb-1">
                      <Input
                        value={sub}
                        onChange={(e) => updateSubcategory(fi, si, e.target.value)}
                        placeholder={t.merchandising.subcategoryPlaceholder}
                        className="flex-1 h-7 text-[14px] text-carbon/60 bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 placeholder:text-carbon/15"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeSubcategory(fi, si)} className="rounded-full h-5 w-5 text-carbon/15 hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                    {onPricingChange && (
                      <div className="flex items-center gap-2 ml-0">
                        <div className="flex items-center bg-carbon/[0.03] rounded-full px-3 py-1 gap-1.5">
                          <span className="text-[10px] text-carbon/25 font-medium uppercase tracking-wider">min</span>
                          <Input
                            type="number"
                            value={price.min || ''}
                            onChange={(e) => setPrice(fam.name, sub, 'minPrice', Number(e.target.value))}
                            className="w-[48px] h-5 text-[13px] text-carbon font-medium text-center bg-transparent border-0 shadow-none focus-visible:ring-0 p-0"
                            placeholder="—"
                          />
                          <span className="text-[10px] text-carbon/20">€</span>
                        </div>
                        <div className="w-3 h-px bg-carbon/10" />
                        <div className="flex items-center bg-carbon/[0.03] rounded-full px-3 py-1 gap-1.5">
                          <span className="text-[10px] text-carbon/25 font-medium uppercase tracking-wider">max</span>
                          <Input
                            type="number"
                            value={price.max || ''}
                            onChange={(e) => setPrice(fam.name, sub, 'maxPrice', Number(e.target.value))}
                            className="w-[48px] h-5 text-[13px] text-carbon font-medium text-center bg-transparent border-0 shadow-none focus-visible:ring-0 p-0"
                            placeholder="—"
                          />
                          <span className="text-[10px] text-carbon/20">€</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <Button variant="ghost" onClick={() => addSubcategory(fi)} className="rounded-full h-7 text-[12px] text-carbon/20 hover:text-carbon/40 px-0">
                <Plus className="h-3 w-3 mr-1" /> {t.merchandising.addSubcategory}
              </Button>
            </div>

            {/* Delete — bottom right, only on hover */}
            <div className="flex justify-end mt-4">
              <Button variant="ghost" size="icon" onClick={() => removeFamily(fi)} className="rounded-full h-8 w-8 text-carbon/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" onClick={addFamily} className="w-full rounded-full border-dashed text-muted-foreground">
        <Plus className="h-3.5 w-3.5 mr-2" /> {t.merchandising.addFamily}
      </Button>
    </>
  );

  return (
    <div className="space-y-5">
      {/* ═══ ASSISTED — direction input + generate ═══ */}
      {mode === 'assisted' && (
        <Card className="rounded-[20px]">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[14px]">{t.merchandising.direction}</Label>
              <Textarea
                value={(data.direction as string) || ''}
                onChange={(e) => onChange({ ...data, direction: e.target.value })}
                placeholder={t.merchandising.directionFamiliesPlaceholder}
                className="min-h-24 rounded-[12px] bg-carbon/[0.03] border-carbon/[0.06] focus:border-carbon/20 resize-none leading-relaxed"
              />
            </div>
            <Button
              onClick={async () => {
                setGenerating(true); setError(null);
                const { result, error: err } = await generateMerch('families-assisted', { direction: (data.direction as string) || '', ...collectionContext }, language);
                if (err) { setError(err); setGenerating(false); return; }
                const parsed = result as { families: Family[] };
                onChange({ ...data, families: parsed.families || [] });
                setGenerating(false);
              }}
              disabled={generating || !(data.direction as string)?.trim()}
              className="rounded-full"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
              {t.merchandising.suggestFamilies}
            </Button>
            {error && <p className="text-[13px] text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* ═══ AI — generate button (no families yet) ═══ */}
      {mode === 'ai' && !families.length && (
        <Card className="rounded-[20px]">
          <CardContent className="p-6 space-y-4">
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              {t.merchandising.aiProposalFamilies} <strong className="text-foreground">{t.merchandising.aiProposalFamiliesBold}</strong>.
            </p>
            <Button
              onClick={async () => {
                setGenerating(true); setError(null);
                const { result, error: err } = await generateMerch('families-proposals', { ...collectionContext }, language);
                if (err) { setError(err); setGenerating(false); return; }
                const parsed = result as { families: Family[] };
                onChange({ ...data, families: parsed.families || [] });
                setGenerating(false);
              }}
              disabled={generating}
              className="rounded-full"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
              {t.merchandising.proposeFamilies}
            </Button>
            {error && <p className="text-[13px] text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* ═══ AI — regenerate when results exist ═══ */}
      {mode === 'ai' && families.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={async () => {
              setGenerating(true); setError(null);
              const { result, error: err } = await generateMerch('families-proposals', { ...collectionContext }, language);
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { families: Family[] };
              onChange({ ...data, families: parsed.families || [] });
              setGenerating(false);
            }}
            disabled={generating}
            className="rounded-full"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
            {t.merchandising.regenerate}
          </Button>
        </div>
      )}

      {/* ═══ ALL MODES — same horizontal card grid ═══ */}
      {families.length > 0 && <FamilyCardGrid />}

      {/* Free mode — add button when no families yet */}
      {mode === 'free' && families.length === 0 && (
        <Button variant="outline" onClick={addFamily} className="w-full rounded-full border-dashed text-muted-foreground">
          <Plus className="h-3.5 w-3.5 mr-2" /> {t.merchandising.addFamily}
        </Button>
      )}
    </div>
  );
}

function PricingContent({ mode, data, onChange, collectionContext, familiesData }: {
  mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  collectionContext: Record<string, string>; familiesData: Family[];
}) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pricing = (data.pricing as PricingRow[]) || [];

  const familiesStr = familiesData.map(f => `${f.name}: ${f.subcategories.join(', ')}`).join(' | ');

  // Initialize pricing from families if empty
  const initPricing = () => {
    if (pricing.length === 0 && familiesData.length > 0) {
      onChange({ ...data, pricing: familiesData.map(f => ({ family: f.name, subcategories: f.subcategories.map(s => ({ name: s, minPrice: 0, maxPrice: 0 })) })) });
    }
  };

  useEffect(() => { if (mode === 'free') initPricing(); }, [mode, familiesData.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePrice = (fi: number, si: number, field: 'minPrice' | 'maxPrice', val: number) => {
    const updated = [...pricing];
    const subs = [...updated[fi].subcategories];
    subs[si] = { ...subs[si], [field]: val };
    updated[fi] = { ...updated[fi], subcategories: subs };
    onChange({ ...data, pricing: updated });
  };

  return (
    <div className="space-y-6">
      {mode === 'free' && (
        <div className="space-y-5">
          {pricing.map((fam, fi) => (
            <Card key={fi} className="rounded-[16px] overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle className="text-[15px] tracking-[-0.02em]">{fam.family}</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-2">
                  {fam.subcategories.map((sub, si) => (
                    <div key={si} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <span className="text-[14px] text-foreground/60 flex-1 min-w-0 truncate">{sub.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Label className="text-[11px] text-muted-foreground">Min</Label>
                        <Input
                          type="number"
                          value={sub.minPrice || ''}
                          onChange={(e) => updatePrice(fi, si, 'minPrice', Number(e.target.value))}
                          className="w-20 h-8 rounded-lg text-sm text-center"
                          placeholder="€"
                        />
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Label className="text-[11px] text-muted-foreground">Max</Label>
                        <Input
                          type="number"
                          value={sub.maxPrice || ''}
                          onChange={(e) => updatePrice(fi, si, 'maxPrice', Number(e.target.value))}
                          className="w-20 h-8 rounded-lg text-sm text-center"
                          placeholder="€"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {pricing.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-[14px]">
              {t.merchandising.validateFamiliesFirst}
            </div>
          )}
        </div>
      )}

      {(mode === 'assisted' || mode === 'ai') && (
        <div className="space-y-4">
          {mode === 'ai' && !pricing.length && (
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              {t.merchandising.aiProposalPricing} <strong className="text-foreground">{t.merchandising.aiProposalPricingBold}</strong>.
            </p>
          )}
          {mode === 'assisted' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[14px]">{t.merchandising.pricingDirection}</Label>
                <Textarea
                  value={(data.direction as string) || ''}
                  onChange={(e) => onChange({ ...data, direction: e.target.value })}
                  placeholder={t.merchandising.pricingDirectionPlaceholder}
                  className="min-h-24 rounded-[12px] bg-carbon/[0.03] border-carbon/[0.06] focus:border-carbon/20 resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <Label className="text-[14px]">{t.merchandising.referenceBrands}</Label>
                  <Badge variant="outline" className="text-[10px] font-normal">{t.merchandising.optional}</Badge>
                </div>
                <Input
                  value={(data.referenceBrands as string) || ''}
                  onChange={(e) => onChange({ ...data, referenceBrands: e.target.value })}
                  placeholder={t.merchandising.referenceBrandsPlaceholder}
                  className="rounded-lg"
                />
                <p className="text-[12px] text-muted-foreground">{t.merchandising.referenceBrandsHint}</p>
              </div>
            </div>
          )}
          <Button
            onClick={async () => {
              setGenerating(true); setError(null);
              const apiType = mode === 'assisted' ? 'pricing-assisted' : 'pricing-proposals';
              const { result, error: err } = await generateMerch(apiType, {
                families: familiesStr,
                direction: (data.direction as string) || '',
                referenceBrands: (data.referenceBrands as string) || '',
                ...collectionContext,
              }, language);
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { pricing: PricingRow[]; pricingThesis?: string };
              onChange({ ...data, pricing: parsed.pricing || [], pricingThesis: parsed.pricingThesis || '' });
              setGenerating(false);
            }}
            disabled={generating || (mode === 'assisted' && !(data.direction as string)?.trim())}
            className="rounded-full"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
            {mode === 'assisted' ? t.merchandising.suggestPricing : t.merchandising.generatePricingMatrix}
          </Button>
          {error && <p className="text-[13px] text-destructive">{error}</p>}

          {/* Show editable result */}
          {pricing.length > 0 && (
            <div className="space-y-4 pt-2">
              {/* Pricing Thesis */}
              {(data.pricingThesis as string) && (
                <Card className="rounded-[16px] bg-muted/30">
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2 text-[10px]">{t.merchandising.pricingThesisLabel}</Badge>
                    <p className="text-[14px] text-muted-foreground leading-relaxed italic">{data.pricingThesis as string}</p>
                  </CardContent>
                </Card>
              )}
              {pricing.map((fam, fi) => (
                <Card key={fi} className="rounded-[16px] overflow-hidden">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-[15px] tracking-[-0.02em]">{fam.family}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="space-y-2">
                      {fam.subcategories.map((sub, si) => (
                        <div key={si} className="py-2 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-[14px] text-foreground/60 flex-1 min-w-0 truncate" title={sub.name}>{sub.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Label className="text-[11px] text-muted-foreground">Min</Label>
                              <Input type="number" value={sub.minPrice || ''} onChange={(e) => updatePrice(fi, si, 'minPrice', Number(e.target.value))} className="w-20 h-8 rounded-lg text-sm text-center" placeholder="€" />
                            </div>
                            <Separator orientation="vertical" className="h-4" />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Label className="text-[11px] text-muted-foreground">Max</Label>
                              <Input type="number" value={sub.maxPrice || ''} onChange={(e) => updatePrice(fi, si, 'maxPrice', Number(e.target.value))} className="w-20 h-8 rounded-lg text-sm text-center" placeholder="€" />
                            </div>
                          </div>
                          {sub.rationale && <p className="text-[12px] text-muted-foreground italic mt-1">{sub.rationale}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChannelsContent({ mode, data, onChange, collectionContext }: {
  mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  collectionContext: Record<string, string>;
}) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  type ChannelConfig = { enabled: boolean; digital: boolean; physical: boolean };
  const dtc: ChannelConfig = (data.dtc as ChannelConfig) || { enabled: false, digital: false, physical: false };
  const wholesale: ChannelConfig = (data.wholesale as ChannelConfig) || { enabled: false, digital: false, physical: false };
  const toggleMarketSelection = (idx: number) => {
    const updated = [...markets];
    updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
    onChange({ ...data, markets: updated });
  };

  // Legacy compat: migrate old string[] channels to new structure
  const legacyChannels = (data.channels as string[]) || [];
  if (legacyChannels.length > 0 && !data.dtc && !data.wholesale) {
    const hasDtc = legacyChannels.includes('DTC');
    const hasWholesale = legacyChannels.includes('Wholesale');
    if (hasDtc || hasWholesale) {
      onChange({
        ...data,
        dtc: { enabled: hasDtc, digital: hasDtc, physical: false },
        wholesale: { enabled: hasWholesale, digital: hasWholesale, physical: false },
        channels: [],
      });
    }
  }
  type EntryPoint = { label: string; detail: string };
  type Market = { name: string; region: string; opportunity: string; rationale: string; entryStrategy?: string; entryPoints?: EntryPoint[]; selected?: boolean };
  const markets = (data.markets as Market[]) || [];

  const toggleDtc = () => {
    const next = !dtc.enabled;
    onChange({ ...data, dtc: { enabled: next, digital: next, physical: false } });
  };
  const toggleWholesale = () => {
    const next = !wholesale.enabled;
    onChange({ ...data, wholesale: { enabled: next, digital: next, physical: false } });
  };
  const toggleSub = (channel: 'dtc' | 'wholesale', sub: 'digital' | 'physical') => {
    const current = channel === 'dtc' ? dtc : wholesale;
    const updated = { ...current, [sub]: !current[sub] };
    onChange({ ...data, [channel]: updated });
  };

  // Build channels string for API
  const channelsSummary = [
    dtc.enabled ? `DTC (${[dtc.digital ? 'Digital' : '', dtc.physical ? 'Physical' : ''].filter(Boolean).join(' + ') || 'TBD'})` : '',
    wholesale.enabled ? `Wholesale (${[wholesale.digital ? 'Digital' : '', wholesale.physical ? 'Physical' : ''].filter(Boolean).join(' + ') || 'TBD'})` : '',
  ].filter(Boolean).join(', ');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ── Left card: Channel selection ── */}
      <DecisionCard title={t.merchandising.distributionChannels}>
        <div className="space-y-4">
          {/* DTC */}
          <Card className={`rounded-[16px] transition-all ${dtc.enabled ? 'border-primary/20 bg-primary/[0.02]' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dtc-switch" className="text-[15px] font-medium cursor-pointer">Direct to Consumer</Label>
                <Switch id="dtc-switch" checked={dtc.enabled} onCheckedChange={toggleDtc} />
              </div>
              {dtc.enabled && (
                <div className="flex gap-2 mt-4">
                  <Toggle
                    pressed={dtc.digital}
                    onPressedChange={() => toggleSub('dtc', 'digital')}
                    className="rounded-full px-4 h-8 text-[12px] font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {t.merchandising.digital}
                  </Toggle>
                  <Toggle
                    pressed={dtc.physical}
                    onPressedChange={() => toggleSub('dtc', 'physical')}
                    className="rounded-full px-4 h-8 text-[12px] font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {t.merchandising.physical}
                  </Toggle>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wholesale */}
          <Card className={`rounded-[16px] transition-all ${wholesale.enabled ? 'border-primary/20 bg-primary/[0.02]' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="ws-switch" className="text-[15px] font-medium cursor-pointer">Wholesale</Label>
                <Switch id="ws-switch" checked={wholesale.enabled} onCheckedChange={toggleWholesale} />
              </div>
              {wholesale.enabled && (
                <div className="flex gap-2 mt-4">
                  <Toggle
                    pressed={wholesale.digital}
                    onPressedChange={() => toggleSub('wholesale', 'digital')}
                    className="rounded-full px-4 h-8 text-[12px] font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {t.merchandising.digital}
                  </Toggle>
                  <Toggle
                    pressed={wholesale.physical}
                    onPressedChange={() => toggleSub('wholesale', 'physical')}
                    className="rounded-full px-4 h-8 text-[12px] font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {t.merchandising.physical}
                  </Toggle>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DecisionCard>

      {/* ── Right card: Markets ── */}
      <DecisionCard title={t.merchandising.targetMarkets}>
        {mode === 'free' && (
          <div className="space-y-3">
            {markets.map((mk, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={mk.name}
                  onChange={(e) => { const u = [...markets]; u[i] = { ...u[i], name: e.target.value }; onChange({ ...data, markets: u }); }}
                  placeholder={t.merchandising.marketNamePlaceholder}
                  className="flex-1 rounded-[12px] h-11"
                />
                <Input
                  value={mk.region}
                  onChange={(e) => { const u = [...markets]; u[i] = { ...u[i], region: e.target.value }; onChange({ ...data, markets: u }); }}
                  placeholder={t.merchandising.regionPlaceholder}
                  className="w-32 rounded-[12px] h-11"
                />
                <Button
                  variant="ghost" size="icon"
                  onClick={() => onChange({ ...data, markets: markets.filter((_, j) => j !== i) })}
                  className="rounded-full h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => onChange({ ...data, markets: [...markets, { name: '', region: '', opportunity: 'medium', rationale: '' }] })}
              className="rounded-full border-dashed text-muted-foreground"
            >
              <Plus className="h-3 w-3 mr-2" /> {t.merchandising.addMarket}
            </Button>
          </div>
        )}

        {(mode === 'assisted' || mode === 'ai') && (
          <div className="space-y-4">
            {mode === 'assisted' && (
              <Textarea
                value={(data.direction as string) || ''}
                onChange={(e) => onChange({ ...data, direction: e.target.value })}
                placeholder={t.merchandising.marketDirectionPlaceholder}
                className="min-h-24 rounded-[12px] bg-carbon/[0.03] border-carbon/[0.06] focus:border-carbon/20 resize-none leading-relaxed"
              />
            )}
            <Button
              onClick={async () => {
                setGenerating(true); setError(null);
                const apiType = mode === 'assisted' ? 'channels-assisted' : 'channels-proposals';
                const { result, error: err } = await generateMerch(apiType, { direction: (data.direction as string) || '', channelConfig: channelsSummary, ...collectionContext }, language);
                if (err) { setError(err); setGenerating(false); return; }
                const parsed = result as { markets: Market[] };
                const marketsWithSelection = (parsed.markets || []).map(mk => ({ ...mk, selected: true }));
                onChange({ ...data, markets: marketsWithSelection });
                setGenerating(false);
              }}
              disabled={generating || (mode === 'assisted' && !(data.direction as string)?.trim())}
              className="rounded-full"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
              {mode === 'assisted' ? t.merchandising.suggestMarkets : t.merchandising.recommendMarkets}
            </Button>
            {error && <p className="text-[13px] text-destructive">{error}</p>}
            {markets.length > 0 && (
              <div className="space-y-3 pt-2">
                {markets.map((mk, i) => (
                  <Card
                    key={i}
                    onClick={() => toggleMarketSelection(i)}
                    className={`rounded-[16px] cursor-pointer transition-all ${mk.selected !== false ? 'border-primary/20 bg-card' : 'opacity-40'}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Switch checked={mk.selected !== false} onCheckedChange={() => toggleMarketSelection(i)} className="scale-75" />
                        <span className="text-[14px] font-medium">{mk.name}</span>
                        <Badge variant="outline" className="ml-auto rounded-full text-[10px]">{mk.region}</Badge>
                      </div>
                      {mk.rationale && <p className="text-[12px] text-muted-foreground leading-relaxed ml-10">{mk.rationale}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DecisionCard>
    </div>
  );
}

function BudgetContent({ mode, data, onChange, collectionContext, familiesStr, pricingStr, channelsStr }: {
  mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  collectionContext: Record<string, string>; familiesStr: string; pricingStr: string; channelsStr: string;
}) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type Seg = { name: string; percentage: number };
  const typeSeg = (data.typeSegmentation as Seg[]) || [{ name: 'Revenue', percentage: 60 }, { name: 'Image', percentage: 20 }, { name: 'Entry', percentage: 20 }];
  const newnessSeg = (data.newnessSegmentation as Seg[]) || [{ name: 'Newness', percentage: 70 }, { name: 'Carry-Over', percentage: 30 }];

  const kpiCards = [
    { key: 'salesTarget', label: t.merchandising.salesTarget, prefix: '€', suffix: '', format: (v: number) => v ? v.toLocaleString() : '—' },
    { key: 'targetMargin', label: t.merchandising.targetMargin, prefix: '', suffix: '%', format: (v: number) => v ? String(v) : '—' },
    { key: 'avgDiscount', label: t.merchandising.avgDiscount, prefix: '', suffix: '%', format: (v: number) => v ? String(v) : '—' },
    { key: 'sellThroughMonths', label: t.merchandising.sellThroughMonths, prefix: '', suffix: 'mo', format: (v: number) => v ? String(v) : '—' },
  ];

  /* ── KPI Card — reusable mini card with big number ── */
  const KpiCard = ({ kpi }: { kpi: typeof kpiCards[0] }) => {
    const val = (data[kpi.key] as number) || 0;
    return (
      <Card className="rounded-[20px] border-0 shadow-none">
        <CardContent className="p-6 md:p-8 flex flex-col">
          <Label className="text-[13px] text-carbon/40 mb-4">{kpi.label}</Label>
          <div className="flex items-baseline gap-1 mb-4">
            {kpi.prefix && <span className="text-[24px] font-medium text-carbon/30">{kpi.prefix}</span>}
            <Input
              type="number"
              value={val || ''}
              onChange={(e) => onChange({ ...data, [kpi.key]: Number(e.target.value) })}
              placeholder="0"
              className="text-[42px] font-bold text-carbon tracking-[-0.04em] bg-transparent border-none shadow-none focus-visible:ring-0 p-0 h-auto w-full placeholder:text-carbon/10"
            />
            {kpi.suffix && <span className="text-[24px] font-medium text-carbon/30 shrink-0">{kpi.suffix}</span>}
          </div>
        </CardContent>
      </Card>
    );
  };

  /* ── Segmentation row ── */
  const SegRow = ({ label, segs, dataKey }: { label: string; segs: Seg[]; dataKey: string }) => (
    <div className="flex items-center gap-4">
      <span className="text-[12px] text-carbon/30 shrink-0 w-20">{label}</span>
      {segs.map((s, i) => (
        <div key={s.name} className="flex items-center gap-1.5">
          <span className="text-[13px] text-carbon/50">{s.name}</span>
          <Input type="number" value={s.percentage}
            onChange={(e) => { const u = [...segs]; u[i] = { ...u[i], percentage: Number(e.target.value) }; onChange({ ...data, [dataKey]: u }); }}
            className="w-12 px-2 py-1 text-[13px] text-carbon text-center bg-carbon/[0.03] rounded-[8px] border-carbon/[0.06] h-auto" />
          <span className="text-[12px] text-carbon/30">%</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ═══ FREE — 4 KPI cards in a row (like sub-block cards) ═══ */}
      {mode === 'free' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {kpiCards.map(kpi => {
              const val = (data[kpi.key] as number) || 0;
              const isEmpty = !val;
              return (
                <Card key={kpi.key} className="rounded-[20px] border-0 shadow-none min-h-[300px]">
                  <CardContent className="p-8 flex flex-col h-full">
                    <h3 className="text-[20px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-2">
                      {kpi.label}
                    </h3>
                    <p className="text-[13px] text-carbon/30">
                      {kpi.key === 'salesTarget' && 'Total revenue target for this collection'}
                      {kpi.key === 'targetMargin' && 'Gross margin percentage goal'}
                      {kpi.key === 'avgDiscount' && 'Average markdown expected'}
                      {kpi.key === 'sellThroughMonths' && 'Time to sell full inventory'}
                    </p>
                    <div className="mt-auto">
                      <div className="flex items-end">
                        <Input
                          type="number"
                          value={val || ''}
                          onChange={(e) => onChange({ ...data, [kpi.key]: Number(e.target.value) })}
                          placeholder="—"
                          className="text-[56px] font-bold text-carbon tracking-[-0.04em] bg-transparent border-none shadow-none focus-visible:ring-0 p-0 h-auto flex-1 min-w-0 placeholder:text-carbon/[0.08] leading-none"
                        />
                        <span className="text-[28px] font-semibold text-carbon/15 mb-[6px] ml-1 shrink-0">
                          {kpi.prefix || kpi.suffix}
                        </span>
                      </div>
                      {isEmpty && (
                        <div className="h-[2px] w-20 bg-carbon/10 rounded-full mt-2" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Segmentation — shadcn Slider + Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Product Type */}
            <Card className="rounded-[20px] border-0 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-[20px] font-semibold tracking-[-0.03em]">Product Type</CardTitle>
                <p className="text-[13px] text-muted-foreground">Drag to adjust the split</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Labels with big numbers */}
                <div className="flex items-center justify-between">
                  {typeSeg.map((s) => (
                    <div key={s.name} className="text-center">
                      <span className="text-[36px] font-bold text-foreground tracking-[-0.04em] leading-none">
                        {s.percentage}<span className="text-[16px] font-semibold text-muted-foreground/40 ml-0.5">%</span>
                      </span>
                      <p className="text-[12px] text-muted-foreground mt-1">{s.name}</p>
                    </div>
                  ))}
                </div>

                {/* shadcn Slider */}
                <Slider
                  value={[typeSeg[0].percentage]}
                  min={10} max={85} step={1}
                  onValueChange={([rev]) => {
                    const remaining = 100 - rev;
                    const ratio = typeSeg[1].percentage / Math.max(1, typeSeg[1].percentage + typeSeg[2].percentage);
                    const img = Math.max(5, Math.round(remaining * ratio));
                    const entry = Math.max(5, remaining - img);
                    onChange({ ...data, typeSegmentation: [
                      { name: 'Revenue', percentage: rev },
                      { name: 'Image', percentage: img },
                      { name: 'Entry', percentage: entry },
                    ]});
                  }}
                  className="[&_[data-slot=slider-track]]:h-3 [&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-2"
                />

                {/* Stacked bar visualization */}
                <div className="h-[8px] rounded-full overflow-hidden flex">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${typeSeg[0].percentage}%` }} />
                  <div className="h-full bg-primary/40 transition-all duration-300" style={{ width: `${typeSeg[1].percentage}%` }} />
                  <div className="h-full bg-primary/15 transition-all duration-300" style={{ width: `${typeSeg[2].percentage}%` }} />
                </div>
              </CardContent>
            </Card>

            {/* Newness Split */}
            <Card className="rounded-[20px] border-0 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-[20px] font-semibold tracking-[-0.03em]">Newness Split</CardTitle>
                <p className="text-[13px] text-muted-foreground">Drag to adjust the split</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Labels with big numbers */}
                <div className="flex items-center justify-between">
                  {newnessSeg.map((s) => (
                    <div key={s.name} className="text-center">
                      <span className="text-[36px] font-bold text-foreground tracking-[-0.04em] leading-none">
                        {s.percentage}<span className="text-[16px] font-semibold text-muted-foreground/40 ml-0.5">%</span>
                      </span>
                      <p className="text-[12px] text-muted-foreground mt-1">{s.name}</p>
                    </div>
                  ))}
                </div>

                {/* shadcn Slider */}
                <Slider
                  value={[newnessSeg[0].percentage]}
                  min={10} max={90} step={1}
                  onValueChange={([val]) => {
                    onChange({ ...data, newnessSegmentation: [
                      { name: 'Newness', percentage: val },
                      { name: 'Carry-Over', percentage: 100 - val },
                    ]});
                  }}
                  className="[&_[data-slot=slider-track]]:h-3 [&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-2"
                />

                {/* Stacked bar visualization */}
                <div className="h-[8px] rounded-full overflow-hidden flex">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${newnessSeg[0].percentage}%` }} />
                  <div className="h-full bg-primary/20 transition-all duration-300" style={{ width: `${newnessSeg[1].percentage}%` }} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {(mode === 'assisted' || mode === 'ai') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* ── Left: 2×2 KPI cards + generate button ── */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {kpiCards.map(kpi => (
                <Card key={kpi.key} className="rounded-[20px] border-0 shadow-none min-h-[160px]">
                  <CardContent className="p-6 flex flex-col h-full">
                    <Label className="text-[15px] font-semibold tracking-[-0.02em] mb-auto">{kpi.label}</Label>
                    <div className="flex items-end mt-4">
                      <Input
                        type="number"
                        value={(data[kpi.key] as number) || ''}
                        onChange={(e) => onChange({ ...data, [kpi.key]: Number(e.target.value) })}
                        placeholder="—"
                        className="text-[36px] font-bold tracking-[-0.04em] bg-transparent border-none shadow-none focus-visible:ring-0 p-0 h-auto leading-none placeholder:text-muted-foreground/10"
                      />
                      <span className="text-[20px] font-semibold text-muted-foreground/30 mb-[2px] ml-1 shrink-0">
                        {kpi.prefix || kpi.suffix}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Segmentation compact */}
            <div className="bg-white rounded-[20px] p-6 space-y-3">
              <SegRow label="Product" segs={(data.typeSegmentation as Seg[]) || typeSeg} dataKey="typeSegmentation" />
              <SegRow label="Newness" segs={(data.newnessSegmentation as Seg[]) || newnessSeg} dataKey="newnessSegmentation" />
            </div>
            <Button
              onClick={async () => {
                setGenerating(true); setError(null);
                const apiType = mode === 'assisted' ? 'budget-assisted' : 'budget-proposals';
                const { result, error: err } = await generateMerch(apiType, {
                  families: familiesStr, pricing: pricingStr, channels: channelsStr,
                  direction: (data.direction as string) || '', ...collectionContext,
                }, language);
                if (err) { setError(err); setGenerating(false); return; }
                const parsed = result as { salesTarget: number; targetMargin: number; avgDiscount: number; sellThroughMonths: number; segmentation: { type: Seg[]; newness: Seg[] }; rationale?: string; selectedModel?: string; selectedModelRef?: string; whyThisModel?: string; risks?: string[]; advantages?: string[]; fineTuning?: string };
                onChange({
                  ...data,
                  salesTarget: parsed.salesTarget, targetMargin: parsed.targetMargin,
                  avgDiscount: parsed.avgDiscount, sellThroughMonths: parsed.sellThroughMonths,
                  typeSegmentation: parsed.segmentation?.type || typeSeg,
                  newnessSegmentation: parsed.segmentation?.newness || newnessSeg,
                  rationale: parsed.rationale,
                  selectedModel: parsed.selectedModel, selectedModelRef: parsed.selectedModelRef,
                  whyThisModel: parsed.whyThisModel, risks: parsed.risks, advantages: parsed.advantages, fineTuning: parsed.fineTuning,
                });
                setGenerating(false);
              }}
              disabled={generating || (mode === 'assisted' && !(data.growthModel as string))}
              className="rounded-full"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
              {mode === 'assisted' ? t.merchandising.suggestBudget : t.merchandising.generateFinancialPlan}
            </Button>
            {error && <p className="text-[13px] text-destructive">{error}</p>}
          </div>

          {/* ── Right: Reference context ── */}
          <Card className="rounded-[20px] border-0 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[20px] font-semibold tracking-[-0.03em]">
                {mode === 'assisted' ? 'Growth Models' : 'Context'}
              </CardTitle>
              <p className="text-[13px] text-muted-foreground">
                {mode === 'assisted' ? 'Select a reference model' : 'Data used for AI proposal'}
              </p>
            </CardHeader>
            <CardContent className="space-y-2 flex-1 overflow-y-auto">
              {mode === 'assisted' && (
                <>
                  {[
                    { id: 'dtc-bootstrap', name: 'DTC-First Bootstrap', ref: 'Axel Arigato', revenue: '€100K–300K', mix: '80% DTC', margin: '65%' },
                    { id: 'wholesale-led', name: 'Wholesale-Led', ref: 'Jacquemus', revenue: '€200K–500K', mix: '60% WS', margin: '50%' },
                    { id: 'community-nordic', name: 'Community-Driven', ref: 'Holzweiler / Ganni', revenue: '€150K–400K', mix: '50/50', margin: '60%' },
                    { id: 'quiet-luxury', name: 'Quiet Luxury', ref: 'COS / The Row', revenue: '€300K–800K', mix: 'Controlled', margin: '70%' },
                    { id: 'collab-hype', name: 'Collab & Hype', ref: 'Aimé Leon Dore', revenue: '€200K–600K', mix: 'DTC+Collabs', margin: '60%' },
                    { id: 'digital-native', name: 'Digital Native', ref: 'Pangaia', revenue: '€150K–500K', mix: '90% Digital', margin: '65%' },
                    { id: 'accessible-premium', name: 'Accessible Premium', ref: 'Sandro / Maje', revenue: '€400K–1M', mix: 'Omni', margin: '55%' },
                    { id: 'artisan-craft', name: 'Artisan Craft', ref: 'HEREU / Loewe', revenue: '€80K–250K', mix: 'Selective', margin: '70%' },
                  ].map((s) => {
                    const sel = (data.growthModel as string) === s.id;
                    return (
                      <Card
                        key={s.id}
                        className={`rounded-[16px] cursor-pointer transition-all ${sel ? 'border-primary/30 bg-primary/[0.02]' : 'hover:border-primary/15'}`}
                        onClick={() => onChange({ ...data, growthModel: sel ? '' : s.id, direction: sel ? '' : `Growth model: ${s.name} (ref: ${s.ref}). Target: ${s.revenue}, mix: ${s.mix}, margin: ${s.margin}.` })}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[14px] font-medium ${sel ? 'text-foreground' : 'text-foreground/70'}`}>{s.name}</span>
                            <span className="text-[11px] text-muted-foreground italic">{s.ref}</span>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="rounded-full text-[10px] font-medium">{s.revenue}</Badge>
                            <Badge variant="outline" className="rounded-full text-[10px] font-medium">{s.margin}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}

              {mode === 'ai' && (
                <div className="space-y-3">
                  {[
                    { label: 'Families', value: familiesStr || 'Not defined yet' },
                    { label: 'Pricing', value: pricingStr ? `${JSON.parse(pricingStr).length || 0} families priced` : 'Not defined yet' },
                    { label: 'Channels', value: channelsStr || 'Not defined yet' },
                    { label: 'Consumer', value: collectionContext.consumer ? collectionContext.consumer.slice(0, 80) + '...' : 'Not defined yet' },
                    { label: 'Collection', value: `${collectionContext.collectionName} · ${collectionContext.season}` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[12px] bg-muted/50 p-4">
                      <Label className="text-[12px] text-muted-foreground block mb-1">{item.label}</Label>
                      <span className="text-[13px] text-foreground/70 leading-relaxed">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─── Content Router ─── */
function ExpandedCardContent({ cardId, mode, data, onChange, collectionContext, familiesData, familiesStr, pricingStr, channelsStr, pricingData, onPricingChange }: {
  cardId: string; mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  collectionContext: Record<string, string>; familiesData: Family[]; familiesStr: string; pricingStr: string; channelsStr: string;
  pricingData?: PricingRow[]; onPricingChange?: (rows: PricingRow[]) => void;
}) {
  switch (cardId) {
    case 'families': return <FamiliesContent mode={mode} data={data} onChange={onChange} collectionContext={collectionContext} pricingData={pricingData} onPricingChange={onPricingChange} />;
    case 'pricing': return <PricingContent mode={mode} data={data} onChange={onChange} collectionContext={collectionContext} familiesData={familiesData} />;
    case 'channels': return <ChannelsContent mode={mode} data={data} onChange={onChange} collectionContext={collectionContext} />;
    case 'budget': return <BudgetContent mode={mode} data={data} onChange={onChange} collectionContext={collectionContext} familiesStr={familiesStr} pricingStr={pricingStr} channelsStr={channelsStr} />;
    default: return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════ */

export default function MerchandisingPage({ blockParamOverride }: { blockParamOverride?: string | null }) {
  const { id } = useParams();
  const collectionId = id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const blockParam = blockParamOverride ?? searchParams?.get('block');
  const t = useTranslation();
  const { language } = useLanguage();
  const [expandedCard, setExpandedCard] = useState<string | null>(blockParam || null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [collectionContext, setCollectionContext] = useState<Record<string, string>>({ season: '', collectionName: '', consumer: '', vibe: '', brandDNA: '', productCategory: '' });

  // Persist card data to Supabase (auto-save with 1s debounce)
  const { data: persisted, save: persistData, loading: persistLoading } =
    useWorkspaceData<{ cardData: CardData }>(
      collectionId,
      'merchandising',
      { cardData: {} }
    );

  const cardData = persisted.cardData;

  const setCardData = useCallback((updater: CardData | ((prev: CardData) => CardData)) => {
    persistData((prev) => {
      const newCardData = typeof updater === 'function' ? updater(prev.cardData) : updater;
      return { ...prev, cardData: newCardData };
    });
  }, [persistData]);

  // Fetch collection context + creative block data for AI prompts
  useEffect(() => {
    const supabase = createClient();

    // Load collection name + season + product category (with SKU fallback)
    supabase.from('collection_plans').select('name, season, setup_data').eq('id', collectionId).single().then(async ({ data }) => {
      if (data) {
        const setupData = (data.setup_data || {}) as Record<string, unknown>;
        let category = (setupData.productCategory as string) || '';

        // Fallback: if no productCategory in setup_data, infer from existing SKUs
        if (!category) {
          const { data: skus } = await supabase.from('collection_skus').select('category').eq('collection_plan_id', collectionId).limit(1);
          if (skus?.[0]?.category) category = skus[0].category;
        }

        setCollectionContext(prev => ({
          ...prev,
          collectionName: data.name || '',
          season: data.season || '',
          productCategory: category,
        }));
      }
    });

    // Load Creative block data (consumer, vibe, brand DNA, trends)
    supabase.from('collection_workspace_data').select('data').eq('collection_plan_id', collectionId).eq('workspace', 'creative').single().then(({ data }) => {
      if (!data?.data) return;
      const creative = data.data as { blockData?: Record<string, { confirmed?: boolean; data?: Record<string, unknown> }> };
      const bd = creative.blockData || {};

      // Consumer — extract liked profiles
      const consumerProposals = (bd.consumer?.data?.proposals as Array<{ title: string; desc: string; status: string }>) || [];
      const likedConsumers = consumerProposals.filter(p => p.status === 'liked');
      const consumerText = likedConsumers.map(p => `${p.title}: ${p.desc}`).join('\n\n');

      // Vibe — title + narrative + keywords
      const vibeTitle = (bd.vibe?.data?.vibeTitle as string) || '';
      const vibeNarrative = (bd.vibe?.data?.vibe as string) || '';
      const vibeKeywords = (bd.vibe?.data?.keywords as string) || '';
      const vibeText = [vibeTitle, vibeNarrative, vibeKeywords ? `Keywords: ${vibeKeywords}` : ''].filter(Boolean).join('\n');

      // Brand DNA — name + colors + tone + typography + style
      const brand = bd['brand-dna']?.data || {};
      const brandParts = [
        brand.brandName ? `Brand: ${brand.brandName}` : '',
        (brand.colors as string[])?.length ? `Colors: ${(brand.colors as string[]).join(', ')}` : '',
        brand.tone ? `Tone: ${brand.tone}` : '',
        brand.typography ? `Typography: ${brand.typography}` : '',
        brand.style ? `Visual Identity: ${brand.style}` : '',
      ].filter(Boolean);
      const brandText = brandParts.join('\n');

      // Trends — selected results from all research blocks
      const trendParts: string[] = [];
      for (const blockId of ['global-trends', 'deep-dive', 'live-signals']) {
        const results = (bd[blockId]?.data?.results as Array<{ title: string; brands?: string; desc: string; selected?: boolean }>) || [];
        const selected = results.filter(r => r.selected);
        selected.forEach(r => {
          trendParts.push(`${r.title}${r.brands ? ` (${r.brands})` : ''}: ${r.desc}`);
        });
      }
      const trendsText = trendParts.join('\n\n');

      setCollectionContext(prev => ({
        ...prev,
        consumer: consumerText,
        vibe: vibeText,
        brandDNA: brandText,
        trends: trendsText,
      }));
    });
  }, [collectionId]);

  const getCardState = useCallback((cardId: string) => {
    return cardData[cardId] || { mode: 'free' as InputMode, confirmed: false, data: {} };
  }, [cardData]);

  const updateCardData = useCallback((cardId: string, updates: Partial<CardData[string]>) => {
    setCardData((prev) => {
      const current = prev[cardId] || { mode: 'free' as InputMode, confirmed: false, data: {} };
      return { ...prev, [cardId]: { ...current, ...updates } };
    });
  }, [setCardData]);

  const handleExpand = useCallback((cardId: string) => {
    setIsAnimating(true);
    setExpandedCard(cardId);
    setTimeout(() => setIsAnimating(false), 400);
  }, []);

  const handleCollapse = useCallback(() => {
    setIsAnimating(true);
    setExpandedCard(null);
    setTimeout(() => setIsAnimating(false), 400);
  }, []);

  const handleConfirm = useCallback((cardId: string) => {
    updateCardData(cardId, { confirmed: true });
    // Check if all cards will be validated after this confirmation
    const willAllBeValidated = MERCH_CARDS.every((c) =>
      c.id === cardId ? true : (cardData[c.id]?.confirmed ?? false)
    );
    if (willAllBeValidated) {
      setShowCelebration(true);
    }
    handleCollapse();
  }, [updateCardData, handleCollapse, cardData]);

  function isLocked(card: MerchCard): boolean {
    if (!card.lockedBy) return false;
    return !getCardState(card.lockedBy).confirmed;
  }

  const allValidated = MERCH_CARDS.every((c) => getCardState(c.id).confirmed);

  // Accumulated context from confirmed cards
  const familiesData = (cardData.families?.data?.families as Family[]) || [];
  const familiesStr = familiesData.map(f => `${f.name}: ${f.subcategories.join(', ')}`).join(' | ');
  const pricingStr = JSON.stringify(cardData.pricing?.data?.pricing || []);
  const chData = cardData.channels?.data || {};
  const dtcConf = chData.dtc as { enabled?: boolean; digital?: boolean; physical?: boolean } | undefined;
  const wsConf = chData.wholesale as { enabled?: boolean; digital?: boolean; physical?: boolean } | undefined;
  const channelParts = [
    dtcConf?.enabled ? `DTC (${[dtcConf.digital ? 'Digital' : '', dtcConf.physical ? 'Physical' : ''].filter(Boolean).join('+') || 'TBD'})` : '',
    wsConf?.enabled ? `Wholesale (${[wsConf.digital ? 'Digital' : '', wsConf.physical ? 'Physical' : ''].filter(Boolean).join('+') || 'TBD'})` : '',
  ].filter(Boolean);
  const channelsStr = (channelParts.length ? channelParts.join(', ') : (chData.channels as string[] || []).join(', ')) + ' | Markets: ' + ((chData.markets as Array<{ name: string }>) || []).map(m => m.name).join(', ');

  if (persistLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-carbon/30" />
      </div>
    );
  }

  /* ── Card name map for clean workspace header ── */
  const m = t.merchandising as Record<string, string>;
  const cardNameMap: Record<string, string> = {
    'families': m[language === 'es' ? 'productFamiliesEs' : 'productFamilies'] || 'Product Families & Pricing',
    'channels': m[language === 'es' ? 'channelsMarketsEs' : 'channelsMarkets'] || 'Channels & Markets',
    'budget': m[language === 'es' ? 'budgetFinancialsEs' : 'budgetFinancials'] || 'Budget & Financials',
  };

  /* ═══ CLEAN WORKSPACE VIEW (from sidebar with ?block= param) ═══ */
  if (blockParam && (blockParam === 'families' || blockParam === 'channels' || blockParam === 'budget')) {
    // For families, use families card state; for others, use their own
    const cardId = blockParam === 'families' ? 'families' : blockParam;
    const state = getCardState(cardId);
    // Also get pricing state for the merged families+pricing view
    const pricingState = getCardState('pricing');

    return (
      <div className="min-h-[80vh]">
        <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16">
          {/* Header — centered */}
          <div className="text-center mb-8">
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">
              {collectionContext.collectionName || 'Collection'}
            </p>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
              {cardNameMap[blockParam] || blockParam}
            </h1>
          </div>

          {/* Mode selector — centered below title */}
          <div className="mb-10 flex flex-col items-center gap-3">
            <SegmentedPill
              options={INPUT_MODE_IDS.map((modeId) => ({
                id: modeId,
                label: t.merchandising[INPUT_MODE_KEYS[modeId].label as keyof typeof t.merchandising] as string,
              }))}
              value={state.mode}
              onChange={(modeId) => {
                updateCardData(cardId, { mode: modeId });
                if (blockParam === 'families') updateCardData('pricing', { mode: modeId });
              }}
              size="md"
            />
            <p className="text-[13px] text-carbon/35 tracking-[-0.01em]">
              {t.merchandising[INPUT_MODE_KEYS[state.mode].desc as keyof typeof t.merchandising] as string}
            </p>
          </div>

          {/* Content — unified Families & Pricing (all modes use same grid) */}
          {blockParam === 'families' && (
            <div className="min-h-[calc((100vh-380px)*0.8)]">
              <FamiliesContent
                mode={state.mode}
                data={state.data}
                onChange={(newData) => updateCardData('families', { data: newData })}
                collectionContext={collectionContext}
                pricingData={(pricingState.data.pricing as PricingRow[]) || []}
                onPricingChange={(rows) => updateCardData('pricing', { data: { ...pricingState.data, pricing: rows } })}
              />
            </div>
          )}

          {blockParam === 'channels' && (
            <div className="max-w-[1100px] mx-auto min-h-[calc((100vh-380px)*0.8)]">
              <ChannelsContent
                mode={state.mode} data={state.data}
                onChange={(newData) => updateCardData('channels', { data: newData })}
                collectionContext={collectionContext}
              />
            </div>
          )}

          {blockParam === 'budget' && (
            <div className="min-h-[calc((100vh-380px)*0.8)]">
              <BudgetContent
                mode={state.mode} data={state.data}
                onChange={(newData) => updateCardData('budget', { data: newData })}
                collectionContext={collectionContext}
                familiesStr={familiesStr} pricingStr={pricingStr} channelsStr={channelsStr}
              />
            </div>
          )}

          {/* Confirm — centered */}
          <div className="mt-12 flex justify-center pt-8 border-t border-carbon/[0.06]">
            <Button
              variant={state.confirmed ? 'outline' : 'default'}
              onClick={() => {
                handleConfirm(cardId);
                if (blockParam === 'families') handleConfirm('pricing');
              }}
              className="rounded-full px-7"
            >
              <Check className="h-3.5 w-3.5 mr-2" />
              {state.confirmed ? 'Confirmed' : t.merchandising.validateContinue}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ LEGACY VIEW (direct access, no blockParam) ═══ */
  return (
    <div className="min-h-[80vh]">
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-10 pl-12 md:pl-0">
          <Button variant="ghost" onClick={() => router.push(`/collection/${id}`)} className="rounded-full text-[13px] font-medium text-muted-foreground mb-3 px-0 hover:bg-transparent hover:text-foreground">
            <ArrowLeft className="h-3 w-3 mr-2" /> {t.merchandising.overview}
          </Button>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
            {t.merchandising.title} <span className="italic">{t.merchandising.titleItalic}</span>
          </h2>
          <p className="text-xs sm:text-sm text-carbon/60 mt-2 max-w-lg">
            {t.merchandising.subtitle}
          </p>
        </div>

        {/* Validation Progress — pill stepper (matches Creative) */}
        <div className="flex items-center gap-0 mb-8 sm:mb-10 border border-carbon/[0.06] rounded-full w-fit overflow-x-auto max-w-full">
          {MERCH_CARDS.map((card, idx) => {
            const state = getCardState(card.id);
            const locked = isLocked(card);
            const isActive = expandedCard === card.id;
            return (
              <Button
                key={card.id}
                variant="ghost"
                onClick={() => { if (!locked && !expandedCard) setExpandedCard(card.id); }}
                disabled={locked || !!expandedCard}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase rounded-full transition-all ${
                  isActive
                    ? 'bg-carbon text-white hover:bg-carbon/90'
                    : state.confirmed
                      ? 'text-foreground/70'
                      : 'text-muted-foreground'
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center text-xs shrink-0 rounded-full ${
                  isActive ? 'bg-white/20' : state.confirmed ? 'bg-carbon text-white' : 'bg-carbon/[0.06]'
                }`}>
                  {state.confirmed ? <Check className="h-3 w-3" /> : locked ? <Lock className="h-2.5 w-2.5" /> : idx + 1}
                </span>
                <span className="whitespace-nowrap">{t.merchandising[(language === 'es' ? CARD_KEYS[card.id].nameEs : CARD_KEYS[card.id].name) as keyof typeof t.merchandising] as string}</span>
              </Button>
            );
          })}
        </div>

        <div className="relative">
          {/* ─── EXPANDED VIEW ─── */}
          {expandedCard && (
            <div className="flex gap-4">
              {/* Collapsed sidebar icons — hidden on mobile */}
              <div className="hidden sm:flex flex-col gap-3 pt-1 w-14 shrink-0">
                {MERCH_CARDS.map((card) => {
                  if (card.id === expandedCard) return null;
                  const Icon = card.icon;
                  const state = getCardState(card.id);
                  const locked = isLocked(card);
                  return (
                    <Button
                      key={card.id}
                      variant="outline"
                      size="icon"
                      onClick={() => { if (!locked) { handleCollapse(); setTimeout(() => handleExpand(card.id), 350); } }}
                      disabled={locked}
                      className={`group/icon relative w-12 h-12 rounded-[12px] transition-all duration-300 ${
                        locked ? 'bg-carbon/[0.02] border-carbon/[0.04]'
                        : state.confirmed ? 'bg-carbon/[0.04] border-carbon/[0.12]'
                        : 'bg-white border-carbon/[0.08] hover:border-carbon/20 hover:shadow-sm'
                      }`}
                      title={t.merchandising[(language === 'es' ? CARD_KEYS[card.id].nameEs : CARD_KEYS[card.id].name) as keyof typeof t.merchandising] as string}
                    >
                      {locked ? <Lock className="h-3.5 w-3.5 text-carbon/15" /> : state.confirmed ? <Check className="h-4 w-4 text-carbon/60" /> : <Icon className="h-4 w-4 text-carbon/35 group-hover/icon:text-carbon/60 transition-colors" />}
                      <div className="absolute left-full ml-3 px-3 py-1.5 bg-carbon text-white rounded-full text-xs tracking-wide whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none z-10">{t.merchandising[(language === 'es' ? CARD_KEYS[card.id].nameEs : CARD_KEYS[card.id].name) as keyof typeof t.merchandising] as string}</div>
                    </Button>
                  );
                })}
              </div>

              {/* Expanded content */}
              <div className="flex-1 bg-white border border-carbon/[0.06] rounded-[20px] overflow-visible flex flex-col" style={{ animation: 'expandIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards', minHeight: 'calc(100vh - 260px)' }}>
                {(() => {
                  const card = MERCH_CARDS.find((c) => c.id === expandedCard);
                  if (!card) return null;
                  const Icon = card.icon;
                  const state = getCardState(card.id);
                  return (
                    <div className="p-4 sm:p-6 md:p-8 flex flex-col h-full min-h-[inherit]">
                      <div className="flex items-start justify-between mb-6 sm:mb-8">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-carbon/[0.04] flex items-center justify-center"><Icon className="h-4 w-4 sm:h-5 sm:w-5 text-carbon/50" /></div>
                          <div>
                            <h3 className="text-lg sm:text-xl font-light text-carbon tracking-tight">{t.merchandising[(language === 'es' ? CARD_KEYS[card.id].nameEs : CARD_KEYS[card.id].name) as keyof typeof t.merchandising] as string}</h3>
                            <p className="text-[11px] sm:text-xs text-carbon/70 mt-0.5">{t.merchandising[CARD_KEYS[card.id].desc as keyof typeof t.merchandising] as string}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleCollapse} className="rounded-full w-9 h-9 text-muted-foreground"><X className="h-4 w-4" /></Button>
                      </div>

                      {/* Mode Pills — unified segmented control */}
                      <div className="mb-6 sm:mb-8">
                        <SegmentedPill
                          options={INPUT_MODE_IDS.map((modeId) => ({
                            id: modeId,
                            label: t.merchandising[INPUT_MODE_KEYS[modeId].label as keyof typeof t.merchandising] as string,
                          }))}
                          value={state.mode}
                          onChange={(modeId) => updateCardData(card.id, { mode: modeId })}
                          description={t.merchandising[INPUT_MODE_KEYS[state.mode].desc as keyof typeof t.merchandising] as string}
                          size="md"
                        />
                      </div>

                      <div className="flex-1">
                        <ExpandedCardContent
                          cardId={card.id} mode={state.mode} data={state.data}
                          onChange={(newData) => updateCardData(card.id, { data: newData })}
                          collectionContext={collectionContext} familiesData={familiesData}
                          familiesStr={familiesStr} pricingStr={pricingStr} channelsStr={channelsStr}
                          pricingData={(getCardState('pricing').data.pricing as PricingRow[]) || []}
                          onPricingChange={(rows) => updateCardData('pricing', { data: { ...getCardState('pricing').data, pricing: rows } })}
                        />
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 pt-6 border-t border-carbon/[0.06]">
                        <Button variant="ghost" onClick={handleCollapse} className="rounded-full text-[13px] text-muted-foreground">{t.merchandising.backToGrid}</Button>
                        <Button onClick={() => handleConfirm(card.id)} className="rounded-full px-8">
                          <Check className="h-3.5 w-3.5 mr-2" /> {t.merchandising.validateContinue}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ─── GRID VIEW (2x2) ─── */}
          {!expandedCard && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={isAnimating ? { animation: 'gridIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' } : undefined}>
              {MERCH_CARDS.map((card) => {
                const Icon = card.icon;
                const locked = isLocked(card);
                const state = getCardState(card.id);
                return (
                  <div
                    key={card.id}
                    onClick={() => { if (!locked) handleExpand(card.id); }}
                    className={`group relative bg-white rounded-[20px] p-5 sm:p-6 md:p-8 transition-all duration-300 overflow-hidden border shadow-sm flex flex-col ${
                      locked ? 'border-carbon/[0.04] opacity-50 cursor-not-allowed' : state.confirmed ? 'border-carbon/[0.12] bg-carbon/[0.01] cursor-pointer hover:shadow-md' : 'border-carbon/[0.06] cursor-pointer hover:shadow-md'
                    }`}
                  >
                    {state.confirmed && <div className="absolute top-0 left-0 right-0 h-[3px] bg-carbon" />}
                    {state.confirmed && <div className="absolute top-5 right-5 w-7 h-7 bg-carbon flex items-center justify-center"><Check className="h-3.5 w-3.5 text-crema" /></div>}
                    <div className="flex items-start justify-between mb-4 sm:mb-6">
                      <div>
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] flex items-center justify-center mb-3 sm:mb-4 ${locked ? 'bg-carbon/[0.02]' : 'bg-carbon/[0.04]'}`}>
                          {locked ? <Lock className="h-5 w-5 text-carbon/20" /> : <Icon className="h-5 w-5 text-carbon/50" />}
                        </div>
                        <h3 className="text-lg sm:text-xl font-light text-carbon tracking-tight">{t.merchandising[(language === 'es' ? CARD_KEYS[card.id].nameEs : CARD_KEYS[card.id].name) as keyof typeof t.merchandising] as string}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-carbon/70 leading-relaxed flex-1">{t.merchandising[CARD_KEYS[card.id].desc as keyof typeof t.merchandising] as string}</p>
                    {!locked && (
                      <div className="mt-4 sm:mt-6">
                        <SegmentedPill
                          preview
                          options={INPUT_MODE_IDS.map((modeId) => ({
                            id: modeId,
                            label: t.merchandising[INPUT_MODE_KEYS[modeId].label as keyof typeof t.merchandising] as string,
                          }))}
                          value={state.mode}
                          onChange={() => {}}
                        />
                      </div>
                    )}
                    <div className="mt-5 flex justify-center">
                    <div className={`inline-flex items-center justify-center gap-2 py-2.5 px-8 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-colors ${
                      locked ? 'bg-carbon/[0.04] text-carbon/20' : state.confirmed ? 'bg-carbon/[0.05] text-carbon/35' : 'bg-carbon text-crema group-hover:bg-carbon/90'
                    }`}>
                      {locked ? (<><Lock className="h-3 w-3" /> {t.merchandising.requires} {card.lockedBy ? t.merchandising[(language === 'es' ? CARD_KEYS[card.lockedBy].nameEs : CARD_KEYS[card.lockedBy].name) as keyof typeof t.merchandising] as string : ''}</>) :
                        state.confirmed ? (<>{t.merchandising.edit} <ArrowRight className="h-3.5 w-3.5" /></>) : Object.keys(state.data || {}).length > 0 ? (<>{t.merchandising.continueAction} <ArrowRight className="h-3.5 w-3.5" /></>) : (<>{t.merchandising.start} <ArrowRight className="h-3.5 w-3.5" /></>)}
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collection Builder CTA */}
        {!expandedCard && (
          <div className={`mt-6 sm:mt-8 p-4 sm:p-8 border rounded-[20px] transition-all ${allValidated ? 'bg-white border-carbon/[0.06] hover:shadow-lg cursor-pointer' : 'bg-carbon/[0.02] border-carbon/[0.04] cursor-not-allowed'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-5">
                <div className={`w-12 h-12 flex items-center justify-center ${allValidated ? 'bg-carbon/[0.04]' : 'bg-carbon/[0.02]'}`}>
                  {allValidated ? <LayoutGrid className="h-6 w-6 text-carbon/50" /> : <Lock className="h-5 w-5 text-carbon/15" />}
                </div>
                <div>
                  <h3 className={`text-lg sm:text-xl font-light tracking-tight ${allValidated ? 'text-carbon' : 'text-carbon/25'}`}>{t.merchandising.collectionBuilder}</h3>
                  <p className={`text-sm mt-1 ${allValidated ? 'text-carbon/60' : 'text-carbon/15'}`}>
                    {allValidated ? t.merchandising.allCardsValidated : t.merchandising.validateAllCards}
                  </p>
                </div>
              </div>
              {allValidated && (
                <Button onClick={() => router.push(`/collection/${id}/product`)} className="rounded-full">
                  {t.merchandising.openBuilder} <ArrowRight className="h-3.5 w-3.5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Celebration Overlay */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ animation: 'fadeIn 0.6s ease-out forwards' }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-carbon/95" style={{ animation: 'fadeIn 0.4s ease-out forwards' }} />

          {/* Content */}
          <div className="relative z-10 text-center px-6 max-w-2xl" style={{ animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}>
            <div className="w-16 h-16 mx-auto mb-8 border border-crema/20 flex items-center justify-center" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both' }}>
              <Check className="h-7 w-7 text-crema/80" />
            </div>

            <div className="text-[10px] font-medium tracking-[0.4em] uppercase text-crema/30 mb-4" style={{ animation: 'fadeIn 0.6s ease-out 0.8s both' }}>
              {collectionContext.collectionName} · {collectionContext.season}
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-crema tracking-tight leading-[1.1] mb-6" style={{ animation: 'fadeIn 0.6s ease-out 1s both' }}>
              {t.merchandising.celebrationTitle}<br /><span className="italic">{t.merchandising.celebrationTitleItalic}</span>.
            </h2>

            <p className="text-sm sm:text-base font-light text-crema/60 leading-relaxed max-w-lg mx-auto mb-4" style={{ animation: 'fadeIn 0.6s ease-out 1.3s both' }}>
              {t.merchandising.celebrationBody}
            </p>

            <p className="text-xs text-crema/30 italic mb-10" style={{ animation: 'fadeIn 0.6s ease-out 1.5s both' }}>
              {t.merchandising.celebrationQuote}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animation: 'fadeIn 0.6s ease-out 1.8s both' }}>
              <Button
                onClick={() => router.push(`/collection/${collectionId}/product`)}
                className="rounded-full px-8 py-3.5 bg-crema text-carbon hover:bg-white"
              >
                {t.merchandising.celebrationCta} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/collection/${collectionId}`)}
                className="rounded-full px-6 py-3 text-crema/50 border-crema/15 hover:text-crema/80 hover:border-crema/30 bg-transparent"
              >
                {t.merchandising.celebrationBack}
              </Button>
            </div>

            {/* Dismiss */}
            <Button
              variant="ghost"
              onClick={() => setShowCelebration(false)}
              className="mt-8 rounded-full text-[10px] tracking-[0.1em] uppercase text-crema/20 hover:text-crema/40 hover:bg-transparent"
            >
              {t.merchandising.celebrationDismiss}
            </Button>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes expandIn {
          0% { opacity: 0; transform: scale(0.92) translateY(-8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes gridIn {
          0% { opacity: 0; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
