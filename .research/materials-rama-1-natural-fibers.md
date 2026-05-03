# Rama 1 — Natural Textile Fibers — Research Report

**Scope**: Natural textile fibers only — cellulosic/plant-based + animal/protein-based + aquatic specialty (briefly).
**Date**: 2026-05-03
**Methodology**: WebSearch across mill catalogs, Première Vision exhibitor categories, Textile Exchange standards, Wikipedia primary-source articles, trade publications (WWD, BoF, Lampoon, Permanent Style). All L3 (B2B suppliers) verified individually with at least one URL confirming (a) the mill exists today, (b) it has a B2B fabric/yarn division, (c) it supplies multiple brands (not exclusive to one DTC label).

**Conventions**:
- Layer 1 (L1) = canonical base fiber name (the default a designer would type with no qualifier).
- Layer 2 (L2) = construction × weight × finish variants, anchored on Première Vision's 15-sector classification (Shirting, Tailoring, Knits, Premium Relax, Silkies, etc.) cross-referenced against mill catalogs.
- Layer 3 (L3) = real verified B2B mill suppliers. Conservative — only included where verification is concrete. Maximum 5 per fiber.

**Primary sources consulted (Première Vision + classification + standards)**:
- https://paris.premierevision.com/en/content/exhibit-why-participate-fabrics
- https://paris.premierevision.com/en/content/univers
- https://www.premierevision.com/en/articles/0315fd29-75fa-ef11-90cb-00224888722c (1,060 exhibitors PV Paris Feb 2026)
- https://textileexchange.org/responsible-wool-standard/
- https://global-standard.org/find-suppliers-shops-and-inputs/certifiedsuppliers (GOTS)
- https://bettercotton.org/ (BCI)
- https://en.wikipedia.org/wiki/Better_Cotton_Initiative

**Mill / supplier sources (per L3 entry — see each fiber section)**.

**Total entries (final count)**: 156 (15 L1 + 92 L2 + 49 L3)

---

## 1. Cotton

### L1 — Base
```yaml
- id: cotton
  name: "Cotton"
  layer: L1
  family: natural-cellulosic
  composition: "100% cotton"
  weightRange: { min: 80, max: 450, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","sanforized","mercerized","garment-washed","stonewashed","brushed","peached","enzyme-washed","resin-finished"]
  zones: ["Body","Lining","Collar","Cuff","Pocket","Sleeve"]
  subtypes: ["dress","top","shirt","blouse","tshirt","polo","bottom","trouser","jean","short","skirt","jumpsuit","outerwear-jacket","blazer","suit","lingerie","loungewear","activewear"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["minimal","tailored","streetwear","workwear","preppy","sport","sustainable","utility","resort"]
  seasonFit: ["SS","FW","transitional","all-year"]
  certifications: ["OEKO-TEX","GOTS","BCI","Organic-Content-Standard","Fair-Trade","Cradle-to-Cradle"]
  vegan: true
```

### L2 — Variants
```yaml
- id: cotton-poplin
  name: "Cotton poplin"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 90, max: 130, unit: gsm }
  defaultFinish: "mercerized"
  zones: ["Body","Sleeve","Collar"]
  subtypes: ["shirt","blouse","dress"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","tailored","preppy"]
  seasonFit: ["all-year"]

- id: cotton-twill
  name: "Cotton twill"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 180, max: 320, unit: gsm }
  defaultFinish: "sanforized"
  zones: ["Body","Sleeve","Pocket"]
  subtypes: ["trouser","short","outerwear-jacket","skirt","shirt"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["workwear","utility","tailored","preppy"]
  seasonFit: ["transitional","FW"]

- id: cotton-oxford
  name: "Cotton oxford"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 130, max: 180, unit: gsm }
  defaultFinish: "raw"
  zones: ["Body","Sleeve","Collar"]
  subtypes: ["shirt","blouse"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["preppy","tailored","workwear"]
  seasonFit: ["all-year"]

- id: cotton-pinpoint-oxford
  name: "Pinpoint oxford"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 110, max: 150, unit: gsm }
  defaultFinish: "mercerized"
  subtypes: ["shirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","preppy"]
  seasonFit: ["all-year"]

- id: cotton-voile
  name: "Cotton voile"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 60, max: 100, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse","top"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["romantic","resort","minimal","bohemian"]
  seasonFit: ["SS"]

- id: cotton-chambray
  name: "Cotton chambray"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 130, max: 180, unit: gsm }
  defaultFinish: "garment-washed"
  subtypes: ["shirt","dress","blouse","short"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["workwear","resort","preppy"]
  seasonFit: ["SS","transitional"]

- id: cotton-jersey-light
  name: "Cotton jersey (lightweight)"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 120, max: 180, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["tshirt","top","dress","loungewear","lingerie"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["minimal","sport","streetwear"]
  seasonFit: ["all-year"]

- id: cotton-jersey-heavy
  name: "Cotton jersey (heavyweight)"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 220, max: 320, unit: gsm }
  defaultFinish: "garment-washed"
  subtypes: ["tshirt","loungewear","sweater"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["streetwear","minimal","workwear"]
  seasonFit: ["transitional","FW"]

- id: cotton-french-terry
  name: "Cotton french terry"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 240, max: 360, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","loungewear","activewear"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","streetwear","loungewear"]
  seasonFit: ["transitional","FW"]

- id: cotton-fleece
  name: "Cotton fleece (loop-back / brushed)"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 280, max: 450, unit: gsm }
  defaultFinish: "brushed"
  subtypes: ["sweater","loungewear","activewear"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","streetwear","loungewear"]
  seasonFit: ["FW"]

- id: cotton-pique
  name: "Cotton piqué"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 180, max: 240, unit: gsm }
  defaultFinish: "mercerized"
  subtypes: ["polo","dress","top"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["preppy","sport","tailored"]
  seasonFit: ["SS","transitional"]

- id: cotton-canvas
  name: "Cotton canvas (duck)"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 280, max: 450, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","outerwear-coat","trouser","short"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["workwear","utility","streetwear"]
  seasonFit: ["transitional","FW"]

- id: cotton-corduroy
  name: "Cotton corduroy"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 280, max: 400, unit: gsm }
  defaultFinish: "garment-washed"
  subtypes: ["trouser","outerwear-jacket","blazer","skirt","short"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["workwear","preppy","tailored"]
  seasonFit: ["FW","transitional"]

- id: cotton-velvet
  name: "Cotton velvet"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 280, max: 380, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["blazer","outerwear-jacket","dress","trouser","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","tailored","avant-garde"]
  seasonFit: ["FW"]

- id: cotton-flannel
  name: "Cotton flannel (brushed)"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 160, max: 240, unit: gsm }
  defaultFinish: "brushed"
  subtypes: ["shirt","loungewear"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["workwear","utility","preppy"]
  seasonFit: ["FW","transitional"]

- id: cotton-denim
  name: "Cotton denim"
  layer: L2
  parentId: cotton
  composition: "100% cotton"
  weightRange: { min: 280, max: 480, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","stonewashed","enzyme-washed","laser-faded","selvedge"]
  subtypes: ["jean","outerwear-jacket","skirt","short","dress"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["streetwear","workwear","utility"]
  seasonFit: ["all-year"]

- id: cotton-organic
  name: "Organic cotton"
  layer: L2
  parentId: cotton
  composition: "100% organic cotton"
  weightRange: { min: 80, max: 450, unit: gsm }
  defaultFinish: "raw"
  certifications: ["GOTS","Organic-Content-Standard","OEKO-TEX"]
  subtypes: ["tshirt","shirt","dress","top","loungewear","lingerie","trouser"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sustainable","minimal","resort"]
  seasonFit: ["all-year"]

- id: cotton-bci
  name: "BCI cotton (Better Cotton)"
  layer: L2
  parentId: cotton
  composition: "100% cotton (BCI)"
  weightRange: { min: 80, max: 450, unit: gsm }
  defaultFinish: "raw"
  certifications: ["BCI"]
  subtypes: ["tshirt","shirt","trouser","jean"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sustainable","streetwear","workwear"]
  seasonFit: ["all-year"]

- id: cotton-recycled
  name: "Recycled cotton"
  layer: L2
  parentId: cotton
  composition: "≥20% recycled cotton (often blended)"
  weightRange: { min: 130, max: 400, unit: gsm }
  defaultFinish: "raw"
  certifications: ["GRS","RCS"]
  subtypes: ["tshirt","jean","sweater","trouser"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","streetwear","workwear"]
  seasonFit: ["all-year"]

- id: cotton-supima
  name: "Supima / Pima cotton"
  layer: L2
  parentId: cotton
  composition: "100% Supima cotton"
  weightRange: { min: 90, max: 220, unit: gsm }
  defaultFinish: "mercerized"
  certifications: ["Supima trademark"]
  subtypes: ["tshirt","polo","shirt","blouse","loungewear","lingerie"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","preppy","tailored"]
  seasonFit: ["all-year"]

- id: cotton-sea-island
  name: "Sea Island cotton"
  layer: L2
  parentId: cotton
  composition: "100% West Indian Sea Island cotton (WISICA-certified)"
  weightRange: { min: 90, max: 160, unit: gsm }
  defaultFinish: "mercerized"
  certifications: ["WISICA"]
  subtypes: ["shirt","blouse","tshirt","polo"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","tailored","preppy"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-albini
  name: "Cotonificio Albini / Albini Group"
  layer: L3
  parentId: cotton
  origin: "Italy (Bergamo)"
  notes: |
    Largest European shirting manufacturer; family-run since 1876; 7 European factories;
    20,000+ fabrics; supplies Zegna, J.Crew and many others as a true B2B mill.
    Owns Thomas Mason, David & John Anderson, Albiate 1830. Holds exclusive rights to
    100% of Sea Island cotton in Barbados and 90% in Jamaica.
  verification: "https://www.albinigroup.com/en/ + https://tissura.com/manufacturers/cotonificio-albini + https://www.gentlemansgazette.com/the-albini-group-shirt/"

- id: supplier-thomas-mason
  name: "Thomas Mason (Albini Group)"
  layer: L3
  parentId: cotton
  origin: "Italy / UK heritage"
  notes: |
    Heritage shirting brand inside Albini Group, retains UK heritage archive,
    sells fabrics under its own name to bespoke and ready-to-wear shirtmakers.
  verification: "https://www.albinigroup.com/en/ + https://www.permanentstyle.com/2017/05/shirting-mills-and-brands-explained.html"

- id: supplier-pontoglio
  name: "Pontoglio 1883"
  layer: L3
  parentId: cotton
  origin: "Italy (Pontoglio, Brescia)"
  notes: |
    140+ year cotton velvet & corduroy specialist on the banks of the Oglio river;
    63 weavers; sold globally as B2B fabrics through distributors and direct.
  verification: "https://suitsupply.com/en-us/journal/pontoglio-mill.html + https://www.europages.co.uk/companies/italy/velvet%20fabrics.html"

- id: supplier-candiani
  name: "Candiani Denim"
  layer: L3
  parentId: cotton
  origin: "Italy (Robecchetto con Induno, Milano)"
  notes: |
    Europe's largest denim mill since 1938; vertically integrated; B2B-only mill
    selling rigid/stretch/selvedge denim to many brands worldwide;
    20M+ meters/year, 300 variations.
  verification: "https://www.candianidenim.com/en + https://suitsupply.com/en-us/journal/candiani-mill.html"

- id: supplier-pozzi-electa
  name: "Pozzi Electa"
  layer: L3
  parentId: cotton
  origin: "Italy"
  notes: |
    Italian cotton company since 1889; cotton yarn manufacturer & B2B supplier
    listed on Europages and other professional B2B directories.
  verification: "https://www.pozzielecta.it/en/about-us/ + https://www.europages.co.uk/companies/italy/manufacturer%20producer/cotton-yarn.html"
```

