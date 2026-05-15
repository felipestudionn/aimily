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
  Download,
  User,
  Play,
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
  valNoReference: string;
  lightboxDownloadMaster: string;
  lightboxDownloadFormat: string;
  lightboxClose: string;
  lightboxLoading: string;
  lightboxFormatsProcessing: string;
  lightboxOpenAria: string;
  moreOptions: string;
  hideOptions: string;
  optOrientation: string;
  optFraming: string;
  optLight: string;
  regenerateLabel: string;
  regenCloser: string;
  regenLessBg: string;
  regenBetterLight: string;
  regenerating: string;
  castingUseModel: string;
  castingCancel: string;
  castingSelected: string;
  lightboxDownloadAllZip: string;
  modelBlockEmpty: string;
  modelBlockSub: string;
  modelBlockChange: string;
  ctxMoodLabel: string;
  ctxMoodPh: string;
  ctxPaletteLabel: string;
  ctxPalettePh: string;
  ctxConsumerLabel: string;
  ctxConsumerPh: string;
  variationsTitle: string;
  varColorLabel: string;
  varBgLabel: string;
  varModelLabel: string;
  varColorPh: string;
  varBgPh: string;
  varGenerate: string;
  varProcessing: string;
  varVideoLabel: string;
  vidDurationLabel: string;
  vidMotionLabel: string;
  vidGenerate: string;
  vidProcessing: string;
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
    valNoReference: 'Upload a reference photo — it drives the whole composition.',
    lightboxDownloadMaster: 'Download master',
    lightboxDownloadFormat: 'Download',
    lightboxClose: 'Close',
    lightboxLoading: 'Loading formats…',
    lightboxFormatsProcessing: 'Formats are still processing — try again in a moment.',
    lightboxOpenAria: 'Open output',
    moreOptions: 'More options',
    hideOptions: 'Hide options',
    optOrientation: 'Orientation',
    optFraming: 'Framing',
    optLight: 'Light',
    regenerateLabel: 'Quick variations',
    regenCloser: 'Closer',
    regenLessBg: 'Less background',
    regenBetterLight: 'Better light',
    regenerating: 'Regenerating…',
    castingUseModel: 'Use this model',
    castingCancel: 'Cancel',
    castingSelected: 'Selected',
    lightboxDownloadAllZip: 'Download all (ZIP)',
    modelBlockEmpty: 'Pick a model',
    modelBlockSub: 'Click to browse the casting',
    modelBlockChange: 'Change',
    ctxMoodLabel: 'Mood',
    ctxMoodPh: 'editorial · minimal · raw…',
    ctxPaletteLabel: 'Palette',
    ctxPalettePh: 'cream · navy · burnt orange…',
    ctxConsumerLabel: 'Consumer',
    ctxConsumerPh: 'urban professional 25-35…',
    variationsTitle: 'Variations on this photo',
    varColorLabel: 'Change color',
    varBgLabel: 'Change background',
    varModelLabel: 'Change model',
    varColorPh: 'burnt orange linen · forest green silk…',
    varBgPh: 'warm beige plaster wall · afternoon light…',
    varGenerate: 'Generate variation',
    varProcessing: 'Generating variation…',
    varVideoLabel: 'Make video',
    vidDurationLabel: 'Duration',
    vidMotionLabel: 'Motion',
    vidGenerate: 'Create video',
    vidProcessing: 'Creating video… (2-4 min)',
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
    valNoReference: 'Sube una foto de referencia — es la que guía toda la composición.',
    lightboxDownloadMaster: 'Descargar master',
    lightboxDownloadFormat: 'Descargar',
    lightboxClose: 'Cerrar',
    lightboxLoading: 'Cargando formatos…',
    lightboxFormatsProcessing: 'Los formatos siguen procesándose — vuelve en un momento.',
    lightboxOpenAria: 'Abrir output',
    moreOptions: 'Más opciones',
    hideOptions: 'Ocultar opciones',
    optOrientation: 'Orientación',
    optFraming: 'Encuadre',
    optLight: 'Luz',
    regenerateLabel: 'Variaciones rápidas',
    regenCloser: 'Más cerca',
    regenLessBg: 'Menos fondo',
    regenBetterLight: 'Mejor luz',
    regenerating: 'Regenerando…',
    castingUseModel: 'Usar este modelo',
    castingCancel: 'Cancelar',
    castingSelected: 'Seleccionado',
    lightboxDownloadAllZip: 'Descargar todo (ZIP)',
    modelBlockEmpty: 'Elegir modelo',
    modelBlockSub: 'Haz click para ver el casting',
    modelBlockChange: 'Cambiar',
    ctxMoodLabel: 'Mood',
    ctxMoodPh: 'editorial · minimal · raw…',
    ctxPaletteLabel: 'Paleta',
    ctxPalettePh: 'crudo · marino · naranja quemado…',
    ctxConsumerLabel: 'Cliente',
    ctxConsumerPh: 'profesional urbano 25-35…',
    variationsTitle: 'Variaciones sobre esta foto',
    varColorLabel: 'Cambiar color',
    varBgLabel: 'Cambiar fondo',
    varModelLabel: 'Cambiar modelo',
    varColorPh: 'lino naranja quemado · seda verde bosque…',
    varBgPh: 'pared yeso beige · luz de tarde…',
    varGenerate: 'Generar variación',
    varProcessing: 'Generando variación…',
    varVideoLabel: 'Hacer vídeo',
    vidDurationLabel: 'Duración',
    vidMotionLabel: 'Movimiento',
    vidGenerate: 'Crear vídeo',
    vidProcessing: 'Creando vídeo… (2-4 min)',
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
    valNoReference: 'Charge une photo de référence — elle guide toute la composition.',
    lightboxDownloadMaster: 'Télécharger le master',
    lightboxDownloadFormat: 'Télécharger',
    lightboxClose: 'Fermer',
    lightboxLoading: 'Chargement des formats…',
    lightboxFormatsProcessing: "Les formats sont encore en traitement — réessaie dans un instant.",
    lightboxOpenAria: "Ouvrir l'output",
    moreOptions: 'Plus d’options',
    hideOptions: 'Masquer les options',
    optOrientation: 'Orientation',
    optFraming: 'Cadrage',
    optLight: 'Lumière',
    regenerateLabel: 'Variations rapides',
    regenCloser: 'Plus près',
    regenLessBg: 'Moins de fond',
    regenBetterLight: 'Meilleure lumière',
    regenerating: 'Régénération…',
    castingUseModel: 'Utiliser ce mannequin',
    castingCancel: 'Annuler',
    castingSelected: 'Sélectionné',
    lightboxDownloadAllZip: 'Tout télécharger (ZIP)',
    modelBlockEmpty: 'Choisir un mannequin',
    modelBlockSub: 'Clique pour parcourir le casting',
    modelBlockChange: 'Changer',
    ctxMoodLabel: 'Mood',
    ctxMoodPh: 'éditorial · minimal · raw…',
    ctxPaletteLabel: 'Palette',
    ctxPalettePh: 'crème · marine · orange brûlé…',
    ctxConsumerLabel: 'Client',
    ctxConsumerPh: 'professionnel urbain 25-35…',
    variationsTitle: 'Variations sur cette photo',
    varColorLabel: 'Changer la couleur',
    varBgLabel: "Changer l'arrière-plan",
    varModelLabel: 'Changer le mannequin',
    varColorPh: 'lin orange brûlé · soie vert forêt…',
    varBgPh: 'mur en plâtre beige · lumière après-midi…',
    varGenerate: 'Générer la variation',
    varProcessing: 'Génération de la variation…',
    varVideoLabel: 'Créer une vidéo',
    vidDurationLabel: 'Durée',
    vidMotionLabel: 'Mouvement',
    vidGenerate: 'Créer la vidéo',
    vidProcessing: 'Création de la vidéo… (2-4 min)',
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
    valNoReference: 'Carica una foto di riferimento — guida tutta la composizione.',
    lightboxDownloadMaster: 'Scarica master',
    lightboxDownloadFormat: 'Scarica',
    lightboxClose: 'Chiudi',
    lightboxLoading: 'Caricamento formati…',
    lightboxFormatsProcessing: 'I formati sono ancora in elaborazione — riprova tra un momento.',
    lightboxOpenAria: 'Apri output',
    moreOptions: 'Più opzioni',
    hideOptions: 'Nascondi opzioni',
    optOrientation: 'Orientamento',
    optFraming: 'Inquadratura',
    optLight: 'Luce',
    regenerateLabel: 'Variazioni rapide',
    regenCloser: 'Più vicino',
    regenLessBg: 'Meno sfondo',
    regenBetterLight: 'Luce migliore',
    regenerating: 'Rigenerazione…',
    castingUseModel: 'Usa questo modello',
    castingCancel: 'Annulla',
    castingSelected: 'Selezionato',
    lightboxDownloadAllZip: 'Scarica tutto (ZIP)',
    modelBlockEmpty: 'Scegli un modello',
    modelBlockSub: 'Clicca per sfogliare il casting',
    modelBlockChange: 'Cambia',
    ctxMoodLabel: 'Mood',
    ctxMoodPh: 'editoriale · minimal · raw…',
    ctxPaletteLabel: 'Palette',
    ctxPalettePh: 'crema · blu navy · arancio bruciato…',
    ctxConsumerLabel: 'Cliente',
    ctxConsumerPh: 'professionista urbano 25-35…',
    variationsTitle: 'Variazioni su questa foto',
    varColorLabel: 'Cambia colore',
    varBgLabel: 'Cambia sfondo',
    varModelLabel: 'Cambia modello',
    varColorPh: 'lino arancio bruciato · seta verde bosco…',
    varBgPh: 'muro in intonaco beige · luce pomeridiana…',
    varGenerate: 'Genera variazione',
    varProcessing: 'Generazione variazione…',
    varVideoLabel: 'Crea video',
    vidDurationLabel: 'Durata',
    vidMotionLabel: 'Movimento',
    vidGenerate: 'Crea video',
    vidProcessing: 'Creazione video… (2-4 min)',
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
    valNoReference: 'Lade ein Referenzfoto hoch — es leitet die ganze Komposition.',
    lightboxDownloadMaster: 'Master herunterladen',
    lightboxDownloadFormat: 'Herunterladen',
    lightboxClose: 'Schließen',
    lightboxLoading: 'Formate werden geladen…',
    lightboxFormatsProcessing: 'Die Formate werden noch verarbeitet — versuche es gleich erneut.',
    lightboxOpenAria: 'Output öffnen',
    moreOptions: 'Weitere Optionen',
    hideOptions: 'Optionen ausblenden',
    optOrientation: 'Ausrichtung',
    optFraming: 'Bildausschnitt',
    optLight: 'Licht',
    regenerateLabel: 'Schnelle Variationen',
    regenCloser: 'Näher',
    regenLessBg: 'Weniger Hintergrund',
    regenBetterLight: 'Besseres Licht',
    regenerating: 'Wird neu generiert…',
    castingUseModel: 'Dieses Modell verwenden',
    castingCancel: 'Abbrechen',
    castingSelected: 'Ausgewählt',
    lightboxDownloadAllZip: 'Alles herunterladen (ZIP)',
    modelBlockEmpty: 'Modell auswählen',
    modelBlockSub: 'Klicke, um das Casting zu durchsuchen',
    modelBlockChange: 'Ändern',
    ctxMoodLabel: 'Mood',
    ctxMoodPh: 'editorial · minimal · raw…',
    ctxPaletteLabel: 'Palette',
    ctxPalettePh: 'creme · marine · gebranntes Orange…',
    ctxConsumerLabel: 'Kunde',
    ctxConsumerPh: 'urbaner Professional 25-35…',
    variationsTitle: 'Variationen dieses Fotos',
    varColorLabel: 'Farbe ändern',
    varBgLabel: 'Hintergrund ändern',
    varModelLabel: 'Modell ändern',
    varColorPh: 'verbranntes orange Leinen · waldgrüne Seide…',
    varBgPh: 'warme beige Putzwand · Nachmittagslicht…',
    varGenerate: 'Variation erstellen',
    varProcessing: 'Variation wird erstellt…',
    varVideoLabel: 'Video erstellen',
    vidDurationLabel: 'Dauer',
    vidMotionLabel: 'Bewegung',
    vidGenerate: 'Video erstellen',
    vidProcessing: 'Video wird erstellt… (2-4 min)',
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
    valNoReference: 'Carrega uma foto de referência — guia toda a composição.',
    lightboxDownloadMaster: 'Descarregar master',
    lightboxDownloadFormat: 'Descarregar',
    lightboxClose: 'Fechar',
    lightboxLoading: 'A carregar formatos…',
    lightboxFormatsProcessing: 'Os formatos ainda estão a ser processados — tenta de novo num momento.',
    lightboxOpenAria: 'Abrir output',
    moreOptions: 'Mais opções',
    hideOptions: 'Ocultar opções',
    optOrientation: 'Orientação',
    optFraming: 'Enquadramento',
    optLight: 'Luz',
    regenerateLabel: 'Variações rápidas',
    regenCloser: 'Mais perto',
    regenLessBg: 'Menos fundo',
    regenBetterLight: 'Melhor luz',
    regenerating: 'A regenerar…',
    castingUseModel: 'Usar este modelo',
    castingCancel: 'Cancelar',
    castingSelected: 'Selecionado',
    lightboxDownloadAllZip: 'Descarregar tudo (ZIP)',
    modelBlockEmpty: 'Escolher modelo',
    modelBlockSub: 'Clica para ver o casting',
    modelBlockChange: 'Mudar',
    ctxMoodLabel: 'Mood',
    ctxMoodPh: 'editorial · minimal · raw…',
    ctxPaletteLabel: 'Paleta',
    ctxPalettePh: 'creme · marinho · laranja queimado…',
    ctxConsumerLabel: 'Cliente',
    ctxConsumerPh: 'profissional urbano 25-35…',
    variationsTitle: 'Variações sobre esta foto',
    varColorLabel: 'Mudar cor',
    varBgLabel: 'Mudar fundo',
    varModelLabel: 'Mudar modelo',
    varColorPh: 'linho laranja queimado · seda verde floresta…',
    varBgPh: 'parede de estuque bege · luz de tarde…',
    varGenerate: 'Gerar variação',
    varProcessing: 'A gerar variação…',
    varVideoLabel: 'Criar vídeo',
    vidDurationLabel: 'Duração',
    vidMotionLabel: 'Movimento',
    vidGenerate: 'Criar vídeo',
    vidProcessing: 'A criar vídeo… (2-4 min)',
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
    valNoReference: 'Upload een referentiefoto — die stuurt de hele compositie.',
    lightboxDownloadMaster: 'Master downloaden',
    lightboxDownloadFormat: 'Downloaden',
    lightboxClose: 'Sluiten',
    lightboxLoading: 'Formaten laden…',
    lightboxFormatsProcessing: 'Formaten worden nog verwerkt — probeer het zo opnieuw.',
    lightboxOpenAria: 'Output openen',
    moreOptions: 'Meer opties',
    hideOptions: 'Opties verbergen',
    optOrientation: 'Oriëntatie',
    optFraming: 'Kadrering',
    optLight: 'Licht',
    regenerateLabel: 'Snelle variaties',
    regenCloser: 'Dichterbij',
    regenLessBg: 'Minder achtergrond',
    regenBetterLight: 'Beter licht',
    regenerating: 'Regenereren…',
    castingUseModel: 'Dit model gebruiken',
    castingCancel: 'Annuleren',
    castingSelected: 'Geselecteerd',
    lightboxDownloadAllZip: 'Alles downloaden (ZIP)',
    modelBlockEmpty: 'Kies een model',
    modelBlockSub: 'Klik om de casting te bekijken',
    modelBlockChange: 'Wijzigen',
    ctxMoodLabel: 'Mood',
    ctxMoodPh: 'editorial · minimal · raw…',
    ctxPaletteLabel: 'Palet',
    ctxPalettePh: 'crème · marineblauw · gebrand oranje…',
    ctxConsumerLabel: 'Klant',
    ctxConsumerPh: 'urban professional 25-35…',
    variationsTitle: 'Variaties op deze foto',
    varColorLabel: 'Kleur wijzigen',
    varBgLabel: 'Achtergrond wijzigen',
    varModelLabel: 'Model wijzigen',
    varColorPh: 'gebrand oranje linnen · bosgroene zijde…',
    varBgPh: 'warme beige pleisterwand · middaglicht…',
    varGenerate: 'Variatie genereren',
    varProcessing: 'Variatie wordt gegenereerd…',
    varVideoLabel: 'Video maken',
    vidDurationLabel: 'Duur',
    vidMotionLabel: 'Beweging',
    vidGenerate: 'Video maken',
    vidProcessing: 'Video wordt gemaakt… (2-4 min)',
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
    valNoReference: 'Ladda upp ett referensfoto — det styr hela kompositionen.',
    lightboxDownloadMaster: 'Ladda ner master',
    lightboxDownloadFormat: 'Ladda ner',
    lightboxClose: 'Stäng',
    lightboxLoading: 'Laddar format…',
    lightboxFormatsProcessing: 'Formaten bearbetas fortfarande — försök igen om ett ögonblick.',
    lightboxOpenAria: 'Öppna output',
    moreOptions: 'Fler alternativ',
    hideOptions: 'Dölj alternativ',
    optOrientation: 'Orientering',
    optFraming: 'Bildutsnitt',
    optLight: 'Ljus',
    regenerateLabel: 'Snabba variationer',
    regenCloser: 'Närmare',
    regenLessBg: 'Mindre bakgrund',
    regenBetterLight: 'Bättre ljus',
    regenerating: 'Genererar om…',
    castingUseModel: 'Använd denna modell',
    castingCancel: 'Avbryt',
    castingSelected: 'Vald',
    lightboxDownloadAllZip: 'Ladda ner allt (ZIP)',
    modelBlockEmpty: 'Välj en modell',
    modelBlockSub: 'Klicka för att bläddra i castingen',
    modelBlockChange: 'Ändra',
    ctxMoodLabel: 'Mood',
    ctxMoodPh: 'editorial · minimal · raw…',
    ctxPaletteLabel: 'Palett',
    ctxPalettePh: 'gräddvit · marin · bränd orange…',
    ctxConsumerLabel: 'Kund',
    ctxConsumerPh: 'urban professional 25-35…',
    variationsTitle: 'Variationer av denna bild',
    varColorLabel: 'Ändra färg',
    varBgLabel: 'Ändra bakgrund',
    varModelLabel: 'Ändra modell',
    varColorPh: 'bränd orange linne · skogsgrönt siden…',
    varBgPh: 'varm beige putsvägg · eftermiddagsljus…',
    varGenerate: 'Generera variation',
    varProcessing: 'Genererar variation…',
    varVideoLabel: 'Skapa video',
    vidDurationLabel: 'Längd',
    vidMotionLabel: 'Rörelse',
    vidGenerate: 'Skapa video',
    vidProcessing: 'Skapar video… (2-4 min)',
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
    valNoReference: 'Last opp et referansebilde — det styrer hele komposisjonen.',
    lightboxDownloadMaster: 'Last ned master',
    lightboxDownloadFormat: 'Last ned',
    lightboxClose: 'Lukk',
    lightboxLoading: 'Laster formater…',
    lightboxFormatsProcessing: 'Formatene behandles fortsatt — prøv igjen om et øyeblikk.',
    lightboxOpenAria: 'Åpne output',
    moreOptions: 'Flere alternativer',
    hideOptions: 'Skjul alternativer',
    optOrientation: 'Retning',
    optFraming: 'Bildeutsnitt',
    optLight: 'Lys',
    regenerateLabel: 'Raske variasjoner',
    regenCloser: 'Nærmere',
    regenLessBg: 'Mindre bakgrunn',
    regenBetterLight: 'Bedre lys',
    regenerating: 'Genererer på nytt…',
    castingUseModel: 'Bruk denne modellen',
    castingCancel: 'Avbryt',
    castingSelected: 'Valgt',
    lightboxDownloadAllZip: 'Last ned alt (ZIP)',
    modelBlockEmpty: 'Velg en modell',
    modelBlockSub: 'Klikk for å bla i castingen',
    modelBlockChange: 'Endre',
    ctxMoodLabel: 'Mood',
    ctxMoodPh: 'editorial · minimal · raw…',
    ctxPaletteLabel: 'Palett',
    ctxPalettePh: 'krem · marine · brent oransje…',
    ctxConsumerLabel: 'Kunde',
    ctxConsumerPh: 'urban profesjonell 25-35…',
    variationsTitle: 'Variasjoner av dette bildet',
    varColorLabel: 'Endre farge',
    varBgLabel: 'Endre bakgrunn',
    varModelLabel: 'Endre modell',
    varColorPh: 'brent oransje lin · skogsgrønn silke…',
    varBgPh: 'varm beige pussvegg · ettermiddagslys…',
    varGenerate: 'Generer variasjon',
    varProcessing: 'Genererer variasjon…',
    varVideoLabel: 'Lag video',
    vidDurationLabel: 'Varighet',
    vidMotionLabel: 'Bevegelse',
    vidGenerate: 'Lag video',
    vidProcessing: 'Lager video… (2-4 min)',
  },
};

