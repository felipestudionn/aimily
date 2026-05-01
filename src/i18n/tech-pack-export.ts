/* ═══════════════════════════════════════════════════════════════════
   Tech Pack PDF export i18n. Standalone strings module — kept out of
   the global Dictionary because these only render inside the
   server-rendered /tech-pack/export/[skuId] route and there's no
   useTranslation() hook available there (Puppeteer renders without
   a session).

   Add a new key here → it MUST be present in all 9 locales.
   ═══════════════════════════════════════════════════════════════════ */

export type Locale = 'en' | 'es' | 'fr' | 'it' | 'de' | 'pt' | 'nl' | 'sv' | 'no';

export interface TechPackExportStrings {
  techPack: string;
  technicalDrawings: string;
  drawingsHelpFootwear: string;
  drawingsHelpApparel: string;
  pinNotes: string;
  noPins: string;
  constructionCallouts: string;
  detail: string; // template "Detail {n}" — interpolated as `${strings.detail} ${i + 1}`
  zone: string; // same template
  materialSwatches: string;
  measurements: string;
  point: string;
  billOfMaterials: string;
  bomType: string;
  bomMaterial: string;
  bomQty: string;
  bomUnit: string;
  bomSupplier: string;
  bomCost: string;
  factoryNotes: string;
  comments: string;
  user: string;
  noDrawing: string;
  // Header fields
  styleField: string;
  familyField: string;
  categoryField: string;
  seasonField: string;
  dropField: string;
  segmentField: string;
  pvpField: string;
  cogsField: string;
  // Drawing labels
  sideView: string;
  topDownView: string;
  frontView: string;
  backView: string;
  // SKU type labels
  typeImage: string;
  typeRevenue: string;
  typeEntry: string;
  // SKU category labels
  categoryFootwear: string;
  categoryApparel: string;
  categoryAccessories: string;
  // Defaults
  collectionDefault: string;
}

const en: TechPackExportStrings = {
  techPack: 'Tech pack',
  technicalDrawings: 'Technical drawings',
  drawingsHelpFootwear: 'Side and top-down views — pin-annotated for factory execution.',
  drawingsHelpApparel: 'Front and back views — pin-annotated for factory execution.',
  pinNotes: 'Pin notes',
  noPins: 'No pins.',
  constructionCallouts: 'Construction callouts',
  detail: 'Detail',
  zone: 'Zone',
  materialSwatches: 'Material swatches',
  measurements: 'Measurements',
  point: 'Point',
  billOfMaterials: 'Bill of Materials',
  bomType: 'Type',
  bomMaterial: 'Material',
  bomQty: 'Qty',
  bomUnit: 'Unit',
  bomSupplier: 'Supplier',
  bomCost: 'Cost',
  factoryNotes: 'Factory notes',
  comments: 'Comments',
  user: 'user',
  noDrawing: 'No drawing',
  styleField: 'Style',
  familyField: 'Family',
  categoryField: 'Category',
  seasonField: 'Season',
  dropField: 'Drop',
  segmentField: 'Segment',
  pvpField: 'PVP',
  cogsField: 'COGS',
  sideView: 'Side view',
  topDownView: 'Top-down view',
  frontView: 'Front view',
  backView: 'Back view',
  typeImage: 'Image',
  typeRevenue: 'Revenue',
  typeEntry: 'Entry',
  categoryFootwear: 'Footwear',
  categoryApparel: 'Apparel',
  categoryAccessories: 'Accessories',
  collectionDefault: 'Collection',
};

const es: TechPackExportStrings = {
  techPack: 'Ficha técnica',
  technicalDrawings: 'Dibujos técnicos',
  drawingsHelpFootwear: 'Vistas lateral y superior — anotadas con pines para fábrica.',
  drawingsHelpApparel: 'Vistas frontal y trasera — anotadas con pines para fábrica.',
  pinNotes: 'Notas de los pines',
  noPins: 'Sin pines.',
  constructionCallouts: 'Detalles de construcción',
  detail: 'Detalle',
  zone: 'Zona',
  materialSwatches: 'Muestras de material',
  measurements: 'Medidas',
  point: 'Punto',
  billOfMaterials: 'Lista de Materiales',
  bomType: 'Tipo',
  bomMaterial: 'Material',
  bomQty: 'Cant.',
  bomUnit: 'Unidad',
  bomSupplier: 'Proveedor',
  bomCost: 'Coste',
  factoryNotes: 'Notas para fábrica',
  comments: 'Comentarios',
  user: 'usuario',
  noDrawing: 'Sin dibujo',
  styleField: 'Estilo',
  familyField: 'Familia',
  categoryField: 'Categoría',
  seasonField: 'Temporada',
  dropField: 'Drop',
  segmentField: 'Segmento',
  pvpField: 'PVP',
  cogsField: 'Coste',
  sideView: 'Vista lateral',
  topDownView: 'Vista superior',
  frontView: 'Vista frontal',
  backView: 'Vista trasera',
  typeImage: 'Imagen',
  typeRevenue: 'Ventas',
  typeEntry: 'Entrada',
  categoryFootwear: 'Calzado',
  categoryApparel: 'Ropa',
  categoryAccessories: 'Accesorios',
  collectionDefault: 'Colección',
};