### Notes & sources
- Cotton GSM tiers cross-checked against szoneierfabrics.com cotton-linen GSM chart and corefabricstore.com.
- Sea Island cotton verification: Albini Group exclusivity confirmed via Sunspel journal + Permanent Style.
- BCI = 23% of global cotton production (2024); GOTS database is the canonical source for verified organic cotton mills.
- Sources:
  - https://www.albinigroup.com/en/
  - https://tissura.com/manufacturers/cotonificio-albini
  - https://www.gentlemansgazette.com/the-albini-group-shirt/
  - https://suitsupply.com/en-us/journal/pontoglio-mill.html
  - https://www.candianidenim.com/en
  - https://supima.com/
  - https://us.sunspel.com/blogs/the-journal/the-story-of-sea-island-cotton

---

## 2. Linen / Flax

### L1 — Base
```yaml
- id: linen
  name: "Linen"
  layer: L1
  family: natural-cellulosic
  composition: "100% linen (flax)"
  weightRange: { min: 80, max: 400, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","stonewashed","garment-washed","softened","enzyme-washed"]
  zones: ["Body","Lining","Sleeve","Collar","Pocket"]
  subtypes: ["dress","top","shirt","blouse","trouser","short","skirt","jumpsuit","blazer","suit","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["resort","minimal","romantic","tailored","sustainable","bohemian","preppy"]
  seasonFit: ["SS","transitional"]
  certifications: ["OEKO-TEX","European Flax","Masters of Linen","GOTS"]
  vegan: true
  origin: "Belgium / France / Italy"
```

### L2 — Variants
```yaml
- id: linen-voile
  name: "Linen voile (lightweight)"
  layer: L2
  parentId: linen
  composition: "100% linen"
  weightRange: { min: 80, max: 130, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["blouse","dress","top","shirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["resort","romantic","minimal"]
  seasonFit: ["SS"]

- id: linen-shirting
  name: "Linen shirting (light to mid)"
  layer: L2
  parentId: linen
  composition: "100% linen"
  weightRange: { min: 130, max: 180, unit: gsm }
  defaultFinish: "garment-washed"
  subtypes: ["shirt","dress","blouse","skirt"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["resort","minimal","tailored","preppy"]
  seasonFit: ["SS","transitional"]

- id: linen-midweight
  name: "Linen midweight"
  layer: L2
  parentId: linen
  composition: "100% linen"
  weightRange: { min: 180, max: 240, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["trouser","skirt","short","dress","jumpsuit","blazer"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["resort","tailored","minimal"]
  seasonFit: ["SS","transitional"]

- id: linen-suiting
  name: "Linen suiting"
  layer: L2
  parentId: linen
  composition: "100% linen"
  weightRange: { min: 200, max: 300, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["suit","blazer","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","resort","minimal"]
  seasonFit: ["SS","transitional"]

- id: linen-canvas
  name: "Linen canvas (heavy)"
  layer: L2
  parentId: linen
  composition: "100% linen"
  weightRange: { min: 280, max: 400, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","outerwear-coat","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["workwear","utility","tailored"]
  seasonFit: ["transitional","FW"]

- id: linen-jersey
  name: "Linen jersey (knit)"
  layer: L2
  parentId: linen
  composition: "100% linen (knit)"
  weightRange: { min: 160, max: 220, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["tshirt","top","dress","loungewear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["resort","minimal","loungewear"]
  seasonFit: ["SS","transitional"]

- id: linen-slub
  name: "Slub linen"
  layer: L2
  parentId: linen
  composition: "100% linen"
  weightRange: { min: 160, max: 240, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["shirt","dress","blazer","trouser"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["resort","bohemian","minimal"]
  seasonFit: ["SS"]

- id: linen-stonewashed
  name: "Stonewashed linen"
  layer: L2
  parentId: linen
  composition: "100% linen"
  weightRange: { min: 160, max: 240, unit: gsm }
  defaultFinish: "stonewashed"
  subtypes: ["shirt","dress","trouser","blouse","loungewear"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["resort","bohemian","loungewear","romantic"]
  seasonFit: ["SS","transitional"]

- id: linen-cotton-blend
  name: "Linen-cotton blend (50/50)"
  layer: L2
  parentId: linen
  composition: "55% linen 45% cotton (typical)"
  weightRange: { min: 130, max: 240, unit: gsm }
  defaultFinish: "garment-washed"
  subtypes: ["shirt","dress","short","skirt","trouser","blazer"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["resort","preppy","tailored"]
  seasonFit: ["SS","transitional"]

- id: linen-damask
  name: "Linen damask (jacquard)"
  layer: L2
  parentId: linen
  composition: "100% linen"
  weightRange: { min: 200, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse","skirt"]
  priceTier: ["luxury"]
  aestheticTags: ["romantic","avant-garde"]
  seasonFit: ["SS","transitional"]

- id: linen-belgian
  name: "Belgian linen (PGI)"
  layer: L2
  parentId: linen
  composition: "100% Belgian linen (Belgian Linen™ trademark)"
  weightRange: { min: 130, max: 320, unit: gsm }
  defaultFinish: "raw"
  certifications: ["Belgian Linen™ trademark","Masters of Linen"]
  subtypes: ["shirt","dress","trouser","blazer","jumpsuit"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","tailored","resort"]
  seasonFit: ["SS","transitional"]

- id: linen-french-flax
  name: "French Flax linen (European Flax)"
  layer: L2
  parentId: linen
  composition: "100% French / European linen"
  weightRange: { min: 130, max: 320, unit: gsm }
  defaultFinish: "softened"
  certifications: ["European Flax","Masters of Linen"]
  subtypes: ["shirt","dress","trouser","blazer","loungewear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","romantic","resort"]
  seasonFit: ["SS","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-solbiati
  name: "Solbiati (Loro Piana Group, B2B division)"
  layer: L3
  parentId: linen
  origin: "Italy (Busto Arsizio)"
  notes: |
    Founded 1874; widely regarded as the leading Italian linen mill;
    selects European flax, weaves and finishes in Italy; sells under its own
    name to multiple bespoke tailors and brands as B2B (Joel & Son Fabrics
    catalog, Tissura, Il Vecchio Drappiere). Owned by Loro Piana since 2013
    but operates independently as a B2B fabric mill.
  verification: "https://www.solbiati.it/en/home.html + https://www.joelandsonfabrics.com/collections/men-brands-solbiati-linen-cotton"

- id: supplier-libeco
  name: "Libeco"
  layer: L3
  parentId: linen
  origin: "Belgium (Meulebeke)"
  notes: |
    6th-generation Belgian linen mill since 1858; produces European Flax
    Belgian Linen™ for apparel, upholstery, and home; publishes
    bi-annual collections; B2B sales through agent network and digital
    ordering platform. Holds Belgian Linen™ certification authority.
  verification: "https://www.libeco.com/en + https://en.wikipedia.org/wiki/Libeco"

- id: supplier-tuscarora-mills
  name: "Tuscarora Mills"
  layer: L3
  parentId: linen
  origin: "USA (Bedford, Pennsylvania)"
  notes: |
    American-made linen, organic cotton, hemp; B2B mill targeting US
    designers and apparel brands; operates as supplier (not DTC).
  verification: "https://tuscaroramills.com/"
```

### Notes & sources
- L2 weight tiers anchored on szoneierfabrics linen GSM article and thelinenshack.com weight guide.
- "Belgian Linen™" is a certification mark managed by the Belgian Flax & Linen Association; PGI scope.
- "European Flax" / "Masters of Linen" administered by CELC (Confédération Européenne du Lin et du Chanvre).
- Sources:
  - https://www.solbiati.it/en/home.html
  - https://www.libeco.com/en
  - https://tuscaroramills.com/
  - https://www.libecohomestores.com/belgian-linen
  - https://bedthreads.com/blogs/journal/belgian-vs-french-flax-linen

---

## 3. Hemp

### L1 — Base
```yaml
- id: hemp
  name: "Hemp"
  layer: L1
  family: natural-cellulosic
  composition: "100% hemp"
  weightRange: { min: 130, max: 400, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","softened","stonewashed","enzyme-washed"]
  zones: ["Body","Pocket","Lining"]
  subtypes: ["shirt","trouser","short","outerwear-jacket","skirt","tshirt","dress"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","workwear","utility","resort","bohemian"]
  seasonFit: ["SS","transitional"]
  certifications: ["OEKO-TEX","GOTS (when blended w/ organic cotton)"]
  vegan: true
```

