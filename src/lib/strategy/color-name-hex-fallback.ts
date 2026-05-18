/**
 * Spanish color-name → hex resolution.
 *
 * Used when a creative brief's `color_story` (an array of Spanish color
 * names representing the moodboard palette) needs to be rendered as
 * concrete swatches.
 *
 * Resolution chain (two tiers, graceful degradation):
 *
 *   1. Tenant taxonomy (authoritative for catalog colors)
 *      — built from `strategy_taxonomies.mapping.code_to_name`
 *        joined with `code_to_hex`. Vision-validated for Zara/aimily-internal.
 *
 *   2. Standard Spanish color dictionary (this module)
 *      — covers moodboard colors that are NOT yet in the catalog,
 *        because the brief's role is precisely to extend chromatic
 *        territory beyond what the retailer has historically produced.
 *        Without this fallback the proposed-color chips would be silent
 *        greys for any name the tenant taxonomy doesn't know yet.
 *
 *   3. null (caller decides: neutral swatch, suppress chip, etc.).
 *
 * Cardinal rule reference: feedback_aimily-graceful-degradation-tenant-input-or-synthetic.md
 *  — every input must (a) honor explicit tenant data, (b) fall through to
 *  synthetic/standard when missing, (c) never silently fail.
 */

const SPANISH_COLOR_HEX: Record<string, string> = {
  // Neutrals / off-whites
  blanco: '#fafaf7',
  blanco_hueso: '#f3eee0',
  blanco_roto: '#f0ece0',
  crudo: '#efe7d8',
  marfil: '#f0e8d4',
  crema: '#f1e8d2',
  arena: '#d9c6a4',
  beige: '#e7d9c3',
  hueso: '#f3eee0',
  ecru: '#efe7d8',

  // Browns / tans
  camel: '#c1986c',
  tostado: '#9a6a3d',
  cuero: '#8a5a32',
  cognac: '#a45c2a',
  tabaco: '#7c5a3a',
  marron: '#6b4528',
  chocolate: '#4a2c1a',
  terracota: '#a85c3c',
  rojo_terracota: '#a85c3c',

  // Greens
  verde: '#3f7a4f',
  verde_botella: '#1f4634',
  verde_militar: '#4a5a37',
  verde_menta: '#a8d8b9',
  verde_oliva: '#6a7a2e',
  oliva: '#6a7a2e',
  caqui: '#a79770',
  kaki: '#a79770',
  verde_salvia: '#a8b89a',
  salvia: '#a8b89a',

  // Blues
  azul: '#3a5da9',
  azul_marino: '#1a3162',
  azul_claro: '#9bc4e2',
  azul_noche: '#1a3162',
  azul_acero: '#5a7a9a',
  denim: '#4f6a85',
  denim_medio: '#5e7389',
  denim_claro: '#a4b9cf',
  celeste: '#9bc4e2',
  turquesa: '#4ea8a4',
  petroleo: '#1f5b66',
  marino: '#1a3162',

  // Purples
  morado: '#5a3a7a',
  violeta: '#7a4f8a',
  lila: '#bba2c8',
  malva: '#a385a3',
  lavanda: '#b8a5d6',
  lavanda_clara: '#d0c2e4',

  // Reds / pinks
  rojo: '#a82828',
  rojo_cereza: '#7a1c1c',
  granate: '#6e1a1a',
  burdeos: '#5b1a22',
  vino: '#5b1a22',
  coral: '#e08a6e',
  rosa: '#e8b4b4',
  rosa_palo: '#e8c4c4',
  rosa_empolvado: '#deb5b5',
  fucsia: '#d63b6a',
  salmon: '#e8a48a',

  // Yellows / oranges
  naranja: '#d68040',
  mostaza: '#c8a64a',
  ocre: '#c89548',
  amarillo: '#e8c84a',
  dorado: '#c89a4a',

  // Greys / blacks
  negro: '#101010',
  gris: '#9e9e9e',
  gris_claro: '#c8c8c8',
  gris_oscuro: '#5a5a5a',
  gris_perla: '#cfcfcf',
  gris_pluma: '#a0a0a0',
  plata: '#c8c8c8',
};

function normalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_');
}

/** Tier 2: standard Spanish color dictionary. */
export function resolveColorHexFallback(name: string): string | null {
  if (!name) return null;
  const key = normalize(name);
  if (SPANISH_COLOR_HEX[key]) return SPANISH_COLOR_HEX[key];
  // Compound names: "rojo_terracota_oscuro" → try "rojo".
  const first = key.split('_')[0];
  if (first && SPANISH_COLOR_HEX[first]) return SPANISH_COLOR_HEX[first];
  return null;
}

/** Tier 1: lookup against a tenant-taxonomy name→hex index. */
export function resolveColorHexFromTaxonomy(
  taxonomyNameToHex: Record<string, string>,
  name: string
): string | null {
  if (!name) return null;
  const key = normalize(name);
  return taxonomyNameToHex[key] ?? null;
}

/** Two-tier resolution. Null only when both tiers miss. */
export function resolveColorHex(
  name: string,
  taxonomyNameToHex: Record<string, string>
): string | null {
  return (
    resolveColorHexFromTaxonomy(taxonomyNameToHex, name) ??
    resolveColorHexFallback(name)
  );
}

/**
 * Build a name→hex index from the tenant's active color taxonomy. The
 * taxonomy maps codes (Zara/RNK numeric) to names AND to hex separately;
 * the brief carries names not codes, so we invert via name as key. When
 * multiple codes share a name (e.g. 250/251/252 → "crudo") we keep the
 * first hex seen — visualization picks one representative swatch and
 * doesn't try to disambiguate between near-identical shades for the chip.
 */
export function buildTaxonomyNameToHex(
  codeToName: Record<string, string> | undefined | null,
  codeToHex: Record<string, string> | undefined | null
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!codeToName || !codeToHex) return out;
  for (const [code, name] of Object.entries(codeToName)) {
    const hex = codeToHex[code];
    if (!hex || !name) continue;
    const key = normalize(name);
    if (!out[key]) out[key] = hex;
  }
  return out;
}

/** Resolve a whole color_story palette into [{name, hex}] pairs in one call.
 *  `hex` is null when neither tier had a mapping — caller decides how to
 *  render (neutral swatch, suppress chip, etc.). */
export function resolveColorStory(
  names: string[],
  taxonomyNameToHex: Record<string, string>
): Array<{ name: string; hex: string | null }> {
  return names.map((name) => ({
    name,
    hex: resolveColorHex(name, taxonomyNameToHex),
  }));
}
