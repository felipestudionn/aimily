/**
 * Extracción de imágenes embebidas del PDF Zara RNK por SKU.
 *
 * Felipe sprint Aimily Design · 2026-05-19. ENFOQUE CORRECTO:
 *
 * El PDF tiene las fotos de los productos como objetos embebidos
 * (paintImageXObject). pdfjs permite leerlos directamente como bitmaps —
 * sin recorte heurístico, sin pérdida de calidad. Cada SKU del Zara RNK
 * tiene UNA imagen embebida en su row.
 *
 * Estrategia:
 *   1) Para la página del SKU, iterar el operator list de pdfjs
 *   2) Capturar cada `OPS.paintImageXObject` con su transform (que da la
 *      posición Y en la página)
 *   3) Filtrar imágenes pequeñas (iconos, logos)
 *   4) Ordenar por Y (top→bottom)
 *   5) Match a SKU por su `row_in_page`
 *
 * Si la extracción falla (PDF sin imágenes embebidas — escaneado, vector,
 * etc.), caemos al modo CROP HEURÍSTICO como fallback.
 */

const MIN_IMAGE_AREA_PX = 20000; // descarta iconos < ~140×140
const FALLBACK_THUMB_X_RATIO = 0.02;
const FALLBACK_THUMB_W_RATIO = 0.18;
const FALLBACK_HEADER_RATIO = 0.07;
const FALLBACK_ROW_PADDING_RATIO = 0.03;
const FALLBACK_HIGH_RES_SCALE = 4.0;

export type CropResult = {
  blob: Blob;
  width: number;
  height: number;
};

/* ────────────────────────────── EXTRACT (preferred) ───────────────────── */

type ImgObject = {
  bitmap?: ImageBitmap;
  data?: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  kind?: number;
};