const fr: TechPackExportStrings = {
  techPack: 'Fiche technique',
  technicalDrawings: 'Dessins techniques',
  drawingsHelpFootwear: 'Vues latérale et de dessus — annotées par épingles pour la fabrication.',
  drawingsHelpApparel: 'Vues avant et arrière — annotées par épingles pour la fabrication.',
  pinNotes: 'Notes d\'épingles',
  noPins: 'Aucune épingle.',
  constructionCallouts: 'Détails de construction',
  detail: 'Détail',
  zone: 'Zone',
  materialSwatches: 'Échantillons de matière',
  measurements: 'Mesures',
  point: 'Point',
  billOfMaterials: 'Nomenclature',
  bomType: 'Type',
  bomMaterial: 'Matière',
  bomQty: 'Qté',
  bomUnit: 'Unité',
  bomSupplier: 'Fournisseur',
  bomCost: 'Coût',
  factoryNotes: 'Notes usine',
  comments: 'Commentaires',
  user: 'utilisateur',
  noDrawing: 'Aucun dessin',
  styleField: 'Style',
  familyField: 'Famille',
  categoryField: 'Catégorie',
  seasonField: 'Saison',
  dropField: 'Drop',
  segmentField: 'Segment',
  pvpField: 'PVC',
  cogsField: 'Coût',
  sideView: 'Vue de côté',
  topDownView: 'Vue de dessus',
  frontView: 'Vue de face',
  backView: 'Vue arrière',
  typeImage: 'Image',
  typeRevenue: 'Revenu',
  typeEntry: 'Entrée',
  categoryFootwear: 'Chaussures',
  categoryApparel: 'Vêtements',
  categoryAccessories: 'Accessoires',
  collectionDefault: 'Collection',
};

const it: TechPackExportStrings = {
  techPack: 'Scheda tecnica',
  technicalDrawings: 'Disegni tecnici',
  drawingsHelpFootwear: 'Viste laterale e dall\'alto — annotate con spilli per la produzione.',
  drawingsHelpApparel: 'Viste frontale e posteriore — annotate con spilli per la produzione.',
  pinNotes: 'Note degli spilli',
  noPins: 'Nessuno spillo.',
  constructionCallouts: 'Dettagli costruttivi',
  detail: 'Dettaglio',
  zone: 'Zona',
  materialSwatches: 'Campioni materiale',
  measurements: 'Misure',
  point: 'Punto',
  billOfMaterials: 'Distinta materiali',
  bomType: 'Tipo',
  bomMaterial: 'Materiale',
  bomQty: 'Q.tà',
  bomUnit: 'Unità',
  bomSupplier: 'Fornitore',
  bomCost: 'Costo',
  factoryNotes: 'Note per la fabbrica',
  comments: 'Commenti',
  user: 'utente',
  noDrawing: 'Nessun disegno',
  styleField: 'Stile',
  familyField: 'Famiglia',
  categoryField: 'Categoria',
  seasonField: 'Stagione',
  dropField: 'Drop',
  segmentField: 'Segmento',
  pvpField: 'Prezzo',
  cogsField: 'Costo',
  sideView: 'Vista laterale',
  topDownView: 'Vista dall\'alto',
  frontView: 'Vista frontale',
  backView: 'Vista posteriore',
  typeImage: 'Immagine',
  typeRevenue: 'Ricavi',
  typeEntry: 'Entrata',
  categoryFootwear: 'Calzature',
  categoryApparel: 'Abbigliamento',
  categoryAccessories: 'Accessori',
  collectionDefault: 'Collezione',
};