/* ── Format taxonomy ──────────────────────────────────────────────────────
 * The 12 sharp-derived channel formats, grouped for the lightbox UI.
 * Labels stay in English everywhere (brand vocabulary — same convention as
 * "Capsule / Editorial / Full Campaign" tier names). Group headers stay
 * English too — universal loanwords in every supported locale. */
interface FormatRow {
  format_key: string;
  storage_url: string;
  width: number;
  height: number;
  file_size: number;
}

const FORMAT_NAMES: Record<string, string> = {
  'instagram-square': 'Instagram square',
  'instagram-portrait': 'Instagram portrait',
  'instagram-story': 'Instagram story',
  'tiktok-vertical': 'TikTok vertical',
  'pinterest': 'Pinterest',
  'facebook-ad': 'Facebook ad',
  'linkedin': 'LinkedIn',
  'twitter': 'Twitter / X',
  'web-hero': 'Web hero',
  'ecommerce-pdp': 'E-commerce PDP',
  'print-a4': 'Print A4',
  'email-banner': 'Email banner',
};

/* ── Shooting-style progress stages ───────────────────────────────────────
 * Per Felipe: durante los ~60s que tarda gpt-image-1.5, mostrar todos los
 * pasos de un shooting real pasando ultra rápido — como si Aimily fuera un
 * estudio fotográfico que monta el set, el maquillaje, el casting, etc. en
 * 60 segundos. 12 stages, ~4s entre cada uno. El último ("Disparando") se
 * queda en loop con spinner hasta que la AI responde. */