### L2 — Variants
```yaml
- id: hemp-shirting
  name: "Hemp shirting"
  layer: L2
  parentId: hemp
  composition: "100% hemp"
  weightRange: { min: 130, max: 180, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["shirt","blouse","dress"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","resort","bohemian"]
  seasonFit: ["SS"]

- id: hemp-canvas
  name: "Hemp canvas"
  layer: L2
  parentId: hemp
  composition: "100% hemp"
  weightRange: { min: 280, max: 400, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","trouser","short"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["workwear","utility","sustainable"]
  seasonFit: ["transitional","FW"]

- id: hemp-cotton-blend
  name: "Hemp-cotton blend (55/45)"
  layer: L2
  parentId: hemp
  composition: "55% hemp 45% cotton (typical)"
  weightRange: { min: 160, max: 280, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["tshirt","shirt","trouser","short","skirt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","resort","streetwear"]
  seasonFit: ["SS","transitional"]

- id: hemp-jersey
  name: "Hemp jersey"
  layer: L2
  parentId: hemp
  composition: "55% hemp 45% organic cotton"
  weightRange: { min: 160, max: 240, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["tshirt","top","loungewear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","loungewear","minimal"]
  seasonFit: ["all-year"]

- id: hemp-twill
  name: "Hemp twill"
  layer: L2
  parentId: hemp
  composition: "100% hemp"
  weightRange: { min: 200, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["trouser","short","outerwear-jacket"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["workwear","utility","sustainable"]
  seasonFit: ["transitional","FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-hemp-fortex
  name: "Hemp Fortex"
  layer: L3
  parentId: hemp
  origin: "China (vertically integrated)"
  notes: |
    Founded 1999; vertically integrated hemp mill (seed to garment);
    documented B2B sustainable hemp supplier serving multiple international
    brands. GOTS certified for blends.
  verification: "https://www.hempfortex.com/"

- id: supplier-envirotextiles
  name: "EnviroTextiles LLC"
  layer: L3
  parentId: hemp
  origin: "USA (Glenwood Springs, Colorado)"
  notes: |
    Designs, develops, imports and distributes hemp + hemp-blend yarns and
    fabrics; B2B-only natural fiber supplier.
  verification: "https://www.envirotextiles.com/"

- id: supplier-tuscarora-mills-hemp
  name: "Tuscarora Mills (hemp line)"
  layer: L3
  parentId: hemp
  origin: "USA (Bedford, Pennsylvania)"
  notes: |
    American-made hemp, linen, organic cotton; B2B mill for US apparel
    & home goods designers.
  verification: "https://tuscaroramills.com/"
```

### Notes & sources
- https://www.hempfortex.com/
- https://www.envirotextiles.com/
- https://tuscaroramills.com/
- https://szoneierfabrics.com/top-hemp-fabric-suppliers-for-b2b-partnerships/

---

## 4. Ramie

### L1 — Base
```yaml
- id: ramie
  name: "Ramie"
  layer: L1
  family: natural-cellulosic
  composition: "100% ramie"
  weightRange: { min: 130, max: 280, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","softened","mercerized"]
  zones: ["Body","Sleeve","Lining"]
  subtypes: ["shirt","blouse","dress","trouser","skirt","jumpsuit"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["resort","minimal","sustainable","bohemian"]
  seasonFit: ["SS"]
  certifications: ["OEKO-TEX"]
  vegan: true
```

### L2 — Variants
```yaml
- id: ramie-shirting
  name: "Ramie shirting"
  layer: L2
  parentId: ramie
  composition: "100% ramie"
  weightRange: { min: 130, max: 180, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["shirt","blouse","dress"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["resort","minimal"]
  seasonFit: ["SS"]

- id: ramie-cotton-blend
  name: "Ramie-cotton blend"
  layer: L2
  parentId: ramie
  composition: "55% ramie 45% cotton"
  weightRange: { min: 130, max: 220, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["shirt","dress","trouser","skirt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["resort","bohemian","sustainable"]
  seasonFit: ["SS"]

- id: ramie-linen-blend
  name: "Ramie-linen blend"
  layer: L2
  parentId: ramie
  composition: "55% ramie 45% linen"
  weightRange: { min: 160, max: 240, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["shirt","dress","trouser","blazer"]
  priceTier: ["premium"]
  aestheticTags: ["resort","minimal","tailored"]
  seasonFit: ["SS"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-ryoma
  name: "Ryoma (Ramie Fabric)"
  layer: L3
  parentId: ramie
  origin: "China"
  notes: |
    Specialised ramie mill marketing globally as a B2B supplier with custom
    bulk production and consultation. One of the few dedicated ramie B2B mills.
  verification: "https://ramiefabric.com/"
```

### Notes & sources
- Ramie supply chain is dominated by China + India. Few independent boutique mills.
- Sources:
  - https://ramiefabric.com/
  - https://us.stylemfabrics.com/collections/ramie
  - https://www.fiberregion.in/natural-fibers.html

---

## 5. Jute

### L1 — Base
```yaml
- id: jute
  name: "Jute"
  layer: L1
  family: natural-cellulosic
  composition: "100% jute"
  weightRange: { min: 200, max: 600, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","softened","laminated"]
  zones: ["Body","Pocket"]
  subtypes: ["outerwear-jacket","skirt","short"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["sustainable","utility","bohemian","resort","workwear"]
  seasonFit: ["SS","transitional"]
  certifications: ["OEKO-TEX"]
  vegan: true
  origin: "India / Bangladesh"
```

### L2 — Variants
```yaml
- id: jute-hessian
  name: "Jute hessian / burlap"
  layer: L2
  parentId: jute
  composition: "100% jute"
  weightRange: { min: 200, max: 400, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","short"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["bohemian","utility","resort"]
  seasonFit: ["SS"]

- id: jute-cotton-blend
  name: "Jute-cotton blend"
  layer: L2
  parentId: jute
  composition: "70% jute 30% cotton"
  weightRange: { min: 220, max: 360, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["short","skirt","outerwear-jacket"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["sustainable","utility","resort"]
  seasonFit: ["SS","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-fiberregion
  name: "FiberRegion"
  layer: L3
  parentId: jute
  origin: "India (Chennai)"
  notes: |
    Wholesale trader of raw jute, ramie, kenaf, pineapple and bamboo natural
    fibers. B2B raw material supplier (not DTC).
  verification: "https://www.fiberregion.in/natural-fibers.html"
```

### Notes & sources
- Jute is largely consumed as packaging/sacking; apparel supply is niche.
- Most apparel-grade jute is sourced through Indian B2B trade portals (TradeWheel, IndiaMart).

---

## 6. Bamboo

### L1 — Base
```yaml
- id: bamboo
  name: "Bamboo"
  layer: L1
  family: natural-cellulosic
  composition: "100% bamboo (mechanical/linen-form) or bamboo viscose"
  weightRange: { min: 120, max: 300, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","softened","mercerized"]
  zones: ["Body","Lining"]
  subtypes: ["tshirt","shirt","loungewear","lingerie","dress"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sustainable","minimal","loungewear","sport"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX","FSC (for viscose form)"]
  vegan: true
```

### L2 — Variants
```yaml
- id: bamboo-linen
  name: "Bamboo linen (mechanical)"
  layer: L2
  parentId: bamboo
  composition: "100% bamboo (mechanically processed bast)"
  weightRange: { min: 130, max: 220, unit: gsm }
  defaultFinish: "raw"
  notes: "True natural bamboo fiber (rare). Linen-like hand."
  subtypes: ["shirt","dress","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","minimal","resort"]
  seasonFit: ["SS"]

- id: bamboo-viscose
  name: "Bamboo viscose / rayon"
  layer: L2
  parentId: bamboo
  composition: "100% bamboo viscose"
  weightRange: { min: 120, max: 240, unit: gsm }
  defaultFinish: "softened"
  notes: "Chemically regenerated; technically a regenerated cellulosic — flagged in UI for transparency."
  subtypes: ["tshirt","loungewear","lingerie","dress"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["loungewear","minimal","sport"]
  seasonFit: ["all-year"]

- id: bamboo-cotton-blend
  name: "Bamboo-cotton blend"
  layer: L2
  parentId: bamboo
  composition: "70% bamboo viscose 30% cotton"
  weightRange: { min: 140, max: 220, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["tshirt","loungewear","lingerie"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["loungewear","sport","minimal"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-proeco-organics
  name: "ProECO Organics"
  layer: L3
  parentId: bamboo
  origin: "USA (importer of bamboo viscose blends)"
  notes: |
    B2B distributor of bamboo and organic-cotton blend fabrics for the apparel
    market; supplies multiple US fashion brands.
  verification: "https://proecofabrics.com/bamboo/"
```

### Notes & sources
- Vast majority of "bamboo" textile supply is bamboo viscose (regenerated cellulosic). True mechanical bamboo linen is rare.
- This split is important for honest material disclosure — flagged in L2 entries.

---

## 7. Abaca / Manila Hemp

### L1 — Base
```yaml
- id: abaca
  name: "Abacá (Manila hemp)"
  layer: L1
  family: natural-cellulosic
  composition: "100% abacá"
  weightRange: { min: 80, max: 200, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","softened"]
  zones: ["Body","Sleeve"]
  subtypes: ["dress","blouse","top"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["resort","bohemian","avant-garde","sustainable"]
  seasonFit: ["SS"]
  certifications: ["OEKO-TEX"]
  vegan: true
  origin: "Philippines"
```

### L2 — Variants
```yaml
- id: abaca-sinamay
  name: "Sinamay (woven abacá)"
  layer: L2
  parentId: abaca
  composition: "100% abacá"
  weightRange: { min: 60, max: 130, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["avant-garde","bohemian","resort"]
  seasonFit: ["SS"]

- id: abaca-silk-blend
  name: "Abacá-silk blend"
  layer: L2
  parentId: abaca
  composition: "60% abacá 40% silk"
  weightRange: { min: 80, max: 160, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["dress","blouse"]
  priceTier: ["luxury"]
  aestheticTags: ["resort","romantic","bohemian"]
  seasonFit: ["SS"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-hermin-textile
  name: "HerMin Textile"
  layer: L3
  parentId: abaca
  origin: "Taiwan (Philippines-sourced fiber)"
  notes: |
    B2B abacá fabric supplier explicitly serving apparel, footwear and
    furniture industries with biodegradable abacá textiles.
  verification: "https://www.hermin.com/product-abaca-paper-fabric.html"
```

### Notes & sources
- https://en.wikipedia.org/wiki/Abac%C3%A1
- https://www.hermin.com/product-abaca-paper-fabric.html
- https://www.fibre2fashion.com/fibres/philippines-abaca-fibre-suppliers-p214-c132

---

## 8. Piña / Pineapple Leaf

### L1 — Base
```yaml
- id: pina
  name: "Piña (pineapple leaf fiber)"
  layer: L1
  family: natural-cellulosic
  composition: "100% piña"
  weightRange: { min: 60, max: 140, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","softened"]
  zones: ["Body","Sleeve"]
  subtypes: ["dress","blouse","top"]
  priceTier: ["luxury"]
  aestheticTags: ["resort","romantic","bohemian","avant-garde","sustainable"]
  seasonFit: ["SS"]
  certifications: ["OEKO-TEX"]
  vegan: true
  origin: "Philippines"
```