const de: TechPackExportStrings = {
  techPack: 'Technisches Datenblatt',
  technicalDrawings: 'Technische Zeichnungen',
  drawingsHelpFootwear: 'Seiten- und Draufsicht — mit Stecknadeln für die Produktion annotiert.',
  drawingsHelpApparel: 'Vorder- und Rückansicht — mit Stecknadeln für die Produktion annotiert.',
  pinNotes: 'Stecknadel-Notizen',
  noPins: 'Keine Stecknadeln.',
  constructionCallouts: 'Konstruktionsdetails',
  detail: 'Detail',
  zone: 'Zone',
  materialSwatches: 'Materialmuster',
  measurements: 'Maße',
  point: 'Punkt',
  billOfMaterials: 'Stückliste',
  bomType: 'Typ',
  bomMaterial: 'Material',
  bomQty: 'Menge',
  bomUnit: 'Einheit',
  bomSupplier: 'Lieferant',
  bomCost: 'Kosten',
  factoryNotes: 'Fabrikhinweise',
  comments: 'Kommentare',
  user: 'Benutzer',
  noDrawing: 'Keine Zeichnung',
  styleField: 'Stil',
  familyField: 'Familie',
  categoryField: 'Kategorie',
  seasonField: 'Saison',
  dropField: 'Drop',
  segmentField: 'Segment',
  pvpField: 'VK-Preis',
  cogsField: 'Kosten',
  sideView: 'Seitenansicht',
  topDownView: 'Draufsicht',
  frontView: 'Vorderansicht',
  backView: 'Rückansicht',
  typeImage: 'Bild',
  typeRevenue: 'Umsatz',
  typeEntry: 'Einstieg',
  categoryFootwear: 'Schuhe',
  categoryApparel: 'Bekleidung',
  categoryAccessories: 'Accessoires',
  collectionDefault: 'Kollektion',
};

const pt: TechPackExportStrings = {
  techPack: 'Ficha técnica',
  technicalDrawings: 'Desenhos técnicos',
  drawingsHelpFootwear: 'Vistas lateral e superior — anotadas com pinos para fabricação.',
  drawingsHelpApparel: 'Vistas frontal e traseira — anotadas com pinos para fabricação.',
  pinNotes: 'Notas dos pinos',
  noPins: 'Sem pinos.',
  constructionCallouts: 'Detalhes de construção',
  detail: 'Detalhe',
  zone: 'Zona',
  materialSwatches: 'Amostras de material',
  measurements: 'Medidas',
  point: 'Ponto',
  billOfMaterials: 'Lista de Materiais',
  bomType: 'Tipo',
  bomMaterial: 'Material',
  bomQty: 'Qtd.',
  bomUnit: 'Unidade',
  bomSupplier: 'Fornecedor',
  bomCost: 'Custo',
  factoryNotes: 'Notas para fábrica',
  comments: 'Comentários',
  user: 'utilizador',
  noDrawing: 'Sem desenho',
  styleField: 'Estilo',
  familyField: 'Família',
  categoryField: 'Categoria',
  seasonField: 'Temporada',
  dropField: 'Drop',
  segmentField: 'Segmento',
  pvpField: 'PVP',
  cogsField: 'Custo',
  sideView: 'Vista lateral',
  topDownView: 'Vista superior',
  frontView: 'Vista frontal',
  backView: 'Vista traseira',
  typeImage: 'Imagem',
  typeRevenue: 'Receita',
  typeEntry: 'Entrada',
  categoryFootwear: 'Calçado',
  categoryApparel: 'Vestuário',
  categoryAccessories: 'Acessórios',
  collectionDefault: 'Coleção',
};

const nl: TechPackExportStrings = {
  techPack: 'Technisch dossier',
  technicalDrawings: 'Technische tekeningen',
  drawingsHelpFootwear: 'Zij- en bovenaanzicht — geannoteerd met pinnen voor productie.',
  drawingsHelpApparel: 'Voor- en achteraanzicht — geannoteerd met pinnen voor productie.',
  pinNotes: 'Pin-notities',
  noPins: 'Geen pinnen.',
  constructionCallouts: 'Constructiedetails',
  detail: 'Detail',
  zone: 'Zone',
  materialSwatches: 'Materiaalstalen',
  measurements: 'Maten',
  point: 'Punt',
  billOfMaterials: 'Materiaallijst',
  bomType: 'Type',
  bomMaterial: 'Materiaal',
  bomQty: 'Aant.',
  bomUnit: 'Eenheid',
  bomSupplier: 'Leverancier',
  bomCost: 'Kosten',
  factoryNotes: 'Fabrieknotities',
  comments: 'Opmerkingen',
  user: 'gebruiker',
  noDrawing: 'Geen tekening',
  styleField: 'Stijl',
  familyField: 'Familie',
  categoryField: 'Categorie',
  seasonField: 'Seizoen',
  dropField: 'Drop',
  segmentField: 'Segment',
  pvpField: 'Verkoopprijs',
  cogsField: 'Kosten',
  sideView: 'Zijaanzicht',
  topDownView: 'Bovenaanzicht',
  frontView: 'Vooraanzicht',
  backView: 'Achteraanzicht',
  typeImage: 'Beeld',
  typeRevenue: 'Omzet',
  typeEntry: 'Instap',
  categoryFootwear: 'Schoenen',
  categoryApparel: 'Kleding',
  categoryAccessories: 'Accessoires',
  collectionDefault: 'Collectie',
};

