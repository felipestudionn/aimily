'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Star,
  Loader2,
  Upload,
  Image as ImageIcon,
  ShoppingBag,
  ArrowRight,
  X,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { SegmentedPill } from '@/components/ui/segmented-pill';
import { useLanguage, type Language } from '@/contexts/LanguageContext';

/* ── i18n × 9 locales (inline, follows PricingDetail STUDIO_I18N pattern) ──
 * Strings added for the progress/error UX. The pre-existing Spanish strings
 * in the rest of this file are kept as-is — separate i18n sweep. */
const STUDIO_WORKSPACE_I18N: Record<Language, {
  stagePreparing: string;
  stageGenerating: string;
  stageFormats: string;
  generatingTitle: string;
  generatingSub: string;
  etaSecondsLeft: (n: number) => string;
  etaAlmostThere: string;
  elapsedSeconds: (n: number) => string;
  errorTitle: string;
  errorClose: string;
  errorRetry: string;
  errorBuyPack: string;
  errUnauthorized: string;
  errPoolEmpty: string;
  errRateLimit: string;
  errAiFailed: string;
  errNetwork: string;
  errProject: string;
  errModel: string;
  errGeneric: string;
  valNoProduct: string;
  valNoModel: string;
  valNoOutputs: string;
}> = {
  en: {
    stagePreparing: 'Preparing references',
    stageGenerating: 'Generating with AI',
    stageFormats: 'Processing 12 formats',
    generatingTitle: 'Generating your photo',
    generatingSub: 'This usually takes 30–60 seconds. Your output is safe if anything fails.',
    etaSecondsLeft: (n) => `~${n}s left`,
    etaAlmostThere: 'Almost there…',
    elapsedSeconds: (n) => `${n}s elapsed`,
    errorTitle: "Something didn't work",
    errorClose: 'Close',
    errorRetry: 'Try again',
    errorBuyPack: 'Buy a pack',
    errUnauthorized: 'Your session expired. Please sign in again.',
    errPoolEmpty: "You're out of outputs. Buy another pack to keep generating.",
    errRateLimit: "You're generating too fast. Wait a few seconds and try again.",
    errAiFailed: "The AI couldn't generate this photo. Your pack is intact — try again.",
    errNetwork: 'Connection problem. Check your network and try again.',
    errProject: "Project not found or you don't have access.",
    errModel: 'Selected model not found. Pick another one.',
    errGeneric: "Something didn't work. Try again.",
    valNoProduct: 'Upload a product photo first.',
    valNoModel: 'Pick a model from the casting bank.',
    valNoOutputs: "You're out of outputs. Buy another pack.",
  },
  es: {
    stagePreparing: 'Preparando referencias',
    stageGenerating: 'Generando con IA',
    stageFormats: 'Procesando 12 formatos',
    generatingTitle: 'Generando tu foto',
    generatingSub: 'Esto suele tardar entre 30 y 60 segundos. Tu output está intacto si algo falla.',
    etaSecondsLeft: (n) => `~${n}s restantes`,
    etaAlmostThere: 'Casi listo…',
    elapsedSeconds: (n) => `${n}s transcurridos`,
    errorTitle: 'Algo no salió bien',
    errorClose: 'Cerrar',
    errorRetry: 'Reintentar',
    errorBuyPack: 'Comprar pack',
    errUnauthorized: 'Tu sesión expiró. Vuelve a iniciar sesión.',
    errPoolEmpty: 'No tienes outputs disponibles. Compra otro pack para seguir generando.',
    errRateLimit: 'Estás generando demasiado rápido. Espera unos segundos y reintenta.',
    errAiFailed: 'La IA no pudo generar esta foto. Tu pack está intacto — vuelve a intentarlo.',
    errNetwork: 'Problema de conexión. Comprueba tu red y reintenta.',
    errProject: 'Proyecto no encontrado o sin permiso.',
    errModel: 'El modelo seleccionado no está disponible. Elige otro.',
    errGeneric: 'Algo no salió bien. Vuelve a intentarlo.',
    valNoProduct: 'Sube primero una foto del producto.',
    valNoModel: 'Selecciona un modelo del casting.',
    valNoOutputs: 'No tienes outputs disponibles. Compra otro pack.',
  },
  fr: {
    stagePreparing: 'Préparation des références',
    stageGenerating: 'Génération avec IA',
    stageFormats: 'Traitement de 12 formats',
    generatingTitle: 'Génération de ta photo',
    generatingSub: 'Cela prend généralement 30 à 60 secondes. Ton output est en sécurité en cas de problème.',
    etaSecondsLeft: (n) => `~${n}s restantes`,
    etaAlmostThere: 'Presque prêt…',
    elapsedSeconds: (n) => `${n}s écoulées`,
    errorTitle: "Ça n'a pas marché",
    errorClose: 'Fermer',
    errorRetry: 'Réessayer',
    errorBuyPack: 'Acheter un pack',
    errUnauthorized: 'Ta session a expiré. Reconnecte-toi.',
    errPoolEmpty: 'Plus aucun output disponible. Achète un autre pack pour continuer.',
    errRateLimit: 'Tu génères trop vite. Attends quelques secondes et réessaie.',
    errAiFailed: "L'IA n'a pas pu générer cette photo. Ton pack est intact — réessaie.",
    errNetwork: 'Problème de connexion. Vérifie ton réseau et réessaie.',
    errProject: "Projet introuvable ou sans accès.",
    errModel: 'Le mannequin sélectionné est indisponible. Choisis-en un autre.',
    errGeneric: "Ça n'a pas marché. Réessaie.",
    valNoProduct: "Charge d'abord une photo du produit.",
    valNoModel: 'Choisis un mannequin du casting.',
    valNoOutputs: "Tu n'as plus d'outputs. Achète un autre pack.",
  },
  it: {
    stagePreparing: 'Preparazione dei riferimenti',
    stageGenerating: 'Generazione con AI',
    stageFormats: 'Elaborazione di 12 formati',
    generatingTitle: 'Generazione della tua foto',
    generatingSub: 'Di solito ci vogliono 30–60 secondi. Il tuo output è al sicuro se qualcosa va storto.',
    etaSecondsLeft: (n) => `~${n}s rimasti`,
    etaAlmostThere: 'Quasi pronto…',
    elapsedSeconds: (n) => `${n}s trascorsi`,
    errorTitle: 'Qualcosa non ha funzionato',
    errorClose: 'Chiudi',
    errorRetry: 'Riprova',
    errorBuyPack: 'Compra un pack',
    errUnauthorized: 'La tua sessione è scaduta. Accedi di nuovo.',
    errPoolEmpty: 'Non hai output disponibili. Compra un altro pack per continuare.',
    errRateLimit: 'Stai generando troppo velocemente. Aspetta qualche secondo e riprova.',
    errAiFailed: "L'AI non è riuscita a generare questa foto. Il tuo pack è intatto — riprova.",
    errNetwork: 'Problema di connessione. Controlla la rete e riprova.',
    errProject: 'Progetto non trovato o senza permesso.',
    errModel: 'Il modello selezionato non è disponibile. Scegline un altro.',
    errGeneric: 'Qualcosa non ha funzionato. Riprova.',
    valNoProduct: 'Carica prima una foto del prodotto.',
    valNoModel: 'Scegli un modello dal casting.',
    valNoOutputs: 'Non hai output disponibili. Compra un altro pack.',
  },
  de: {
    stagePreparing: 'Referenzen werden vorbereitet',
    stageGenerating: 'Generierung mit KI',
    stageFormats: '12 Formate werden verarbeitet',
    generatingTitle: 'Dein Foto wird erstellt',
    generatingSub: 'Das dauert normalerweise 30–60 Sekunden. Dein Output bleibt sicher, falls etwas schiefgeht.',
    etaSecondsLeft: (n) => `~${n}s übrig`,
    etaAlmostThere: 'Fast fertig…',
    elapsedSeconds: (n) => `${n}s vergangen`,
    errorTitle: 'Etwas hat nicht geklappt',
    errorClose: 'Schließen',
    errorRetry: 'Erneut versuchen',
    errorBuyPack: 'Pack kaufen',
    errUnauthorized: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
    errPoolEmpty: 'Keine Outputs mehr übrig. Kaufe ein weiteres Pack, um weiterzumachen.',
    errRateLimit: 'Du generierst zu schnell. Warte einen Moment und versuche es erneut.',
    errAiFailed: 'Die KI konnte dieses Foto nicht erzeugen. Dein Pack ist intakt — versuche es erneut.',
    errNetwork: 'Verbindungsproblem. Prüfe dein Netzwerk und versuche es erneut.',
    errProject: 'Projekt nicht gefunden oder kein Zugriff.',
    errModel: 'Das gewählte Modell ist nicht verfügbar. Wähle ein anderes.',
    errGeneric: 'Etwas hat nicht geklappt. Versuche es erneut.',
    valNoProduct: 'Lade zuerst ein Produktfoto hoch.',
    valNoModel: 'Wähle ein Modell aus dem Casting.',
    valNoOutputs: 'Keine Outputs mehr übrig. Kaufe ein weiteres Pack.',
  },
  pt: {
    stagePreparing: 'Preparando referências',
    stageGenerating: 'Gerando com IA',
    stageFormats: 'Processando 12 formatos',
    generatingTitle: 'Gerando a tua foto',
    generatingSub: 'Costuma demorar 30–60 segundos. O teu output fica seguro se algo falhar.',
    etaSecondsLeft: (n) => `~${n}s restantes`,
    etaAlmostThere: 'Quase pronto…',
    elapsedSeconds: (n) => `${n}s decorridos`,
    errorTitle: 'Algo não correu bem',
    errorClose: 'Fechar',
    errorRetry: 'Tentar de novo',
    errorBuyPack: 'Comprar pack',
    errUnauthorized: 'A tua sessão expirou. Volta a entrar.',
    errPoolEmpty: 'Não tens outputs disponíveis. Compra outro pack para continuar.',
    errRateLimit: 'Estás a gerar demasiado rápido. Espera alguns segundos e tenta de novo.',
    errAiFailed: 'A IA não conseguiu gerar esta foto. O teu pack está intacto — tenta de novo.',
    errNetwork: 'Problema de ligação. Verifica a tua rede e tenta de novo.',
    errProject: 'Projeto não encontrado ou sem acesso.',
    errModel: 'O modelo selecionado não está disponível. Escolhe outro.',
    errGeneric: 'Algo não correu bem. Tenta de novo.',
    valNoProduct: 'Carrega primeiro uma foto do produto.',
    valNoModel: 'Escolhe um modelo do casting.',
    valNoOutputs: 'Não tens outputs disponíveis. Compra outro pack.',
  },
  nl: {
    stagePreparing: "Referenties voorbereiden",
    stageGenerating: 'Genereren met AI',
    stageFormats: '12 formaten verwerken',
    generatingTitle: 'Je foto wordt gegenereerd',
    generatingSub: 'Dit duurt meestal 30–60 seconden. Je output blijft veilig als er iets misgaat.',
    etaSecondsLeft: (n) => `~${n}s resterend`,
    etaAlmostThere: 'Bijna klaar…',
    elapsedSeconds: (n) => `${n}s verstreken`,
    errorTitle: 'Er ging iets mis',
    errorClose: 'Sluiten',
    errorRetry: 'Opnieuw proberen',
    errorBuyPack: 'Pack kopen',
    errUnauthorized: 'Je sessie is verlopen. Log opnieuw in.',
    errPoolEmpty: 'Je hebt geen outputs meer. Koop een nieuw pack om door te gaan.',
    errRateLimit: 'Je genereert te snel. Wacht even en probeer opnieuw.',
    errAiFailed: 'De AI kon deze foto niet maken. Je pack is intact — probeer opnieuw.',
    errNetwork: 'Verbindingsprobleem. Controleer je netwerk en probeer opnieuw.',
    errProject: 'Project niet gevonden of geen toegang.',
    errModel: 'Het gekozen model is niet beschikbaar. Kies een ander.',
    errGeneric: 'Er ging iets mis. Probeer opnieuw.',
    valNoProduct: 'Upload eerst een productfoto.',
    valNoModel: 'Kies een model uit de casting.',
    valNoOutputs: 'Je hebt geen outputs meer. Koop een ander pack.',
  },
  sv: {
    stagePreparing: 'Förbereder referenser',
    stageGenerating: 'Genererar med AI',
    stageFormats: 'Behandlar 12 format',
    generatingTitle: 'Genererar din bild',
    generatingSub: 'Det tar oftast 30–60 sekunder. Din output är säker om något skulle gå fel.',
    etaSecondsLeft: (n) => `~${n}s kvar`,
    etaAlmostThere: 'Snart klart…',
    elapsedSeconds: (n) => `${n}s gått`,
    errorTitle: 'Något gick inte rätt',
    errorClose: 'Stäng',
    errorRetry: 'Försök igen',
    errorBuyPack: 'Köp ett pack',
    errUnauthorized: 'Din session har gått ut. Logga in igen.',
    errPoolEmpty: 'Du har inga outputs kvar. Köp ett nytt pack för att fortsätta.',
    errRateLimit: 'Du genererar för snabbt. Vänta några sekunder och försök igen.',
    errAiFailed: 'AI:n kunde inte generera den här bilden. Ditt pack är intakt — försök igen.',
    errNetwork: 'Anslutningsproblem. Kontrollera nätverket och försök igen.',
    errProject: 'Projektet hittades inte eller saknar åtkomst.',
    errModel: 'Den valda modellen är inte tillgänglig. Välj en annan.',
    errGeneric: 'Något gick inte rätt. Försök igen.',
    valNoProduct: 'Ladda upp ett produktfoto först.',
    valNoModel: 'Välj en modell från castingen.',
    valNoOutputs: 'Du har inga outputs kvar. Köp ett annat pack.',
  },
  no: {
    stagePreparing: 'Forbereder referanser',
    stageGenerating: 'Genererer med AI',
    stageFormats: 'Behandler 12 formater',
    generatingTitle: 'Genererer bildet ditt',
    generatingSub: 'Dette tar vanligvis 30–60 sekunder. Outputen din er trygg hvis noe feiler.',
    etaSecondsLeft: (n) => `~${n}s igjen`,
    etaAlmostThere: 'Snart ferdig…',
    elapsedSeconds: (n) => `${n}s gått`,
    errorTitle: 'Noe gikk galt',
    errorClose: 'Lukk',
    errorRetry: 'Prøv igjen',
    errorBuyPack: 'Kjøp pakke',
    errUnauthorized: 'Økten din er utløpt. Logg inn igjen.',
    errPoolEmpty: 'Du har ingen outputs igjen. Kjøp en ny pakke for å fortsette.',
    errRateLimit: 'Du genererer for raskt. Vent litt og prøv igjen.',
    errAiFailed: 'AI klarte ikke å generere dette bildet. Pakken din er intakt — prøv igjen.',
    errNetwork: 'Tilkoblingsproblem. Sjekk nettverket og prøv igjen.',
    errProject: 'Prosjekt ikke funnet eller mangler tilgang.',
    errModel: 'Den valgte modellen er ikke tilgjengelig. Velg en annen.',
    errGeneric: 'Noe gikk galt. Prøv igjen.',
    valNoProduct: 'Last opp et produktbilde først.',
    valNoModel: 'Velg en modell fra castingen.',
    valNoOutputs: 'Du har ingen outputs igjen. Kjøp en annen pakke.',
  },
};

