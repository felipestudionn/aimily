/**
 * Reescritura final de strings que mencionan Zara/RNK cuando la fuente
 * NO es un PDF Zara (e.g., Shopify CSV/XLSX bundle).
 *
 * Felipe sprint Shopify lane 2026-05-19. El resolver de verdicts está
 * lleno de strings con "top X del RNK Zara" / "filosofía Zara" /
 * "Zara abre nuevos modelos desde el día 1" — son legítimos cuando la
 * fuente ES Zara RNK pero suenan absurdos para un DTC en Shopify.
 *
 * Esta función se aplica AL FINAL del pipeline (en el route handler,
 * justo antes de devolver al cliente). No tocamos el resolver para
 * evitar perder evidencia/citas en logs internos. Lo hacemos aquí para
 * que el copy final sea retailer-agnostic.
 *
 * Strategy: regex replace conservador. Si la frase está pensada para
 * Zara y no traduce limpio → la quitamos en vez de inventar. Mejor
 * silencio que ruido.
 */

const ZARA_RNK_PATTERNS: Array<[RegExp, string]> = [
  // "top X del RNK Zara" → "top X en velocidad"
  [/top (\d+) del RNK Zara/g, 'top $1 en velocidad'],
  // "del RNK Zara" → "del ranking"
  [/del RNK Zara/g, 'del ranking'],
  // "Zara lo posicionó en top X del RNK pero..." → "El ranking del proveedor lo marcó top X pero..."
  [/Zara lo posicionó en top (\d+) del RNK/g, 'El ranking lo marcó top $1'],
  // "Zara lo destacó en el RNK" → "El ranking lo marcó alto"
  [/Zara lo destacó en el RNK/g, 'El ranking lo marcó alto'],
  // "(filosofía Zara: ... )" → quitar el aparte completo
  [/\s*\(filosofía Zara[^)]*\)/g, ''],
  // "Zara abre nuevos modelos desde el día 1 cuando los datos validan" → genérico
  [
    /Zara abre nuevos modelos desde el día 1 cuando los datos validan/g,
    'cuando los datos validan, no esperar a las 4 semanas para abrir secuelas',
  ],
  // "ahí está la gracia de Zara:" → quitar
  [/\s*ahí está la gracia de Zara:?\s*/g, ' '],
];

/** Aplicar la limpieza si `source_format` no es Zara. Idempotente.
 *  Si recibe `null`/`undefined` → asume not-Zara (defensivo). */
export function neutralizeRationale(
  rationale: string | null | undefined,
  source_format: string | null | undefined
): string {
  if (!rationale) return '';
  if (source_format === 'zara_rnk_pdf') return rationale;
  let out = rationale;
  for (const [pattern, replacement] of ZARA_RNK_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\s+/g, ' ').trim();
}
