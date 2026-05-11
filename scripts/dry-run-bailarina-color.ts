import { loadFullContext, mergeContextWithInput } from '@/lib/ai/load-full-context';
import { buildDesignPrompt } from '@/lib/ai/design-prompts';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function main() {
  const planId = '72a5f5ae-235f-4909-b777-919f95ce5dab';
  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('*')
    .eq('collection_plan_id', planId)
    .ilike('name', '%bailarina%')
    .single();
  if (!sku) { console.error('SKU not found'); return; }

  // Simulated zones (would normally come from /api/ai/zones/detect on the sketch)
  const zonesPayload = [
    { name: 'Upper', semanticRole: 'identity', description: 'Main vamp area' },
    { name: 'Sole', semanticRole: 'structural', description: 'Flat bottom' },
    { name: 'Trim', semanticRole: 'accent', description: 'Edge piping' },
  ];

  // Frontend input AFTER my fix (SketchPhase.tsx:719)
  const input: Record<string, string> = {
    productCategory: sku.category,              // override collection-level default ("Sastrería" leaks)
    productType: sku.category,
    family: sku.family,
    subcategory: sku.name,
    concept: sku.notes || '',
    designDirection: sku.notes || sku.name,
    priceRange: `€${sku.pvp}`,
    zones: JSON.stringify(zonesPayload),
  };

  const serverCtx = await loadFullContext(planId);
  mergeContextWithInput(serverCtx, input);
  const prompt = buildDesignPrompt('color-suggest', input);
  if (!prompt) { console.error('No prompt built'); return; }

  // Search for the key fields in the assembled prompt
  const findIn = (label: string, regex: RegExp) => {
    const m = prompt.user.match(regex);
    console.log(`  ${m ? '✓' : '✗'} ${label}${m ? ': ' + m[0].slice(0, 120) : ''}`);
  };
  console.log('═══ Prompt verification: does CIS data reach the color-suggest prompt for Bailarina Plano? ═══\n');
  console.log('CONTEXT FIELDS:');
  findIn('Collection name (Nudo)', /Collection: "Nudo"/);
  findIn('Product category override (FOOTWEAR)', /PRODUCT CATEGORY: FOOTWEAR/);
  findIn('Season (SS27)', /Season: SS27/);
  findIn('Consumer profile present', /TARGET CONSUMER/);
  findIn('Vibe present', /COLLECTION VIBE/);
  findIn('Brand DNA Palette present', /Palette:|Colors:/);
  findIn('Brand DNA Visual Identity', /Visual Identity:/);
  findIn('Brand DNA Tagline', /Tagline:/);
  findIn('Moodboard present', /MOODBOARD/);
  findIn('Trends present', /TRENDS|Trends:/);
  findIn('Market competitors', /COMPETITORS|MARKET COMPETITORS|Competitors|MARKET:/);
  findIn('Existing SKUs present', /EXISTING SKUS|Existing SKUs/i);
  findIn('Pricing tiers/range', /priceRange|Price range:|Tiers:|tiers/);
  findIn('Target margin', /target margin|Target margin/i);
  findIn('Creative synthesis', /CREATIVE SYNTHESIS|Creative Synthesis/i);

  console.log('\nSKU-SPECIFIC FIELDS:');
  findIn('SKU name "Bailarina Plano" injected as designDirection', /Design direction:.*Bailarina Plano/);
  findIn('SKU name as subcategory or product specifier', /Bailarina Plano Cuero Saturado Rosa Pastel/);
  findIn('Family "Calzado" passed', /Family: Calzado|family.*Calzado/i);
  findIn('Zones JSON (Upper/Sole/Trim)', /Upper|Sole|Trim/);

  console.log('\nKNOWN BUGS:');
  const consumerCount = (prompt.user.match(/Arquitecta Urbana/g) || []).length;
  console.log(`  ${consumerCount > 1 ? '⚠️' : '✓'} Consumer profile duplication: appears ${consumerCount}x ${consumerCount > 1 ? '(bug — loadFullContext writes from CIS proposals + Creative workspace, both fire)' : ''}`);

  console.log(`\n[Total user prompt: ${prompt.user.length} chars · ~${Math.round(prompt.user.length/4)} tokens]`);

  console.log('\n═══ SEED BLOCK (palette source for color-suggest) ═══\n');
  // The seedBlock starts after "PRODUCT ZONES TO COLOR" and ends before "YOUR TASK"
  const m = prompt.user.match(/PRODUCT ZONES TO COLOR[\s\S]*?(?=YOUR TASK)/);
  if (m) console.log(m[0]);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