const SHOOTING_STAGES_I18N: Record<Language, string[]> = {
  en: [
    'Studio set up',
    'Lighting rigged',
    'Camera & tripod ready',
    'Makeup artist on set',
    'Makeup done',
    'Stylist checking wardrobe',
    'Wardrobe selected',
    'Model in dressing room',
    'Model on set',
    'Light test',
    'Pose check',
    'Rolling',
  ],
  es: [
    'Preparando el estudio',
    'Iluminación montada',
    'Cámara y trípode listos',
    'Maquillador en zona',
    'Maquillaje listo',
    'Estilista revisando vestuario',
    'Vestuario seleccionado',
    'Modelo en cabina',
    'Modelo en zona',
    'Test de luz',
    'Test de pose',
    'Disparando',
  ],
  fr: [
    'Studio préparé',
    'Éclairage installé',
    'Caméra et trépied prêts',
    'Maquilleur sur le plateau',
    'Maquillage terminé',
    'Styliste vérifie la garde-robe',
    'Vêtements sélectionnés',
    'Mannequin en loge',
    'Mannequin sur le plateau',
    'Test de lumière',
    'Test de pose',
    'Tournage',
  ],
  it: [
    'Studio allestito',
    'Luci montate',
    'Camera e treppiede pronti',
    'Truccatore sul set',
    'Trucco completato',
    'Stilista controlla i capi',
    'Vestiti selezionati',
    'Modello in cabina',
    'Modello sul set',
    'Test luci',
    'Prova di posa',
    'Si gira',
  ],
  de: [
    'Studio eingerichtet',
    'Lichtsetup montiert',
    'Kamera & Stativ bereit',
    'Visagist am Set',
    'Make-up fertig',
    'Stylist prüft Garderobe',
    'Outfit gewählt',
    'Model in der Garderobe',
    'Model am Set',
    'Lichttest',
    'Posencheck',
    'Aufnahme läuft',
  ],
  pt: [
    'Estúdio preparado',
    'Iluminação montada',
    'Câmara e tripé prontos',
    'Maquilhador em zona',
    'Maquilhagem pronta',
    'Estilista a rever o guarda-roupa',
    'Roupa selecionada',
    'Modelo na cabina',
    'Modelo no set',
    'Teste de luz',
    'Teste de pose',
    'A disparar',
  ],
  nl: [
    'Studio opgebouwd',
    'Belichting opgesteld',
    'Camera & statief klaar',
    'Visagist op de set',
    'Make-up klaar',
    'Stylist controleert garderobe',
    'Outfit gekozen',
    'Model in de kleedkamer',
    'Model op de set',
    'Lichttest',
    'Pose check',
    'Opname',
  ],
  sv: [
    'Studio riggad',
    'Ljussättning klar',
    'Kamera & stativ redo',
    'Sminkös på plats',
    'Smink klart',
    'Stylist kollar garderoben',
    'Outfit vald',
    'Modell i omklädningsrum',
    'Modell på plats',
    'Ljustest',
    'Pose-check',
    'Rullar',
  ],
  no: [
    'Studio rigget',
    'Lyssetting montert',
    'Kamera & stativ klare',
    'Sminkør på sett',
    'Sminke ferdig',
    'Stylist sjekker garderoben',
    'Antrekk valgt',
    'Modell i garderoben',
    'Modell på sett',
    'Lystest',
    'Posesjekk',
    'Tar opp',
  ],
};

/* ── Quick variation hints ────────────────────────────────────────────────
 * Appended (in English) to user_prompt when the user clicks one of the
 * regenerate-variation pills in the lightbox. The LLM understands these
 * directives directly. Kept short to leave room for the rest of the
 * prompt + the user's own art direction. */
type VariationKey = 'closer' | 'less_bg' | 'better_light';

const VARIATION_PROMPT: Record<VariationKey, string> = {
  closer: 'Zoom in tighter, the product fills more of the frame, more detail visible, less surrounding context.',
  less_bg: 'Minimize the background — remove decorative scene elements and add clean negative space around the subject. Keep the subject and pose intact.',
  better_light: 'Improve the lighting quality — softer, more flattering, magazine-grade light. Same composition, better light.',
};

const FORMAT_GROUPS: Array<{ label: string; formats: string[] }> = [
  { label: 'Social', formats: ['instagram-square', 'instagram-portrait', 'instagram-story', 'tiktok-vertical', 'pinterest'] },
  { label: 'Ads', formats: ['facebook-ad', 'linkedin', 'twitter'] },
  { label: 'Web', formats: ['web-hero'] },
  { label: 'Ecommerce', formats: ['ecommerce-pdp'] },
  { label: 'Print', formats: ['print-a4'] },
  { label: 'Email', formats: ['email-banner'] },
];

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