/* ── Failure-mode taxonomy ─────────────────────────────────────────────── */
type StudioErrorCode =
  | 'unauthorized'
  | 'pool_empty'
  | 'rate_limit'
  | 'ai_failed'
  | 'network'
  | 'project'
  | 'model'
  | 'generic';

interface StudioError {
  code: StudioErrorCode;
  /** Optional detail from server, surfaced as small subtext. */
  detail?: string;
}

interface GeneratePayload {
  studio_project_id: string;
  type: 'still_life' | 'editorial' | 'tryon';
  product_image_url: string;
  reference_image_url?: string;
  model_id?: string;
  scene?: string;
  category: 'ROPA' | 'CALZADO' | 'ACCESORIO';
  product_name?: string;
  user_prompt?: string;
}

interface Asset {
  id: string;
  asset_type: string;
  name: string;
  url: string;
  metadata: Record<string, unknown> | null;
  is_style_memory: boolean;
  style_memory_role: string | null;
  created_at: string;
}

interface AimilyModel {
  id: string;
  name: string;
  headshot_url: string;
  gender: string | null;
  complexion: string | null;
  hair_style: string | null;
  hair_color: string | null;
  description: string | null;
}

interface Project {
  id: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_palette: string[] | null;
}

interface Props {
  project: Project;
  assets: Asset[];
  models: AimilyModel[];
  outputs_remaining: number;
  pack_count: number;
  isAdmin?: boolean;
}