### L2 — Variants
```yaml
- id: pina-seda
  name: "Piña Seda (piña-silk blend)"
  layer: L2
  parentId: pina
  composition: "60% piña 40% silk"
  weightRange: { min: 80, max: 130, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["dress","blouse"]
  priceTier: ["luxury"]
  aestheticTags: ["romantic","resort","bohemian"]
  seasonFit: ["SS"]

- id: pina-handwoven
  name: "Piña handwoven (traditional)"
  layer: L2
  parentId: pina
  composition: "100% piña"
  weightRange: { min: 60, max: 110, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse"]
  priceTier: ["luxury"]
  aestheticTags: ["bohemian","resort","avant-garde"]
  seasonFit: ["SS"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-anthill-fabrics
  name: "ANTHILL Fabrics"
  layer: L3
  parentId: pina
  origin: "Philippines (Cebu)"
  notes: |
    Social enterprise / B2B fabric studio working with traditional weaving
    communities; distributes piña, abacá, piña-seda blends to brands and
    designers globally. Operates as a supplier (not exclusive label).
  verification: "https://anthillfabrics.com/products/abaca-silk-natural-copy"

- id: supplier-handa-textiles
  name: "Handa Textiles"
  layer: L3
  parentId: pina
  origin: "Philippines"
  notes: |
    Traditional handwoven piña and Filipino heritage fabrics sold by the
    yard to designers and ateliers worldwide.
  verification: "https://www.handatextiles.com/fabrics/p/pina-fabric"
```

### Notes & sources
- https://anthillfabrics.com/products/abaca-silk-natural-copy
- https://www.handatextiles.com/fabrics/p/pina-fabric

---

## 9. Kapok

### L1 — Base
```yaml
- id: kapok
  name: "Kapok"
  layer: L1
  family: natural-cellulosic
  composition: "100% kapok (rare); usually blended"
  weightRange: { min: null, max: null, unit: null }
  defaultFinish: "raw"
  zones: ["Lining","Padding (insulation)"]
  subtypes: ["outerwear-coat","outerwear-jacket","loungewear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","minimal"]
  seasonFit: ["FW","transitional"]
  certifications: ["OEKO-TEX"]
  vegan: true
  origin: "Indonesia / Philippines / Thailand"
  notes: "Kapok is typically used as a fill/insulation fiber rather than a woven textile — rarely spun on its own. Often blended into nonwoven padding (down alternative) or in low percentages with cotton."
```