/** Convierte un objeto imagen de pdfjs a un canvas (cualquier formato). */
function imgObjectToCanvas(obj: ImgObject): HTMLCanvasElement | null {
  if (!obj.width || !obj.height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = obj.width;
  canvas.height = obj.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (obj.bitmap) {
    ctx.drawImage(obj.bitmap, 0, 0);
    return canvas;
  }
  if (obj.data) {
    // pdfjs returns RGB (kind=1) or RGBA (kind=3 typically). Expand to RGBA.
    const expected = obj.width * obj.height * 4;
    const imgData = ctx.createImageData(obj.width, obj.height);
    const src = obj.data;
    if (src.length === expected) {
      imgData.data.set(src);
    } else if (src.length === obj.width * obj.height * 3) {
      // RGB → RGBA
      for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
        imgData.data[j] = src[i];
        imgData.data[j + 1] = src[i + 1];
        imgData.data[j + 2] = src[i + 2];
        imgData.data[j + 3] = 255;
      }
    } else if (src.length === obj.width * obj.height) {
      // Grayscale → RGBA
      for (let i = 0, j = 0; i < src.length; i++, j += 4) {
        imgData.data[j] = src[i];
        imgData.data[j + 1] = src[i];
        imgData.data[j + 2] = src[i];
        imgData.data[j + 3] = 255;
      }
    } else {
      return null;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }
  return null;
}

/** Lee un objeto imagen de pdfjs commonObjs/objs (callback o promise). */
function getPdfObj(objs: { get: (name: string, cb?: (o: unknown) => void) => unknown }, name: string): Promise<unknown> {
  return new Promise((resolve) => {
    try {
      // pdfjs v4: objs.get returns sync or via callback
      const sync = objs.get(name, (o: unknown) => resolve(o));
      if (sync !== undefined && sync !== null) resolve(sync);
    } catch {
      resolve(null);
    }
  });
}

/** Extrae las imágenes embebidas de una página del PDF, en orden de
 *  aparición (top to bottom según su transform Y). */
async function extractImagesFromPage(page: {
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  objs: { get: (name: string, cb?: (o: unknown) => void) => unknown };
  commonObjs: { get: (name: string, cb?: (o: unknown) => void) => unknown };
  getViewport: (opts: { scale: number }) => { height: number };
}, ops: { paintImageXObject: number; transform: number; save: number; restore: number }): Promise<Array<{ canvas: HTMLCanvasElement; y: number }>> {
  const list = await page.getOperatorList();
  const viewport = page.getViewport({ scale: 1 });
  const pageH = viewport.height;

  // Track CTM stack to know the y-position of each image
  const ctmStack: number[][] = [[1, 0, 0, 1, 0, 0]];
  const result: Array<{ canvas: HTMLCanvasElement; y: number }> = [];

  for (let i = 0; i < list.fnArray.length; i++) {
    const fn = list.fnArray[i];
    const args = list.argsArray[i];

    if (fn === ops.save) {
      ctmStack.push([...ctmStack[ctmStack.length - 1]]);
    } else if (fn === ops.restore) {
      if (ctmStack.length > 1) ctmStack.pop();
    } else if (fn === ops.transform) {
      const [a, b, c, d, e, f] = args as number[];
      const top = ctmStack[ctmStack.length - 1];
      const [A, B, C, D, E, F] = top;
      ctmStack[ctmStack.length - 1] = [
        A * a + C * b,
        B * a + D * b,
        A * c + C * d,
        B * c + D * d,
        A * e + C * f + E,
        B * e + D * f + F,
      ];
    } else if (fn === ops.paintImageXObject) {
      const imgName = args[0] as string;
      // image objects live in page.objs (or commonObjs for shared)
      let imgObj = await getPdfObj(page.objs, imgName);
      if (!imgObj) imgObj = await getPdfObj(page.commonObjs, imgName);
      if (!imgObj || typeof imgObj !== 'object') continue;
      const obj = imgObj as ImgObject;
      const area = (obj.width || 0) * (obj.height || 0);
      if (area < MIN_IMAGE_AREA_PX) continue; // skip icons / logos
      const canvas = imgObjectToCanvas(obj);
      if (!canvas) continue;
      // Compute Y in page space. In PDF coords, origin is bottom-left;
      // we want "top-to-bottom" ordering, so we use (pageH - y).
      const ctm = ctmStack[ctmStack.length - 1];
      const yPdf = ctm[5]; // f component
      const yTopDown = pageH - yPdf;
      result.push({ canvas, y: yTopDown });
    }
  }

  // Order top to bottom
  result.sort((a, b) => a.y - b.y);
  return result;
}

/** Extrae la imagen del SKU del PDF original como objeto embebido (no
 *  recorte). Resultado: bitmap nativo, máxima calidad posible. */
export async function extractSkuImageFromPdf(
  pdfSignedUrl: string,
  skuRank: number,
  totalSkus: number,
  numPagesHint: number
): Promise<CropResult | null> {
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const ops = pdfjs.OPS as unknown as { paintImageXObject: number; transform: number; save: number; restore: number };
    const pdf = await pdfjs.getDocument(pdfSignedUrl).promise;

    const numPages = numPagesHint > 0 ? numPagesHint : pdf.numPages;
    const skusPerPage = Math.max(1, Math.ceil(totalSkus / numPages));
    const pageIdx = Math.min(numPages - 1, Math.floor((skuRank - 1) / skusPerPage));
    const rowInPage = (skuRank - 1) % skusPerPage;

    const page = await pdf.getPage(pageIdx + 1);
    const images = await extractImagesFromPage(page as never, ops);

    if (images.length === 0) return null;

    // Match by row index (top to bottom). If the page has more images than
    // SKUs (e.g., decorative photos), take only the SKU-row count.
    const candidate = images[rowInPage] ?? images[images.length - 1];
    if (!candidate?.canvas) return null;

    const blob = await new Promise<Blob | null>((resolve) => {
      candidate.canvas.toBlob((b) => resolve(b), 'image/png');
    });
    if (!blob) return null;

    return {
      blob,
      width: candidate.canvas.width,
      height: candidate.canvas.height,
    };
  } catch (err) {
    console.warn('[sku-image-cropper] extraction failed', err);
    return null;
  }
}

