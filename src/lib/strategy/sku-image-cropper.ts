/**
 * Recorte de la imagen referencia de un SKU desde el canvas del PDF Zara RNK
 * renderizado en el viewer.
 *
 * Felipe sprint Aimily Design · 2026-05-19. Aprovecha el canvas que el
 * PdfOverlayViewer ya renderiza (a 2× scale × dpr) — NO re-renderiza el
 * PDF entero, sólo recorta. El resultado es un blob PNG que se sube vía
 * /api/strategy/sku-image y se persiste en strategy_product_facts.product_image_url.
 *
 * Heurística de bbox (el parser Claude vision no nos da coordenadas):
 *   - SKUs distribuidos uniformemente verticalmente por página
 *   - skus_per_page = ceil(total_skus / num_pages)
 *   - El thumbnail del producto está en el extremo izquierdo de cada fila
 *     (~12-18% del ancho de la página en el layout Zara RNK)
 *
 * Si el layout cambia, ajustar las constantes THUMB_X_RATIO / THUMB_W_RATIO.
 * Iteración futura: extraer bboxes reales con Claude vision durante el parse.
 */

const THUMB_X_RATIO = 0.02; // margen desde el borde izquierdo
const THUMB_W_RATIO = 0.15; // ancho del thumbnail = 15% de la página
const ROW_PADDING_RATIO = 0.05; // 5% padding vertical para evitar cortar contenido del row siguiente

export type CropResult = {
  blob: Blob;
  width: number;
  height: number;
};

/** Recorta del canvas la región del SKU dado su rank (1-based) y devuelve
 *  un Blob PNG. Si las dimensiones no son válidas o el canvas para esa
 *  página no existe, retorna null. */
export async function cropSkuFromPdfCanvas(
  pdfContainer: HTMLElement,
  skuRank: number,
  totalSkus: number
): Promise<CropResult | null> {
  const canvases = Array.from(pdfContainer.querySelectorAll('canvas')) as HTMLCanvasElement[];
  if (canvases.length === 0) return null;

  const numPages = canvases.length;
  const skusPerPage = Math.max(1, Math.ceil(totalSkus / numPages));
  const pageIdx = Math.min(numPages - 1, Math.floor((skuRank - 1) / skusPerPage));
  const rowInPage = (skuRank - 1) % skusPerPage;

  const sourceCanvas = canvases[pageIdx];
  if (!sourceCanvas) return null;

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  if (srcW <= 0 || srcH <= 0) return null;

  // Page header (Zara puts a brand bar + filters at the top). The actual
  // SKU rows start around y = 8% of the page.
  const HEADER_RATIO = 0.08;
  const usableH = srcH * (1 - HEADER_RATIO);
  const rowH = usableH / skusPerPage;
  const rowY0 = srcH * HEADER_RATIO + rowInPage * rowH;
  const padY = rowH * ROW_PADDING_RATIO;

  const cropX = Math.round(srcW * THUMB_X_RATIO);
  const cropY = Math.round(rowY0 + padY);
  const cropW = Math.round(srcW * THUMB_W_RATIO);
  const cropH = Math.round(rowH - padY * 2);

  if (cropW <= 0 || cropH <= 0) return null;

  // Render to an offscreen canvas at the crop dimensions
  const offscreen = document.createElement('canvas');
  offscreen.width = cropW;
  offscreen.height = cropH;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const blob = await new Promise<Blob | null>((resolve) => {
    offscreen.toBlob((b) => resolve(b), 'image/png');
  });
  if (!blob) return null;

  return { blob, width: cropW, height: cropH };
}

/** Sube el blob recortado al endpoint sku-image y devuelve la URL persistida. */
export async function uploadCroppedSkuImage(
  blob: Blob,
  productFactId: string
): Promise<string | null> {
  const fd = new FormData();
  fd.append('product_fact_id', productFactId);
  fd.append('image', blob, 'sku.png');
  const res = await fetch('/api/strategy/sku-image', { method: 'POST', body: fd });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}