type Orientation = 'vertical' | 'horizontal' | 'square';
type Framing = 'close' | 'medium' | 'full';
type LightDirection = 'soft' | 'golden' | 'studio' | 'dramatic';

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
  orientation?: Orientation;
  framing?: Framing;
  light?: LightDirection;
  /* CIS-equivalent free-text fields the user fills in the form. Each is
   * optional; the backend only injects them into the prompt when truthy. */
  brand_mood?: string;
  brand_palette?: string;
  target_consumer?: string;
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
  const [elapsedSec, setElapsedSec] = useState(0);
  const [allStagesDone, setAllStagesDone] = useState(false);
  const lastPayloadRef = useRef<GeneratePayload | null>(null);
  const [recentAssets, setRecentAssets] = useState<Asset[]>(props.assets);
  const [outputsRemaining, setOutputsRemaining] = useState(props.outputs_remaining);
  const [lightboxAssetId, setLightboxAssetId] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>('vertical');
  const [framing, setFraming] = useState<Framing>('medium');
  const [light, setLight] = useState<LightDirection>('soft');
  const [brandMood, setBrandMood] = useState('');
  const [brandPalette, setBrandPalette] = useState('');
  const [targetConsumer, setTargetConsumer] = useState('');
  const [castingPickerOpen, setCastingPickerOpen] = useState(false);
  // When set, the casting picker is in "variation" mode — selecting a model
  // fires applyVariation('model', ..., newId) for the asset whose id is stored.
  const [castingPickerForVariationAssetId, setCastingPickerForVariationAssetId] = useState<string | null>(null);
  // Variation in-flight indicator (shown in the lightbox while a /variation
  // request is running). null = idle.
  const [variationInFlight, setVariationInFlight] = useState<'color' | 'background' | 'model' | null>(null);
  const [videoInFlight, setVideoInFlight] = useState(false);
  // Derived so the lightbox re-renders when the underlying asset changes
  // (e.g. after a Style Memory toggle updates recentAssets).
  const lightboxAsset = lightboxAssetId
    ? recentAssets.find((a) => a.id === lightboxAssetId) ?? null
    : null;

  /* Drive elapsed timer while a request is in flight. The shooting-stage
   * index is derived purely from elapsedSec in <GenerationProgress />, so
   * here we only tick the timer. */
  useEffect(() => {
    if (!generating) return;
    const startedAt = Date.now();
    setElapsedSec(0);
    setAllStagesDone(false);
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [generating]);

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
    if (type === 'editorial' && !referenceImageUrl)
      return { _validation: 'no_reference' };
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
      orientation,
      framing,
      light,
      brand_mood: brandMood.trim() || undefined,
      brand_palette: brandPalette.trim() || undefined,
      target_consumer: targetConsumer.trim() || undefined,
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
    // Prefer the OpenAI/server "details" field when present — it carries the
    // actual upstream error text. Fall back to "error" (which is just our
    // own generic label). This is critical for debugging — without exposing
    // details we only ever see "AI generation failed".
    const detail = typeof body.details === 'string' && body.details
      ? body.details
      : typeof body.error === 'string' ? body.error : undefined;
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

      // Response arrived — mark every stage complete with a quick flash
      // before closing the panel so the checklist feels resolved.
      setAllStagesDone(true);
      await new Promise((r) => setTimeout(r, 600));

      // Optimistic add to recent — mirror everything the server persists so
      // the lightbox "Regenerate variation" controls work on this asset
      // immediately (without a reload).
      setRecentAssets((prev) => [
        {
          id: json.asset_id,
          asset_type: payload.type,
          name: `${payload.type} — ${payload.product_name || 'output'}`,
          url: json.master_url,
          metadata: {
            provider: json.provider,
            formats: json.formats,
            type: payload.type,
            category: payload.category,
            scene: payload.scene,
            model_id: payload.model_id,
            product_image_url: payload.product_image_url,
            reference_image_url: payload.reference_image_url,
            product_name: payload.product_name,
            orientation: payload.orientation,
            framing: payload.framing,
            light: payload.light,
            user_prompt: payload.user_prompt,
          },
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
      setAllStagesDone(false);
    }
  };

  const handleGenerate = async () => {
    const built = buildPayload();
    if ('_validation' in built) {
      if (built._validation === 'no_product') setError(t.valNoProduct);
      else if (built._validation === 'no_reference') setError(t.valNoReference);
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

  /* Called from the lightbox when the user wants a variation of the
   * confirmed image (color / background / model swap). Hits the new
   * /api/studio/variation endpoint, which uses the source image as the
   * new "input reference" instead of regenerating from the original
   * product/model/reference. On success, prepends the new asset and
   * switches the lightbox to it. */
  type VariationType = 'color' | 'background' | 'model';
  const applyVariation = async (
    sourceAsset: Asset,
    variationType: VariationType,
    targetValue?: string,
    newModelId?: string
  ): Promise<{ ok: boolean; error?: StudioError }> => {
    setVariationInFlight(variationType);
    try {
      const res = await fetch('/api/studio/variation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_asset_id: sourceAsset.id,
          variation_type: variationType,
          target_value: targetValue,
          new_model_id: newModelId,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const code: StudioErrorCode =
          res.status === 401 ? 'unauthorized' :
          res.status === 402 ? 'pool_empty' :
          res.status === 429 ? 'rate_limit' :
          res.status === 502 || res.status === 500 ? 'ai_failed' : 'generic';
        const detail = typeof errBody.details === 'string' && errBody.details
          ? errBody.details
          : typeof errBody.error === 'string' ? errBody.error : undefined;
        return { ok: false, error: { code, detail } };
      }
      const json = await res.json();
      const sourceMeta = (sourceAsset.metadata || {}) as Record<string, unknown>;
      const newAsset: Asset = {
        id: json.asset_id,
        asset_type: sourceAsset.asset_type,
        name: `${variationType} — ${sourceAsset.name}`,
        url: json.master_url,
        metadata: {
          provider: json.provider,
          variation_type: variationType,
          target_value: targetValue,
          new_model_id: newModelId,
          parent_asset_id: sourceAsset.id,
          // Carry forward so further variations on this new asset still work
          product_image_url: sourceMeta.product_image_url,
          reference_image_url: sourceAsset.url,
          model_id: newModelId || sourceMeta.model_id,
          product_name: sourceMeta.product_name,
          category: sourceMeta.category,
          orientation: sourceMeta.orientation,
          framing: sourceMeta.framing,
          light: sourceMeta.light,
          type: sourceMeta.type,
        },
        is_style_memory: false,
        style_memory_role: null,
        created_at: new Date().toISOString(),
      };
      setRecentAssets((prev) => [newAsset, ...prev]);
      if (typeof json.outputs_remaining === 'number') setOutputsRemaining(json.outputs_remaining);
      setLightboxAssetId(newAsset.id);
      return { ok: true };
    } catch (e) {
      console.error('[Studio] applyVariation threw:', e);
      const code: StudioErrorCode = e instanceof TypeError ? 'network' : 'generic';
      return { ok: false, error: { code } };
    } finally {
      setVariationInFlight(null);
    }
  };

  /* Called from the lightbox when the user wants a video from the
   * confirmed image. Hits /api/studio/video, which routes to the active
   * provider (Kling 2.1 by default, Sora 2 when STUDIO_VIDEO_PROVIDER=sora).
   * On success prepends the new video asset and switches the lightbox
   * to it so the video player auto-shows. */
  const applyVideo = async (
    sourceAsset: Asset,
    motion: 'subtle' | 'walk' | 'pan' | 'zoom' | 'turn' | 'dolly',
    duration: '5' | '10',
    userPrompt?: string
  ): Promise<{ ok: boolean; error?: StudioError }> => {
    setVideoInFlight(true);
    try {
      const res = await fetch('/api/studio/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_asset_id: sourceAsset.id,
          motion,
          duration,
          tier: 'pro',
          user_prompt: userPrompt || undefined,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const code: StudioErrorCode =
          res.status === 401 ? 'unauthorized' :
          res.status === 402 ? 'pool_empty' :
          res.status === 429 ? 'rate_limit' :
          res.status === 502 || res.status === 500 ? 'ai_failed' : 'generic';
        const detail = typeof errBody.details === 'string' && errBody.details
          ? errBody.details
          : typeof errBody.error === 'string' ? errBody.error : undefined;
        return { ok: false, error: { code, detail } };
      }
      const json = await res.json();
      const sourceMeta = (sourceAsset.metadata || {}) as Record<string, unknown>;
      const newAsset: Asset = {
        id: json.asset_id,
        asset_type: 'video',
        name: `Video — ${sourceAsset.name}`,
        url: json.master_url,
        metadata: {
          provider: json.provider,
          motion,
          duration,
          parent_asset_id: sourceAsset.id,
          product_image_url: sourceMeta.product_image_url,
          reference_image_url: sourceAsset.url,
          product_name: sourceMeta.product_name,
        },
        is_style_memory: false,
        style_memory_role: null,
        created_at: new Date().toISOString(),
      };
      setRecentAssets((prev) => [newAsset, ...prev]);
      if (typeof json.outputs_remaining === 'number') setOutputsRemaining(json.outputs_remaining);
      setLightboxAssetId(newAsset.id);
      return { ok: true };
    } catch (e) {
      console.error('[Studio] applyVideo threw:', e);
      const code: StudioErrorCode = e instanceof TypeError ? 'network' : 'generic';
      return { ok: false, error: { code } };
    } finally {
      setVideoInFlight(false);
    }
  };

  /* Called from inside the lightbox when the user clicks a variation pill.
   * Rebuilds a GeneratePayload from the source asset's stored metadata,
   * appends the variation hint to user_prompt, fires a fresh generation.
   * On success: prepend the new asset and switch the lightbox to it. */
  const regenerateVariation = async (
    asset: Asset,
    variation: VariationKey
  ): Promise<{ ok: boolean; error?: StudioError }> => {
    const meta = (asset.metadata || {}) as Record<string, unknown>;
    if (typeof meta.product_image_url !== 'string' || !meta.product_image_url) {
      return { ok: false, error: { code: 'generic', detail: 'legacy_asset_no_regen' } };
    }

    const existing = typeof meta.user_prompt === 'string' ? meta.user_prompt : '';
    const hint = VARIATION_PROMPT[variation];
    const newUserPrompt = existing ? `${existing}. VARIATION: ${hint}` : `VARIATION: ${hint}`;

    const payload: GeneratePayload = {
      studio_project_id: props.project.id,
      type:
        (meta.type as GeneratePayload['type']) ||
        (asset.asset_type as GeneratePayload['type']) ||
        'editorial',
      product_image_url: meta.product_image_url,
      reference_image_url:
        typeof meta.reference_image_url === 'string' ? meta.reference_image_url : undefined,
      model_id: typeof meta.model_id === 'string' ? meta.model_id : undefined,
      scene: typeof meta.scene === 'string' ? meta.scene : undefined,
      category:
        (meta.category as GeneratePayload['category']) ||
        (asset.asset_type === 'still_life' ? 'ROPA' : 'ROPA'),
      product_name: typeof meta.product_name === 'string' ? meta.product_name : undefined,
      user_prompt: newUserPrompt,
      orientation: (meta.orientation as Orientation) || 'vertical',
      framing: (meta.framing as Framing) || undefined,
      light: (meta.light as LightDirection) || undefined,
    };

    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const code: StudioErrorCode =
          res.status === 401 ? 'unauthorized' :
          res.status === 402 ? 'pool_empty' :
          res.status === 429 ? 'rate_limit' :
          res.status === 502 || res.status === 500 ? 'ai_failed' : 'generic';
        return { ok: false, error: { code, detail: typeof errBody.error === 'string' ? errBody.error : undefined } };
      }
      const json = await res.json();
      const newAsset: Asset = {
        id: json.asset_id,
        asset_type: payload.type,
        name: `${payload.type} — ${payload.product_name || 'variation'}`,
        url: json.master_url,
        metadata: {
          provider: json.provider,
          formats: json.formats,
          type: payload.type,
          category: payload.category,
          scene: payload.scene,
          model_id: payload.model_id,
          product_image_url: payload.product_image_url,
          reference_image_url: payload.reference_image_url,
          product_name: payload.product_name,
          orientation: payload.orientation,
          framing: payload.framing,
          light: payload.light,
          user_prompt: payload.user_prompt,
        },
        is_style_memory: false,
        style_memory_role: null,
        created_at: new Date().toISOString(),
      };
      setRecentAssets((prev) => [newAsset, ...prev]);
      if (typeof json.outputs_remaining === 'number') setOutputsRemaining(json.outputs_remaining);
      setLightboxAssetId(newAsset.id);
      return { ok: true };
    } catch (e) {
      console.error('[Studio] regenerate threw:', e);
      const code: StudioErrorCode = e instanceof TypeError ? 'network' : 'generic';
      return { ok: false, error: { code } };
    }
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

        {/* Header — stacks on mobile so the CTA never collides with the title */}
        <header className="mb-10 flex flex-col sm:flex-row sm:items-end items-start justify-between gap-4">
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
          <div className="bg-white rounded-[20px] p-6 md:p-10 mb-10">
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
              <GenerationProgress
                language={language}
                t={t}
                elapsed={elapsedSec}
                allDone={allStagesDone}
              />
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

              {/* Three visual input blocks — Producto · Referencia · Modelo.
                  Equal-size aspect-square cards at the top of the form so the
                  three pieces of input the user provides feel symmetric and
                  immediate. The number of blocks adapts to type:
                    still_life → 1 (Producto)
                    tryon      → 2 (Producto + Modelo)
                    editorial  → 3 (Producto + Referencia + Modelo) */}
              <div className="md:col-span-2">
                <div className={`grid gap-4 ${
                  type === 'editorial' ? 'grid-cols-1 sm:grid-cols-3' :
                  type === 'tryon' ? 'grid-cols-1 sm:grid-cols-2' :
                  'grid-cols-1 max-w-[340px]'
                }`}>
                  <UploadSquare
                    label="Producto"
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
                      label="Referencia"
                      required
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
                  {(type === 'editorial' || type === 'tryon') && (
                    <ModelBlock
                      label="Modelo"
                      required={type === 'editorial' || type === 'tryon'}
                      model={modelId ? props.models.find((m) => m.id === modelId) ?? null : null}
                      onOpenPicker={() => setCastingPickerOpen(true)}
                      onClear={() => setModelId(null)}
                      t={t}
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

              {/* Creative controls — always visible (no accordion). Felipe
                  directive: "las opciones de sacar carteles ocultas estén
                  visibles". Each row: section label left, pill right. */}
              <div className="md:col-span-2">
                <div className="space-y-3 bg-carbon/[0.02] rounded-[14px] p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">{t.optOrientation}</span>
                    <SegmentedPill<Orientation>
                      options={[
                        { id: 'vertical', label: 'Vertical' },
                        { id: 'horizontal', label: 'Horizontal' },
                        { id: 'square', label: 'Square' },
                      ]}
                      value={orientation}
                      onChange={setOrientation}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">{t.optFraming}</span>
                    <SegmentedPill<Framing>
                      options={[
                        { id: 'close', label: 'Close-up' },
                        { id: 'medium', label: 'Medium' },
                        { id: 'full', label: 'Full' },
                      ]}
                      value={framing}
                      onChange={setFraming}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">{t.optLight}</span>
                    <SegmentedPill<LightDirection>
                      options={[
                        { id: 'soft', label: 'Soft' },
                        { id: 'golden', label: 'Golden' },
                        { id: 'studio', label: 'Studio' },
                        { id: 'dramatic', label: 'Dramatic' },
                      ]}
                      value={light}
                      onChange={setLight}
                      size="sm"
                    />
                  </div>

                  {/* CIS-equivalent free-text inputs — optional. When the
                      user fills any, the backend injects them as a single
                      BRAND CONTEXT line in the prompt. When empty, nothing
                      is added (parity with editorial GPT path stays clean). */}
                  <div className="pt-3 mt-3 border-t border-carbon/[0.05] grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-1.5">
                        {t.ctxMoodLabel}
                      </label>
                      <input
                        type="text"
                        value={brandMood}
                        onChange={(e) => setBrandMood(e.target.value)}
                        placeholder={t.ctxMoodPh}
                        className="w-full px-3 py-2 text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] focus:border-carbon/25 focus:outline-none transition-colors placeholder:text-carbon/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-1.5">
                        {t.ctxPaletteLabel}
                      </label>
                      <input
                        type="text"
                        value={brandPalette}
                        onChange={(e) => setBrandPalette(e.target.value)}
                        placeholder={t.ctxPalettePh}
                        className="w-full px-3 py-2 text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] focus:border-carbon/25 focus:outline-none transition-colors placeholder:text-carbon/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-1.5">
                        {t.ctxConsumerLabel}
                      </label>
                      <input
                        type="text"
                        value={targetConsumer}
                        onChange={(e) => setTargetConsumer(e.target.value)}
                        placeholder={t.ctxConsumerPh}
                        className="w-full px-3 py-2 text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] focus:border-carbon/25 focus:outline-none transition-colors placeholder:text-carbon/30"
                      />
                    </div>
                  </div>
                </div>
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
          <div className="mx-auto max-w-2xl rounded-[20px] bg-white p-8 md:p-16 text-center">
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

        {/* Gallery — wider grids on widescreen so the user sees more outputs per fold.
            Click thumbnail = open lightbox. ★ Style Memory button stops propagation
            so it doesn't double as a "view detail" click. */}
        {recentAssets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-4">
            {recentAssets.map((a) => (
              <div
                key={a.id}
                className="group relative bg-white rounded-[16px] overflow-hidden cursor-pointer transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
                onClick={() => setLightboxAssetId(a.id)}
                role="button"
                tabIndex={0}
                aria-label={t.lightboxOpenAria}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLightboxAssetId(a.id);
                  }
                }}
              >
                <div className="relative aspect-[3/4]">
                  {a.asset_type === 'video' ? (
                    <>
                      <video
                        src={a.url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      {/* Play overlay so users see at a glance which thumbs are videos */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="h-12 w-12 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
                          <Play className="h-5 w-5 text-white" fill="white" />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStyleMemory(a.id, a.is_style_memory); }}
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

        {/* Lightbox overlay (renders only when an asset is selected) */}
        {lightboxAsset && (
          <OutputLightbox
            key={lightboxAsset.id}
            asset={lightboxAsset}
            t={t}
            onClose={() => setLightboxAssetId(null)}
            onToggleStyleMemory={() => toggleStyleMemory(lightboxAsset.id, lightboxAsset.is_style_memory)}
            onRegenerate={(variation) => regenerateVariation(lightboxAsset, variation)}
            onApplyVariation={(type, target) => applyVariation(lightboxAsset, type, target)}
            onOpenCastingForVariation={() => setCastingPickerForVariationAssetId(lightboxAsset.id)}
            variationInFlight={variationInFlight}
            onApplyVideo={(motion, duration, userPrompt) => applyVideo(lightboxAsset, motion, duration, userPrompt)}
            videoInFlight={videoInFlight}
          />
        )}

        {/* Casting picker — two modes:
              • castingPickerOpen=true → "select" mode, sets the form's modelId
              • castingPickerForVariationAssetId=set → "variation" mode, fires
                applyVariation('model', undefined, newId) for that asset */}
        {(castingPickerOpen || castingPickerForVariationAssetId) && (
          <CastingPicker
            models={props.models}
            selectedId={castingPickerForVariationAssetId ? null : modelId}
            initialGenderFilter={genderFilter}
            t={t}
            onClose={() => {
              setCastingPickerOpen(false);
              setCastingPickerForVariationAssetId(null);
            }}
            onSelect={(id) => {
              if (castingPickerForVariationAssetId) {
                const sourceAsset = recentAssets.find((a) => a.id === castingPickerForVariationAssetId);
                setCastingPickerForVariationAssetId(null);
                if (sourceAsset) void applyVariation(sourceAsset, 'model', undefined, id);
              } else {
                setModelId(id);
                setCastingPickerOpen(false);
              }
            }}
            onFilterChange={setGenderFilter}
          />
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// GenerationProgress — shooting-style checklist that ticks through the
// stages of a real photoshoot ultra-fast during the ~60s gpt-image-1.5
// wait. Each row gets checked off in sequence. The last stage ("Rolling")
// stays in a spinning state perpetually until the AI returns; when the
// response arrives, allDone flips every row to checked and we close.
//
// Felipe directive: "una lista de todas las cosas que se hacen en un
// shooting normal y como nosotros, de manera ficticia, pasamos por todas
// ellas ultra rápido en 60 segundos."
// ─────────────────────────────────────────────────────────────────────────
const SECONDS_PER_STAGE = 4; // 12 stages × 4s = 48s, last stays in loop

interface GenerationProgressProps {
  language: Language;
  t: (typeof STUDIO_WORKSPACE_I18N)[Language];
  elapsed: number;
  allDone: boolean;
}

function GenerationProgress({ language, t, elapsed, allDone }: GenerationProgressProps) {
  const stages = SHOOTING_STAGES_I18N[language] ?? SHOOTING_STAGES_I18N.en;
  const lastIdx = stages.length - 1;
  // Active stage advances every SECONDS_PER_STAGE, capped at the last index.
  const activeIdx = Math.min(Math.floor(elapsed / SECONDS_PER_STAGE), lastIdx);

  return (
    <div className="flex flex-col items-center text-center py-6">
      <h2 className="text-[22px] md:text-[24px] font-semibold text-carbon tracking-[-0.03em] mb-2">
        {t.generatingTitle}
      </h2>
      <p className="text-[13px] text-carbon/50 max-w-md leading-[1.7] mb-8">
        {t.generatingSub}
      </p>

      <div className="w-full max-w-md space-y-1.5">
        {stages.map((label, idx) => {
          const completed = allDone || idx < activeIdx;
          const active = !allDone && idx === activeIdx;
          return (
            <div
              key={idx}
              className={`flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 transition-all duration-300 ${
                active
                  ? 'bg-carbon/[0.04]'
                  : completed
                  ? 'bg-transparent'
                  : 'bg-transparent opacity-50'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  completed
                    ? 'bg-carbon text-white'
                    : active
                    ? 'bg-white text-carbon ring-1 ring-carbon/20'
                    : 'bg-carbon/[0.05] text-carbon/30'
                }`}
              >
                {completed ? (
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <div className="h-1 w-1 rounded-full bg-current" />
                )}
              </div>
              <span
                className={`text-[13px] tracking-[-0.01em] text-left flex-1 ${
                  completed
                    ? 'text-carbon/55 line-through decoration-carbon/20'
                    : active
                    ? 'text-carbon font-medium'
                    : 'text-carbon/35'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-[11px] text-carbon/35 tabular-nums">
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
// OutputLightbox — fullscreen overlay showing the master + the 12 derived
// formats grouped by channel. Each format row has its own download button.
// Master image gets a prominent "Download master" CTA. The ★ Style Memory
// toggle is mirrored from the gallery so users don't lose the action while
// inspecting an output.
//
// Formats are lazy-loaded from /api/studio/output-formats?asset_id=X on
// open. If the array is empty, we show a "still processing" hint with a
// manual reload button.
// ─────────────────────────────────────────────────────────────────────────
interface OutputLightboxProps {
  asset: Asset;
  t: (typeof STUDIO_WORKSPACE_I18N)[Language];
  onClose: () => void;
  onToggleStyleMemory: () => void;
  onRegenerate: (variation: VariationKey) => Promise<{ ok: boolean; error?: StudioError }>;
  onApplyVariation: (type: 'color' | 'background', target: string) => Promise<{ ok: boolean; error?: StudioError }>;
  onOpenCastingForVariation: () => void;
  variationInFlight: 'color' | 'background' | 'model' | null;
  onApplyVideo: (
    motion: 'subtle' | 'walk' | 'pan' | 'zoom' | 'turn' | 'dolly',
    duration: '5' | '10',
    userPrompt?: string
  ) => Promise<{ ok: boolean; error?: StudioError }>;
  videoInFlight: boolean;
}

function OutputLightbox({
  asset, t, onClose, onToggleStyleMemory, onRegenerate,
  onApplyVariation, onOpenCastingForVariation, variationInFlight,
  onApplyVideo, videoInFlight,
}: OutputLightboxProps) {
  const [formats, setFormats] = useState<FormatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setReloadKey] = useState(0);
  const [regenInFlight, setRegenInFlight] = useState<VariationKey | null>(null);
  const [regenError, setRegenError] = useState<StudioError | null>(null);
  // Inline mini-form state for color / background variations.
  const [variationFormType, setVariationFormType] = useState<'color' | 'background' | null>(null);
  const [variationInput, setVariationInput] = useState('');
  const [variationError, setVariationError] = useState<StudioError | null>(null);
  // Video form state
  const [videoFormOpen, setVideoFormOpen] = useState(false);
  const [videoMotion, setVideoMotion] = useState<'subtle' | 'walk' | 'pan' | 'zoom' | 'turn' | 'dolly'>('subtle');
  const [videoDuration, setVideoDuration] = useState<'5' | '10'>('5');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoError, setVideoError] = useState<StudioError | null>(null);

  const isVideo = asset.asset_type === 'video';

  const canRegenerate = (() => {
    const meta = (asset.metadata || {}) as Record<string, unknown>;
    return typeof meta.product_image_url === 'string' && !!meta.product_image_url;
  })();

  const fireRegenerate = async (variation: VariationKey) => {
    setRegenInFlight(variation);
    setRegenError(null);
    const result = await onRegenerate(variation);
    setRegenInFlight(null);
    if (!result.ok && result.error) setRegenError(result.error);
    // On success the parent updates lightboxAssetId → this component
    // remounts with the new asset (key changes), so no extra cleanup needed.
  };

  const submitColorBgVariation = async () => {
    if (!variationFormType || !variationInput.trim()) return;
    setVariationError(null);
    const result = await onApplyVariation(variationFormType, variationInput.trim());
    if (result.ok) {
      // Parent will remount this component with the new asset
      setVariationFormType(null);
      setVariationInput('');
    } else if (result.error) {
      setVariationError(result.error);
    }
  };

  const submitVideo = async () => {
    setVideoError(null);
    const result = await onApplyVideo(videoMotion, videoDuration, videoPrompt.trim() || undefined);
    if (result.ok) {
      setVideoFormOpen(false);
      setVideoPrompt('');
    } else if (result.error) {
      setVideoError(result.error);
    }
  };

  // Lazy-load formats. Re-runs when reloadKey changes (manual retry).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/studio/output-formats?asset_id=${asset.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setFormats(Array.isArray(data.formats) ? data.formats : []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [asset.id]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // Prevent page scroll while overlay is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const formatsByKey = new Map(formats.map((f) => [f.format_key, f] as const));
  const downloadHref = (formatKey: string) =>
    `/api/studio/download?asset_id=${asset.id}&format_key=${formatKey}`;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-stretch justify-center overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[1500px] mx-auto p-4 md:p-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — top right, fixed within container */}
        <button
          onClick={onClose}
          aria-label={t.lightboxClose}
          className="absolute top-6 right-6 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white flex items-center justify-center transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 lg:gap-8 min-h-[80vh]">
          {/* LEFT — master image */}
          <div className="flex flex-col">
            <div className="flex-1 flex items-center justify-center rounded-[20px] overflow-hidden bg-black/30 min-h-[400px]">
              {isVideo ? (
                <video
                  src={asset.url}
                  className="max-h-[80vh] max-w-full"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="max-h-[80vh] max-w-full object-contain"
                />
              )}
            </div>
            {/* Master meta + primary actions — wraps individually on narrow
                screens so CTAs never get clipped by the master thumb caption */}
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-white">
                <p className="text-[14px] font-medium tracking-[-0.01em]">{asset.name}</p>
                <p className="text-[12px] text-white/55 capitalize">{asset.asset_type}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={onToggleStyleMemory}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${
                    asset.is_style_memory
                      ? 'bg-white text-carbon'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Star className={`h-3.5 w-3.5 ${asset.is_style_memory ? 'fill-current' : ''}`} />
                  Style Memory
                </button>
                {!isVideo && (
                  <a
                    href={`/api/studio/download-zip?asset_id=${asset.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t.lightboxDownloadAllZip}
                  </a>
                )}
                <a
                  href={downloadHref('master')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white text-carbon text-[13px] font-semibold tracking-[-0.01em] hover:bg-white/90 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {t.lightboxDownloadMaster}
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT — formats panel + regenerate variations + ON-IMAGE variations.
              On mobile the aside expands naturally and the OUTER overlay
              handles scroll. On lg+ the aside scrolls internally so the
              image area stays anchored. */}
          <aside className="bg-white rounded-[20px] p-6 md:p-7 lg:overflow-y-auto lg:max-h-[85vh]">

            {/* In-flight overlay — takes over the panel while a /variation
                or /video call is in flight. Variations finish in 20-40s,
                videos in 2-4 minutes. */}
            {(variationInFlight || videoInFlight) && (
              <div className="py-10 flex flex-col items-center text-center">
                <Loader2 className="h-7 w-7 text-carbon/50 animate-spin mb-4" />
                <p className="text-[14px] font-medium text-carbon mb-1">
                  {videoInFlight ? t.vidProcessing : t.varProcessing}
                </p>
                {!videoInFlight && variationInFlight && (
                  <p className="text-[12px] text-carbon/50">
                    {variationInFlight === 'color' ? t.varColorLabel :
                     variationInFlight === 'background' ? t.varBgLabel :
                     t.varModelLabel}
                  </p>
                )}
              </div>
            )}

            {/* Variations on this confirmed photo (color / bg / model / video).
                Hidden for video sources (can't variation a video itself). */}
            {!variationInFlight && !videoInFlight && !isVideo && (
              <div className="mb-6 pb-6 border-b border-carbon/[0.06]">
                <h3 className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-3">
                  {t.variationsTitle}
                </h3>

                {variationFormType ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={variationInput}
                      onChange={(e) => setVariationInput(e.target.value)}
                      placeholder={variationFormType === 'color' ? t.varColorPh : t.varBgPh}
                      autoFocus
                      className="w-full px-4 py-3 text-[13px] text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/25 focus:outline-none transition-colors placeholder:text-carbon/30"
                      onKeyDown={(e) => { if (e.key === 'Enter' && variationInput.trim()) void submitColorBgVariation(); }}
                    />
                    {variationError && (
                      <div className="text-[12px] leading-relaxed">
                        <p className="text-red-700">
                          {variationError.code === 'pool_empty' ? t.errPoolEmpty :
                           variationError.code === 'ai_failed' ? t.errAiFailed :
                           variationError.code === 'rate_limit' ? t.errRateLimit :
                           variationError.code === 'network' ? t.errNetwork :
                           t.errGeneric}
                        </p>
                        {variationError.detail && (
                          <p className="mt-1.5 text-carbon/45 font-mono text-[11px] break-words">
                            {variationError.detail}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => { setVariationFormType(null); setVariationInput(''); setVariationError(null); }}
                        className="px-4 py-2 rounded-full text-[12px] font-medium text-carbon/55 hover:text-carbon transition-colors"
                      >
                        {t.castingCancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitColorBgVariation()}
                        disabled={!variationInput.trim()}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90 disabled:opacity-50 transition-colors"
                      >
                        {t.varGenerate}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : videoFormOpen ? (
                  /* Video form — duration toggle + motion preset chips + optional text */
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-1.5">
                        {t.vidDurationLabel}
                      </p>
                      <SegmentedPill<'5' | '10'>
                        options={[
                          { id: '5', label: '5s' },
                          { id: '10', label: '10s' },
                        ]}
                        value={videoDuration}
                        onChange={setVideoDuration}
                        size="sm"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-1.5">
                        {t.vidMotionLabel}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(['subtle', 'walk', 'pan', 'zoom', 'turn', 'dolly'] as const).map((m) => {
                          const active = videoMotion === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setVideoMotion(m)}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-medium capitalize transition-colors ${
                                active
                                  ? 'bg-carbon text-white'
                                  : 'bg-carbon/[0.04] text-carbon hover:bg-carbon/[0.08]'
                              }`}
                            >
                              {m === 'subtle' ? 'Subtle' :
                               m === 'walk' ? 'Walk' :
                               m === 'pan' ? 'Pan' :
                               m === 'zoom' ? 'Zoom' :
                               m === 'turn' ? 'Turn' : 'Dolly'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="opcional · matiz adicional"
                      className="w-full px-4 py-3 text-[13px] text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/25 focus:outline-none transition-colors placeholder:text-carbon/30"
                    />
                    {videoError && (
                      <div className="text-[12px] leading-relaxed">
                        <p className="text-red-700">
                          {videoError.code === 'pool_empty' ? t.errPoolEmpty :
                           videoError.code === 'ai_failed' ? t.errAiFailed :
                           videoError.code === 'rate_limit' ? t.errRateLimit :
                           videoError.code === 'network' ? t.errNetwork :
                           t.errGeneric}
                        </p>
                        {videoError.detail && (
                          <p className="mt-1.5 text-carbon/45 font-mono text-[11px] break-words">
                            {videoError.detail}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => { setVideoFormOpen(false); setVideoError(null); }}
                        className="px-4 py-2 rounded-full text-[12px] font-medium text-carbon/55 hover:text-carbon transition-colors"
                      >
                        {t.castingCancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitVideo()}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90 transition-colors"
                      >
                        {t.vidGenerate}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => { setVariationFormType('color'); setVariationError(null); }}
                      className="flex flex-col items-center gap-2 px-2 py-4 rounded-[14px] bg-carbon/[0.03] hover:bg-carbon/[0.06] text-carbon transition-colors text-center"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500" />
                      <span className="text-[11px] font-medium tracking-[-0.01em] leading-tight">
                        {t.varColorLabel}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setVariationFormType('background'); setVariationError(null); }}
                      className="flex flex-col items-center gap-2 px-2 py-4 rounded-[14px] bg-carbon/[0.03] hover:bg-carbon/[0.06] text-carbon transition-colors text-center"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-stone-300 to-stone-500" />
                      <span className="text-[11px] font-medium tracking-[-0.01em] leading-tight">
                        {t.varBgLabel}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCastingForVariation()}
                      className="flex flex-col items-center gap-2 px-2 py-4 rounded-[14px] bg-carbon/[0.03] hover:bg-carbon/[0.06] text-carbon transition-colors text-center"
                    >
                      <div className="h-8 w-8 rounded-full bg-carbon/[0.1] flex items-center justify-center">
                        <User className="h-4 w-4 text-carbon/55" />
                      </div>
                      <span className="text-[11px] font-medium tracking-[-0.01em] leading-tight">
                        {t.varModelLabel}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setVideoFormOpen(true); setVideoError(null); }}
                      className="flex flex-col items-center gap-2 px-2 py-4 rounded-[14px] bg-carbon hover:bg-carbon/90 text-white transition-colors text-center"
                    >
                      <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center">
                        <Play className="h-4 w-4 text-white" fill="white" />
                      </div>
                      <span className="text-[11px] font-medium tracking-[-0.01em] leading-tight">
                        {t.varVideoLabel}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick variation regen pills (only when source metadata
                preserves the inputs — legacy assets hide the row).
                Hidden for video sources (regen would produce an image, not
                a video — that's a UX trap). */}
            {!variationInFlight && !videoInFlight && !isVideo && canRegenerate && (
              <div className="mb-6 pb-6 border-b border-carbon/[0.06]">
                <h3 className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-3">
                  {t.regenerateLabel}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: 'closer' as VariationKey, label: t.regenCloser },
                      { key: 'less_bg' as VariationKey, label: t.regenLessBg },
                      { key: 'better_light' as VariationKey, label: t.regenBetterLight },
                    ]
                  ).map((v) => {
                    const isThis = regenInFlight === v.key;
                    const anyInFlight = regenInFlight !== null;
                    return (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => fireRegenerate(v.key)}
                        disabled={anyInFlight}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${
                          isThis
                            ? 'bg-carbon text-white'
                            : anyInFlight
                            ? 'bg-carbon/[0.03] text-carbon/30'
                            : 'bg-carbon/[0.04] text-carbon hover:bg-carbon/[0.08]'
                        }`}
                      >
                        {isThis ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        {isThis ? t.regenerating : v.label}
                      </button>
                    );
                  })}
                </div>
                {regenError && (
                  <p className="mt-3 text-[12px] text-red-700 leading-relaxed">
                    {regenError.code === 'pool_empty'
                      ? t.errPoolEmpty
                      : regenError.code === 'ai_failed'
                      ? t.errAiFailed
                      : regenError.code === 'rate_limit'
                      ? t.errRateLimit
                      : regenError.code === 'network'
                      ? t.errNetwork
                      : t.errGeneric}
                  </p>
                )}
              </div>
            )}

            {!variationInFlight && !videoInFlight && !isVideo && (loading ? (
              <div className="flex items-center gap-3 text-carbon/55 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[13px]">{t.lightboxLoading}</span>
              </div>
            ) : formats.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-[13px] text-carbon/55 leading-[1.7] mb-4">
                  {t.lightboxFormatsProcessing}
                </p>
                <button
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium bg-carbon/[0.04] text-carbon/60 hover:bg-carbon/[0.08]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t.errorRetry}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {FORMAT_GROUPS.map((group) => {
                  const groupFormats = group.formats
                    .map((k) => formatsByKey.get(k))
                    .filter(Boolean) as FormatRow[];
                  if (groupFormats.length === 0) return null;
                  return (
                    <section key={group.label}>
                      <h3 className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-3">
                        {group.label}
                      </h3>
                      <ul className="space-y-1.5">
                        {groupFormats.map((f) => (
                          <li
                            key={f.format_key}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-[10px] bg-carbon/[0.02] hover:bg-carbon/[0.04] transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-carbon truncate">
                                {FORMAT_NAMES[f.format_key] || f.format_key}
                              </p>
                              <p className="text-[11px] text-carbon/40 tabular-nums">
                                {f.width}×{f.height}
                                {f.file_size > 0 && (
                                  <span className="ml-2">{(f.file_size / 1024).toFixed(0)} KB</span>
                                )}
                              </p>
                            </div>
                            <a
                              href={downloadHref(f.format_key)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-carbon text-white hover:bg-carbon/90 transition-colors shrink-0"
                            >
                              <Download className="h-3 w-3" />
                              {t.lightboxDownloadFormat}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ModelBlock — the third equal-size aspect-square block in the form grid,
// matching UploadSquare's visual weight. Empty state: avatar icon + CTA
// to open the casting picker. Filled state: headshot + name + "Change"
// pill + clear (X). Single click on the empty card opens the picker.
// ─────────────────────────────────────────────────────────────────────────
interface ModelBlockProps {
  label: string;
  required?: boolean;
  model: AimilyModel | null;
  onOpenPicker: () => void;
  onClear: () => void;
  t: (typeof STUDIO_WORKSPACE_I18N)[Language];
}

function ModelBlock({ label, required, model, onOpenPicker, onClear, t }: ModelBlockProps) {
  const hasModel = !!model;
  return (
    <button
      type="button"
      onClick={onOpenPicker}
      className={`relative aspect-square rounded-[20px] overflow-hidden cursor-pointer transition-all duration-300 text-left group
        ${hasModel
          ? 'bg-carbon/[0.04] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]'
          : 'bg-carbon/[0.03] border-2 border-dashed border-carbon/15 hover:border-carbon/40 hover:bg-carbon/[0.05]'}
      `}
    >
      {/* Large editorial title — INSIDE the card, gold-standard typography */}
      <div className="absolute top-5 md:top-7 left-5 md:left-7 z-10">
        <h3
          className={`text-[26px] md:text-[34px] font-semibold tracking-[-0.04em] leading-[0.95] ${
            hasModel ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]' : 'text-carbon'
          }`}
        >
          {label}
        </h3>
        <div className="mt-1.5">
          {required && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] tracking-[0.15em] uppercase font-semibold ${
                hasModel ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-carbon text-white'
              }`}
            >
              Obligatorio
            </span>
          )}
        </div>
      </div>

      {hasModel && model ? (
        <>
          {/* Headshot full-bleed */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={model.headshot_url} alt={model.name} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 via-black/15 to-transparent pointer-events-none" />

          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }
            }}
            className="absolute top-4 right-4 z-20 h-9 w-9 rounded-full bg-white/95 hover:bg-white flex items-center justify-center shadow-md transition-all hover:scale-105 cursor-pointer"
            aria-label="Quitar modelo"
          >
            <X className="h-4 w-4 text-carbon" />
          </span>

          {/* Model name + traits + change CTA — at the bottom over a gradient */}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-14 pb-4 md:pb-5 px-5 md:px-7">
            <p className="text-white text-[18px] md:text-[22px] font-semibold tracking-[-0.02em] truncate">
              {model.name}
            </p>
            {(model.complexion || model.hair_style) && (
              <p className="text-white/75 text-[10px] uppercase tracking-[0.12em] truncate mt-1">
                {[model.complexion, model.hair_style].filter(Boolean).join(' · ')}
              </p>
            )}
            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-carbon text-[11px] font-semibold tracking-[-0.01em]">
              {t.modelBlockChange}
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </>
      ) : (
        <>
          {/* Empty state — invitation, decorative ghost initial bottom-left */}
          <div className="absolute bottom-5 md:bottom-7 right-5 md:right-7 flex items-center gap-2 text-carbon/45">
            <span className="text-[11px] tracking-[0.1em] uppercase font-medium">{t.modelBlockEmpty}</span>
            <div className="h-9 w-9 rounded-full bg-carbon/[0.06] flex items-center justify-center group-hover:bg-carbon/[0.1] transition-colors">
              <User className="h-4 w-4 text-carbon/60" />
            </div>
          </div>
          <div className="absolute bottom-3 left-5 md:left-7 text-[68px] md:text-[88px] font-bold text-carbon/[0.04] leading-none tracking-[-0.05em] pointer-events-none select-none">
            ✦
          </div>
        </>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CastingPicker — fullscreen modal for choosing a model. Filter pills at
// the top (Todos/Mujer/Hombre), responsive grid of headshot tiles, click
// on a tile = INSTANT select and close. No intermediate detail step — the
// tile overlay (name + complexion · hair style) is enough info to decide
// for most users. "Super fácil" per Felipe's directive.
// ─────────────────────────────────────────────────────────────────────────
interface CastingPickerProps {
  models: AimilyModel[];
  selectedId: string | null;
  initialGenderFilter: GenderFilter;
  t: (typeof STUDIO_WORKSPACE_I18N)[Language];
  onClose: () => void;
  onSelect: (id: string) => void;
  onFilterChange: (filter: GenderFilter) => void;
}

function CastingPicker({
  models, selectedId, initialGenderFilter, t, onClose, onSelect, onFilterChange,
}: CastingPickerProps) {
  const [filter, setFilter] = useState<GenderFilter>(initialGenderFilter);

  // Lock body scroll + Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const filtered = filter === 'all' ? models : models.filter((m) => m.gender === filter);

  const updateFilter = (next: GenderFilter) => {
    setFilter(next);
    onFilterChange(next);
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm flex items-stretch justify-center overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[1300px] mx-auto p-4 md:p-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header — title + filter + close */}
        <div className="sticky top-0 z-10 bg-shade/95 backdrop-blur rounded-[20px] mb-4 px-5 py-4 flex items-center justify-between gap-4 flex-wrap shadow-sm">
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35">
              Casting Aimily
            </span>
            <p className="text-[18px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              {filtered.length}
              <span className="text-carbon/40"> / {models.length}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <SegmentedPill<GenderFilter>
              options={[
                { id: 'all', label: 'Todos' },
                { id: 'female', label: 'Mujer' },
                { id: 'male', label: 'Hombre' },
              ]}
              value={filter}
              onChange={updateFilter}
              size="sm"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label={t.castingCancel}
              className="h-10 w-10 rounded-full bg-carbon/[0.06] hover:bg-carbon/[0.1] text-carbon/55 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Grid — click tile = instant select + close. The thumbnail overlay
            shows enough info (name + complexion · hair) for fast decisions. */}
        <div className="bg-white rounded-[20px] p-4 md:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                className={`group relative aspect-[3/4] rounded-[14px] overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:z-10 hover:shadow-[0_12px_32px_rgba(0,0,0,0.15)] ${
                  selectedId === m.id
                    ? 'ring-2 ring-carbon ring-offset-2 ring-offset-white'
                    : 'opacity-90 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.headshot_url} alt={m.name} className="h-full w-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pt-8 pb-2 px-3 text-left">
                  <p className="text-white text-[12px] font-semibold tracking-[-0.01em] truncate">
                    {m.name}
                  </p>
                  {(m.complexion || m.hair_style) && (
                    <p className="text-white/70 text-[9px] uppercase tracking-[0.08em] truncate mt-0.5">
                      {[m.complexion, m.hair_style].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {selectedId === m.id && (
                  <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-carbon text-white flex items-center justify-center">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
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

  /* Gold-standard editorial card — title INSIDE the box, large display
   * typography. No more "form de un médico" external micro-labels. */
  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`relative aspect-square rounded-[20px] overflow-hidden cursor-pointer transition-all duration-300 group
        ${hasImage
          ? 'bg-carbon/[0.04] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]'
          : `bg-carbon/[0.03] border-2 border-dashed ${
              dragOver
                ? 'border-carbon/50 bg-carbon/[0.06] scale-[1.01]'
                : 'border-carbon/15 hover:border-carbon/40 hover:bg-carbon/[0.05]'
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
        <div className="absolute inset-0 flex items-center justify-center bg-carbon/40 backdrop-blur-sm z-20">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
      )}

      {/* Large editorial title — INSIDE the box, gold-standard typography */}
      <div className={`absolute top-5 md:top-7 left-5 md:left-7 z-10 ${hasImage ? '' : ''}`}>
        <h3
          className={`text-[26px] md:text-[34px] font-semibold tracking-[-0.04em] leading-[0.95] ${
            hasImage ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]' : 'text-carbon'
          }`}
        >
          {label}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5">
          {required && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] tracking-[0.15em] uppercase font-semibold ${
                hasImage
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'bg-carbon text-white'
              }`}
            >
              Obligatorio
            </span>
          )}
          {sublabel && !required && (
            <span
              className={`text-[10px] tracking-[0.12em] uppercase font-medium ${
                hasImage ? 'text-white/80' : 'text-carbon/40'
              }`}
            >
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {hasImage ? (
        <>
          {/* Image fills the card, dark gradient ensures the title is readable */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 via-black/15 to-transparent pointer-events-none" />

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-4 right-4 z-20 h-9 w-9 rounded-full bg-white/95 hover:bg-white flex items-center justify-center shadow-md transition-all hover:scale-105"
            aria-label="Quitar imagen"
          >
            <X className="h-4 w-4 text-carbon" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/95 hover:bg-white text-[12px] font-semibold tracking-[-0.01em] text-carbon shadow-md transition-all opacity-0 group-hover:opacity-100"
          >
            <Upload className="h-3.5 w-3.5" /> Cambiar
          </button>
        </>
      ) : (
        <>
          {/* Empty-state visual cue: subtle icon bottom-right, doesn't fight with title */}
          <div className="absolute bottom-5 md:bottom-7 right-5 md:right-7 flex items-center gap-2 text-carbon/45">
            <span className="text-[11px] tracking-[0.1em] uppercase font-medium">Arrastra o pulsa</span>
            <div className="h-9 w-9 rounded-full bg-carbon/[0.06] flex items-center justify-center group-hover:bg-carbon/[0.1] transition-colors">
              <Upload className="h-4 w-4 text-carbon/60" />
            </div>
          </div>
          {/* Decorative ghost number bottom-left — adds the "cañero" editorial vibe */}
          <div className="absolute bottom-3 left-5 md:left-7 text-[68px] md:text-[88px] font-bold text-carbon/[0.04] leading-none tracking-[-0.05em] pointer-events-none select-none">
            +
          </div>
        </>
      )}
    </div>
  );
}
