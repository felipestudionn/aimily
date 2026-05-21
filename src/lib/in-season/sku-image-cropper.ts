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
const UPSCALE_TARGET_MAX_DIM = 1024; // imágenes < 1024 en lado mayor se escalan bicubic

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

/** Auto-trim de bordes blancos: detecta el bounding box del contenido
 *  NO blanco y recorta al mismo + un pequeño margen. Si la imagen es
 *  uniforme, retorna sin cambios. */
function autoTrimWhiteBorders(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const WHITE_THRESHOLD = 245;
  const MARGIN_PX = 20;
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;
  const { width, height } = sourceCanvas;
  if (width === 0 || height === 0) return sourceCanvas;
  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, width, height);
  } catch {
    return sourceCanvas;
  }
  const data = imgData.data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] < WHITE_THRESHOLD || data[i + 1] < WHITE_THRESHOLD || data[i + 2] < WHITE_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX >= maxX || minY >= maxY) return sourceCanvas;
  const trimX = Math.max(0, minX - MARGIN_PX);
  const trimY = Math.max(0, minY - MARGIN_PX);
  const trimW = Math.min(width - trimX, maxX - minX + MARGIN_PX * 2);
  const trimH = Math.min(height - trimY, maxY - minY + MARGIN_PX * 2);
  const trimmed = document.createElement('canvas');
  trimmed.width = trimW;
  trimmed.height = trimH;
  const tctx = trimmed.getContext('2d');
  if (!tctx) return sourceCanvas;
  tctx.drawImage(sourceCanvas, trimX, trimY, trimW, trimH, 0, 0, trimW, trimH);
  return trimmed;
}

/** Upscale a canvas con interpolación bicubic (imageSmoothingEnabled +
 *  imageSmoothingQuality='high') hasta target en lado mayor. Si la imagen
 *  ya es >= target, retorna sin cambios. */
function upscaleCanvasBicubic(source: HTMLCanvasElement, targetMaxDim: number): HTMLCanvasElement {
  const maxDim = Math.max(source.width, source.height);
  if (maxDim >= targetMaxDim) return source;
  const scale = targetMaxDim / maxDim;
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const dst = document.createElement('canvas');
  dst.width = w;
  dst.height = h;
  const ctx = dst.getContext('2d');
  if (!ctx) return source;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  return dst;
}

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

    // Felipe sprint Aimily Design 2026-05-19 · upscale a 1024px en lado
    // mayor con interpolación bicubic para que la referencia se vea
    // grande y nítida en el Collection Builder. Los thumbnails nativos
    // del PDF Zara RNK son ~135×203px — bien para match correcto, pero
    // visualmente muy pequeños. AI generation funciona con cualquier
    // resolución; este upscale es para UX visual del comprador.
    const upscaled = upscaleCanvasBicubic(candidate.canvas, UPSCALE_TARGET_MAX_DIM);
    const blob = await new Promise<Blob | null>((resolve) => {
      upscaled.toBlob((b) => resolve(b), 'image/png');
    });
    if (!blob) return null;

    return {
      blob,
      width: upscaled.width,
      height: upscaled.height,
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

/** EXTRACCIÓN NATIVA POR MODEL REF (preferido):
 *  - Encuentra la coord Y del texto del modelRef en la página.
 *  - Extrae TODAS las imágenes embebidas del page con sus Y CTM.
 *  - Match: la imagen cuyo Y CTM esté más cerca del Y del modelRef.
 *  - Devuelve la imagen NATIVA (limpia, sin texto/header) + upscale bicubic.
 *
 *  Si falla → fallback a cropSkuFromPdfByModelRef (crop del page render). */
export async function extractSkuImageByModelRef(
  pdfSignedUrl: string,
  modelRef: string,
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
    const guessedPageIdx = Math.min(numPages - 1, Math.floor((skuRank - 1) / skusPerPage));
    const tryPages = [guessedPageIdx, guessedPageIdx + 1, guessedPageIdx - 1, guessedPageIdx + 2, guessedPageIdx - 2]
      .filter((p) => p >= 0 && p < numPages);

    const normRef = modelRef.replace(/\s+/g, '');

    for (const pageIdx of tryPages) {
      const page = await pdf.getPage(pageIdx + 1);
      // 1) Buscar Y del modelRef
      const text = await page.getTextContent();
      let matchY: number | null = null;
      for (const item of text.items as Array<{ str: string; transform: number[] }>) {
        const norm = (item.str || '').replace(/\s+/g, '');
        if (norm.includes(normRef)) {
          matchY = item.transform[5];
          break;
        }
      }
      if (matchY == null) continue;

      // 2) Extraer todas las imágenes con sus CTM
      const images = await extractImagesFromPage(page as never, ops);
      if (images.length === 0) continue;

      // 3) Match: imagen cuyo Y CTM (en coords PDF, origin bottom-left)
      //    esté más cerca del matchY del modelRef. Tolerancia generosa
      //    porque la imagen y el texto del modelRef están a la misma
      //    altura visual pero el origen de la imagen es bottom-left
      //    (puede estar offset por la altura de la imagen).
      const viewport = page.getViewport({ scale: 1 });
      const pageH = viewport.height;
      const matchYTopDown = pageH - matchY;
      let bestImg: { canvas: HTMLCanvasElement; y: number } | null = null;
      let bestDist = Infinity;
      for (const img of images) {
        // img.y ya es top-down (pageH - yPdf)
        const dist = Math.abs(img.y - matchYTopDown);
        if (dist < bestDist) {
          bestDist = dist;
          bestImg = img;
        }
      }
      if (!bestImg) continue;

      // 4) Upscale + emit
      const upscaled = upscaleCanvasBicubic(bestImg.canvas, UPSCALE_TARGET_MAX_DIM);
      const blob = await new Promise<Blob | null>((resolve) => {
        upscaled.toBlob((b) => resolve(b), 'image/png');
      });
      if (!blob) continue;
      return { blob, width: upscaled.width, height: upscaled.height };
    }
    return null;
  } catch (err) {
    console.warn('[sku-image-cropper] native extraction by modelRef failed', err);
    return null;
  }
}