/* ────────────────────────── FALLBACK (heuristic crop) ─────────────────── */

/** Fallback: si la extracción de imagen embebida falla (PDF escaneado,
 *  vectorial, sin objetos imagen), recortar de un render high-res de la
 *  página. Menos preciso pero siempre funciona. */
export async function cropSkuFromPdfHighRes(
  pdfSignedUrl: string,
  skuRank: number,
  totalSkus: number,
  numPagesHint: number
): Promise<CropResult | null> {
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const pdf = await pdfjs.getDocument(pdfSignedUrl).promise;

    const numPages = numPagesHint > 0 ? numPagesHint : pdf.numPages;
    const skusPerPage = Math.max(1, Math.ceil(totalSkus / numPages));
    const pageIdx = Math.min(numPages - 1, Math.floor((skuRank - 1) / skusPerPage));
    const rowInPage = (skuRank - 1) % skusPerPage;

    const page = await pdf.getPage(pageIdx + 1);
    const viewport = page.getViewport({ scale: FALLBACK_HIGH_RES_SCALE });
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = Math.floor(viewport.width);
    pageCanvas.height = Math.floor(viewport.height);
    const pctx = pageCanvas.getContext('2d');
    if (!pctx) return null;

    await page.render({
      canvasContext: pctx,
      viewport,
    } as Parameters<typeof page.render>[0]).promise;

    const srcW = pageCanvas.width;
    const srcH = pageCanvas.height;
    const usableH = srcH * (1 - FALLBACK_HEADER_RATIO);
    const rowH = usableH / skusPerPage;
    const rowY0 = srcH * FALLBACK_HEADER_RATIO + rowInPage * rowH;
    const padY = rowH * FALLBACK_ROW_PADDING_RATIO;

    const cropX = Math.round(srcW * FALLBACK_THUMB_X_RATIO);
    const cropY = Math.round(rowY0 + padY);
    const cropW = Math.round(srcW * FALLBACK_THUMB_W_RATIO);
    const cropH = Math.round(rowH - padY * 2);

    if (cropW <= 0 || cropH <= 0) return null;

    const crop = document.createElement('canvas');
    crop.width = cropW;
    crop.height = cropH;
    const cctx = crop.getContext('2d');
    if (!cctx) return null;
    cctx.drawImage(pageCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const blob = await new Promise<Blob | null>((resolve) => {
      crop.toBlob((b) => resolve(b), 'image/png');
    });
    if (!blob) return null;
    return { blob, width: cropW, height: cropH };
  } catch (err) {
    console.warn('[sku-image-cropper] high-res crop failed', err);
    return null;
  }
}

/** Entry point: intenta extracción real primero, fallback a crop. */
export async function getSkuReferenceImage(
  pdfSignedUrl: string,
  skuRank: number,
  totalSkus: number,
  numPagesHint: number
): Promise<CropResult | null> {
  const extracted = await extractSkuImageFromPdf(pdfSignedUrl, skuRank, totalSkus, numPagesHint);
  if (extracted) return extracted;
  return await cropSkuFromPdfHighRes(pdfSignedUrl, skuRank, totalSkus, numPagesHint);
}

/** Sube el blob al endpoint sku-image y devuelve la URL persistida.
 *  options.forceReplace = true para sobrescribir una URL existente
 *  (útil cuando hemos mejorado el algoritmo y queremos re-extraer). */
export async function uploadCroppedSkuImage(
  blob: Blob,
  productFactId: string,
  options?: { forceReplace?: boolean }
): Promise<string | null> {
  const fd = new FormData();
  fd.append('product_fact_id', productFactId);
  fd.append('image', blob, 'sku.png');
  if (options?.forceReplace) fd.append('force_replace', '1');
  const res = await fetch('/api/strategy/sku-image', { method: 'POST', body: fd });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}