const sv: TechPackExportStrings = {
  techPack: 'Teknisk specifikation',
  technicalDrawings: 'Tekniska ritningar',
  drawingsHelpFootwear: 'Sido- och ovanvy — markerade med pinnar för produktion.',
  drawingsHelpApparel: 'Fram- och baksida — markerade med pinnar för produktion.',
  pinNotes: 'Pin-anteckningar',
  noPins: 'Inga pinnar.',
  constructionCallouts: 'Konstruktionsdetaljer',
  detail: 'Detalj',
  zone: 'Zon',
  materialSwatches: 'Materialprover',
  measurements: 'Mått',
  point: 'Punkt',
  billOfMaterials: 'Materiallista',
  bomType: 'Typ',
  bomMaterial: 'Material',
  bomQty: 'Antal',
  bomUnit: 'Enhet',
  bomSupplier: 'Leverantör',
  bomCost: 'Kostnad',
  factoryNotes: 'Fabriksanteckningar',
  comments: 'Kommentarer',
  user: 'användare',
  noDrawing: 'Ingen ritning',
  styleField: 'Stil',
  familyField: 'Familj',
  categoryField: 'Kategori',
  seasonField: 'Säsong',
  dropField: 'Drop',
  segmentField: 'Segment',
  pvpField: 'Försäljningspris',
  cogsField: 'Kostnad',
  sideView: 'Sidovy',
  topDownView: 'Ovanvy',
  frontView: 'Framifrån',
  backView: 'Bakifrån',
  typeImage: 'Bild',
  typeRevenue: 'Intäkt',
  typeEntry: 'Ingång',
  categoryFootwear: 'Skor',
  categoryApparel: 'Kläder',
  categoryAccessories: 'Accessoarer',
  collectionDefault: 'Kollektion',
};

const no: TechPackExportStrings = {
  techPack: 'Teknisk dokumentasjon',
  technicalDrawings: 'Tekniske tegninger',
  drawingsHelpFootwear: 'Side- og toppvisning — annotert med nåler for produksjon.',
  drawingsHelpApparel: 'Front- og bakvisning — annotert med nåler for produksjon.',
  pinNotes: 'Nålnotater',
  noPins: 'Ingen nåler.',
  constructionCallouts: 'Konstruksjonsdetaljer',
  detail: 'Detalj',
  zone: 'Sone',
  materialSwatches: 'Materialprøver',
  measurements: 'Mål',
  point: 'Punkt',
  billOfMaterials: 'Materialliste',
  bomType: 'Type',
  bomMaterial: 'Materiale',
  bomQty: 'Antall',
  bomUnit: 'Enhet',
  bomSupplier: 'Leverandør',
  bomCost: 'Kostnad',
  factoryNotes: 'Fabrikknotater',
  comments: 'Kommentarer',
  user: 'bruker',
  noDrawing: 'Ingen tegning',
  styleField: 'Stil',
  familyField: 'Familie',
  categoryField: 'Kategori',
  seasonField: 'Sesong',
  dropField: 'Drop',
  segmentField: 'Segment',
  pvpField: 'Utsalgspris',
  cogsField: 'Kostnad',
  sideView: 'Sidevisning',
  topDownView: 'Toppvisning',
  frontView: 'Frontvisning',
  backView: 'Bakvisning',
  typeImage: 'Bilde',
  typeRevenue: 'Inntekt',
  typeEntry: 'Inngang',
  categoryFootwear: 'Fottøy',
  categoryApparel: 'Klær',
  categoryAccessories: 'Tilbehør',
  collectionDefault: 'Kolleksjon',
};

const dictionaries: Record<Locale, TechPackExportStrings> = { en, es, fr, it, de, pt, nl, sv, no };

export function getTechPackExportStrings(locale: string | undefined): TechPackExportStrings {
  if (!locale) return en;
  const key = locale.toLowerCase().slice(0, 2) as Locale;
  return dictionaries[key] ?? en;
}

/* Map our 2-letter locale to a BCP-47 tag for Intl.DateTimeFormat. */
const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
  pt: 'pt-PT',
  nl: 'nl-NL',
  sv: 'sv-SE',
  no: 'nb-NO',
};

export function getIntlLocale(locale: string | undefined): string {
  if (!locale) return INTL_LOCALE.en;
  const key = locale.toLowerCase().slice(0, 2) as Locale;
  return INTL_LOCALE[key] ?? INTL_LOCALE.en;
}