/** Recorte del PAGE RENDER por modelRef · fallback cuando extractSkuImageByModelRef
 *  no encuentra una imagen embebida cerca del texto del modelRef. */
export async function cropSkuFromPdfByModelRef(
  pdfSignedUrl: string,
  modelRef: string,
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
    const guessedPageIdx = Math.min(numPages - 1, Math.floor((skuRank - 1) / skusPerPage));

    // Probamos la página estimada y vecinas (±2) por si el rank/created_at
    // no mapea 1:1 al PDF.
    const tryPages = [guessedPageIdx, guessedPageIdx + 1, guessedPageIdx - 1, guessedPageIdx + 2, guessedPageIdx - 2]
      .filter((p) => p >= 0 && p < numPages);

    const normRef = modelRef.replace(/\s+/g, '');

    for (const pageIdx of tryPages) {
      const page = await pdf.getPage(pageIdx + 1);
      const text = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });

      let matchY: number | null = null;
      let matchX: number | null = null;
      for (const item of text.items as Array<{ str: string; transform: number[] }>) {
        const norm = (item.str || '').replace(/\s+/g, '');
        if (norm.includes(normRef)) {
          matchY = item.transform[5];
          matchX = item.transform[4];
          break;
        }
      }
      if (matchY == null || matchX == null) continue;

      const scale = FALLBACK_HIGH_RES_SCALE;
      const renderViewport = page.getViewport({ scale });
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = Math.floor(renderViewport.width);
      pageCanvas.height = Math.floor(renderViewport.height);
      const pctx = pageCanvas.getContext('2d');
      if (!pctx) return null;
      await page.render({
        canvasContext: pctx,
        viewport: renderViewport,
      } as Parameters<typeof page.render>[0]).promise;

      // Y nativa → Y top-down en coords del canvas escalado.
      const pageH = viewport.height;
      const yTopDownNative = pageH - matchY;
      const rowH = pageH / Math.max(skusPerPage, 1);
      const rowTop = Math.max(0, yTopDownNative - rowH / 2);
      const rowBottom = Math.min(pageH, yTopDownNative + rowH / 2);

      // Ancho dinámico: desde un pequeño margen izquierdo hasta justo
      // antes de la X donde aparece el texto del modelRef (que en el
      // layout Zara RNK está a la derecha del thumbnail). Eso elimina
      // el header ZARA + la tabla de datos del crop.
      const SAFETY_MARGIN_X = 8; // pixels (en coords PDF native, antes de scale)
      const cropY = Math.round(rowTop * scale);
      const cropH = Math.round((rowBottom - rowTop) * scale);
      const cropX = Math.round(renderViewport.width * FALLBACK_THUMB_X_RATIO);
      const dynamicRightX = Math.round((matchX - SAFETY_MARGIN_X) * scale);
      let cropW = Math.max(0, dynamicRightX - cropX);
      // Sanity: si la coord X del texto está fuera de rango o muy a la
      // izquierda, fallback al 18% original.
      if (cropW < renderViewport.width * 0.05) {
        cropW = Math.round(renderViewport.width * FALLBACK_THUMB_W_RATIO);
      }
      if (cropW <= 0 || cropH <= 0) continue;

      const crop = document.createElement('canvas');
      crop.width = cropW;
      crop.height = cropH;
      const cctx = crop.getContext('2d');
      if (!cctx) continue;
      cctx.drawImage(pageCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      // Auto-trim de bordes blancos para centrar el thumbnail.
      const trimmed = autoTrimWhiteBorders(crop);

      const blob = await new Promise<Blob | null>((resolve) => {
        trimmed.toBlob((b) => resolve(b), 'image/png');
      });
      if (!blob) continue;
      return { blob, width: trimmed.width, height: trimmed.height };
    }
    return null;
  } catch (err) {
    console.warn('[sku-image-cropper] text-based crop failed', err);
    return null;
  }
}

/** Entry point: prioridad
 *    1) Extracción NATIVA por modelRef (imagen embebida limpia + upscale)
 *    2) Crop del page render por modelRef (fallback con bbox text-anchored)
 *    3) Extracción nativa por orden (fallback sin modelRef)
 *    4) Crop heurístico high-res. */
export async function getSkuReferenceImage(
  pdfSignedUrl: string,
  skuRank: number,
  totalSkus: number,
  numPagesHint: number,
  modelRef?: string | null
): Promise<CropResult | null> {
  if (modelRef) {
    const native = await extractSkuImageByModelRef(pdfSignedUrl, modelRef, skuRank, totalSkus, numPagesHint);
    if (native) return native;
    const byText = await cropSkuFromPdfByModelRef(pdfSignedUrl, modelRef, skuRank, totalSkus, numPagesHint);
    if (byText) return byText;
  }
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
  const res = await fetch('/api/in-season/sku-image', { method: 'POST', body: fd });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}