type OutputType = 'still_life' | 'editorial' | 'tryon';

const STILL_LIFE_SCENES = [
  { key: 'sun_on_stone', label: 'Sun on Stone' },
  { key: 'still_breakfast', label: 'Still Breakfast' },
  { key: 'atelier_floor', label: 'Atelier Floor' },
  { key: 'gallery_plinth', label: 'Gallery Plinth' },
  { key: 'window_light', label: 'Window Light' },
  { key: 'sand_and_shell', label: 'Sand & Shell' },
  { key: 'color_wall', label: 'Color Wall' },
  { key: 'ceramic_still', label: 'Ceramic Still' },
];

const EDITORIAL_SCENES = [
  { key: 'street', label: 'Street' },
  { key: 'cafe', label: 'Café' },
  { key: 'beach', label: 'Beach' },
  { key: 'office', label: 'Office' },
  { key: 'runway', label: 'Runway' },
  { key: 'nature', label: 'Nature' },
  { key: 'urban', label: 'Urban' },
  { key: 'white-studio', label: 'White Studio' },
  { key: 'marble', label: 'Marble' },
  { key: 'gradient', label: 'Gradient' },
];

type GenderFilter = 'all' | 'female' | 'male';

export default function ProjectWorkspaceClient(props: Props) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = STUDIO_WORKSPACE_I18N[language] ?? STUDIO_WORKSPACE_I18N.en;
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [type, setType] = useState<OutputType>('editorial');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [productUploading, setProductUploading] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [modelId, setModelId] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [scene, setScene] = useState('');
  const [category, setCategory] = useState<'ROPA' | 'CALZADO' | 'ACCESORIO'>('ROPA');
  const [productName, setProductName] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studioError, setStudioError] = useState<StudioError | null>(null);
  const [progressStage, setProgressStage] = useState<0 | 1 | 2 | 3>(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const lastPayloadRef = useRef<GeneratePayload | null>(null);
  const [recentAssets, setRecentAssets] = useState<Asset[]>(props.assets);
  const [outputsRemaining, setOutputsRemaining] = useState(props.outputs_remaining);

  /* Drive elapsed timer + auto-advance stages while a request is in flight.
   * Stage 0 → 1 at 1.6s (preparing → AI), stage 2 (formats) fires after the
   * fetch resolves, stage 3 = done (then close after a brief flash). */
  useEffect(() => {
    if (!generating) return;
    const startedAt = Date.now();
    setElapsedSec(0);
    setProgressStage(0);
    const id = window.setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      setElapsedSec(s);
      setProgressStage((prev) => {
        if (prev === 0 && s >= 2) return 1;
        return prev;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [generating]);

  const filteredModels = genderFilter === 'all'
    ? props.models
    : props.models.filter((m) => m.gender === genderFilter);

  const uploadImage = async (file: File, kind: 'product' | 'reference'): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('studio_project_id', props.project.id);
    fd.append('kind', kind);
    try {
      const res = await fetch('/api/studio/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      return json.url as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      return null;
    }
  };

  const scenes = type === 'still_life' ? STILL_LIFE_SCENES : type === 'editorial' ? EDITORIAL_SCENES : [];

  /* Build the request payload from current form state. Returns null if the
   * form is incomplete — the caller surfaces a validation message. */
  const buildPayload = (): GeneratePayload | { _validation: string } => {
    if (!productImageUrl) return { _validation: 'no_product' };
    if ((type === 'editorial' || type === 'tryon') && !modelId)
      return { _validation: 'no_model' };
    if (!props.isAdmin && outputsRemaining <= 0)
      return { _validation: 'no_outputs' };
    return {
      studio_project_id: props.project.id,
      type,
      product_image_url: productImageUrl,
      reference_image_url: referenceImageUrl || undefined,
      model_id: modelId || undefined,
      scene: scene || undefined,
      category,
      product_name: productName || undefined,
      user_prompt: userPrompt || undefined,
    };
  };

  /* Map an HTTP response (or thrown fetch error) to a structured StudioError
   * so the UI can show a specific, actionable message + the right CTA. */
  const classifyError = async (
    res: Response | null,
    thrown?: unknown
  ): Promise<StudioError> => {
    if (!res) {
      // fetch threw — almost always network
      if (thrown instanceof TypeError) return { code: 'network' };
      return { code: 'generic', detail: thrown instanceof Error ? thrown.message : undefined };
    }
    let body: Record<string, unknown> = {};
    try { body = await res.json(); } catch { /* leave empty */ }
    const detail = typeof body.error === 'string' ? body.error : undefined;
    if (res.status === 401) return { code: 'unauthorized' };
    if (res.status === 402) return { code: 'pool_empty' };
    if (res.status === 429) return { code: 'rate_limit' };
    if (res.status === 404) {
      if (detail?.toLowerCase().includes('model')) return { code: 'model', detail };
      return { code: 'project', detail };
    }
    if (res.status === 400 && detail?.toLowerCase().includes('model')) {
      return { code: 'model', detail };
    }
    if (res.status === 502 || res.status === 500 || detail?.toLowerCase().includes('ai')) {
      return { code: 'ai_failed', detail };
    }
    return { code: 'generic', detail };
  };

  const runGenerate = async (payload: GeneratePayload) => {
    lastPayloadRef.current = payload;
    setGenerating(true);
    setError(null);
    setStudioError(null);

    let res: Response | null = null;
    try {
      res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await classifyError(res);
        setStudioError(err);
        return;
      }
      const json = await res.json();

      // Stage 2 (formats) flash, then stage 3 (done), then close.
      setProgressStage(2);
      await new Promise((r) => setTimeout(r, 600));
      setProgressStage(3);
      await new Promise((r) => setTimeout(r, 400));

      // Optimistic add to recent
      setRecentAssets((prev) => [
        {
          id: json.asset_id,
          asset_type: payload.type,
          name: `${payload.type} — ${payload.product_name || 'output'}`,
          url: json.master_url,
          metadata: { provider: json.provider, formats: json.formats },
          is_style_memory: false,
          style_memory_role: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      if (typeof json.outputs_remaining === 'number')
        setOutputsRemaining(json.outputs_remaining);
      setGeneratorOpen(false);
      setProductImageUrl('');
      setReferenceImageUrl('');
      setUserPrompt('');
    } catch (e) {
      console.error('[Studio] generate fetch threw:', e);
      const err = await classifyError(res, e);
      setStudioError(err);
    } finally {
      setGenerating(false);
      setProgressStage(0);
    }
  };

  const handleGenerate = async () => {
    const built = buildPayload();
    if ('_validation' in built) {
      if (built._validation === 'no_product') setError(t.valNoProduct);
      else if (built._validation === 'no_model') setError(t.valNoModel);
      else setError(t.valNoOutputs);
      return;
    }
    setError(null);
    await runGenerate(built);
  };

  const handleRetry = async () => {
    if (!lastPayloadRef.current) {
      setStudioError(null);
      return;
    }
    await runGenerate(lastPayloadRef.current);
  };

  const toggleStyleMemory = async (assetId: string, currentlyMarked: boolean) => {
    try {
      const res = currentlyMarked
        ? await fetch(`/api/studio/style-memory?asset_id=${assetId}`, { method: 'DELETE' })
        : await fetch('/api/studio/style-memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asset_id: assetId, marked: true, role: 'principal' }),
          });
      if (!res.ok) throw new Error();
      setRecentAssets(
        recentAssets.map((a) => (a.id === assetId ? { ...a, is_style_memory: !currentlyMarked } : a))
      );
    } catch {
      // silent fail
    }
  };

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12 xl:px-16">
      {/* Full-width container — content-first workspaces use the entire viewport
          on widescreen monitors. Soft cap at 2200px so 4K/5K monitors don't end
          up with absurdly wide flow. */}
      <div className="mx-auto max-w-[2200px]">
        {/* Back */}
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 text-[13px] text-carbon/50 hover:text-carbon mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Studio
        </Link>

        {/* Header */}
        <header className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-2">
              {props.project.brand_name}
            </p>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.05]">
              Campañas
            </h1>
            <p className="mt-3 text-[14px] text-carbon/50">
              {props.isAdmin
                ? 'Admin · outputs ilimitados (sin descuento de pack)'
                : outputsRemaining > 0
                  ? `${outputsRemaining} outputs disponibles · ${props.pack_count} ${props.pack_count === 1 ? 'pack' : 'packs'}`
                  : '0 outputs · compra un pack para generar'}
            </p>
          </div>

          {props.isAdmin || outputsRemaining > 0 ? (
            <button
              onClick={() => setGeneratorOpen(!generatorOpen)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
            >
              <Plus className="h-4 w-4" />
              Nueva foto
            </button>
          ) : (
            <Link
              href="/studio/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
            >
              <ShoppingBag className="h-4 w-4" />
              Comprar pack
            </Link>
          )}
        </header>

        {/* Generator panel (inline) — renders form, progress, or error state */}
        {generatorOpen && (
          <div className="bg-white rounded-[20px] p-10 mb-10">
            {studioError ? (
              <GenerationError
                t={t}
                error={studioError}
                onClose={() => {
                  setStudioError(null);
                  setGeneratorOpen(false);
                }}
                onRetry={handleRetry}
                isAdmin={!!props.isAdmin}
              />
            ) : generating ? (
              <GenerationProgress t={t} stage={progressStage} elapsed={elapsedSec} />
            ) : (
            <>
            <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.03em] mb-6">
              Nuevo output
            </h2>

            {error && (
              <div className="mb-6 rounded-[12px] bg-red-50 text-red-800 px-4 py-3 text-[13px]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type selector — canonical SegmentedPill (CLAUDE.md gold standard) */}
              <div>
                <label className="block text-[13px] font-medium text-carbon/70 mb-3 tracking-[-0.02em]">
                  Tipo
                </label>
                <SegmentedPill<OutputType>
                  options={[
                    { id: 'still_life', label: 'Still life' },
                    { id: 'editorial', label: 'Editorial' },
                    { id: 'tryon', label: 'Try-on' },
                  ]}
                  value={type}
                  onChange={setType}
                  size="md"
                />
              </div>

              {/* Category — same canonical pill */}
              <div>
                <label className="block text-[13px] font-medium text-carbon/70 mb-3 tracking-[-0.02em]">
                  Categoría
                </label>
                <SegmentedPill
                  options={[
                    { id: 'ROPA', label: 'Ropa' },
                    { id: 'CALZADO', label: 'Calzado' },
                    { id: 'ACCESORIO', label: 'Accesorio' },
                  ]}
                  value={category}
                  onChange={(v) => setCategory(v as 'ROPA' | 'CALZADO' | 'ACCESORIO')}
                  size="md"
                />
              </div>

              {/* Upload squares — product + reference */}
              <div className="md:col-span-2">
                <div className={`grid gap-4 ${type === 'editorial' ? 'grid-cols-2' : 'grid-cols-1 max-w-[340px]'}`}>
                  <UploadSquare
                    label="Foto del producto"
                    required
                    imageUrl={productImageUrl}
                    uploading={productUploading}
                    onUpload={async (file) => {
                      setProductUploading(true);
                      setError(null);
                      const url = await uploadImage(file, 'product');
                      if (url) setProductImageUrl(url);
                      setProductUploading(false);
                    }}
                    onClear={() => setProductImageUrl('')}
                  />
                  {type === 'editorial' && (
                    <UploadSquare
                      label="Foto de referencia"
                      sublabel="opcional · mood / composición"
                      imageUrl={referenceImageUrl}
                      uploading={referenceUploading}
                      onUpload={async (file) => {
                        setReferenceUploading(true);
                        setError(null);
                        const url = await uploadImage(file, 'reference');
                        if (url) setReferenceImageUrl(url);
                        setReferenceUploading(false);
                      }}
                      onClear={() => setReferenceImageUrl('')}
                    />
                  )}
                </div>
              </div>

              {/* Product name (optional) */}
              <div>
                <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                  Nombre del producto (opcional)
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Vestido Mira / Bolso Nudo / etc."
                  className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
                />
              </div>

              {/* Scene */}
              {scenes.length > 0 && (
                <div>
                  <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                    Escena
                  </label>
                  <select
                    value={scene}
                    onChange={(e) => setScene(e.target.value)}
                    className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors"
                  >
                    <option value="">— Elige una —</option>
                    {scenes.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Model casting selector — filters + larger grid (3+ rows always visible) */}
              {(type === 'editorial' || type === 'tryon') && (
                <div className="md:col-span-2">
                  <div className="flex items-end justify-between mb-3 gap-3 flex-wrap">
                    <label className="block text-[13px] font-medium text-carbon/70 tracking-[-0.02em]">
                      Modelo del casting Aimily ({filteredModels.length} de {props.models.length})
                    </label>
                    <SegmentedPill<GenderFilter>
                      options={[
                        { id: 'all', label: 'Todos' },
                        { id: 'female', label: 'Mujer' },
                        { id: 'male', label: 'Hombre' },
                      ]}
                      value={genderFilter}
                      onChange={setGenderFilter}
                      size="sm"
                    />
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3 max-h-[680px] overflow-y-auto p-3 bg-carbon/[0.02] rounded-[14px]">
                    {filteredModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModelId(m.id)}
                        className={`group relative aspect-[3/4] rounded-[10px] overflow-hidden transition-all ${
                          modelId === m.id ? 'ring-2 ring-carbon ring-offset-2 ring-offset-shade scale-[1.03]' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.headshot_url} alt={m.name} className="h-full w-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[11px] py-1 px-1.5 text-center truncate">
                          {m.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* User prompt */}
              <div className="md:col-span-2">
                <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                  Dirección artística (opcional)
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  rows={2}
                  placeholder="Toques específicos: mood, paleta, atmósfera..."
                  className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center pt-6 border-t border-carbon/[0.06]">
              <button
                onClick={() => { setGeneratorOpen(false); setError(null); }}
                className="px-5 py-2 text-[13px] font-medium text-carbon/60 hover:text-carbon"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={!productImageUrl}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90 disabled:opacity-50"
              >
                Generar
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            </>
            )}
          </div>
        )}

        {/* Empty gallery state */}
        {recentAssets.length === 0 && !generatorOpen && (
          <div className="mx-auto max-w-2xl rounded-[20px] bg-white p-12 md:p-16 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-carbon/[0.04] flex items-center justify-center mb-6">
              <ImageIcon className="h-7 w-7 text-carbon/40" />
            </div>
            <h2 className="text-[24px] md:text-[28px] font-medium text-carbon tracking-[-0.03em] mb-4">
              Tu primera campaña te espera
            </h2>
            <p className="text-[14px] text-carbon/55 leading-[1.7] mb-8">
              Sube una foto de tu producto, elige un modelo del casting Aimily,
              y recibe el editorial en minutos.
            </p>
            {props.isAdmin || outputsRemaining > 0 ? (
              <button
                onClick={() => setGeneratorOpen(true)}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-carbon text-white text-[14px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
              >
                Generar primera foto
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/studio/new"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-carbon text-white text-[14px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
              >
                Comprar pack
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}

        {/* Gallery — wider grids on widescreen so the user sees more outputs per fold */}
        {recentAssets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-4">
            {recentAssets.map((a) => (
              <div key={a.id} className="group relative bg-white rounded-[16px] overflow-hidden">
                <div className="relative aspect-[3/4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                  <button
                    onClick={() => toggleStyleMemory(a.id, a.is_style_memory)}
                    className={`absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                      a.is_style_memory
                        ? 'bg-carbon text-white'
                        : 'bg-white/80 text-carbon/40 hover:text-carbon opacity-0 group-hover:opacity-100'
                    }`}
                    title={a.is_style_memory ? 'Quitar de Style Memory' : 'Marcar como brand-correcto'}
                  >
                    <Star className={`h-4 w-4 ${a.is_style_memory ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-[12px] font-medium text-carbon truncate">{a.name}</p>
                  <p className="text-[11px] text-carbon/40 capitalize">{a.asset_type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// GenerationProgress — overlay shown inside the generator panel while a
// /api/studio/generate call is in flight. Three pseudo-stages driven by
// elapsed time, with a typical-ETA countdown for the long AI step.
// gpt-image-1.5 quality=high usually finishes in 30–60s; pick 45 as the
// baseline so the countdown reads honestly for most users.
// ─────────────────────────────────────────────────────────────────────────
const ETA_BASELINE_SECONDS = 45;

interface GenerationProgressProps {
  t: (typeof STUDIO_WORKSPACE_I18N)[Language];
  stage: 0 | 1 | 2 | 3;
  elapsed: number;
}

function GenerationProgress({ t, stage, elapsed }: GenerationProgressProps) {
  // The AI stage starts at ~2s. Countdown estimate from there.
  const aiSecondsElapsed = Math.max(elapsed - 2, 0);
  const etaLeft = Math.max(ETA_BASELINE_SECONDS - aiSecondsElapsed, 0);
  const showAlmostThere = stage >= 1 && etaLeft === 0;

  const stages = [
    { idx: 0, label: t.stagePreparing },
    { idx: 1, label: t.stageGenerating },
    { idx: 2, label: t.stageFormats },
  ] as const;

  return (
    <div className="flex flex-col items-center text-center py-8">
      <h2 className="text-[22px] md:text-[24px] font-semibold text-carbon tracking-[-0.03em] mb-2">
        {t.generatingTitle}
      </h2>
      <p className="text-[13px] text-carbon/50 max-w-md leading-[1.7] mb-10">
        {t.generatingSub}
      </p>

      <div className="w-full max-w-md space-y-3">
        {stages.map((s) => {
          // stage 3 = done flash → mark all stages completed
          const completed = stage > s.idx || stage === 3;
          const active = stage === s.idx;
          return (
            <div
              key={s.idx}
              className={`flex items-center gap-3 rounded-[14px] px-4 py-3 transition-colors ${
                active
                  ? 'bg-carbon/[0.04]'
                  : completed
                  ? 'bg-carbon/[0.02]'
                  : 'bg-transparent'
              }`}
            >
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                  completed
                    ? 'bg-carbon text-white'
                    : active
                    ? 'bg-white text-carbon ring-1 ring-carbon/15'
                    : 'bg-carbon/[0.05] text-carbon/30'
                }`}
              >
                {completed ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </div>
              <span
                className={`text-[13px] font-medium tracking-[-0.01em] ${
                  completed
                    ? 'text-carbon/60'
                    : active
                    ? 'text-carbon'
                    : 'text-carbon/30'
                }`}
              >
                {s.label}
              </span>
              {active && s.idx === 1 && (
                <span className="ml-auto text-[12px] text-carbon/45 tabular-nums">
                  {showAlmostThere ? t.etaAlmostThere : t.etaSecondsLeft(etaLeft)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-[11px] text-carbon/35 tabular-nums">
        {t.elapsedSeconds(elapsed)}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// GenerationError — overlay shown inside the generator panel when a
// generate call failed. Specific message per failure mode + the right CTA
// (retry / buy pack / close).
// ─────────────────────────────────────────────────────────────────────────
interface GenerationErrorProps {
  t: (typeof STUDIO_WORKSPACE_I18N)[Language];
  error: StudioError;
  onClose: () => void;
  onRetry: () => void;
  isAdmin: boolean;
}

function GenerationError({ t, error, onClose, onRetry, isAdmin }: GenerationErrorProps) {
  const message = (() => {
    switch (error.code) {
      case 'unauthorized': return t.errUnauthorized;
      case 'pool_empty':   return t.errPoolEmpty;
      case 'rate_limit':   return t.errRateLimit;
      case 'ai_failed':    return t.errAiFailed;
      case 'network':      return t.errNetwork;
      case 'project':      return t.errProject;
      case 'model':        return t.errModel;
      default:             return t.errGeneric;
    }
  })();

  // Pool empty → primary CTA is Buy pack. Admins should never see this code,
  // but defensively: admins always retry (their bypass means no real cost).
  const isPoolEmpty = error.code === 'pool_empty' && !isAdmin;
  const canRetry = error.code !== 'unauthorized' && !isPoolEmpty;

  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="h-12 w-12 rounded-full bg-carbon/[0.05] flex items-center justify-center mb-5">
        <AlertCircle className="h-6 w-6 text-carbon/55" strokeWidth={1.5} />
      </div>
      <h2 className="text-[22px] md:text-[24px] font-semibold text-carbon tracking-[-0.03em] mb-3">
        {t.errorTitle}
      </h2>
      <p className="text-[14px] text-carbon/60 max-w-md leading-[1.7] mb-2">
        {message}
      </p>
      {error.detail && (
        <p className="text-[11px] text-carbon/30 max-w-md leading-relaxed mb-2 font-mono">
          {error.detail}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors"
        >
          {t.errorClose}
        </button>
        {isPoolEmpty ? (
          <Link
            href="/studio/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            {t.errorBuyPack}
          </Link>
        ) : canRetry ? (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {t.errorRetry}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// UploadSquare — big aspect-square drop zone with preview state.
// Click-to-pick, drag-and-drop, EXIF rotate handled server-side.
// ─────────────────────────────────────────────────────────────────────────
interface UploadSquareProps {
  label: string;
  sublabel?: string;
  required?: boolean;
  imageUrl: string;
  uploading: boolean;
  onUpload: (file: File) => Promise<void> | void;
  onClear: () => void;
}

function UploadSquare({ label, sublabel, required, imageUrl, uploading, onUpload, onClear }: UploadSquareProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    void onUpload(file);
  }, [onUpload]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const hasImage = !!imageUrl;

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-baseline gap-1.5">
        <span className="text-[13px] font-medium text-carbon tracking-[-0.02em]">{label}</span>
        {required && <span className="text-[11px] text-carbon/40">·  obligatorio</span>}
        {sublabel && !required && <span className="text-[11px] text-carbon/40">·  {sublabel}</span>}
      </div>

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative aspect-square rounded-[16px] overflow-hidden cursor-pointer transition-all
          ${hasImage
            ? 'bg-carbon/[0.04]'
            : `bg-carbon/[0.03] border-2 border-dashed ${
                dragOver ? 'border-carbon/50 bg-carbon/[0.06]' : 'border-carbon/15 hover:border-carbon/35'
              }`}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-carbon/40 z-10">
            <Loader2 className="h-7 w-7 text-white animate-spin" />
          </div>
        )}

        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
              aria-label="Quitar imagen"
            >
              <X className="h-4 w-4 text-carbon" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-[11px] font-medium text-carbon shadow-sm transition-colors"
            >
              <Upload className="h-3 w-3" /> Cambiar
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-carbon/[0.06] flex items-center justify-center">
              <Upload className="h-5 w-5 text-carbon/50" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-carbon">Arrastra una foto aquí</p>
              <p className="text-[11px] text-carbon/45">o haz click para elegir un archivo</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