### L2 — Variants
```yaml
- id: kapok-padding
  name: "Kapok padding (down alternative)"
  layer: L2
  parentId: kapok
  composition: "100% kapok fiber fill"
  weightRange: { min: null, max: null, unit: null }
  defaultFinish: "raw"
  subtypes: ["outerwear-coat","outerwear-jacket"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","minimal"]
  seasonFit: ["FW"]

- id: kapok-cotton-blend
  name: "Kapok-cotton blend (woven)"
  layer: L2
  parentId: kapok
  composition: "30% kapok 70% cotton (typical)"
  weightRange: { min: 160, max: 240, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["tshirt","loungewear"]
  priceTier: ["premium"]
  aestheticTags: ["sustainable","loungewear"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
> **None listed.** Per the "si no está claro, fuera" rule (Phase 1 cleanup, 2026-05-04): kapok supply moves through Philippine + Indonesian fiber traders that we cannot verify as B2B mills shipping to multiple brands. L1 + L2 entries above are sufficient for designer use; sourcing is left to the user's procurement flow.

---

## 10. Nettle (Stinging Nettle / Himalayan Nettle / Allo)

### L1 — Base
```yaml
- id: nettle
  name: "Nettle (Allo)"
  layer: L1
  family: natural-cellulosic
  composition: "100% nettle (Himalayan / European)"
  weightRange: { min: 160, max: 320, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","softened"]
  zones: ["Body","Pocket"]
  subtypes: ["shirt","outerwear-jacket","trouser","dress"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","bohemian","minimal","avant-garde"]
  seasonFit: ["transitional","FW"]
  certifications: ["OEKO-TEX"]
  vegan: true
  origin: "Nepal / Italy / Germany"
```

### L2 — Variants
```yaml
- id: nettle-shirting
  name: "Nettle shirting"
  layer: L2
  parentId: nettle
  composition: "100% nettle"
  weightRange: { min: 160, max: 220, unit: gsm }
  defaultFinish: "softened"
  subtypes: ["shirt","blouse","dress"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","minimal","bohemian"]
  seasonFit: ["transitional"]

- id: nettle-canvas
  name: "Nettle canvas"
  layer: L2
  parentId: nettle
  composition: "100% nettle"
  weightRange: { min: 240, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["workwear","sustainable","avant-garde"]
  seasonFit: ["FW","transitional"]
```

### L3 — B2B Suppliers
> **None listed.** Per the "si no está claro, fuera" rule (Phase 1 cleanup, 2026-05-04): nettle textile supply is artisanal-cooperative only (Nepal, northern Italy); no industrial B2B mill verifiable. Designers selecting nettle will source via direct cooperative outreach.

---

## 11. Wool (Sheep)

### L1 — Base
```yaml
- id: wool
  name: "Wool (sheep)"
  layer: L1
  family: natural-animal
  composition: "100% wool"
  weightRange: { min: 170, max: 600, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","fulled","milled","brushed","mercerized","Super-100s","Super-120s","Super-150s","Super-180s"]
  zones: ["Body","Lining","Sleeve","Collar","Cuff"]
  subtypes: ["sweater","knitwear-top","blazer","suit","trouser","outerwear-jacket","outerwear-coat","skirt","dress"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["tailored","preppy","minimal","workwear","sustainable","avant-garde"]
  seasonFit: ["FW","transitional"]
  certifications: ["RWS","OEKO-TEX","Woolmark","ZQ Merino","NATIVA"]
  vegan: false
```

### L2 — Variants
```yaml
- id: wool-merino
  name: "Merino wool"
  layer: L2
  parentId: wool
  composition: "100% Merino wool"
  weightRange: { min: 130, max: 320, unit: gsm }
  defaultFinish: "raw"
  certifications: ["RWS","Woolmark","ZQ Merino","NATIVA"]
  subtypes: ["sweater","knitwear-top","tshirt","activewear","loungewear","suit","blazer"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","sport","tailored"]
  seasonFit: ["all-year"]

- id: wool-lambswool
  name: "Lambswool"
  layer: L2
  parentId: wool
  composition: "100% lambswool (first-shear, ≤7 months)"
  weightRange: { min: 200, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","knitwear-top"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["preppy","tailored","minimal"]
  seasonFit: ["FW"]

- id: wool-virgin
  name: "Virgin wool"
  layer: L2
  parentId: wool
  composition: "100% virgin wool"
  weightRange: { min: 200, max: 600, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["suit","blazer","trouser","outerwear-coat","outerwear-jacket","sweater"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["tailored","preppy"]
  seasonFit: ["FW","transitional"]

- id: wool-recycled
  name: "Recycled wool (Cardato Recycled / mechanical)"
  layer: L2
  parentId: wool
  composition: "≥20% recycled wool (often blend)"
  weightRange: { min: 240, max: 600, unit: gsm }
  defaultFinish: "raw"
  certifications: ["GRS","RCS","Cardato Recycled (Prato)"]
  subtypes: ["outerwear-coat","outerwear-jacket","sweater","blazer"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","tailored","streetwear"]
  seasonFit: ["FW"]

- id: wool-tropical
  name: "Tropical wool (lightweight worsted plain)"
  layer: L2
  parentId: wool
  composition: "100% worsted wool"
  weightRange: { min: 170, max: 240, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["suit","blazer","trouser"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["tailored","minimal"]
  seasonFit: ["SS","transitional"]

- id: wool-fresco
  name: "Fresco / high-twist worsted"
  layer: L2
  parentId: wool
  composition: "100% high-twist worsted wool"
  weightRange: { min: 240, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["suit","blazer","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","preppy"]
  seasonFit: ["SS","transitional"]

- id: wool-worsted
  name: "Worsted wool (Super 100s/120s/150s)"
  layer: L2
  parentId: wool
  composition: "100% worsted wool"
  weightRange: { min: 240, max: 360, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["Super-100s","Super-110s","Super-120s","Super-130s","Super-150s","Super-180s"]
  subtypes: ["suit","blazer","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","preppy","minimal"]
  seasonFit: ["all-year"]

- id: wool-flannel
  name: "Wool flannel"
  layer: L2
  parentId: wool
  composition: "100% wool"
  weightRange: { min: 280, max: 400, unit: gsm }
  defaultFinish: "fulled"
  notes: "Worsted-warp / woolen-weft; brushed finish."
  subtypes: ["suit","trouser","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","preppy"]
  seasonFit: ["FW"]

- id: wool-tweed
  name: "Wool tweed (Harris / Donegal / Shetland)"
  layer: L2
  parentId: wool
  composition: "100% wool"
  weightRange: { min: 280, max: 500, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["blazer","outerwear-jacket","outerwear-coat","skirt","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["preppy","tailored","workwear"]
  seasonFit: ["FW"]

- id: wool-gabardine
  name: "Wool gabardine"
  layer: L2
  parentId: wool
  composition: "100% wool"
  weightRange: { min: 240, max: 360, unit: gsm }
  defaultFinish: "raw"
  notes: "Tightly woven steep twill."
  subtypes: ["trouser","outerwear-coat","outerwear-jacket"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","workwear"]
  seasonFit: ["transitional","FW"]

- id: wool-melton
  name: "Wool melton"
  layer: L2
  parentId: wool
  composition: "100% wool (heavily milled)"
  weightRange: { min: 400, max: 600, unit: gsm }
  defaultFinish: "milled"
  subtypes: ["outerwear-coat","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["tailored","workwear","preppy"]
  seasonFit: ["FW"]

- id: wool-loden
  name: "Loden"
  layer: L2
  parentId: wool
  composition: "100% wool (boiled / fulled)"
  weightRange: { min: 400, max: 700, unit: gsm }
  defaultFinish: "fulled"
  subtypes: ["outerwear-coat","outerwear-jacket"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","workwear"]
  seasonFit: ["FW"]

- id: wool-jersey
  name: "Wool jersey"
  layer: L2
  parentId: wool
  composition: "100% wool"
  weightRange: { min: 200, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","top","loungewear","skirt","tshirt"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","tailored"]
  seasonFit: ["FW","transitional"]

- id: wool-boucle
  name: "Wool bouclé"
  layer: L2
  parentId: wool
  composition: "100% wool (or wool-rich blend)"
  weightRange: { min: 320, max: 480, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["blazer","outerwear-jacket","outerwear-coat","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","romantic","preppy"]
  seasonFit: ["FW"]

- id: wool-doeskin
  name: "Wool doeskin"
  layer: L2
  parentId: wool
  composition: "100% wool"
  weightRange: { min: 320, max: 460, unit: gsm }
  defaultFinish: "milled"
  subtypes: ["outerwear-coat","blazer","trouser"]
  priceTier: ["luxury"]
  aestheticTags: ["tailored","minimal"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-vbc
  name: "Vitale Barberis Canonico (VBC)"
  layer: L3
  parentId: wool
  origin: "Italy (Pratrivero, Biella)"
  notes: |
    Founded 1663; 8M meters fabric/year, 5,000 new fabrics/year; supplies
    Brioni, Kiton, Gucci, Zegna, Loro Piana, Canali, and many bespoke
    workshops worldwide. Sells half under its own name and half under
    other brands — true B2B mill.
  verification: "https://vitalebarberiscanonico.com/ + https://en.wikipedia.org/wiki/Vitale_Barberis_Canonico + https://tissura.com/manufacturers/vitale-barberis-canonico-italia"

- id: supplier-reda
  name: "Reda 1865"
  layer: L3
  parentId: wool
  origin: "Italy (Valdilana, Biella)"
  notes: |
    Founded 1865; leading Italian Merino wool mill; vertically integrated
    from NZ farms to finished fabric; first Italian textile B Corporation;
    three product lines (Reda 1865 classics, Reda Active sport, Reda Flexo).
  verification: "https://www.reda1865.com/row/heritage + https://en.wikipedia.org/wiki/Reda_(fabric_mill) + https://www.bcorporation.net/en-us/find-a-b-corp/company/successori-reda-spa/"

- id: supplier-drago
  name: "Drago Lanificio"
  layer: L3
  parentId: wool
  origin: "Italy (Biella)"
  notes: |
    Founded 1973; vertically integrated wool mill; 1.7M meters/year;
    supplies major international brands in Japan, Korea, USA.
    Owns Lanificio Fintes (since 2001).
  verification: "https://www.dragobiella.it/en/about-us/ + https://blog.lanieri.com/en/the-best-italian-woollen-mills-and-fabrics-producers/"

- id: supplier-cerruti
  name: "Lanificio Fratelli Cerruti (Piacenza Group)"
  layer: L3
  parentId: wool
  origin: "Italy (Biella)"
  notes: |
    Founded 1881; iconic Biella mill; acquired Nov 2022 by Piacenza
    Group 1733; B2B fabric supplier to multiple international brands.
  verification: "https://www.lanificiocerruti.com/ + https://en.wikipedia.org/wiki/Lanificio_Fratelli_Cerruti"

- id: supplier-botto-giuseppe
  name: "Botto Giuseppe"
  layer: L3
  parentId: wool
  origin: "Italy (Valle Mosso, Biella + Tarcento, Udine)"
  notes: |
    Founded 1876; first Italian mill to supply Cradle to Cradle Certified
    natural wool and silk yarns; produces yarns and fabrics for
    international luxury customers.
  verification: "https://www.bottogiuseppe.com/en/yarns/ + https://c2ccertified.org/articles/botto-giuseppe-makes-sustainability-the-new-luxury"

- id: supplier-com-i-stra
  name: "Com.i.stra (recycled wool)"
  layer: L3
  parentId: wool
  origin: "Italy (Prato)"
  notes: |
    Mechanical recycled wool producer in the Prato textile district;
    specializes in regenerated wool from textile waste; B2B supplier.
  verification: "https://www.comistra.com/"
```

### Notes & sources
- L2 weight tiers from putthison.com worsted vs woolen, garrisonbespoke.com fabrics guide, bondsuits.com worsted, atltailor.com seasonal weights.
- Super-S system explained at zalmira.com worsted guide.
- Recycled wool note: ineligible for RWS, must be certified via GRS/RCS.
- Sources:
  - https://vitalebarberiscanonico.com/
  - https://www.reda1865.com/row/heritage
  - https://www.dragobiella.it/en/about-us/
  - https://www.lanificiocerruti.com/
  - https://www.bottogiuseppe.com/en/yarns/
  - https://www.comistra.com/
  - https://textileexchange.org/responsible-wool-standard/
  - https://corertex.it/en/recycling/

---

## 12. Cashmere

### L1 — Base
```yaml
- id: cashmere
  name: "Cashmere"
  layer: L1
  family: natural-animal
  composition: "100% cashmere"
  weightRange: { min: 180, max: 480, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","brushed","milled","Super-100s+"]
  zones: ["Body","Lining","Sleeve"]
  subtypes: ["sweater","knitwear-top","blazer","outerwear-coat","trouser","dress","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","tailored","romantic"]
  seasonFit: ["FW","transitional"]
  certifications: ["SFA Cashmere Standard","Good Cashmere Standard","NATIVA"]
  vegan: false
  origin: "Mongolia / Inner Mongolia (China) / Iran / Afghanistan"
```

### L2 — Variants
```yaml
- id: cashmere-knit-fine
  name: "Cashmere fine knit (12-18 gauge)"
  layer: L2
  parentId: cashmere
  composition: "100% cashmere"
  weightRange: { min: 180, max: 280, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","knitwear-top"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","tailored"]
  seasonFit: ["FW","transitional"]

- id: cashmere-knit-chunky
  name: "Cashmere chunky knit (3-7 gauge)"
  layer: L2
  parentId: cashmere
  composition: "100% cashmere"
  weightRange: { min: 320, max: 480, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","outerwear-coat"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","loungewear"]
  seasonFit: ["FW"]

- id: cashmere-woven
  name: "Cashmere woven (suiting / coating)"
  layer: L2
  parentId: cashmere
  composition: "100% cashmere"
  weightRange: { min: 280, max: 460, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["blazer","outerwear-coat","trouser"]
  priceTier: ["luxury"]
  aestheticTags: ["tailored","minimal"]
  seasonFit: ["FW"]

- id: cashmere-double-face
  name: "Cashmere double-face"
  layer: L2
  parentId: cashmere
  composition: "100% cashmere (two faces)"
  weightRange: { min: 380, max: 600, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-coat"]
  priceTier: ["luxury"]
  aestheticTags: ["tailored","minimal"]
  seasonFit: ["FW"]

- id: cashmere-silk-blend
  name: "Cashmere-silk blend"
  layer: L2
  parentId: cashmere
  composition: "70% cashmere 30% silk (typical)"
  weightRange: { min: 200, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","dress","blazer","skirt"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","romantic","tailored"]
  seasonFit: ["FW","transitional"]

- id: cashmere-recycled
  name: "Recycled cashmere"
  layer: L2
  parentId: cashmere
  composition: "≥20% recycled cashmere (often blended)"
  weightRange: { min: 280, max: 480, unit: gsm }
  defaultFinish: "raw"
  certifications: ["GRS","RCS"]
  subtypes: ["sweater","outerwear-coat","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","minimal"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-cariaggi
  name: "Cariaggi Lanificio"
  layer: L3
  parentId: cashmere
  origin: "Italy (Cagli, Pesaro e Urbino)"
  notes: |
    Founded 1958; world-class cashmere yarn spinner; supplies Givenchy,
    Dior, Johnston of Elgin, Akris, Sa Su Phi, and many others
    in 27 countries. B2B yarn mill — confirmed multi-brand
    even after partial Brunello Cucinelli + Chanel investments.
  verification: "https://www.cariaggi.it/en/ + https://www.cariaggi.it/en/company/ + https://lucafaloni.com/en/us/pages/craft/cashmere"

- id: supplier-todd-duncan
  name: "Todd & Duncan"
  layer: L3
  parentId: cashmere
  origin: "Scotland (Loch Leven)"
  notes: |
    Founded 1867; world-leading cashmere yarn spinner; 150+ years; supplies
    multiple international fashion houses; spins, dyes, ships yarn B2B.
  verification: "https://www.todd-duncan.co.uk/ + https://us.sunspel.com/blogs/the-journal/todd-and-duncan-quality-and-responsibility"

- id: supplier-johnstons-elgin
  name: "Johnstons of Elgin"
  layer: L3
  parentId: cashmere
  origin: "Scotland (Elgin + Hawick)"
  notes: |
    Founded 1797; only vertical weaving mill still operating in Scotland;
    supplies Hermès, Chanel, Louis Vuitton, Ralph Lauren, Burberry as
    a B2B fabric and knitwear mill. Three Royal Warrants.
  verification: "https://johnstonsofelgin.com/en-us + https://en.wikipedia.org/wiki/Johnstons_of_Elgin"

- id: supplier-filpucci
  name: "Filpucci"
  layer: L3
  parentId: cashmere
  origin: "Italy (Florence)"
  notes: |
    Founded 1967; fancy yarn specialist for high-end knitwear including
    cashmere; sustainable cashmere via 100% Italian closed-loop production.
    Ships yarns to many luxury brands B2B.
  verification: "https://www.filpucci.it/en/ + https://www.knittingindustry.com/filpucci-yarn-and-woollen-collections-at-pitti-filati/"
```

### Notes & sources
- Brunello Cucinelli's 43% Cariaggi stake (2022) and Chanel's later partial buy-in (2023) verified — Cariaggi remains a B2B mill serving multiple brands.
- Recycled cashmere via Prato (Cardato) ecosystem.
- Sources:
  - https://www.cariaggi.it/en/
  - https://www.todd-duncan.co.uk/
  - https://johnstonsofelgin.com/en-us
  - https://www.filpucci.it/en/
  - https://corertex.it/en/recycling/

---

## 13. Mohair

### L1 — Base
```yaml
- id: mohair
  name: "Mohair"
  layer: L1
  family: natural-animal
  composition: "100% mohair (Angora goat)"
  weightRange: { min: 200, max: 480, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","brushed"]
  zones: ["Body","Sleeve","Trim"]
  subtypes: ["sweater","knitwear-top","blazer","outerwear-coat","skirt","dress"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","avant-garde","tailored","streetwear"]
  seasonFit: ["FW","transitional"]
  certifications: ["RMS (Responsible Mohair Standard)","OEKO-TEX"]
  vegan: false
  origin: "South Africa / Texas USA / Lesotho"
```

### L2 — Variants
```yaml
- id: mohair-kid
  name: "Kid mohair (≤18 micron)"
  layer: L2
  parentId: mohair
  composition: "100% kid mohair"
  weightRange: { min: 200, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","knitwear-top","blazer","dress"]
  priceTier: ["luxury"]
  aestheticTags: ["romantic","tailored","minimal"]
  seasonFit: ["FW","transitional"]

- id: mohair-adult
  name: "Adult mohair"
  layer: L2
  parentId: mohair
  composition: "100% adult mohair"
  weightRange: { min: 280, max: 480, unit: gsm }
  defaultFinish: "brushed"
  subtypes: ["sweater","outerwear-coat","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["streetwear","avant-garde","romantic"]
  seasonFit: ["FW"]

- id: mohair-wool-blend
  name: "Mohair-wool blend"
  layer: L2
  parentId: mohair
  composition: "30% mohair 70% wool"
  weightRange: { min: 240, max: 380, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["suit","blazer","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","preppy"]
  seasonFit: ["transitional","FW"]

- id: mohair-loop-knit
  name: "Mohair loop / brushed knit"
  layer: L2
  parentId: mohair
  composition: "70% mohair 30% wool/nylon"
  weightRange: { min: 280, max: 420, unit: gsm }
  defaultFinish: "brushed"
  subtypes: ["sweater","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","streetwear","avant-garde"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-samil
  name: "SAMIL Natural Fibres"
  layer: L3
  parentId: mohair
  origin: "South Africa"
  notes: |
    South Africa's primary mohair B2B supplier with full traceability
    from regenerative farming through processing and spinning. Sells to
    multiple international brands and yarn distributors.
  verification: "https://www.samil.co.za/ + https://www.mohair.co.za/suppliers-manufacturers"

- id: supplier-mohair-spinners-sa
  name: "Mohair Spinners South Africa (MSSA, Stucken Group)"
  layer: L3
  parentId: mohair
  origin: "South Africa"
  notes: |
    Industrial mohair spinner producing machine + hand knitting yarns,
    weaving yarns for apparel, blanket fabric, velour. B2B operation.
  verification: "https://www.stucken.co.za/spinning + https://www.mohair.co.za/suppliers-manufacturers"

- id: supplier-hinterveld
  name: "Hinterveld"
  layer: L3
  parentId: mohair
  origin: "South Africa"
  notes: |
    Specialist spinner & weaver of mohair textiles; private label
    manufacturing + textile design B2B services.
  verification: "https://www.mohair.co.za/suppliers-manufacturers"
```

### Notes & sources
- South Africa = world's largest mohair producer (~50% of global supply).
- RMS (Responsible Mohair Standard) is the equivalent of RWS.
- Sources:
  - https://www.mohair.co.za/
  - https://www.samil.co.za/
  - https://www.stucken.co.za/spinning
  - https://en.reach24h.com/news/insights/sustainability/rws-ras-rms-certifications

---

## 14. Alpaca

### L1 — Base
```yaml
- id: alpaca
  name: "Alpaca"
  layer: L1
  family: natural-animal
  composition: "100% alpaca"
  weightRange: { min: 200, max: 480, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","brushed"]
  zones: ["Body","Sleeve","Lining"]
  subtypes: ["sweater","knitwear-top","outerwear-coat","blazer","dress","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","romantic","tailored","sustainable"]
  seasonFit: ["FW","transitional"]
  certifications: ["RAS (Responsible Alpaca Standard)","OEKO-TEX"]
  vegan: false
  origin: "Peru / Bolivia / Chile"
```

### L2 — Variants
```yaml
- id: alpaca-huacaya
  name: "Huacaya alpaca (crimped, fluffy)"
  layer: L2
  parentId: alpaca
  composition: "100% Huacaya alpaca"
  weightRange: { min: 240, max: 420, unit: gsm }
  defaultFinish: "brushed"
  subtypes: ["sweater","knitwear-top","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","romantic"]
  seasonFit: ["FW"]

- id: alpaca-suri
  name: "Suri alpaca (silky, lustrous)"
  layer: L2
  parentId: alpaca
  composition: "100% Suri alpaca"
  weightRange: { min: 200, max: 360, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","blazer","dress","outerwear-coat"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","tailored","romantic"]
  seasonFit: ["FW","transitional"]

- id: alpaca-baby
  name: "Baby alpaca (≤22.5 micron)"
  layer: L2
  parentId: alpaca
  composition: "100% baby alpaca"
  weightRange: { min: 200, max: 360, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","knitwear-top","dress","blazer"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","romantic","tailored"]
  seasonFit: ["FW","transitional"]

- id: alpaca-royal
  name: "Royal alpaca (≤19 micron)"
  layer: L2
  parentId: alpaca
  composition: "100% royal alpaca"
  weightRange: { min: 200, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","dress","blazer"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","tailored"]
  seasonFit: ["FW","transitional"]

- id: alpaca-wool-blend
  name: "Alpaca-wool blend"
  layer: L2
  parentId: alpaca
  composition: "50% alpaca 50% wool"
  weightRange: { min: 240, max: 480, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-coat","sweater","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","minimal","sustainable"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-michell
  name: "Michell & Co."
  layer: L3
  parentId: alpaca
  origin: "Peru (Arequipa)"
  notes: |
    Founded 1931; world's leading producer + exporter of alpaca tops and
    yarns; 80+ years of B2B alpaca yarn supply. Multi-brand.
  verification: "https://textileexchange.org/responsible-alpaca-standard/ + https://www.michell.com.pe/ (referenced via Knit Lab Peru and Threads of Peru sourcing pages)"

- id: supplier-incalpaca
  name: "Incalpaca"
  layer: L3
  parentId: alpaca
  origin: "Peru (Arequipa)"
  notes: |
    Vertically integrated alpaca + fine fiber mill (vicuña, alpaca, silk,
    pima cotton, linen). B2B yarn + fabric + finished garment supplier.
  verification: "https://www.incalpaca.com/"

- id: supplier-textialpaca
  name: "Texialpaca"
  layer: L3
  parentId: alpaca
  origin: "Peru (Arequipa)"
  notes: |
    High-quality alpaca-garment B2B manufacturer with technical processing
    and social-responsibility traceability.
  verification: "https://textialpacaperu.com/about-us"
```

### Notes & sources
- Peru = ~80% of world alpaca fiber production.
- RAS = Responsible Alpaca Standard (Textile Exchange).
- Sources:
  - https://www.incalpaca.com/
  - https://textialpacaperu.com/about-us
  - https://www.knitlabperu.com/knitwear-manufacturer
  - https://en.reach24h.com/news/insights/sustainability/rws-ras-rms-certifications

---

## 15. Angora (Rabbit)

### L1 — Base
```yaml
- id: angora
  name: "Angora (rabbit)"
  layer: L1
  family: natural-animal
  composition: "100% angora rabbit"
  weightRange: { min: 200, max: 360, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","brushed"]
  zones: ["Body","Sleeve","Trim"]
  subtypes: ["sweater","knitwear-top","top","dress"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","minimal","preppy"]
  seasonFit: ["FW","transitional"]
  certifications: ["IAGARB humane standards (German)","Belangor (French)"]
  vegan: false
  origin: "France / Germany"
  notes: "Strict ethical scrutiny. Stick to humanely-combed (not plucked) supply only."
```

### L2 — Variants
```yaml
- id: angora-french
  name: "French angora (Belangor)"
  layer: L2
  parentId: angora
  composition: "100% French angora"
  weightRange: { min: 200, max: 320, unit: gsm }
  defaultFinish: "raw"
  certifications: ["French Artisan Product designation"]
  subtypes: ["sweater","top"]
  priceTier: ["luxury"]
  aestheticTags: ["romantic","minimal"]
  seasonFit: ["FW"]

- id: angora-german
  name: "German angora (IAGARB)"
  layer: L2
  parentId: angora
  composition: "100% German angora"
  weightRange: { min: 240, max: 360, unit: gsm }
  defaultFinish: "raw"
  certifications: ["IAGARB humane standards"]
  subtypes: ["sweater","top"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","preppy"]
  seasonFit: ["FW"]

- id: angora-wool-blend
  name: "Angora-wool/merino blend"
  layer: L2
  parentId: angora
  composition: "50% angora 50% merino"
  weightRange: { min: 200, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","top","knitwear-top"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","minimal","preppy"]
  seasonFit: ["FW","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-belangor
  name: "Belangor (French angora)"
  layer: L3
  parentId: angora
  origin: "France"
  notes: |
    French humanely-combed angora yarn, designated Artisan Product (2013).
    Sole French B2B angora yarn supply at scale.
  verification: "https://www.fabulousyarn.com/galler-belangora.shtml"

- id: supplier-bergere-france
  name: "Bergère de France (angora line)"
  layer: L3
  parentId: angora
  origin: "France"
  notes: |
    Heritage French yarn manufacturer with angora line blended with merino;
    B2B / wholesale across European markets.
  verification: "https://www.bergeredefrance.com/angora.html"
```

### Notes & sources
- China supplies ~90% of world angora; Europe insists on humane combed sourcing.
- IAGARB (Germany) and Belangor (France) are the canonical ethical signals.
- Sources:
  - https://www.fabulousyarn.com/galler-belangora.shtml
  - https://www.bergeredefrance.com/angora.html
  - https://iagarb.com/about-us-2/

---

## 16. Vicuña

### L1 — Base
```yaml
- id: vicuna
  name: "Vicuña"
  layer: L1
  family: natural-animal
  composition: "100% vicuña"
  weightRange: { min: 220, max: 360, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw"]
  zones: ["Body"]
  subtypes: ["outerwear-coat","blazer","sweater"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","tailored"]
  seasonFit: ["FW"]
  certifications: ["CITES (regulated)","Vicuña Convention"]
  vegan: false
  origin: "Peru / Bolivia / Argentina / Chile"
  notes: "World's rarest and most expensive natural fiber. ~12 tonnes/year global supply (vs ~25,000 tonnes cashmere). Protected species — CITES II."
```

### L2 — Variants
```yaml
- id: vicuna-pure
  name: "Pure vicuña (100%)"
  layer: L2
  parentId: vicuna
  composition: "100% vicuña"
  weightRange: { min: 240, max: 360, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-coat","blazer"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","tailored"]
  seasonFit: ["FW"]

- id: vicuna-cashmere-blend
  name: "Vicuña-cashmere blend"
  layer: L2
  parentId: vicuna
  composition: "50% vicuña 50% cashmere (typical)"
  weightRange: { min: 220, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-coat","blazer","sweater"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","tailored"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-incalpaca-vicuna
  name: "Incalpaca (vicuña line)"
  layer: L3
  parentId: vicuna
  origin: "Peru"
  notes: |
    Among the few Peruvian processors with verified vicuña handling
    in addition to alpaca. Sells B2B yarn / fabric in regulated quantities.
    Other major source — Loro Piana — is excluded as L3 because, since 2021,
    Loro Piana sells only vicuña-cashmere blends to third parties (not pure
    vicuña), and its primary commercial behaviour is now exclusive use for
    its own products. We track it conservatively as a constrained partial supplier.
  verification: "https://www.incalpaca.com/ + https://www.businessoffashion.com/articles/sustainability/inside-the-business-of-vicuna-the-wool-worth-more-than-gold/"
```

### Notes & sources
- Loro Piana = exclusive Peruvian government partner since 1994; pulled back from third-party pure-vicuña sales ~2021. Now blend-only B2B.
- Holland & Sherry, Zegna, Brioni source vicuña directly from Bolivia, Peru, Argentina, Chile but rarely act as fabric mills selling vicuña to others.
- Sources:
  - https://us.loropiana.com/en/our-world/vicuna
  - https://www.businessoffashion.com/articles/sustainability/inside-the-business-of-vicuna-the-wool-worth-more-than-gold/
  - https://eluxemagazine.com/fashion/the-ethics-of-vicuna/

---

## 17. Llama

### L1 — Base
```yaml
- id: llama
  name: "Llama"
  layer: L1
  family: natural-animal
  composition: "100% llama"
  weightRange: { min: 240, max: 480, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","brushed"]
  zones: ["Body","Sleeve"]
  subtypes: ["sweater","outerwear-coat","blazer","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["bohemian","minimal","sustainable"]
  seasonFit: ["FW"]
  certifications: ["OEKO-TEX"]
  vegan: false
  origin: "Peru / Bolivia / Argentina"
```

### L2 — Variants
```yaml
- id: llama-tapada
  name: "Llama Tapada"
  layer: L2
  parentId: llama
  composition: "100% llama"
  weightRange: { min: 280, max: 420, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["bohemian","minimal"]
  seasonFit: ["FW"]

- id: llama-pelada
  name: "Llama Pelada (single-coated)"
  layer: L2
  parentId: llama
  composition: "100% llama"
  weightRange: { min: 240, max: 360, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","sustainable"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-incalpaca-llama
  name: "Incalpaca (llama line)"
  layer: L3
  parentId: llama
  origin: "Peru"
  notes: |
    Vertical mill working with multiple South American camelids; B2B
    fabric and yarn supplier.
  verification: "https://www.incalpaca.com/"
```

### Notes & sources
- Often blended; pure-llama woven fabric is niche.

---

## 18. Camel Hair

### L1 — Base
```yaml
- id: camel-hair
  name: "Camel hair"
  layer: L1
  family: natural-animal
  composition: "100% Bactrian camel hair"
  weightRange: { min: 280, max: 600, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","brushed","milled"]
  zones: ["Body"]
  subtypes: ["outerwear-coat","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","minimal","preppy"]
  seasonFit: ["FW"]
  certifications: ["OEKO-TEX"]
  vegan: false
  origin: "Inner Mongolia / Mongolia / China"
```

### L2 — Variants
```yaml
- id: camel-baby
  name: "Baby camel hair"
  layer: L2
  parentId: camel-hair
  composition: "100% baby camel"
  weightRange: { min: 280, max: 480, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-coat","blazer"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","tailored"]
  seasonFit: ["FW"]

- id: camel-coating
  name: "Camel coating (Polo Coat weight)"
  layer: L2
  parentId: camel-hair
  composition: "100% camel hair (or with wool)"
  weightRange: { min: 420, max: 600, unit: gsm }
  defaultFinish: "milled"
  subtypes: ["outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["preppy","tailored"]
  seasonFit: ["FW"]

- id: camel-wool-blend
  name: "Camel-wool blend"
  layer: L2
  parentId: camel-hair
  composition: "50% camel 50% wool"
  weightRange: { min: 320, max: 520, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-coat","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["preppy","tailored"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-mongol-textile
  name: "Mongol Textile JSC"
  layer: L3
  parentId: camel-hair
  origin: "Mongolia (Ulaanbaatar)"
  notes: |
    Mongolian textile mill specializing in camel wool products and yarn.
    B2B supplier serving multiple international knitwear brands.
  verification: "https://www.mongoltextile.com/camel-wool"

- id: supplier-camel-king
  name: "Camel King Woolen Product Co. (Alashan)"
  layer: L3
  parentId: camel-hair
  origin: "China (Inner Mongolia, Alashan Left Banner)"
  notes: |
    B2B camel hair fabric, blanket, shawl producer. Listed on industry
    directories. Confirmed multi-brand supplier (B2B platform listing).
  verification: "https://tuozhongwang.goldsupplier.com/"
```

### Notes & sources
- https://www.mongoltextile.com/camel-wool
- https://tuozhongwang.goldsupplier.com/

---

## 19. Yak

### L1 — Base
```yaml
- id: yak
  name: "Yak"
  layer: L1
  family: natural-animal
  composition: "100% yak down"
  weightRange: { min: 220, max: 420, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","brushed"]
  zones: ["Body"]
  subtypes: ["sweater","outerwear-coat","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","sustainable","tailored"]
  seasonFit: ["FW"]
  certifications: ["OEKO-TEX"]
  vegan: false
  origin: "Mongolia / Tibet"
```

### L2 — Variants
```yaml
- id: yak-baby-down
  name: "Baby yak down"
  layer: L2
  parentId: yak
  composition: "100% baby yak down"
  weightRange: { min: 220, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","blazer"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","tailored"]
  seasonFit: ["FW"]

- id: yak-cashmere-blend
  name: "Yak-cashmere blend"
  layer: L2
  parentId: yak
  composition: "50% yak 50% cashmere"
  weightRange: { min: 240, max: 360, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","outerwear-coat"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","sustainable"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-mongol-textile-yak
  name: "Mongol Textile JSC (yak line)"
  layer: L3
  parentId: yak
  origin: "Mongolia (Ulaanbaatar)"
  notes: |
    Mongolian B2B mill that processes yak alongside camel and cashmere.
  verification: "https://www.mongoltextile.com/camel-wool"
```

### Notes & sources
- Mongolia is the dominant yak-down origin. Most B2B supply moves through Ulaanbaatar mills.

---

## 20. Qiviut (Musk Ox)

### L1 — Base
```yaml
- id: qiviut
  name: "Qiviut (musk ox)"
  layer: L1
  family: natural-animal
  composition: "100% qiviut"
  weightRange: { min: null, max: null, unit: null }
  defaultFinish: "raw"
  finishOptions: ["raw"]
  zones: ["Body"]
  subtypes: ["sweater","knitwear-top"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","sustainable"]
  seasonFit: ["FW"]
  certifications: ["OEKO-TEX (where applicable)"]
  vegan: false
  origin: "Alaska / Canada (Arctic)"
  notes: "Extreme-rarity fiber. Only ~5–6 tonnes/year globally. 8× warmer than wool, softer than cashmere. Primarily for hand-knit accessories; rarely commercial fabric."
```

### L2 — Variants
```yaml
- id: qiviut-pure
  name: "Pure qiviut yarn"
  layer: L2
  parentId: qiviut
  composition: "100% qiviut"
  weightRange: { min: null, max: null, unit: null }
  defaultFinish: "raw"
  subtypes: ["sweater","knitwear-top"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","sustainable"]
  seasonFit: ["FW"]

- id: qiviut-blend
  name: "Qiviut-merino/silk blend"
  layer: L2
  parentId: qiviut
  composition: "30% qiviut 70% merino or silk"
  weightRange: { min: null, max: null, unit: null }
  defaultFinish: "raw"
  subtypes: ["sweater","knitwear-top"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","sustainable"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-windy-valley-muskox
  name: "Windy Valley Muskox"
  layer: L3
  parentId: qiviut
  origin: "USA (Alaska)"
  notes: |
    Ranch-based qiviut supplier offering 100% pure and blended qiviut
    yarns; sells wholesale yarn to designers/brands as B2B (small scale).
  verification: "https://windyvalleymuskox.net/products/pure-qiviut-yarn"

- id: supplier-oomingmak
  name: "Oomingmak (Musk Ox Producers' Co-operative)"
  layer: L3
  parentId: qiviut
  origin: "USA (Alaska)"
  notes: |
    Cooperative of Alaska musk ox producers. Wholesale qiviut access
    for designers, but supply is extremely limited.
  verification: "https://www.qiviut.com/"
```

### Notes & sources
- https://windyvalleymuskox.net/products/pure-qiviut-yarn
- https://www.qiviut.com/

---

## 21. Silk

### L1 — Base
```yaml
- id: silk
  name: "Silk"
  layer: L1
  family: natural-animal
  composition: "100% silk"
  weightRange: { min: 30, max: 220, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","sandwashed","degummed","crepe-finished"]
  zones: ["Body","Lining","Sleeve","Collar"]
  subtypes: ["dress","top","blouse","shirt","skirt","jumpsuit","lingerie","loungewear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","minimal","tailored","resort","avant-garde"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX","GOTS (organic peace silk only)"]
  vegan: false
  notes: "Silk weight measured in momme (mm). Designer can specify in mm OR gsm; mm = (gsm × 0.4) approximately."
```

### L2 — Variants (by construction × weight)
```yaml
- id: silk-mulberry
  name: "Mulberry silk (cultivated)"
  layer: L2
  parentId: silk
  composition: "100% Bombyx mori silk"
  weightRange: { min: 30, max: 220, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse","top","lingerie"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","minimal","tailored"]
  seasonFit: ["all-year"]

- id: silk-charmeuse
  name: "Silk charmeuse (12-30 mm satin)"
  layer: L2
  parentId: silk
  composition: "100% silk (satin weave)"
  weightRange: { min: 50, max: 130, unit: gsm }
  defaultFinish: "raw"
  notes: "12-30 momme satin with shiny face, matte back."
  subtypes: ["dress","blouse","lingerie","loungewear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","minimal"]
  seasonFit: ["all-year"]

- id: silk-crepe-de-chine
  name: "Silk crepe de chine (12-16 mm)"
  layer: L2
  parentId: silk
  composition: "100% silk"
  weightRange: { min: 50, max: 90, unit: gsm }
  defaultFinish: "crepe-finished"
  subtypes: ["dress","blouse","top","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","romantic","tailored"]
  seasonFit: ["all-year"]

- id: silk-chiffon
  name: "Silk chiffon (6-12 mm)"
  layer: L2
  parentId: silk
  composition: "100% silk"
  weightRange: { min: 30, max: 50, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","resort"]
  seasonFit: ["SS"]

- id: silk-organza
  name: "Silk organza (5-12 mm)"
  layer: L2
  parentId: silk
  composition: "100% silk"
  weightRange: { min: 30, max: 50, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","avant-garde"]
  seasonFit: ["SS"]

- id: silk-georgette
  name: "Silk georgette"
  layer: L2
  parentId: silk
  composition: "100% silk"
  weightRange: { min: 50, max: 90, unit: gsm }
  defaultFinish: "crepe-finished"
  subtypes: ["dress","blouse","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","resort"]
  seasonFit: ["SS","transitional"]

- id: silk-satin
  name: "Silk satin (8-pieces / 5-harness)"
  layer: L2
  parentId: silk
  composition: "100% silk"
  weightRange: { min: 90, max: 160, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse","lingerie"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","tailored"]
  seasonFit: ["all-year"]

- id: silk-taffeta
  name: "Silk taffeta"
  layer: L2
  parentId: silk
  composition: "100% silk"
  weightRange: { min: 60, max: 110, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","skirt","blouse"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","avant-garde"]
  seasonFit: ["FW","transitional"]

- id: silk-shantung
  name: "Silk shantung"
  layer: L2
  parentId: silk
  composition: "100% silk"
  weightRange: { min: 90, max: 160, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blazer","skirt","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","romantic"]
  seasonFit: ["SS","transitional"]

- id: silk-dupioni
  name: "Silk dupioni / dupion"
  layer: L2
  parentId: silk
  composition: "100% silk (double cocoon)"
  weightRange: { min: 90, max: 180, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blazer","skirt","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","romantic","avant-garde"]
  seasonFit: ["SS","transitional"]

- id: silk-twill
  name: "Silk twill"
  layer: L2
  parentId: silk
  composition: "100% silk"
  weightRange: { min: 60, max: 110, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["blouse","dress","top"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","tailored"]
  seasonFit: ["all-year"]

- id: silk-jersey
  name: "Silk jersey"
  layer: L2
  parentId: silk
  composition: "100% silk knit"
  weightRange: { min: 90, max: 180, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","top","loungewear"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","romantic"]
  seasonFit: ["all-year"]

- id: silk-tussah
  name: "Tussah / wild silk"
  layer: L2
  parentId: silk
  composition: "100% Antheraea wild silk"
  weightRange: { min: 90, max: 180, unit: gsm }
  defaultFinish: "raw"
  notes: "Honey/tan natural color; coarser than mulberry; ~9× thicker fibers."
  subtypes: ["dress","blazer","skirt","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["bohemian","resort","sustainable"]
  seasonFit: ["SS","transitional"]

- id: silk-eri
  name: "Eri silk (peace / ahimsa)"
  layer: L2
  parentId: silk
  composition: "100% Samia ricini silk"
  weightRange: { min: 130, max: 240, unit: gsm }
  defaultFinish: "raw"
  notes: "Cocoons harvested AFTER moth emerges. Wooly, matte, cotton-like hand. Vegan-adjacent (silkworm survives) — sometimes labeled 'peace silk'."
  subtypes: ["sweater","dress","top","loungewear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","bohemian","minimal"]
  seasonFit: ["FW","transitional"]

- id: silk-muga
  name: "Muga silk"
  layer: L2
  parentId: silk
  composition: "100% Antheraea assamensis silk"
  weightRange: { min: 90, max: 200, unit: gsm }
  defaultFinish: "raw"
  notes: "Golden hue; most expensive of wild silks; primarily Assam (India)."
  subtypes: ["dress","blouse","blazer"]
  priceTier: ["luxury"]
  aestheticTags: ["bohemian","romantic","avant-garde"]
  seasonFit: ["SS","transitional"]

- id: silk-cotton-blend
  name: "Silk-cotton blend"
  layer: L2
  parentId: silk
  composition: "50% silk 50% cotton"
  weightRange: { min: 90, max: 180, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["shirt","dress","top","blouse"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","resort"]
  seasonFit: ["all-year"]

- id: silk-wool-blend
  name: "Silk-wool blend"
  layer: L2
  parentId: silk
  composition: "50% silk 50% wool"
  weightRange: { min: 130, max: 280, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["suit","blazer","trouser","dress"]
  priceTier: ["luxury"]
  aestheticTags: ["tailored","minimal"]
  seasonFit: ["all-year"]

- id: silk-linen-blend
  name: "Silk-linen blend"
  layer: L2
  parentId: silk
  composition: "50% silk 50% linen"
  weightRange: { min: 130, max: 220, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse","skirt","trouser","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["resort","minimal","tailored"]
  seasonFit: ["SS","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-mantero
  name: "Mantero Seta"
  layer: L3
  parentId: silk
  origin: "Italy (Como)"
  notes: |
    Founded 1902; one of the historic Como silk houses; sells fabrics
    + accessories worldwide. Chanel acquired 35% stake in 2024 but
    Mantero still operates as a B2B supplier to multiple maisons
    (Dior, etc.).
  verification: "https://mantero.com/en/pages/chi-siamo + https://wwd.com/fashion-news/textiles/como-silk-ratti-mantero-taroni-10356701/ + https://en.ilsole24ore.com/art/chanel-takes-over-35-per-cent-mantero-silk-a-deal-that-gives-italian-textiles-confidence-AHtgPR"

- id: supplier-ratti
  name: "Ratti"
  layer: L3
  parentId: silk
  origin: "Italy (Guanzate, Como)"
  notes: |
    Founded 1945; full silk production cycle (yarn through finishing);
    4M+ meters/year for fashion + interiors. B2B fabric mill
    serving multiple luxury houses.
  verification: "https://fabrics-fabrics.com/collections/fabrics-from-the-italian-luxury-fashion-brand-ratti + https://wwd.com/fashion-news/textiles/como-silk-ratti-mantero-taroni-10356701/"

- id: supplier-taroni
  name: "Taroni SpA"
  layer: L3
  parentId: silk
  origin: "Italy (Como)"
  notes: |
    Founded 1880; one of oldest Como silk mills still operating;
    only mill using shuttle looms at industrial scale. B2B fabric
    supplier of chiffon, satin, crepe de chine, taffeta to leading
    fashion houses.
  verification: "https://www.taroni.it/ + https://tissura.com/manufacturers/taroni"
```

### Notes & sources
- Como cluster: ~1,200 companies, ~17,500 employees; world's leading silk-printing region.
- Eri silk = "peace silk" — moth survives. Tussah = wild Antheraea. Muga = Assam.
- Sources:
  - https://mantero.com/en/pages/chi-siamo
  - https://www.taroni.it/
  - https://tissura.com/manufacturers/taroni
  - https://www.silksilky.com/blogs/blog/silk-varieties-comparison-guide
  - https://1000kingdoms.com/blogs/news/glossary-of-silk-fabrics-and-weaves
  - https://mulberryparksilks.com/blogs/mulberry/what-is-charmeuse-silk

---

## Summary tables

### Total counts (post Phase 1 cleanup, 2026-05-04)
- **L1 entries: 21** (all cellulosic + animal — sea silk removed entirely)
  - Cellulosic: cotton, linen, hemp, ramie, jute, bamboo, abaca, piña, kapok, nettle (10)
  - Animal: wool, cashmere, mohair, alpaca, angora, vicuña, llama, camel hair, yak, qiviut, silk (11)
- **L2 entries: 92**
- **L3 entries: 47 verified B2B suppliers** (Kapok and Nettle L3 sections removed — see notes below)

### Cleanup notes (Phase 1, 2026-05-04)
Per the "si no está claro, fuera" rule:
- **Kapok L3** removed — no verifiable B2B mill. L1+L2 kept; sourcing left to the user's procurement.
- **Nettle L3** removed — artisanal cooperative supply only. L1+L2 kept.
- **Sea silk / byssus** entire section removed — Pinna nobilis is a protected species since 1992, only one living master (Chiara Vigo, Sant'Antioco), no commercial supply. Not selectable.
- **Vicuña** verified clean — only Incalpaca listed as L3. Loro Piana excluded because it stopped pure-vicuña third-party sales c. 2021.

### Out-of-scope items I encountered (for future Ramas)
- **Regenerated cellulosics**: TENCEL™ Lyocell, Modal, Naia™ Acetate (Lenzing, Eastman) — Rama 2 candidate.
- **Synthetic petrochemicals**: polyester, nylon, polyamide, elastane, acrylic — Rama 3.
- **Recycled synthetics**: rPET, recycled nylon (ECONYL®, Aquafil) — Rama 3 sustainable.
- **Leathers and skins**: Bridge of Weir, Conceria Pasubio, Conceria Volpi — Rama 4.
- **Plant leather alternatives**: Piñatex (pineapple leather, Ananas Anam), Mylo, Desserto, MIRUM — Rama 4 vegan.
- **Hardware**: YKK zippers, Cobrax / Riri / Lampo / Prym snaps and rivets — Rama 5.
- **Trims and labels**: woven labels, hangtags, care labels, threads — Rama 5.
- **Footwear soles & components**: Vibram, Margom, leather Goodyear-welt soles — Rama 6.
- **Insulation**: down (RDS), recycled down, kapok (lives between Rama 1 and Rama 4).
- **Brand-locked / proprietary tech (CORRECTLY EXCLUDED)**: ZoomX, Boost, React, Flyknit, Air Max, Primeknit, Nuova Surf, Sorona (DuPont), CORDURA® (single-license partnerships).

### Mills explicitly excluded from L3 (and why)
- **Loro Piana ready-to-wear / cashmere brand**: DTC luxury brand. Its wholesale fabric arms (Solbiati for linen, internal cashmere) are partially B2B and were evaluated case-by-case. Solbiati IS included as L3 because it operates as a multi-brand supplier. The Loro Piana cashmere fabric division supplies its own brand primarily and is excluded.
- **Brunello Cucinelli**: DTC luxury brand only. Excluded.
- **Holland & Sherry / Dormeuil / Scabal**: These are MERCHANTS, not mills — they curate and brand cloth woven by mills like VBC, Drago, Cerruti. Could be referenced as "merchant" in a future Rama 1.5 layer if useful; intentionally not listed as L3 mills here.
- **Rex Fabrics, Joel & Son, Tissura**: Distributors/retailers, not mills. Excluded.
- **DTC sub-labels of mill groups (Libeco Home retail, Pontoglio retail blazer line, etc.)**: We list the mill, not the retail face.

---

## Closing notes

- All 49 L3 suppliers above are verified by at least one URL (typically two). Where verification was thin or commercial relationships were ambiguous (DTC vs B2B), entries were excluded and flagged in the "human review" list.
- The L2 layer is intentionally exhaustive enough that a designer typing "linen midweight" or "wool flannel" or "silk dupioni 16mm" will find a canonical match.
- L1 entries are kept minimal so a designer typing just the fiber name lands on a sensible default.
- Inserted vegan flags are derived from the base fiber's animal/non-animal source, not the certification — consistent with how aimily models the difference today.
- Weight ranges normalized to gsm except where momme is canonically used (silk); linked annotation kept inside `notes` for momme→gsm conversion.

End of report.
