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
import { ScenariosContent } from '@/components/merchandising/ScenariosContent';
import { AssortmentContent } from '@/components/merchandising/AssortmentContent';
import { DistributionContent } from '@/components/merchandising/DistributionContent';
import { FinancialPlanContentV2 } from '@/components/merchandising/FinancialPlanContentV2';
import { WholesaleOrdersCard } from '@/components/merchandising/WholesaleOrdersCard';
import { FinancialPlanContent } from '@/components/merchandising/FinancialPlanContent';
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
  collectionPlanId?: string,
): Promise<{ result: unknown; error?: string }> {
  const res = await fetch('/api/ai/merch-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, input, language, collectionPlanId }),
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

/* ─── Extract pricing from AI families response ─── */
type AIFamilyResponse = Family & { pricing?: { name: string; minPrice: number; maxPrice: number }[] };
function extractPricingFromFamilies(families: AIFamilyResponse[]): PricingRow[] {
  return families.filter(f => f.pricing?.length).map(f => ({
    family: f.name,
    subcategories: (f.pricing || []).map(p => ({ name: p.name, minPrice: p.minPrice, maxPrice: p.maxPrice })),
  }));
}

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

            {/* Subcategories with inline pricing */}
            <div className="space-y-1 flex-1">
              {fam.subcategories.map((sub, si) => {
                const price = getPrice(fam.name, sub);
                return (
                  <div key={si} className="group/row flex items-center gap-2 py-1">
                    <Input
                      value={sub}
                      onChange={(e) => updateSubcategory(fi, si, e.target.value)}
                      placeholder={t.merchandising.subcategoryPlaceholder}
                      className="flex-1 h-7 text-[14px] text-carbon/50 bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 placeholder:text-carbon/15"
                    />
                    {onPricingChange && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          value={price.min || ''}
                          onChange={(e) => setPrice(fam.name, sub, 'minPrice', Number(e.target.value))}
                          className="w-[52px] h-6 rounded-full text-[12px] text-carbon/60 text-center bg-carbon/[0.03] border-0 shadow-none focus-visible:ring-1 focus-visible:ring-carbon/10"
                          placeholder="min"
                        />
                        <span className="text-[10px] text-carbon/15">–</span>
                        <Input
                          type="number"
                          value={price.max || ''}
                          onChange={(e) => setPrice(fam.name, sub, 'maxPrice', Number(e.target.value))}
                          className="w-[52px] h-6 rounded-full text-[12px] text-carbon/60 text-center bg-carbon/[0.03] border-0 shadow-none focus-visible:ring-1 focus-visible:ring-carbon/10"
                          placeholder="max"
                        />
                        <span className="text-[10px] text-carbon/20">€</span>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => removeSubcategory(fi, si)} className="rounded-full h-5 w-5 text-carbon/15 hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                      <X className="h-2.5 w-2.5" />
                    </Button>
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
                const { result, error: err } = await generateMerch('families-assisted', { direction: (data.direction as string) || '', ...collectionContext }, language, collectionContext.collectionPlanId);
                if (err) { setError(err); setGenerating(false); return; }
                const parsed = result as { families: AIFamilyResponse[] };
                onChange({ ...data, families: parsed.families || [] });
                const pricingRows = extractPricingFromFamilies(parsed.families || []);
                if (pricingRows.length && onPricingChange) onPricingChange(pricingRows);
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
                const { result, error: err } = await generateMerch('families-proposals', { ...collectionContext }, language, collectionContext.collectionPlanId);
                if (err) { setError(err); setGenerating(false); return; }
                const parsed = result as { families: AIFamilyResponse[] };
                onChange({ ...data, families: parsed.families || [] });
                const pricingRows = extractPricingFromFamilies(parsed.families || []);
                if (pricingRows.length && onPricingChange) onPricingChange(pricingRows);
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
              const { result, error: err } = await generateMerch('families-proposals', { ...collectionContext }, language, collectionContext.collectionPlanId);
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { families: AIFamilyResponse[] };
              onChange({ ...data, families: parsed.families || [] });
              const pricingRows = extractPricingFromFamilies(parsed.families || []);
              if (pricingRows.length && onPricingChange) onPricingChange(pricingRows);
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
                        <Label className="text-[11px] text-muted-foreground">{(t.common as Record<string, string>).min || "Min"}</Label>
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
                        <Label className="text-[11px] text-muted-foreground">{(t.common as Record<string, string>).max || "Max"}</Label>
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
              }, language, collectionContext.collectionPlanId);
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
                              <Label className="text-[11px] text-muted-foreground">{(t.common as Record<string, string>).min || "Min"}</Label>
                              <Input type="number" value={sub.minPrice || ''} onChange={(e) => updatePrice(fi, si, 'minPrice', Number(e.target.value))} className="w-20 h-8 rounded-lg text-sm text-center" placeholder="€" />
                            </div>
                            <Separator orientation="vertical" className="h-4" />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Label className="text-[11px] text-muted-foreground">{(t.common as Record<string, string>).max || "Max"}</Label>
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
                <Label htmlFor="dtc-switch" className="text-[15px] font-medium cursor-pointer">{(t.merch as Record<string, string>)?.directToConsumer || "Direct to Consumer"}</Label>
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
                <Label htmlFor="ws-switch" className="text-[15px] font-medium cursor-pointer">{(t.merch as Record<string, string>)?.wholesale || "Wholesale"}</Label>
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
                const { result, error: err } = await generateMerch(apiType, { direction: (data.direction as string) || '', channelConfig: channelsSummary, ...collectionContext }, language, collectionContext.collectionPlanId);
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
    case 'budget': return (
      <FinancialPlanContent
        mode={mode}
        data={data as Parameters<typeof FinancialPlanContent>[0]['data']}
        onChange={(next) => onChange(next as Record<string, unknown>)}
        collectionContext={{
          collectionPlanId: (collectionContext.collectionPlanId as string) ?? '',
          productCategory: collectionContext.productCategory,
          collectionName: collectionContext.collectionName,
        }}
      />
    );
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

  // Kill the legacy hub: direct nav to /merchandising (no `?block=...`) or
  // /merchandising?block=merchandising used to land on the old 4-card overview
  // with the locked-card pill stepper, which is NOT gold-standard. The canonical
  // Block 2 hub lives at /collection/[id]?block=merchandising rendered by
  // CollectionOverview's sub-block grid. Sidebar mini-block links pass
  // ?block=scenarios|families|channels|budget so they bypass this redirect.
  //
  // 2026-05-21 cleanup: tightened to also catch the case where the
  // WorkspaceShell passes blockParamOverride=null explicitly. Any unknown
  // block value also redirects, so a typo in the URL doesn't surface the
  // dead legacy view.
  const CANONICAL_BLOCKS = new Set(['scenarios', 'families', 'channels', 'budget', 'wholesale']);
  useEffect(() => {
    if (!blockParam || !CANONICAL_BLOCKS.has(blockParam)) {
      router.replace(`/collection/${collectionId}?block=merchandising`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [collectionContext, setCollectionContext] = useState<Record<string, string>>({ season: '', collectionName: '', consumer: '', vibe: '', brandDNA: '', productCategory: '', collectionPlanId: collectionId });

  // Persist card data to Supabase (auto-save with 1s debounce)
  const { data: persisted, save: persistData, loading: persistLoading, loaded: persistLoaded } =
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

    // Load collection name + season + derived product category. The
    // category falls back through the merchandising workspace and SKU
    // categories inside the loader — we don't duplicate that logic here.
    Promise.all([
      supabase.from('collection_plans').select('name, season').eq('id', collectionId).single(),
      fetch(`/api/derived-setup-data?planId=${collectionId}`)
        .then(r => (r.ok ? r.json() : {}))
        .catch(() => ({})) as Promise<{ productCategory?: string }>,
    ]).then(([{ data }, derived]) => {
      if (!data) return;
      setCollectionContext(prev => ({
        ...prev,
        collectionName: data.name || '',
        season: data.season || '',
        productCategory: derived.productCategory || '',
      }));
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

  // No canonical block selected → the useEffect above already triggered a
  // redirect to /collection/{id}?block=merchandising. Return null so we
  // never flash the legacy 4-card overview that was retired.
  if (!blockParam || !CANONICAL_BLOCKS.has(blockParam)) return null;

  /* ── Card name map for clean workspace header ── */
  const m = t.merchandising as Record<string, string>;
  const sidebarT = (t.sidebar as Record<string, string>) || {};
  const cardNameMap: Record<string, string> = {
    'scenarios': sidebarT.buyingStrategy || 'Buying Strategy',
    'families': sidebarT.assortmentPricing || 'Assortment & Pricing',
    'channels': sidebarT.distribution || 'Distribution',
    'budget': sidebarT.financialPlan || 'Financial Plan',
  };

  /* ═══ CLEAN WORKSPACE VIEW (from sidebar with ?block= param) ═══ */
  if (blockParam === 'wholesale') {
    // Wholesale lives in Block 2 since Sprint 10 (was previously inside Marketing > Ecom).
    // It's B2B distribution, semantically belongs to Merchandising.
    return (
      <div className="min-h-[80vh]">
        <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16">
          <div className="text-center mb-8">
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">
              {collectionContext.collectionName || 'Collection'}
            </p>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
              Wholesale Orders
            </h1>
          </div>
          <div className="max-w-[1100px] mx-auto">
            <WholesaleOrdersCard collectionPlanId={collectionId} />
          </div>
        </div>
      </div>
    );
  }

  if (blockParam && (blockParam === 'scenarios' || blockParam === 'families' || blockParam === 'channels' || blockParam === 'budget')) {
    // Wait for workspace-data to finish loading before mounting mini-block
    // content. Otherwise auto-fetched state (e.g. ScenariosContent's archetypes)
    // gets overwritten by useWorkspaceData.load()'s setData(merged) when it
    // resolves later — silent state loss.
    if (!persistLoaded) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-carbon/20 border-t-carbon/60 rounded-full animate-spin" />
        </div>
      );
    }
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

          {/* Mode selector — Sprint B.1/B.2 dropped SegmentedPill for
              02.1 scenarios + 02.2 families; their canonical flows own
              their own UX. Other 02.x mini-blocks still show the pill
              until their B.x sprint lands. */}
          {blockParam !== 'scenarios' && blockParam !== 'families' && blockParam !== 'channels' && blockParam !== 'budget' && (
            <div className="mb-10 flex flex-col items-center gap-3">
              <SegmentedPill
                options={INPUT_MODE_IDS.map((modeId) => ({
                  id: modeId,
                  label: t.merchandising[INPUT_MODE_KEYS[modeId].label as keyof typeof t.merchandising] as string,
                }))}
                value={state.mode}
                onChange={(modeId) => {
                  updateCardData(cardId, { mode: modeId });
                  // 'families' is now handled by AssortmentContent, but keep this guard
                  // for the legacy direct-access path until the unified flow lands.
                  if ((blockParam as string) === 'families') updateCardData('pricing', { mode: modeId });
                }}
                size="md"
              />
              <p className="text-[13px] text-carbon/35 tracking-[-0.01em]">
                {t.merchandising[INPUT_MODE_KEYS[state.mode].desc as keyof typeof t.merchandising] as string}
              </p>
            </div>
          )}

          {/* Content — Scenarios (Estrategia de Compra · Sprint B.1 archetype-first) */}
          {blockParam === 'scenarios' && (
            <div className="min-h-[calc((100vh-380px)*0.8)]">
              <ScenariosContent
                data={state.data as Parameters<typeof ScenariosContent>[0]['data']}
                onChange={(newData) => updateCardData('scenarios', { data: newData as Record<string, unknown> })}
                onConfirmed={() => updateCardData('scenarios', { confirmed: true })}
                collectionContext={{ collectionPlanId: collectionId, productCategory: collectionContext.productCategory, collectionName: collectionContext.collectionName }}
                language={language}
                basePath={`/collection/${collectionId}/merchandising`}
              />
            </div>
          )}

          {/* Content — Sprint B.2 canonical Surtido & Precios */}
          {blockParam === 'families' && (
            <div className="min-h-[calc((100vh-380px)*0.8)]">
              <AssortmentContent
                collectionContext={{ collectionPlanId: collectionId, collectionName: collectionContext.collectionName }}
                language={language}
                basePath={`/collection/${collectionId}/merchandising`}
              />
            </div>
          )}

          {blockParam === 'channels' && (
            <div className="min-h-[calc((100vh-380px)*0.8)]">
              <DistributionContent
                collectionContext={{ collectionPlanId: collectionId, collectionName: collectionContext.collectionName }}
                language={language}
                basePath={`/collection/${collectionId}/merchandising`}
              />
            </div>
          )}

          {blockParam === 'budget' && (
            <div className="min-h-[calc((100vh-380px)*0.8)]">
              <FinancialPlanContentV2
                collectionContext={{ collectionPlanId: collectionId, collectionName: collectionContext.collectionName }}
                language={language}
                basePath={`/collection/${collectionId}/merchandising`}
              />
            </div>
          )}

          {/* Generic confirm bar — kept for 02.3/02.4 until their
              canonical B.x sprints land. 02.1 + 02.2 own their own
              canonical confirm bar via CanonicalActionBar inside their
              dedicated content components. */}
          {blockParam !== 'scenarios' && blockParam !== 'families' && blockParam !== 'channels' && blockParam !== 'budget' && (
            <div className="mt-12 flex justify-center pt-8 border-t border-carbon/[0.06]">
              <Button
                variant={state.confirmed ? 'outline' : 'default'}
                onClick={() => {
                  handleConfirm(cardId);
                  if ((blockParam as string) === 'families') handleConfirm('pricing');
                }}
                className="rounded-full px-7"
              >
                <Check className="h-3.5 w-3.5 mr-2" />
                {state.confirmed ? 'Confirmed' : t.merchandising.validateContinue}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Unreachable: the redirect useEffect catches any non-canonical blockParam
  // and the early-return null bails before this point. Keep an explicit
  // return so the function is exhaustive.
  return null;
}
