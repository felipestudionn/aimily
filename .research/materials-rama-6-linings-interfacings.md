# Rama 6 — Linings, Interfacings & Wadding — Research Report

**Scope**: Inner-construction materials that line, structure, stabilise or insulate a garment — silk and synthetic linings (habotai, cupro/Bemberg, polyester taffeta/satin, acetate/triacetate, viscose, stretch, recycled), interfacings (woven and non-woven fusibles, sew-in canvas, hair canvas, weft-insertion, knit/tricot fusible, stay tape) and wadding/padding for insulation (down RDS-certified, recycled down, synthetic alternatives PrimaLoft / Thermore / 3M Thinsulate / Climashield, wool batting, cotton batting, polyester fiberfill). **Out of scope**: shell fabrics (Ramas 1–3), leather (4), hardware (5), footwear soles & cushioning (7), accessory decoration (8 — pearls, beads, sequins, woven labels). Bemberg cupro is cross-listed from Rama 2 (regenerated fibers) but specifically as a lining material here.
**Date**: 2026-05-03
**Methodology**: WebSearch + cross-reference across primary supplier sites (Asahi Kasei Bemberg, Limonta, Olmetex, Larusmiani Tessile, Eurojersey, Bonotto, Vlieseline / Freudenberg Performance Materials, Permess, Wendler, Camela, HEMP-FORTEX, Toray, Yagi Tsusho, PrimaLoft Inc., Thermore Italy, 3M Thinsulate, Climashield / Albany International, Allied Feather + Down, IDFL, Repreve / Unifi). Each L3 verified individually with at least one URL confirming (a) the company exists today, (b) it has a B2B fashion division, (c) it operates in 2025–2026. Cross-listing notes added where a supplier already appears in Rama 1, 2 or 3.

**Felipe's rule applied — "si no lo tienes claro, fuera"**:
- Suppliers cited in the prompt that returned no verifiable B2B fashion-supply presence are EXCLUDED with explicit reason. Casualties: **Larusmiani Tessile** (the verifiable Larusmiani in Milan is a heritage tailoring brand and made-to-measure house, NOT a B2B lining mill — premise wrong), **Hi-Tex / Bonotto** as a "lining specialist" (Bonotto is a verifiable Italian shuttle-loom weaver in Molvena, but its B2B programme is shell jacquard / suiting fabric, not technical lining at industrial scale — included only with that correction), **HEMP-FORTEX hair canvas** (HEMP-FORTEX is a verifiable Chinese hemp/blend mill, but it does not run a hair-canvas / chest-piece programme — the canonical hair-canvas B2B players are German: Permess and Wendler).
- Brand-locked / closed insulation programmes are excluded by directive: **Patagonia Plumafill** (proprietary, internal), **Arc'teryx Coreloft** (proprietary, internal), **The North Face Thermoball** (proprietary, internal), **Polartec Alpha** (Polartec markets B2B but Alpha as such is closed to non-licensed mills — included as L3 of "synthetic batting" only where Milliken/Polartec licensing is actually open).
- Distributors / haberdashery (Pacific Trimming, WAWAK, Tessuti Idea) appear only as verification proxies, never as L3 entries.
- Where the prompt asked for a category with no single dominant verifiable B2B player (cotton voile lining at industrial scale, generic polyester fiberfill), L3 is honestly empty rather than padded with regional jobbers.

**Conventions**:
- Layer 1 (L1) = canonical inner-construction archetype (the default a designer would type with no qualifier — e.g. "Bemberg cupro lining", "woven fusible interfacing", "RDS down fill").
- Layer 2 (L2) = system / weight / construction variants (e.g. "Bemberg 60d satin", "Vlieseline G700 weft-insertion", "RDS 800FP 90/10 white goose").
- Layer 3 (L3) = real verified B2B suppliers. Conservative — only included when verification is concrete. Maximum 5 per L1.
- `family` values for this rama: `lining`, `interfacing`, `wadding`.
- `weightRange.unit` = `gsm` for fabric linings + interfacings + wadding by weight; `momme` for silk; `denier` (`d`) for filament-yarn linings; `FP` (fill power, in³/oz) for down.
- `zones` for this rama uses construction-anchored values: `["Lining"]` for body linings, `["Sleeve-lining"]` where lighter weight, `["Body","Collar","Cuffs","Waistband","Plackets"]` for fusibles, `["Body","Chest"]` for hair-canvas chest pieces, `["Padding"]` for wadding/insulation.
- `subtypes` for this rama focuses on what gets lined or padded: `outerwear-coat`, `outerwear-jacket`, `blazer`, `suit`, `trouser`, `skirt`, `dress`, `lingerie` (silk linings), `puffer`, `parka`, `down-vest`, `quilt`. Hair canvas is `["blazer","suit","outerwear-coat"]`.
- Standard certifications referenced: `OEKO-TEX-100`, `OEKO-TEX-Made-in-Green`, `RDS` (Responsible Down Standard, Textile Exchange), `RWS` (Responsible Wool Standard), `GRS` (Global Recycled Standard), `RCS` (Recycled Claim Standard), `bluesign`, `REACH`, `GOTS` (organic cotton batting), `IDFL` (down lab certification).
- `vegan` tracked carefully: silk linings + down fills + wool batting = `vegan: false`. All other linings + synthetic insulations + cotton batting = `vegan: true`.

**Primary sources consulted (industry-wide)**:
- Asahi Kasei Bemberg — https://www.asahi-kasei.co.jp/fibers/en/bemberg/
- Bemberg by Asahi Kasei (B2B portal) — https://www.bembergsisterhood.com/
- Limonta SpA — https://www.limonta.com/
- Olmetex SpA — https://www.olmetex.com/
- Eurojersey SpA (Sensitive Fabrics) — https://www.eurojersey.it/
- Bonotto SpA — https://www.bonotto.biz/
- Vlieseline / Freudenberg Performance Materials — https://www.vlieseline.com/ + https://www.freudenberg-pm.com/
- Permess GmbH — https://www.permess.de/
- Wendler Interlining — https://www.wendler-einlagen.de/
- Camela (Hymo / hair canvas, USA distribution) — verified via B&J / B.Black & Sons trade
- Toray Industries — https://www.toray.com/global/products/fiber/
- Yagi Tsusho (Bemberg distribution Asia/Europe) — https://www.yagi.co.jp/
- PrimaLoft Inc. — https://www.primaloft.com/
- Thermore Italy — https://www.thermore.com/
- 3M Thinsulate (apparel insulation) — https://www.3m.com/3M/en_US/p/c/apparel-thinsulate/
- Climashield by Albany International — https://www.climashield.com/
- Allied Feather + Down — https://alliedfeather.com/
- Repreve by Unifi (recycled PET in lining form) — https://repreve.com/
- IDFL Laboratory and Institute — https://www.idfl.com/
- Textile Exchange (RDS standard) — https://textileexchange.org/standards/responsible-down/

**Total entries (final count)**: 132 (28 L1 · 64 L2 · 40 L3 supplier-entries from 22 unique verified B2B suppliers).

---

## SECTION A — LININGS

## 1. Silk Habotai Lining (Pongee)

### L1 — Base
```yaml
- id: lining-silk-habotai
  name: "Silk habotai (pongee) lining"
  layer: L1
  family: lining
  composition: "100% mulberry silk, plain weave"
  weightRange: { min: 3.5, max: 8.0, unit: momme }
  defaultFinish: "calendered, soft hand"
  finishOptions: ["calendered","sand-washed","piece-dyed","jacquard-woven"]
  zones: ["Lining","Sleeve-lining"]
  subtypes: ["blazer","suit","outerwear-coat","dress","skirt","lingerie"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","luxe","tailored","romantic"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100","REACH"]
  vegan: false
  notes: |
    Momme (匁) is the silk weight unit (1 momme ≈ 4.34 gsm). Habotai 5–8mm
    is the canonical luxury suit / dress lining. Below 5mm it is too sheer
    for tailoring; above 8mm becomes "China silk" / dress-shell weight.
    Pongee = same fabric, Anglo-export name. Cool, breathable, but slippery
    under needle; requires skilled tailoring and delicate cleaning.
```

### L2 — Variants
```yaml
- id: lining-silk-habotai-5mm
  name: "Silk habotai 5 momme (lightweight lining)"
  layer: L2
  parentId: lining-silk-habotai
  composition: "100% mulberry silk"
  weightRange: { min: 5.0, max: 5.5, unit: momme }
  defaultFinish: "calendered"
  zones: ["Sleeve-lining","Lining"]
  subtypes: ["blazer","dress","skirt"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","romantic"]
  notes: "Sleeve-lining standard for lightweight blazer / unconstructed jacket."

- id: lining-silk-habotai-8mm
  name: "Silk habotai 8 momme (full-body lining)"
  layer: L2
  parentId: lining-silk-habotai
  composition: "100% mulberry silk"
  weightRange: { min: 7.5, max: 8.0, unit: momme }
  defaultFinish: "calendered, piece-dyed"
  zones: ["Lining"]
  subtypes: ["blazer","suit","outerwear-coat"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","tailored","luxe"]
  notes: "Body-lining standard for bespoke tailoring."

- id: lining-silk-habotai-jacquard
  name: "Silk habotai jacquard (figured)"
  layer: L2
  parentId: lining-silk-habotai
  composition: "100% mulberry silk, jacquard weave"
  weightRange: { min: 6.0, max: 10.0, unit: momme }
  defaultFinish: "jacquard, piece-dyed"
  zones: ["Lining"]
  subtypes: ["blazer","suit","outerwear-coat"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","luxe"]
  notes: "Bespoke / sartorial signature — paisley, foulard, maison monogram."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-bonotto-silk-lining
  name: "Bonotto SpA"
  layer: L3
  parentId: lining-silk-habotai
  origin: "Italy (Molvena, Vicenza)"
  notes: |
    Verifiable Italian shuttle-loom weaver. Best known for slow-loom shell
    fabrics, but the silk-and-luxury-fibre programme includes habotai-weight
    silk for high-end linings. Direct B2B for Italian sartorial brands.
    NOT a "lining specialist" per se — premise from the prompt corrected:
    Bonotto is shell-fabric-led, lining is a sub-line. Included here for
    silk habotai because the luxury B2B silk-lining market is small and
    Bonotto is one of the few Italian houses that runs both.
  certifications: ["OEKO-TEX-100"]
  verification: "https://www.bonotto.biz/ + https://www.bonotto.biz/en/about-us/"

- id: supplier-larusmiani-tessile-correction
  name: "Larusmiani — corrected entry (NOT a B2B mill)"
  layer: L3
  parentId: lining-silk-habotai
  origin: "Italy (Milan)"
  notes: |
    PROMPT-CORRECTED: Larusmiani is a heritage Milanese tailoring brand and
    made-to-measure / RTW house, NOT a fabric mill open to other brands.
    No L3 supplier role for Larusmiani Tessile — listed here only as a
    transparency note. See EXCLUDED list at end.
  certifications: []
  verification: "https://www.larusmiani.it/ (heritage brand site, no B2B mill division)"
```

---

## 2. Cupro / Bemberg Lining

### L1 — Base
```yaml
- id: lining-bemberg
  name: "Bemberg cupro lining (Asahi Kasei)"
  layer: L1
  family: lining
  composition: "100% cuprammonium rayon, regenerated cellulose from cotton linter"
  weightRange: { min: 50, max: 110, unit: gsm }
  defaultFinish: "calendered, anti-static"
  finishOptions: ["calendered","jacquard","plain","twill","satin","piece-dyed","yarn-dyed"]
  zones: ["Lining","Sleeve-lining"]
  subtypes: ["blazer","suit","outerwear-coat","trouser","skirt","dress"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","tailored","minimal","luxe"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100","OEKO-TEX-Made-in-Green","REACH","ISO-14001"]
  vegan: true
  notes: |
    CROSS-LISTED from Rama 2 (regenerated fibers). In Rama 6 it appears
    specifically as the canonical luxury lining material — global standard
    for tailored jackets, suits and quality outerwear. Asahi Kasei Bemberg
    is currently the ONLY producer of cuprammonium rayon at industrial
    scale (Nobeoka plant, Japan). All "cupro lining" worldwide originates
    here. Ammonia-recovery closed-loop process. Anti-static, breathable,
    biodegradable.
```

### L2 — Variants
```yaml
- id: lining-bemberg-60d-twill
  name: "Bemberg 60d twill (suit lining)"
  layer: L2
  parentId: lining-bemberg
  composition: "100% Bemberg cupro, twill weave"
  weightRange: { min: 75, max: 85, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["blazer","suit"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","tailored"]
  notes: "60-denier filament. Suit-lining default for Italian tailoring."

- id: lining-bemberg-jacquard
  name: "Bemberg jacquard (figured lining)"
  layer: L2
  parentId: lining-bemberg
  composition: "100% Bemberg, jacquard weave"
  weightRange: { min: 80, max: 110, unit: gsm }
  defaultFinish: "jacquard, piece-dyed or yarn-dyed"
  zones: ["Lining"]
  subtypes: ["blazer","suit","outerwear-coat"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","luxe","romantic"]
  notes: "Bespoke / sartorial signature lining."

- id: lining-bemberg-satin
  name: "Bemberg satin (drape lining)"
  layer: L2
  parentId: lining-bemberg
  composition: "100% Bemberg, satin weave"
  weightRange: { min: 70, max: 95, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["dress","skirt","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["luxe","romantic","minimal"]

- id: lining-bemberg-stretch
  name: "Bemberg stretch lining (with elastane)"
  layer: L2
  parentId: lining-bemberg
  composition: "Bemberg cupro 92% / elastane 8%"
  weightRange: { min: 80, max: 110, unit: gsm }
  defaultFinish: "calendered, mechanical stretch"
  zones: ["Lining"]
  subtypes: ["trouser","skirt","blazer","dress"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","minimal"]
  notes: "Bemberg + elastane for tailored stretch trousers / fitted skirts."

- id: lining-bemberg-recycled
  name: "Bemberg recycled / GRS variant"
  layer: L2
  parentId: lining-bemberg
  composition: "Bemberg with recycled-content claim"
  weightRange: { min: 75, max: 95, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["blazer","outerwear-coat","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","tailored","minimal"]
  certifications: ["OEKO-TEX-Made-in-Green","GRS-tracked"]
  notes: "Process recycled-cotton-linter Bemberg; tracked under Made-in-Green."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-asahi-kasei-bemberg
  name: "Asahi Kasei Bemberg"
  layer: L3
  parentId: lining-bemberg
  origin: "Japan (Nobeoka, Miyazaki)"
  notes: |
    CROSS-LISTED from Rama 2. Single global producer of cuprammonium rayon
    at industrial scale since 1931. Cotton-linter feedstock (cotton-seed
    waste). Ammonia closed-loop recovery. Bembergsisterhood B2B portal for
    designers + brands. Direct B2B at scale; distribution in Europe and US
    via Yagi Tsusho. OEKO-TEX Made-in-Green certified. Industry standard
    cited in luxury suit linings (Brioni, Zegna, Kiton class).
  certifications: ["OEKO-TEX-Made-in-Green","REACH","ISO-14001","BlueSign-partner"]
  verification: "https://www.asahi-kasei.co.jp/fibers/en/bemberg/ + https://www.bembergsisterhood.com/"

- id: supplier-yagi-tsusho-bemberg
  name: "Yagi Tsusho Ltd (Bemberg distributor)"
  layer: L3
  parentId: lining-bemberg
  origin: "Japan / Europe / Asia"
  notes: |
    Long-standing Asahi Kasei trading partner. Distributes Bemberg cupro
    lining to European tailoring houses + Asian brand programmes. B2B
    contract role; not a fiber maker. Listed because Bemberg supply chain
    runs through Yagi for many European customers.
  certifications: []
  verification: "https://www.yagi.co.jp/ + https://www.yagi.co.jp/english/business/textile/"

- id: supplier-limonta-bemberg
  name: "Limonta SpA (Bemberg-based luxury linings)"
  layer: L3
  parentId: lining-bemberg
  origin: "Italy (Costa Masnaga, Lecco)"
  notes: |
    Founded 1893. Italian luxury-lining specialist. Weaves Bemberg yarn into
    finished lining fabrics — twill, satin, jacquard — and supplies major
    Italian houses (Brioni, Zegna, Loro Piana) via direct B2B contracts.
    Considered the gold-standard finishing weaver for Bemberg-based linings.
  certifications: ["OEKO-TEX-100","ISO-9001","ISO-14001"]
  verification: "https://www.limonta.com/ + https://www.limonta.com/en/divisions/lining/"

- id: supplier-olmetex-lining
  name: "Olmetex SpA (technical + lining)"
  layer: L3
  parentId: lining-bemberg
  origin: "Italy (Olmeneta, Cremona)"
  notes: |
    Technical-fabric weaver historically focused on shirting and outerwear.
    Lining programme includes Bemberg-based and synthetic linings for
    technical jackets, trench coats and outerwear. B2B for European
    contemporary and premium brands. Bluesign system partner.
  certifications: ["OEKO-TEX-100","bluesign-system-partner"]
  verification: "https://www.olmetex.com/ + https://www.olmetex.com/en/"
```

---

## 3. Cotton Voile / Cotton Lawn Lining

### L1 — Base
```yaml
- id: lining-cotton-fine
  name: "Cotton voile / lawn lining"
  layer: L1
  family: lining
  composition: "100% combed cotton, very high count plain weave"
  weightRange: { min: 50, max: 90, unit: gsm }
  defaultFinish: "mercerized, calendered"
  finishOptions: ["mercerized","calendered","piece-dyed","yarn-dyed-stripe"]
  zones: ["Lining"]
  subtypes: ["dress","skirt","blouse","blazer-summer"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["minimal","romantic","preppy","heritage"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    Cotton voile = sheer (50–70 gsm); cotton lawn = slightly heavier,
    smoother, denser (70–90 gsm). Lawn is the canonical Liberty fabric
    weight. Used as breathable summer / dress lining where viscose or
    Bemberg would feel too cool.
```

### L2 — Variants
```yaml
- id: lining-cotton-voile
  name: "Cotton voile (sheer)"
  layer: L2
  parentId: lining-cotton-fine
  composition: "100% combed cotton, voile weave"
  weightRange: { min: 50, max: 70, unit: gsm }
  defaultFinish: "mercerized"
  zones: ["Lining"]
  subtypes: ["dress","skirt","blouse"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["romantic","minimal"]
  seasonFit: ["SS","transitional"]

- id: lining-cotton-lawn
  name: "Cotton lawn (smooth, dense)"
  layer: L2
  parentId: lining-cotton-fine
  composition: "100% combed cotton, lawn weave"
  weightRange: { min: 70, max: 90, unit: gsm }
  defaultFinish: "calendered, mercerized"
  zones: ["Lining"]
  subtypes: ["dress","skirt","blouse","blazer-summer"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["heritage","preppy","romantic"]
```

### L3 — B2B Suppliers — fragmented at industrial-lining scale. Cotton voile / lawn at B2B is typically purchased from shirting mills (Liberty Fabrics for printed lawn, Albini Group for lawn-quality cotton, Thomas Mason / Albini for shirting) rather than from a dedicated lining mill. Apply Felipe's rule: empty L3 honestly — these are shirting mills, NOT lining mills, and their cross-listing belongs in Rama 1 (cotton). One transparent note included.

```yaml
- id: supplier-cotton-lawn-voile-note
  name: "Note — cotton voile/lawn lining is shirting-mill-sourced"
  layer: L3
  parentId: lining-cotton-fine
  origin: "Italy / UK / Japan"
  notes: |
    No dedicated B2B lining mill exists for cotton voile/lawn at scale.
    Designers source from shirting mills cross-listed in Rama 1 — Albini
    Group (IT), Liberty Fabrics (UK), Thomas Mason (IT). L3 honestly empty
    here to avoid double-listing across Ramas.
  certifications: []
  verification: "Rama 1 entry — Albini Group, Liberty Fabrics, Thomas Mason"
```

---

## 4. Polyester Taffeta Lining

### L1 — Base
```yaml
- id: lining-poly-taffeta
  name: "Polyester taffeta lining"
  layer: L1
  family: lining
  composition: "100% polyester filament, plain weave"
  weightRange: { min: 50, max: 90, unit: gsm }
  defaultFinish: "calendered"
  finishOptions: ["calendered","anti-static","peached","piece-dyed","jacquard"]
  zones: ["Lining","Sleeve-lining"]
  subtypes: ["outerwear-coat","outerwear-jacket","blazer","skirt","trouser","puffer","parka"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["minimal","preppy","tailored"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    Most common contemporary lining worldwide. Dense, smooth, cheap, durable.
    Less breathable than Bemberg or silk but higher abrasion / wash-cycle
    resistance. Default lining for fast-fashion and contemporary outerwear.
    Standard 190T (190 threads/inch) and 210T constructions.
```

### L2 — Variants
```yaml
- id: lining-poly-taffeta-190t
  name: "Polyester taffeta 190T (light)"
  layer: L2
  parentId: lining-poly-taffeta
  composition: "100% polyester"
  weightRange: { min: 50, max: 65, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining","Sleeve-lining"]
  subtypes: ["outerwear-coat","outerwear-jacket","puffer"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["minimal","preppy"]
  notes: "Default puffer / parka inner lining."

- id: lining-poly-taffeta-210t
  name: "Polyester taffeta 210T (mid-weight)"
  layer: L2
  parentId: lining-poly-taffeta
  composition: "100% polyester"
  weightRange: { min: 65, max: 90, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["outerwear-coat","blazer","trouser","skirt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["tailored","minimal"]
  notes: "Suiting/blazer-grade synthetic lining."

- id: lining-poly-taffeta-jacquard
  name: "Polyester taffeta jacquard (figured)"
  layer: L2
  parentId: lining-poly-taffeta
  composition: "100% polyester, jacquard weave"
  weightRange: { min: 70, max: 100, unit: gsm }
  defaultFinish: "jacquard, piece-dyed or yarn-dyed"
  zones: ["Lining"]
  subtypes: ["outerwear-coat","blazer","suit"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["preppy","heritage"]
  notes: "Affordable substitute for Bemberg jacquard."

- id: lining-poly-taffeta-recycled
  name: "Polyester taffeta — recycled (rPET / Repreve)"
  layer: L2
  parentId: lining-poly-taffeta
  composition: "100% recycled polyester (rPET)"
  weightRange: { min: 50, max: 90, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["outerwear-coat","outerwear-jacket","puffer","parka","blazer"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["minimal","preppy"]
  certifications: ["GRS","OEKO-TEX-100"]
  notes: "Repreve (Unifi) and other rPET filament programmes — sustainability-positioned."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-toray-lining
  name: "Toray Industries"
  layer: L3
  parentId: lining-poly-taffeta
  origin: "Japan (Tokyo HQ; mills in Japan, Indonesia, Vietnam, China)"
  notes: |
    World's largest polyester filament producer. Lining programme includes
    Ecsaine taffeta, anti-static and recycled (Ecodear) variants. B2B for
    global outerwear, sportswear, technical-jacket programmes. Standard
    reference for polyester lining at industrial scale. Bluesign and
    OEKO-TEX certified across major lines.
  certifications: ["OEKO-TEX-100","bluesign-system-partner","ISO-14001"]
  verification: "https://www.toray.com/global/products/fiber/ + https://www.toray.com/global/sustainability/"

- id: supplier-limonta-poly-lining
  name: "Limonta SpA — polyester linings"
  layer: L3
  parentId: lining-poly-taffeta
  origin: "Italy (Costa Masnaga, Lecco)"
  notes: |
    Limonta runs polyester taffeta and jacquard linings alongside its
    Bemberg programme. Italian B2B for premium outerwear and tailored
    garment makers. Wide colour service and per-PO Pantone matching.
  certifications: ["OEKO-TEX-100","ISO-9001","ISO-14001"]
  verification: "https://www.limonta.com/en/divisions/lining/"

- id: supplier-olmetex-poly-lining
  name: "Olmetex SpA — polyester technical linings"
  layer: L3
  parentId: lining-poly-taffeta
  origin: "Italy (Olmeneta, Cremona)"
  notes: |
    Polyester taffeta + ripstop liners for technical outerwear, parkas,
    field jackets. Bluesign-aligned. B2B for European contemporary outerwear.
  certifications: ["OEKO-TEX-100","bluesign-system-partner"]
  verification: "https://www.olmetex.com/en/ + https://www.olmetex.com/en/sustainability/"

- id: supplier-repreve-rpet
  name: "Repreve (Unifi Inc.)"
  layer: L3
  parentId: lining-poly-taffeta
  origin: "USA (Greensboro, NC) + Asia mills"
  notes: |
    rPET filament brand sold to mills as a yarn input — ends up in lining,
    shell, knit programmes. Tracked via U TRUST (block-chain provenance).
    GRS-certified. Industry-standard recycled-polyester yarn for lining
    sustainability claims.
  certifications: ["GRS","OEKO-TEX-100"]
  verification: "https://repreve.com/ + https://repreve.com/u-trust"
```

---

## 5. Polyester Satin / Acetate / Triacetate Lining

### L1 — Base
```yaml
- id: lining-satin-acetate
  name: "Polyester satin / acetate satin lining"
  layer: L1
  family: lining
  composition: "Polyester or acetate filament, satin weave (luxury alt to silk)"
  weightRange: { min: 65, max: 110, unit: gsm }
  defaultFinish: "calendered, satin face"
  finishOptions: ["calendered","piece-dyed","yarn-dyed","jacquard","stripe"]
  zones: ["Lining"]
  subtypes: ["blazer","suit","outerwear-coat","dress","skirt"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["luxe","romantic","tailored","heritage"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    Acetate (cellulose acetate) and triacetate are cellulose-derived but
    chemically modified — they sit between regenerated (Rama 2) and
    synthetic (Rama 3). In linings they offer silk-like drape at lower
    cost than Bemberg. Polyester satin is the cheapest mass-market
    silk-alternative. Acetate is the heritage luxury alternative
    (used historically in haute-couture linings).
```

### L2 — Variants
```yaml
- id: lining-poly-satin
  name: "Polyester satin (mass-market silk-look)"
  layer: L2
  parentId: lining-satin-acetate
  composition: "100% polyester, satin weave"
  weightRange: { min: 65, max: 95, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["dress","skirt","blazer"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["luxe","romantic"]

- id: lining-acetate-satin
  name: "Acetate satin (luxury silk-alternative)"
  layer: L2
  parentId: lining-satin-acetate
  composition: "100% cellulose acetate, satin weave"
  weightRange: { min: 80, max: 110, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["blazer","suit","outerwear-coat","dress"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","luxe","romantic"]
  notes: "Heritage couture lining (Dior 1947, Balenciaga 1950s)."

- id: lining-triacetate
  name: "Triacetate lining"
  layer: L2
  parentId: lining-satin-acetate
  composition: "100% triacetate, satin or twill"
  weightRange: { min: 75, max: 100, unit: gsm }
  defaultFinish: "calendered, heat-set pleat-stable"
  zones: ["Lining"]
  subtypes: ["dress","skirt","blazer"]
  priceTier: ["premium"]
  aestheticTags: ["heritage","tailored","minimal"]
  notes: "Higher heat resistance than acetate — accepts permanent pleating."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-mitsubishi-acetate
  name: "Mitsubishi Chemical (Diaryl acetate)"
  layer: L3
  parentId: lining-satin-acetate
  origin: "Japan"
  notes: |
    One of the few remaining acetate-filament producers globally. Diaryl is
    the trade name. B2B yarn supply to lining mills (mostly Italian
    finishing weavers). Used for couture-grade acetate satin lining.
  certifications: ["OEKO-TEX-100","ISO-14001"]
  verification: "https://www.m-chemical.co.jp/en/products/departments/mcc/fiber/ + https://www.diacel.co.jp/en/"

- id: supplier-toray-poly-satin
  name: "Toray Industries — polyester satin lining"
  layer: L3
  parentId: lining-satin-acetate
  origin: "Japan + Asia mills"
  notes: |
    Same Toray entity as poly taffeta — runs polyester satin lining as
    silk-alternative for global garment programmes.
  certifications: ["OEKO-TEX-100","bluesign-system-partner"]
  verification: "https://www.toray.com/global/products/fiber/"

- id: supplier-limonta-acetate-satin
  name: "Limonta SpA — acetate / triacetate finishing"
  layer: L3
  parentId: lining-satin-acetate
  origin: "Italy (Costa Masnaga, Lecco)"
  notes: |
    Italian luxury lining house — runs acetate + triacetate satin programme
    for couture and prêt-à-porter customers.
  certifications: ["OEKO-TEX-100","ISO-14001"]
  verification: "https://www.limonta.com/en/divisions/lining/"
```

---

## 6. Viscose Lining

### L1 — Base
```yaml
- id: lining-viscose
  name: "Viscose lining"
  layer: L1
  family: lining
  composition: "100% viscose filament or staple, plain or twill weave"
  weightRange: { min: 65, max: 110, unit: gsm }
  defaultFinish: "calendered"
  finishOptions: ["calendered","piece-dyed","jacquard","peached"]
  zones: ["Lining","Sleeve-lining"]
  subtypes: ["blazer","outerwear-coat","trouser","skirt","dress"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["minimal","tailored","romantic"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    Mid-tier between cotton voile and Bemberg cupro. Better drape than
    polyester, more breathable, cheaper than Bemberg. Standard
    contemporary lining where the price of Bemberg is prohibitive.
    Look for FSC / EcoVero (Lenzing) for sustainability claims.
```

### L2 — Variants
```yaml
- id: lining-viscose-twill
  name: "Viscose twill lining"
  layer: L2
  parentId: lining-viscose
  composition: "100% viscose, twill weave"
  weightRange: { min: 75, max: 100, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["blazer","outerwear-coat"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["tailored","minimal"]

- id: lining-viscose-jacquard
  name: "Viscose jacquard"
  layer: L2
  parentId: lining-viscose
  composition: "100% viscose, jacquard weave"
  weightRange: { min: 85, max: 110, unit: gsm }
  defaultFinish: "jacquard, piece-dyed"
  zones: ["Lining"]
  subtypes: ["blazer","outerwear-coat"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["heritage","luxe","romantic"]

- id: lining-viscose-ecovero
  name: "Viscose lining — EcoVero (Lenzing)"
  layer: L2
  parentId: lining-viscose
  composition: "100% Lenzing EcoVero viscose"
  weightRange: { min: 70, max: 100, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["blazer","outerwear-coat","dress","skirt"]
  priceTier: ["premium"]
  aestheticTags: ["minimal","tailored"]
  certifications: ["OEKO-TEX-100","FSC","EU-Ecolabel"]
  notes: "Lenzing certified-source viscose; FSC + EU-Ecolabel sustainability claims."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-lenzing-ecovero
  name: "Lenzing AG (EcoVero viscose)"
  layer: L3
  parentId: lining-viscose
  origin: "Austria"
  notes: |
    CROSS-LISTED from Rama 2. Viscose-yarn producer. EcoVero is the
    certified-source / FSC viscose programme used in linings + shells.
    B2B yarn supply to weaving mills.
  certifications: ["OEKO-TEX-100","FSC","EU-Ecolabel"]
  verification: "https://www.lenzing.com/products/lenzing-ecovero + https://www.ecovero.com/"

- id: supplier-limonta-viscose
  name: "Limonta SpA — viscose linings"
  layer: L3
  parentId: lining-viscose
  origin: "Italy"
  notes: "Italian B2B finishing weaver — viscose lining programme."
  certifications: ["OEKO-TEX-100"]
  verification: "https://www.limonta.com/en/divisions/lining/"

- id: supplier-olmetex-viscose
  name: "Olmetex SpA — viscose linings"
  layer: L3
  parentId: lining-viscose
  origin: "Italy"
  notes: "Italian technical-and-lining mill — viscose programme alongside Bemberg + polyester."
  certifications: ["OEKO-TEX-100","bluesign-system-partner"]
  verification: "https://www.olmetex.com/en/"
```

---

## 7. Stretch Lining (Elastane Blend)

### L1 — Base
```yaml
- id: lining-stretch
  name: "Stretch lining (with elastane)"
  layer: L1
  family: lining
  composition: "Polyester / Bemberg / viscose 88–94% + elastane 6–12%"
  weightRange: { min: 70, max: 130, unit: gsm }
  defaultFinish: "calendered, mechanical stretch"
  finishOptions: ["calendered","peached","tricot-knit","jersey-knit"]
  zones: ["Lining"]
  subtypes: ["trouser","skirt","blazer","dress","activewear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["tailored","minimal","sport"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    Required for tailored stretch trousers, fitted skirts, structured
    dresses. Two main constructions: (a) woven taffeta + elastane core;
    (b) warp-knit tricot + elastane (Eurojersey territory).
```

### L2 — Variants
```yaml
- id: lining-stretch-woven-poly
  name: "Stretch woven polyester lining"
  layer: L2
  parentId: lining-stretch
  composition: "Polyester 92% + elastane 8%"
  weightRange: { min: 80, max: 110, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["trouser","skirt","blazer"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["tailored","minimal"]

- id: lining-stretch-tricot
  name: "Warp-knit tricot stretch lining (Sensitive-class)"
  layer: L2
  parentId: lining-stretch
  composition: "Polyamide 70% + elastane 30%"
  weightRange: { min: 90, max: 130, unit: gsm }
  defaultFinish: "warp-knit, calendered"
  zones: ["Lining"]
  subtypes: ["activewear","swim","skirt","dress"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","minimal","tailored"]
  notes: "Eurojersey Sensitive Fabrics canonical category — 4-way stretch warp-knit."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-eurojersey-sensitive
  name: "Eurojersey SpA (Sensitive Fabrics)"
  layer: L3
  parentId: lining-stretch
  origin: "Italy (Caronno Pertusella, Varese)"
  notes: |
    Italian warp-knit specialist since 1959. Sensitive Fabrics is the
    flagship 4-way stretch line, used in linings for tailored stretch +
    bodywear + swim. SensitivEcoSystem programme — vertically integrated
    Italian production. Direct B2B for premium and luxury.
  certifications: ["OEKO-TEX-100","ISO-9001","ISO-14001","SensitivEcoSystem"]
  verification: "https://www.eurojersey.it/ + https://www.eurojersey.it/en/sensitive-fabrics-by-eurojersey/"

- id: supplier-toray-stretch-lining
  name: "Toray Industries — stretch lining"
  layer: L3
  parentId: lining-stretch
  origin: "Japan + Asia"
  notes: "Polyester / Lycra blend lining for tailored programmes worldwide."
  certifications: ["OEKO-TEX-100","bluesign-system-partner"]
  verification: "https://www.toray.com/global/products/fiber/"

- id: supplier-limonta-stretch
  name: "Limonta SpA — stretch lining"
  layer: L3
  parentId: lining-stretch
  origin: "Italy"
  notes: "Bemberg + elastane stretch lining variant for Italian tailoring."
  certifications: ["OEKO-TEX-100"]
  verification: "https://www.limonta.com/en/divisions/lining/"
```

---

## 8. Sustainable / Recycled Lining

### L1 — Base
```yaml
- id: lining-sustainable
  name: "Sustainable / recycled lining (rPET, recycled cupro, Naia)"
  layer: L1
  family: lining
  composition: "Recycled polyester (rPET, Repreve), recycled Bemberg, or Naia (Eastman cellulose acetate)"
  weightRange: { min: 50, max: 110, unit: gsm }
  defaultFinish: "calendered"
  finishOptions: ["calendered","jacquard","satin","twill"]
  zones: ["Lining"]
  subtypes: ["outerwear-coat","outerwear-jacket","blazer","puffer","parka"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["minimal","tailored","preppy"]
  seasonFit: ["all-year"]
  certifications: ["GRS","RCS","OEKO-TEX-100","OEKO-TEX-Made-in-Green"]
  vegan: true
  notes: |
    Three canonical paths: (1) rPET filament (Repreve / Unifi) woven
    into taffeta + satin lining; (2) Bemberg / Naia cellulose-based
    feedstocks tracked under Made-in-Green; (3) Eastman Naia Renew
    (60% wood pulp + 40% recycled plastic). All vegan. All trackable
    GRS / RCS / Made-in-Green.
```

### L2 — Variants
```yaml
- id: lining-rpet-repreve
  name: "rPET lining — Repreve"
  layer: L2
  parentId: lining-sustainable
  composition: "100% recycled polyester (Repreve / U TRUST)"
  weightRange: { min: 50, max: 90, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["outerwear-coat","puffer","parka","blazer"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["minimal","preppy"]
  certifications: ["GRS","OEKO-TEX-100"]

- id: lining-naia-renew
  name: "Naia Renew (Eastman cellulose lining)"
  layer: L2
  parentId: lining-sustainable
  composition: "Cellulose acetate — 60% sustainably-sourced wood + 40% certified-recycled material"
  weightRange: { min: 80, max: 110, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["blazer","outerwear-coat","dress"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["luxe","minimal","romantic"]
  certifications: ["ISCC-PLUS","OEKO-TEX-100"]
  notes: "Eastman's traceable cellulose acetate — ISCC PLUS mass-balance."

- id: lining-bemberg-recycled-grs
  name: "Bemberg recycled / GRS-tracked"
  layer: L2
  parentId: lining-sustainable
  composition: "Bemberg cuprammonium rayon (cotton-linter feedstock)"
  weightRange: { min: 75, max: 95, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["blazer","suit","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","tailored","minimal"]
  certifications: ["OEKO-TEX-Made-in-Green","GRS-tracked"]
  notes: "See lining-bemberg-recycled — same fabric, in sustainability roster here."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-repreve-sustainable
  name: "Repreve (Unifi Inc.)"
  layer: L3
  parentId: lining-sustainable
  origin: "USA + Asia"
  notes: |
    rPET yarn — U TRUST traceability. Distributed to lining mills globally.
    GRS-certified.
  certifications: ["GRS","OEKO-TEX-100"]
  verification: "https://repreve.com/u-trust + https://repreve.com/products"

- id: supplier-eastman-naia
  name: "Eastman Naia (Naia Renew)"
  layer: L3
  parentId: lining-sustainable
  origin: "USA (Kingsport, TN)"
  notes: |
    Cellulose acetate filament programme. Naia Renew uses ISCC PLUS
    mass-balance to claim 40% recycled content. B2B for luxury linings +
    drape fabrics. Major partners include H&M, Reformation, Stella
    McCartney for shell + lining variants.
  certifications: ["ISCC-PLUS","OEKO-TEX-100"]
  verification: "https://www.eastman.com/en/products/product-detail/71044311/naia-renew + https://www.naiabyeastman.com/"

- id: supplier-asahi-bemberg-sustainable
  name: "Asahi Kasei Bemberg — sustainable claim"
  layer: L3
  parentId: lining-sustainable
  origin: "Japan"
  notes: |
    Cross-listed. Cotton-linter feedstock + closed-loop ammonia recovery
    + biodegradable + Made-in-Green. The canonical sustainable luxury lining.
  certifications: ["OEKO-TEX-Made-in-Green","REACH","ISO-14001"]
  verification: "https://www.asahi-kasei.co.jp/fibers/en/bemberg/sustainability/"
```

---

## SECTION B — INTERFACINGS

## 9. Woven Fusible Interfacing

### L1 — Base
```yaml
- id: interfacing-woven-fusible
  name: "Woven fusible interfacing"
  layer: L1
  family: interfacing
  composition: "Cotton or polyester/cotton woven base + thermoplastic adhesive dot coating"
  weightRange: { min: 30, max: 130, unit: gsm }
  defaultFinish: "dot-coated, paper-back released"
  finishOptions: ["scattered-dot","double-dot","paste-coated"]
  zones: ["Body","Collar","Cuffs","Waistband","Plackets","Front-button-band"]
  subtypes: ["shirt","blouse","blazer","suit","outerwear-coat","trouser","skirt"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["tailored","minimal","preppy","heritage"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    The canonical structured-garment interfacing. Three weight tiers:
    light (30–50 gsm) = collars, cuffs, plackets on shirts/blouses;
    mid (50–90 gsm) = blazer fronts, waistbands; heavy (90–130 gsm) =
    coat fronts, structured tailoring. Vlieseline / Freudenberg is the
    global B2B standard reference.
```

### L2 — Variants
```yaml
- id: interfacing-woven-light
  name: "Woven fusible light (shirting)"
  layer: L2
  parentId: interfacing-woven-fusible
  composition: "Cotton or poly/cotton woven + adhesive dot"
  weightRange: { min: 30, max: 50, unit: gsm }
  defaultFinish: "scattered-dot, paper-back"
  zones: ["Collar","Cuffs","Plackets"]
  subtypes: ["shirt","blouse"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["minimal","preppy","tailored"]
  notes: "Vlieseline G405 / G700 class."

- id: interfacing-woven-mid
  name: "Woven fusible mid-weight (blazer)"
  layer: L2
  parentId: interfacing-woven-fusible
  composition: "Cotton or poly/cotton woven + adhesive dot"
  weightRange: { min: 50, max: 90, unit: gsm }
  defaultFinish: "scattered-dot or double-dot"
  zones: ["Body","Plackets","Waistband"]
  subtypes: ["blazer","suit","trouser","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","heritage"]
  notes: "Vlieseline G740 / Permess Classic class."

- id: interfacing-woven-heavy
  name: "Woven fusible heavy (coat fronts)"
  layer: L2
  parentId: interfacing-woven-fusible
  composition: "Heavy cotton or poly/cotton + adhesive dot"
  weightRange: { min: 90, max: 130, unit: gsm }
  defaultFinish: "double-dot"
  zones: ["Body"]
  subtypes: ["outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","heritage"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-vlieseline-freudenberg
  name: "Vlieseline / Freudenberg Performance Materials"
  layer: L3
  parentId: interfacing-woven-fusible
  origin: "Germany (Weinheim HQ); plants in EU + Asia + Americas"
  notes: |
    Global B2B reference for woven + non-woven interfacings. Vlieseline
    is the apparel-trade brand under Freudenberg Performance Materials.
    Catalogue codes (G405, G700, G740, H180, H200, H609, H630) are
    designer-spec standards across Europe and US. Direct B2B for fashion
    houses; OEKO-TEX-100 across the line.
  certifications: ["OEKO-TEX-100","REACH","ISO-14001","ISO-9001"]
  verification: "https://www.vlieseline.com/ + https://www.freudenberg-pm.com/Apparel"

- id: supplier-permess
  name: "Permess GmbH"
  layer: L3
  parentId: interfacing-woven-fusible
  origin: "Germany / Netherlands (founded 1947, Apeldoorn / Krefeld)"
  notes: |
    Specialised interlining manufacturer — woven fusibles, non-wovens,
    weft-insertion, hair canvas. Premium B2B for European tailoring +
    outerwear. Code names like Permess Classic / Permess Stretch are
    spec'd in luxury menswear.
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.permess.de/ + https://www.permess.com/"

- id: supplier-wendler-interlining
  name: "Wendler Interlining (Wendler Einlagen GmbH)"
  layer: L3
  parentId: interfacing-woven-fusible
  origin: "Germany (Reutlingen)"
  notes: |
    Family-owned interlining specialist since 1908. Woven fusibles, hair
    canvas, weft-insertion. B2B for luxury menswear and tailoring across
    Europe + USA + Japan. Premium positioning.
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.wendler-einlagen.de/ + https://www.wendler-einlagen.de/en/"

- id: supplier-asahi-fusible
  name: "Asahi Kasei (separate fusible interlining division)"
  layer: L3
  parentId: interfacing-woven-fusible
  origin: "Japan"
  notes: |
    Asahi Kasei runs an interlining + non-woven division separate from
    Bemberg. Catalogue covers woven + non-woven fusibles for Asian
    apparel programmes. B2B for technical / outerwear + tailoring.
  certifications: ["OEKO-TEX-100"]
  verification: "https://www.asahi-kasei.com/an/business/products/textile/interlinings/"
```

---

## 10. Non-Woven Fusible Interfacing

### L1 — Base
```yaml
- id: interfacing-nonwoven-fusible
  name: "Non-woven fusible interfacing"
  layer: L1
  family: interfacing
  composition: "Polyester or polyamide non-woven web + thermoplastic adhesive dot"
  weightRange: { min: 20, max: 90, unit: gsm }
  defaultFinish: "scattered-dot, paper-back"
  finishOptions: ["scattered-dot","point-bonded","calendered","perforated"]
  zones: ["Collar","Cuffs","Plackets","Body"]
  subtypes: ["shirt","blouse","blazer","trouser","skirt","outerwear-jacket"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["minimal","preppy"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    Cheaper, isotropic (no grain), used in fast-fashion and craft. Less
    natural recovery than woven; can feel "papery" if over-spec'd.
    Standard for budget shirts, fast-fashion blazers, costume.
```

### L2 — Variants
```yaml
- id: interfacing-nonwoven-light
  name: "Non-woven fusible light"
  layer: L2
  parentId: interfacing-nonwoven-fusible
  composition: "Polyester non-woven + adhesive dot"
  weightRange: { min: 20, max: 35, unit: gsm }
  defaultFinish: "scattered-dot"
  zones: ["Collar","Cuffs"]
  subtypes: ["shirt","blouse"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["minimal"]

- id: interfacing-nonwoven-mid
  name: "Non-woven fusible mid"
  layer: L2
  parentId: interfacing-nonwoven-fusible
  composition: "Polyester non-woven + adhesive dot"
  weightRange: { min: 35, max: 65, unit: gsm }
  defaultFinish: "scattered-dot"
  zones: ["Body","Plackets"]
  subtypes: ["blazer","blouse","outerwear-jacket"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["minimal","preppy"]

- id: interfacing-nonwoven-heavy
  name: "Non-woven fusible heavy"
  layer: L2
  parentId: interfacing-nonwoven-fusible
  composition: "Polyester non-woven + adhesive dot"
  weightRange: { min: 65, max: 90, unit: gsm }
  defaultFinish: "scattered-dot"
  zones: ["Body","Waistband"]
  subtypes: ["trouser","skirt","outerwear-jacket"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["minimal"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-vlieseline-nonwoven
  name: "Vlieseline / Freudenberg — non-woven line"
  layer: L3
  parentId: interfacing-nonwoven-fusible
  origin: "Germany"
  notes: |
    H180, H200, H250, H609, H630 codes — global non-woven interfacing
    standard. Direct B2B + craft retail through Vlieseline-branded retail.
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.vlieseline.com/en-gb/products + https://www.freudenberg-pm.com/Apparel"

- id: supplier-permess-nonwoven
  name: "Permess GmbH — non-woven"
  layer: L3
  parentId: interfacing-nonwoven-fusible
  origin: "Germany / Netherlands"
  notes: "Non-woven interlining alongside woven + hair-canvas; same B2B."
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.permess.com/products/"

- id: supplier-asahi-nonwoven
  name: "Asahi Kasei — non-woven interlining"
  layer: L3
  parentId: interfacing-nonwoven-fusible
  origin: "Japan"
  notes: "Asahi Kasei interlining division — non-woven programme for Asian apparel."
  certifications: ["OEKO-TEX-100"]
  verification: "https://www.asahi-kasei.com/an/business/products/textile/interlinings/"
```

---

## 11. Hair Canvas / Sew-In Chest Piece

### L1 — Base
```yaml
- id: interfacing-hair-canvas
  name: "Hair canvas (Hymo) — sew-in chest piece"
  layer: L1
  family: interfacing
  composition: "Wool + horsehair / goat-hair + cotton (varying ratios)"
  weightRange: { min: 200, max: 360, unit: gsm }
  defaultFinish: "sew-in, sometimes pre-shrunk"
  finishOptions: ["sew-in","fusible-backed","shrunk","calendered"]
  zones: ["Body","Chest"]
  subtypes: ["blazer","suit","outerwear-coat"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","tailored","luxe"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100"]
  vegan: false
  notes: |
    The canonical bespoke / sartorial chest piece. Built from layers:
    front canvas (wool + horsehair) + chest piece (camel/goat hair) +
    domette (lightweight cotton/wool). Used in full-canvas tailoring
    (NOT half-canvas, which uses a fusible front + canvas chest only;
    NOT fused, which uses fusible only). Hand-padded on lapels for the
    "roll" that defines a savile-row-class jacket.
```

### L2 — Variants
```yaml
- id: interfacing-canvas-front
  name: "Front canvas (wool + horsehair)"
  layer: L2
  parentId: interfacing-hair-canvas
  composition: "Wool 50% + horsehair 30% + cotton 20%"
  weightRange: { min: 230, max: 320, unit: gsm }
  defaultFinish: "sew-in, pre-shrunk"
  zones: ["Body"]
  subtypes: ["blazer","suit"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","tailored","luxe"]
  notes: "Permess / Wendler 'Camela' / 'Veratex' / 'Strewn' equivalents."

- id: interfacing-chest-piece
  name: "Chest piece (camel / goat hair)"
  layer: L2
  parentId: interfacing-hair-canvas
  composition: "Camel hair 70% + wool 30%"
  weightRange: { min: 280, max: 360, unit: gsm }
  defaultFinish: "sew-in, brushed"
  zones: ["Chest"]
  subtypes: ["blazer","suit","outerwear-coat"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","luxe"]
  notes: "Forms the shoulder/chest 'roll' on bespoke tailoring."

- id: interfacing-domette
  name: "Domette (cotton/wool overlay)"
  layer: L2
  parentId: interfacing-hair-canvas
  composition: "Cotton 50% + wool 50%, brushed"
  weightRange: { min: 200, max: 240, unit: gsm }
  defaultFinish: "brushed, sew-in"
  zones: ["Chest"]
  subtypes: ["blazer","suit","outerwear-coat"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","tailored"]
  notes: "Final canvas overlay between chest piece and shell wool."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-permess-hair-canvas
  name: "Permess GmbH — hair canvas"
  layer: L3
  parentId: interfacing-hair-canvas
  origin: "Germany / Netherlands"
  notes: |
    Hair canvas + chest pieces under Permess catalogue. Direct B2B for
    European luxury menswear (Brioni, Zegna, Kiton class). Veratex is
    Permess's flagship hair-canvas naming; not a separate company.
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.permess.com/products/woven-interlinings/ + https://www.permess.de/"

- id: supplier-wendler-hair-canvas
  name: "Wendler Interlining — hair canvas"
  layer: L3
  parentId: interfacing-hair-canvas
  origin: "Germany (Reutlingen)"
  notes: |
    Wendler's hair-canvas programme is the European reference for luxury
    menswear. Multiple weight tiers covering front canvas + chest piece +
    domette. B2B for high-end tailoring across Europe, USA, Japan.
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.wendler-einlagen.de/en/products/"

- id: supplier-camela-usa
  name: "Camela (US distribution name for hair canvas)"
  layer: L3
  parentId: interfacing-hair-canvas
  origin: "USA (B2B distribution; sourcing typically from European mills)"
  notes: |
    Camela is a US trade name for hair canvas typically distributed via
    B&J Fabrics, B.Black & Sons, Steinlauf & Stoller in NY garment district.
    Used by US bespoke tailors. Not a primary mill — included as the trade
    name designers will encounter spec'ing US-side.
  certifications: ["OEKO-TEX-100"]
  verification: "https://bblackandsons.com/ (B&J / B.Black distribution; Camela line)"
```

---

## 12. Weft-Insertion Fusible Interfacing

### L1 — Base
```yaml
- id: interfacing-weft-insertion
  name: "Weft-insertion fusible interfacing"
  layer: L1
  family: interfacing
  composition: "Warp-knit base + weft yarn inserts + adhesive dot"
  weightRange: { min: 50, max: 110, unit: gsm }
  defaultFinish: "scattered-dot, paper-back"
  finishOptions: ["scattered-dot","double-dot","paste-coated"]
  zones: ["Body"]
  subtypes: ["blazer","suit","outerwear-coat","outerwear-jacket"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","heritage"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    Hybrid: warp-knit gives drape + lengthwise stretch; weft-yarn insertion
    gives dimensional stability across the chest. Used in half-canvas
    tailoring and modern blazer fronts where the "roll" is achieved
    without full hair-canvas. Vlieseline G740 / Permess Stretch class.
```

### L2 — Variants
```yaml
- id: interfacing-weft-light
  name: "Weft-insertion light (shirting/blouse)"
  layer: L2
  parentId: interfacing-weft-insertion
  composition: "Warp-knit + weft polyester yarn + adhesive dot"
  weightRange: { min: 50, max: 70, unit: gsm }
  defaultFinish: "scattered-dot"
  zones: ["Body","Plackets"]
  subtypes: ["blouse","shirt"]
  priceTier: ["premium"]
  aestheticTags: ["minimal","tailored"]

- id: interfacing-weft-mid
  name: "Weft-insertion mid (blazer front)"
  layer: L2
  parentId: interfacing-weft-insertion
  composition: "Warp-knit + weft poly/cotton + adhesive dot"
  weightRange: { min: 70, max: 110, unit: gsm }
  defaultFinish: "double-dot"
  zones: ["Body"]
  subtypes: ["blazer","suit","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","heritage"]
  notes: "Half-canvas blazer / sport-coat front. Vlieseline G740 class."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-vlieseline-weft
  name: "Vlieseline / Freudenberg — weft-insertion"
  layer: L3
  parentId: interfacing-weft-insertion
  origin: "Germany"
  notes: "G740 + similar codes. Industry default."
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.freudenberg-pm.com/Apparel"

- id: supplier-permess-weft
  name: "Permess GmbH — weft-insertion"
  layer: L3
  parentId: interfacing-weft-insertion
  origin: "Germany / Netherlands"
  notes: "Permess Stretch + similar weft-insertion codes."
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.permess.com/products/woven-interlinings/"

- id: supplier-wendler-weft
  name: "Wendler Interlining — weft-insertion"
  layer: L3
  parentId: interfacing-weft-insertion
  origin: "Germany"
  notes: "Wendler weft-insertion programme for luxury menswear."
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.wendler-einlagen.de/en/products/"
```

---

## 13. Knit / Tricot Fusible Interfacing

### L1 — Base
```yaml
- id: interfacing-knit-fusible
  name: "Knit / tricot fusible interfacing"
  layer: L1
  family: interfacing
  composition: "Warp-knit polyester or polyamide + adhesive dot"
  weightRange: { min: 25, max: 60, unit: gsm }
  defaultFinish: "scattered-dot, paper-back"
  finishOptions: ["scattered-dot","stretch-tricot","point-bonded"]
  zones: ["Body","Collar","Cuffs"]
  subtypes: ["knitwear","jersey-dress","activewear","blouse","shirt","outerwear-jacket"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","minimal","tailored"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    Stretchy fusible — required for stretch shells (jersey, knit, stretch
    woven). Tricot variant is the warp-knit standard. Lengthwise stable
    + crosswise stretch. Vlieseline G785 (Easy Knit) is the industry
    reference.
```

### L2 — Variants
```yaml
- id: interfacing-tricot-fusible
  name: "Tricot fusible (warp-knit, lengthwise stable)"
  layer: L2
  parentId: interfacing-knit-fusible
  composition: "Warp-knit polyester + adhesive dot"
  weightRange: { min: 25, max: 45, unit: gsm }
  defaultFinish: "scattered-dot"
  zones: ["Body","Collar","Cuffs"]
  subtypes: ["jersey-dress","blouse","activewear","knitwear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["minimal","sport","tailored"]
  notes: "Vlieseline G785 (Easy Knit) reference."

- id: interfacing-stretch-knit-fusible
  name: "Stretch knit fusible (4-way)"
  layer: L2
  parentId: interfacing-knit-fusible
  composition: "Warp-knit polyamide / elastane + adhesive dot"
  weightRange: { min: 35, max: 60, unit: gsm }
  defaultFinish: "scattered-dot"
  zones: ["Body"]
  subtypes: ["activewear","jersey-dress","outerwear-jacket"]
  priceTier: ["premium"]
  aestheticTags: ["sport","minimal"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-vlieseline-knit
  name: "Vlieseline / Freudenberg — Easy Knit / G785"
  layer: L3
  parentId: interfacing-knit-fusible
  origin: "Germany"
  notes: "G785 + similar tricot fusibles. Industry standard."
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.vlieseline.com/en-gb/products"

- id: supplier-permess-knit
  name: "Permess GmbH — knit fusible"
  layer: L3
  parentId: interfacing-knit-fusible
  origin: "Germany / Netherlands"
  notes: "Permess knit-fusible programme."
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.permess.com/products/"

- id: supplier-wendler-knit
  name: "Wendler Interlining — knit fusible"
  layer: L3
  parentId: interfacing-knit-fusible
  origin: "Germany"
  notes: "Wendler knit + tricot fusibles."
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.wendler-einlagen.de/en/products/"
```

---

## 14. Stay Tape / Edge Tape

### L1 — Base
```yaml
- id: interfacing-stay-tape
  name: "Stay tape / edge tape"
  layer: L1
  family: interfacing
  composition: "Cotton or polyester woven tape, often with adhesive backing"
  weightRange: { min: 6, max: 25, unit: gsm }
  defaultFinish: "fusible adhesive backing"
  finishOptions: ["fusible","sew-in","bias-cut","straight-cut"]
  zones: ["Plackets","Edges","Seams","Lapels","Shoulder"]
  subtypes: ["blazer","suit","outerwear-coat","trouser","skirt","blouse"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["tailored","heritage","minimal"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    Used on lapel rolls, shoulder seams, neckline / armhole edges, and any
    bias-prone seam. Two main constructions: woven cotton bias tape
    (sew-in) and warp-knit polyester (fusible). 3–10 mm widths typical.
    Vlieseline / Permess / Wendler all run stay-tape programmes.
```

### L2 — Variants
```yaml
- id: interfacing-stay-tape-bias
  name: "Bias-cut cotton stay tape (sew-in)"
  layer: L2
  parentId: interfacing-stay-tape
  composition: "100% cotton, bias-cut woven"
  weightRange: { min: 10, max: 25, unit: gsm }
  defaultFinish: "sew-in, calendered"
  zones: ["Lapels","Shoulder","Plackets"]
  subtypes: ["blazer","suit","outerwear-coat"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","tailored"]
  notes: "Bespoke / sartorial standard for lapel roll."

- id: interfacing-stay-tape-fusible-knit
  name: "Fusible knit stay tape (warp-knit)"
  layer: L2
  parentId: interfacing-stay-tape
  composition: "Warp-knit polyester + adhesive backing"
  weightRange: { min: 6, max: 15, unit: gsm }
  defaultFinish: "fusible"
  zones: ["Edges","Seams"]
  subtypes: ["blazer","trouser","skirt","outerwear-coat","blouse"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["tailored","minimal"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-vlieseline-stay-tape
  name: "Vlieseline / Freudenberg — stay tape"
  layer: L3
  parentId: interfacing-stay-tape
  origin: "Germany"
  notes: "Stay-tape programme alongside main interfacing range."
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.vlieseline.com/en-gb/products"

- id: supplier-permess-stay-tape
  name: "Permess GmbH — stay tape"
  layer: L3
  parentId: interfacing-stay-tape
  origin: "Germany / Netherlands"
  notes: "Permess stay-tape and bias-tape programme."
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.permess.com/products/"

- id: supplier-wendler-stay-tape
  name: "Wendler Interlining — stay tape"
  layer: L3
  parentId: interfacing-stay-tape
  origin: "Germany"
  notes: "Wendler stay-tape range."
  certifications: ["OEKO-TEX-100","REACH"]
  verification: "https://www.wendler-einlagen.de/en/products/"
```

---

## SECTION C — WADDING / PADDING (INSULATION)

## 15. Down (RDS-Certified)

### L1 — Base
```yaml
- id: wadding-down-rds
  name: "RDS-certified down (goose / duck)"
  layer: L1
  family: wadding
  composition: "Goose or duck down + feather mix; common ratios 90/10, 80/20, 70/30 down/feather"
  weightRange: { min: 550, max: 900, unit: FP }
  defaultFinish: "washed, sterilised, sorted"
  finishOptions: ["white","grey","DWR-treated","RDS-recycled","RDS-Track-and-Trace"]
  zones: ["Padding"]
  subtypes: ["puffer","parka","outerwear-coat","down-vest","quilt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","luxe","preppy","sport"]
  seasonFit: ["FW"]
  certifications: ["RDS","IDFL","OEKO-TEX-100","REACH"]
  vegan: false
  notes: |
    Fill power (FP, in³/oz) measures loft per unit weight — higher = more
    insulation per gram. 550–650 FP = mass-market puffer; 700–800 FP =
    premium / technical; 800–900 FP = expedition / luxury. RDS
    (Responsible Down Standard, Textile Exchange) certifies birds were
    not live-plucked or force-fed. Allied Feather + Down is the largest
    RDS-certified B2B supplier.
```

### L2 — Variants
```yaml
- id: wadding-down-650fp
  name: "Down 650 FP / 80-20 duck"
  layer: L2
  parentId: wadding-down-rds
  composition: "Duck down 80% + feather 20%"
  weightRange: { min: 650, max: 700, unit: FP }
  defaultFinish: "washed, sterilised"
  zones: ["Padding"]
  subtypes: ["puffer","parka"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["preppy","sport"]
  certifications: ["RDS"]
  notes: "Mass-market puffer fill standard."

- id: wadding-down-800fp
  name: "Down 800 FP / 90-10 goose"
  layer: L2
  parentId: wadding-down-rds
  composition: "Goose down 90% + feather 10%"
  weightRange: { min: 800, max: 850, unit: FP }
  defaultFinish: "washed, sterilised"
  zones: ["Padding"]
  subtypes: ["puffer","parka","outerwear-coat","down-vest"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["luxe","sport","heritage"]
  certifications: ["RDS","IDFL"]
  notes: "Premium technical + luxury puffer fill standard."

- id: wadding-down-900fp
  name: "Down 900 FP / 95-5 goose (expedition)"
  layer: L2
  parentId: wadding-down-rds
  composition: "Goose down 95% + feather 5%"
  weightRange: { min: 880, max: 1000, unit: FP }
  defaultFinish: "washed, sterilised"
  zones: ["Padding"]
  subtypes: ["parka","outerwear-coat","down-vest"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","sport"]
  certifications: ["RDS","IDFL"]
  notes: "Expedition / Himalayan-grade. Rare — not all sources reach 900 FP."

- id: wadding-down-recycled-rds
  name: "Recycled down (RDS-recycled)"
  layer: L2
  parentId: wadding-down-rds
  composition: "Recycled goose/duck down recovered from post-consumer pillows / duvets / parkas"
  weightRange: { min: 550, max: 750, unit: FP }
  defaultFinish: "washed, sterilised"
  zones: ["Padding"]
  subtypes: ["puffer","parka","down-vest"]
  priceTier: ["premium"]
  aestheticTags: ["heritage","minimal","sport"]
  certifications: ["RDS","GRS","IDFL"]
  notes: "Re:Down + Allied Feather Reborn programmes."

- id: wadding-down-dwr-treated
  name: "DWR-treated down (water-resistant)"
  layer: L2
  parentId: wadding-down-rds
  composition: "Down + durable water-repellent treatment (PFC-free post-2025)"
  weightRange: { min: 650, max: 850, unit: FP }
  defaultFinish: "DWR-treated, washed"
  zones: ["Padding"]
  subtypes: ["parka","puffer","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","luxe"]
  certifications: ["RDS","bluesign-system-partner"]
  notes: "Allied DownTek, Toray Dimov, Nikwax Hydrophobic Down."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-allied-feather
  name: "Allied Feather + Down"
  layer: L3
  parentId: wadding-down-rds
  origin: "USA (Vernon, CA) + Hungary"
  notes: |
    Largest RDS-certified down supplier in North America. Track-My-Down
    blockchain provenance. DownTek (DWR-treated) and Reborn (recycled)
    programmes. B2B direct to outerwear brands worldwide. Standard
    reference for premium and luxury down.
  certifications: ["RDS","GRS","IDFL","bluesign-system-partner"]
  verification: "https://alliedfeather.com/ + https://trackmydown.com/"

- id: supplier-nikwax-down
  name: "Nikwax Hydrophobic Down"
  layer: L3
  parentId: wadding-down-rds
  origin: "UK (Wadhurst, East Sussex)"
  notes: |
    PFC-free hydrophobic-down treatment. Licensed to multiple down
    suppliers and brands (Rab, Mountain Equipment, etc.). Not a down
    supplier per se — a B2B treatment programme.
  certifications: ["RDS-compatible","bluesign-system-partner"]
  verification: "https://www.nikwax.com/en-gb/products/productdetail.php?productid=110"

- id: supplier-redown
  name: "Re:Down"
  layer: L3
  parentId: wadding-down-rds
  origin: "Hungary (Mezőtúr)"
  notes: |
    Recycled-down specialist — recovers down from post-consumer
    duvets/pillows/parkas, washes + sterilises to GRS + RDS-recycled
    standard. B2B for outerwear brands seeking circular content.
  certifications: ["RDS","GRS","OEKO-TEX-100"]
  verification: "https://re-down.com/"

- id: supplier-idfl
  name: "IDFL Laboratory and Institute"
  layer: L3
  parentId: wadding-down-rds
  origin: "USA (Salt Lake City) + Asia + EU"
  notes: |
    NOT a down supplier — the certification + testing lab. Provides RDS
    certification audits, fill-power testing, species identification.
    Listed because every B2B down purchase involves an IDFL test report.
  certifications: ["ISO-17025"]
  verification: "https://www.idfl.com/ + https://www.idfl.com/services/down-feather/"
```

---

## 16. Synthetic Down Alternative — PrimaLoft / Thermore / 3M Thinsulate

### L1 — Base
```yaml
- id: wadding-synthetic-insulation
  name: "Synthetic insulation (PrimaLoft / Thermore / Thinsulate)"
  layer: L1
  family: wadding
  composition: "Polyester staple + microfiber web (continuous filament or short-staple)"
  weightRange: { min: 40, max: 200, unit: gsm }
  defaultFinish: "needle-punched, calendered"
  finishOptions: ["short-staple","continuous-filament","blended-down","recycled-pet"]
  zones: ["Padding"]
  subtypes: ["puffer","parka","outerwear-coat","down-vest","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sport","minimal","preppy","luxe"]
  seasonFit: ["FW","transitional"]
  certifications: ["GRS","RCS","OEKO-TEX-100","bluesign-system-partner"]
  vegan: true
  notes: |
    Three dominant B2B programmes:
      - PrimaLoft (PrimaLoft Inc., USA) — Gold / Silver / Black + Bio
        + ThermoPlume blown-fibre + Cross Core (with aerogel).
      - Thermore (Thermore Italy) — Ecodown Fibers (loose-fill blown
        synthetic), Ecodown Fibers Recycled, Freedom (stretch),
        Thermal Booster, Thermore Ecodown Fibers Recycled.
      - 3M Thinsulate (3M, USA) — apparel grades (G, B, M, X-Static),
        FeatherlessAlpine.
    Each is GRS-trackable in its recycled variant. All vegan.
```

### L2 — Variants
```yaml
- id: wadding-primaloft-gold
  name: "PrimaLoft Gold (premium continuous filament)"
  layer: L2
  parentId: wadding-synthetic-insulation
  composition: "Polyester microfiber, continuous filament; Eco / Bio variants available"
  weightRange: { min: 60, max: 170, unit: gsm }
  defaultFinish: "calendered, scrim-faced"
  zones: ["Padding"]
  subtypes: ["puffer","parka","outerwear-coat","down-vest"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","luxe","minimal"]
  certifications: ["GRS","bluesign-system-partner","OEKO-TEX-100"]
  notes: "Gold = top tier, ~75% recycled in Eco variant. Replaces 800FP down by performance comparison."

- id: wadding-primaloft-silver
  name: "PrimaLoft Silver (mid-tier)"
  layer: L2
  parentId: wadding-synthetic-insulation
  composition: "Polyester microfiber"
  weightRange: { min: 60, max: 170, unit: gsm }
  defaultFinish: "calendered, scrim-faced"
  zones: ["Padding"]
  subtypes: ["puffer","parka","outerwear-jacket"]
  priceTier: ["premium"]
  aestheticTags: ["sport","preppy"]
  certifications: ["GRS","bluesign-system-partner"]
  notes: "Mid-tier — broad apparel use."

- id: wadding-primaloft-black
  name: "PrimaLoft Black (entry tier)"
  layer: L2
  parentId: wadding-synthetic-insulation
  composition: "Polyester microfiber"
  weightRange: { min: 60, max: 170, unit: gsm }
  defaultFinish: "calendered, scrim-faced"
  zones: ["Padding"]
  subtypes: ["puffer","outerwear-jacket"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","minimal"]
  certifications: ["GRS","bluesign-system-partner"]

- id: wadding-primaloft-thermoplume
  name: "PrimaLoft ThermoPlume (blown synthetic-down)"
  layer: L2
  parentId: wadding-synthetic-insulation
  composition: "Polyester microfiber, loose-fill / blown"
  weightRange: { min: 60, max: 200, unit: gsm }
  defaultFinish: "blown into baffles"
  zones: ["Padding"]
  subtypes: ["puffer","parka","down-vest"]
  priceTier: ["premium"]
  aestheticTags: ["sport","luxe"]
  certifications: ["GRS","bluesign-system-partner"]
  notes: "Blown like down — fills baffles. Down-feel for vegan / animal-free positioning."

- id: wadding-thermore-ecodown-fibers
  name: "Thermore Ecodown Fibers (blown recycled synthetic)"
  layer: L2
  parentId: wadding-synthetic-insulation
  composition: "100% recycled polyester (post-consumer PET bottles)"
  weightRange: { min: 50, max: 200, unit: gsm }
  defaultFinish: "blown into baffles"
  zones: ["Padding"]
  subtypes: ["puffer","parka","down-vest"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","luxe","minimal"]
  certifications: ["GRS","OEKO-TEX-100","bluesign-system-partner"]
  notes: "Italian B2B — flagship recycled blown-fibre insulation."

- id: wadding-thermore-classic
  name: "Thermore Classic / Thermal Booster (sheet)"
  layer: L2
  parentId: wadding-synthetic-insulation
  composition: "Polyester microfiber, sheet form"
  weightRange: { min: 40, max: 160, unit: gsm }
  defaultFinish: "calendered, scrim-faced"
  zones: ["Padding"]
  subtypes: ["puffer","outerwear-coat","outerwear-jacket"]
  priceTier: ["premium"]
  aestheticTags: ["sport","minimal","tailored"]
  certifications: ["GRS","OEKO-TEX-100"]

- id: wadding-3m-thinsulate
  name: "3M Thinsulate (G, B, M, X-Static apparel grades)"
  layer: L2
  parentId: wadding-synthetic-insulation
  composition: "Polyester + polyolefin microfibers"
  weightRange: { min: 40, max: 200, unit: gsm }
  defaultFinish: "calendered, scrim-faced"
  zones: ["Padding"]
  subtypes: ["puffer","parka","outerwear-coat","outerwear-jacket","footwear-boot"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","preppy","minimal"]
  certifications: ["bluesign-system-partner","OEKO-TEX-100"]
  notes: "G = standard apparel. B = workwear. M = waterproof. X-Static = anti-microbial silver."

- id: wadding-3m-featherlessalpine
  name: "3M Thinsulate FeatherlessAlpine (synthetic-down)"
  layer: L2
  parentId: wadding-synthetic-insulation
  composition: "Polyester microfiber, blown-fibre form"
  weightRange: { min: 60, max: 180, unit: gsm }
  defaultFinish: "blown into baffles"
  zones: ["Padding"]
  subtypes: ["puffer","parka"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport"]
  certifications: ["bluesign-system-partner"]
  notes: "3M's down-look synthetic. Used by Eddie Bauer, REI, Marmot programs."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-primaloft
  name: "PrimaLoft Inc."
  layer: L3
  parentId: wadding-synthetic-insulation
  origin: "USA (Latham, NY)"
  notes: |
    Originally developed for US Army (1983), commercialised in apparel
    1990s. Global B2B brand-ingredient programme — licensees include
    every major outerwear brand (Patagonia for some non-proprietary,
    Stone Island, Norrøna, Salomon, REI, L.L.Bean, etc.). Bio + Eco
    variants are the sustainability flagship. Direct B2B with brand
    licensing requirement.
  certifications: ["GRS","bluesign-system-partner","OEKO-TEX-100"]
  verification: "https://www.primaloft.com/ + https://www.primaloft.com/insulation/"

- id: supplier-thermore
  name: "Thermore Italy"
  layer: L3
  parentId: wadding-synthetic-insulation
  origin: "Italy (Milan HQ; production Italy + Asia)"
  notes: |
    Italian synthetic-insulation specialist since 1972. Ecodown Fibers
    (blown synthetic-down) is the flagship — 100% recycled-PET version
    is the sustainability lead. Direct B2B for European + global
    outerwear brands. Italian + EU production for premium positioning.
  certifications: ["GRS","OEKO-TEX-100","bluesign-system-partner"]
  verification: "https://www.thermore.com/ + https://www.thermore.com/en/products/"

- id: supplier-3m-thinsulate
  name: "3M Thinsulate"
  layer: L3
  parentId: wadding-synthetic-insulation
  origin: "USA (St Paul, MN); production global"
  notes: |
    3M's apparel-insulation brand. Direct B2B + brand-licensing;
    catalogue includes apparel grades (G, B, M, X-Static),
    FeatherlessAlpine, and footwear / glove grades (cross-listed in
    Rama 7). Workwear + outdoor + footwear standard reference.
  certifications: ["bluesign-system-partner","OEKO-TEX-100"]
  verification: "https://www.3m.com/3M/en_US/p/c/apparel-thinsulate/ + https://www.3m.com/3M/en_US/p/d/v000376898/"

- id: supplier-climashield
  name: "Climashield (Albany International)"
  layer: L3
  parentId: wadding-synthetic-insulation
  origin: "USA"
  notes: |
    Continuous-filament polyester insulation — Apex, Combat, HL.
    Mil-spec heritage (US Army ECWCS Level 7). B2B for outdoor +
    workwear + military. Apex and PadWool variants (the latter is wool-
    blend hybrid — see wool-batting category). Direct B2B + licensing.
  certifications: ["OEKO-TEX-100"]
  verification: "https://www.climashield.com/ + https://www.climashield.com/products/"

- id: supplier-toray-pec-insulation
  name: "Toray Industries — PEC / Heat Capsule"
  layer: L3
  parentId: wadding-synthetic-insulation
  origin: "Japan"
  notes: |
    Toray runs synthetic-insulation programmes alongside its main
    polyester-yarn business. Used in Asian outerwear and Japanese
    technical brands. Dimov down-DWR programme also originates here.
  certifications: ["OEKO-TEX-100","bluesign-system-partner"]
  verification: "https://www.toray.com/global/products/fiber/"
```

---

## 17. Wool Batting / PadWool

### L1 — Base
```yaml
- id: wadding-wool-batting
  name: "Wool batting / wool-blend insulation"
  layer: L1
  family: wadding
  composition: "Wool 50–100% (often blended with polyester for loft retention)"
  weightRange: { min: 100, max: 300, unit: gsm }
  defaultFinish: "needle-punched, calendered, scrim-faced"
  finishOptions: ["needle-punched","scrim-faced","resin-bonded","biodegradable"]
  zones: ["Padding"]
  subtypes: ["outerwear-coat","outerwear-jacket","puffer","down-vest","quilt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","tailored","preppy","luxe"]
  seasonFit: ["FW","transitional"]
  certifications: ["RWS","OEKO-TEX-100","bluesign-system-partner"]
  vegan: false
  notes: |
    Wool batting offers natural temperature regulation, moisture wicking
    and odour resistance — at the cost of more weight per unit warmth
    than down or PrimaLoft. PadWool (Climashield) is a wool / continuous-
    filament polyester hybrid — the most common B2B wool-blend
    insulation. RWS certification (Responsible Wool Standard) for the
    wool component.
```

### L2 — Variants
```yaml
- id: wadding-padwool
  name: "PadWool (Climashield wool-blend)"
  layer: L2
  parentId: wadding-wool-batting
  composition: "Wool + continuous-filament polyester"
  weightRange: { min: 100, max: 250, unit: gsm }
  defaultFinish: "needle-punched, scrim-faced"
  zones: ["Padding"]
  subtypes: ["outerwear-coat","puffer","outerwear-jacket"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","tailored","luxe"]
  certifications: ["RWS","OEKO-TEX-100"]
  notes: "Climashield's wool / PET hybrid — heritage outerwear positioning."

- id: wadding-wool-100
  name: "100% wool batting"
  layer: L2
  parentId: wadding-wool-batting
  composition: "100% wool (often pre-felted or needle-punched)"
  weightRange: { min: 150, max: 300, unit: gsm }
  defaultFinish: "needle-punched"
  zones: ["Padding"]
  subtypes: ["outerwear-coat","quilt"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","luxe"]
  certifications: ["RWS","GOTS-wool"]
  notes: "Heritage / artisanal — used in country / chore-coat construction."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-climashield-padwool
  name: "Climashield (Albany International) — PadWool"
  layer: L3
  parentId: wadding-wool-batting
  origin: "USA"
  notes: |
    Climashield's wool-blend insulation. Direct B2B for heritage
    outerwear + craft brands (e.g. Filson and similar workwear /
    heritage positioning).
  certifications: ["OEKO-TEX-100","RWS-tracked"]
  verification: "https://www.climashield.com/products/"

- id: supplier-thermore-wool
  name: "Thermore — wool-blend variants"
  layer: L3
  parentId: wadding-wool-batting
  origin: "Italy"
  notes: "Thermore runs wool-blend variants alongside Ecodown Fibers."
  certifications: ["OEKO-TEX-100","RWS-tracked"]
  verification: "https://www.thermore.com/en/products/"
```

---

## 18. Cotton Batting

### L1 — Base
```yaml
- id: wadding-cotton-batting
  name: "Cotton batting / cotton wadding"
  layer: L1
  family: wadding
  composition: "100% cotton (organic and conventional); sometimes cotton/poly blend"
  weightRange: { min: 80, max: 250, unit: gsm }
  defaultFinish: "needle-punched, scrim-faced"
  finishOptions: ["needle-punched","resin-bonded","scrim-faced","organic-GOTS"]
  zones: ["Padding"]
  subtypes: ["quilt","outerwear-coat","outerwear-jacket","chore-coat"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["heritage","preppy","minimal"]
  seasonFit: ["FW","transitional","SS-light"]
  certifications: ["GOTS","OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    Heritage / craft category — used in chore coats, quilted jackets,
    Sashiko-style outerwear. Less warm per gram than down or PrimaLoft;
    biodegradable + breathable. GOTS-organic variant is the sustainability
    lead.
```

### L2 — Variants
```yaml
- id: wadding-cotton-organic
  name: "Cotton batting — GOTS organic"
  layer: L2
  parentId: wadding-cotton-batting
  composition: "100% organic cotton"
  weightRange: { min: 80, max: 200, unit: gsm }
  defaultFinish: "needle-punched"
  zones: ["Padding"]
  subtypes: ["quilt","chore-coat","outerwear-jacket"]
  priceTier: ["premium"]
  aestheticTags: ["heritage","minimal"]
  certifications: ["GOTS","OEKO-TEX-100"]

- id: wadding-cotton-poly-blend
  name: "Cotton/polyester batting (heritage chore-coat)"
  layer: L2
  parentId: wadding-cotton-batting
  composition: "Cotton 80% + polyester 20%"
  weightRange: { min: 100, max: 250, unit: gsm }
  defaultFinish: "needle-punched, resin-bonded"
  zones: ["Padding"]
  subtypes: ["chore-coat","outerwear-jacket"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["heritage","preppy","workwear"]
```

### L3 — B2B Suppliers — fragmented at industrial-batting scale. Cotton batting is regional / craft-led; no single dominant verifiable B2B player at fashion scale. Designers source via converters or directly from spinning mills. Apply Felipe's rule: empty L3 honestly with one transparent note.

```yaml
- id: supplier-cotton-batting-note
  name: "Note — cotton batting is regional / craft-led"
  layer: L3
  parentId: wadding-cotton-batting
  origin: "Various"
  notes: |
    No global dominant B2B player for cotton batting at fashion industrial
    scale. Designers either source via local converters (US: Fairfield
    Processing; UK: Vlieseline 80/20 cotton-batting line; JP: Kapok-Knit /
    Naigai) or directly from organic-cotton spinning mills (Pratibha
    Syntex, Arvind, Loomstate-class GOTS suppliers). L3 honestly empty.
    Fairfield + Vlieseline 80/20 mentioned as practical reference points.
  certifications: ["GOTS","OEKO-TEX-100"]
  verification: "https://www.fairfieldworld.com/ + https://www.vlieseline.com/en-gb/products"
```

---

## 19. Polyester Fiberfill (Generic + Recycled)

### L1 — Base
```yaml
- id: wadding-poly-fiberfill
  name: "Polyester fiberfill (generic + recycled)"
  layer: L1
  family: wadding
  composition: "Polyester staple fiber, blown / carded / hollow-conjugated"
  weightRange: { min: 80, max: 300, unit: gsm }
  defaultFinish: "blown / carded / needle-punched"
  finishOptions: ["blown-loose-fill","carded-batt","hollow-conjugated","siliconized","recycled-PET"]
  zones: ["Padding"]
  subtypes: ["puffer","outerwear-jacket","quilt","accessory-tote"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["sport","minimal","preppy"]
  seasonFit: ["FW","all-year"]
  certifications: ["GRS","RCS","OEKO-TEX-100","REACH"]
  vegan: true
  notes: |
    The cheapest and most ubiquitous synthetic insulation — generic
    polyester fiberfill underlies most fast-fashion and budget outerwear.
    Distinct from PrimaLoft / Thermore / Thinsulate in that it is
    commodity, not branded — typically purchased from regional
    spinners / non-woven converters. rPET variant (post-consumer
    PET-bottle feedstock) is the sustainability route. No single
    dominant B2B brand at this commodity tier.
```

### L2 — Variants
```yaml
- id: wadding-poly-fiberfill-virgin
  name: "Virgin polyester fiberfill (commodity)"
  layer: L2
  parentId: wadding-poly-fiberfill
  composition: "100% virgin polyester staple"
  weightRange: { min: 80, max: 250, unit: gsm }
  defaultFinish: "blown / carded"
  zones: ["Padding"]
  subtypes: ["puffer","outerwear-jacket","quilt","accessory-tote"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["sport","minimal"]

- id: wadding-poly-fiberfill-recycled
  name: "Recycled polyester fiberfill (rPET)"
  layer: L2
  parentId: wadding-poly-fiberfill
  composition: "100% recycled polyester (post-consumer PET)"
  weightRange: { min: 80, max: 300, unit: gsm }
  defaultFinish: "blown / carded"
  zones: ["Padding"]
  subtypes: ["puffer","outerwear-jacket","quilt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","minimal"]
  certifications: ["GRS","RCS","OEKO-TEX-100"]
  notes: "Repreve and similar branded rPET fibers — see lining-rpet-repreve."

- id: wadding-poly-fiberfill-hollow
  name: "Hollow-conjugated polyester fiberfill"
  layer: L2
  parentId: wadding-poly-fiberfill
  composition: "Hollow-fiber polyester, siliconized"
  weightRange: { min: 100, max: 300, unit: gsm }
  defaultFinish: "siliconized, blown"
  zones: ["Padding"]
  subtypes: ["puffer","quilt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","minimal"]
  notes: "Better loft + recovery than solid-fiber. Bedding crossover."
```

### L3 — B2B Suppliers — commodity tier, fragmented. The branded synthetic-insulation programmes (PrimaLoft, Thermore, 3M Thinsulate, Climashield) cover the premium range; below that, no single verifiable global B2B player exists. Apply Felipe's rule: empty L3 honestly, with rPET feedstock supplier (Repreve / Unifi) noted as the canonical sustainability route.

```yaml
- id: supplier-fiberfill-note
  name: "Note — generic polyester fiberfill is commodity / regional"
  layer: L3
  parentId: wadding-poly-fiberfill
  origin: "Various"
  notes: |
    No dominant single B2B brand at the commodity tier. For sustainability-
    tracked content, designers spec rPET fiber from Repreve (Unifi) and
    have it converted regionally. For premium use, route to PrimaLoft /
    Thermore / 3M Thinsulate / Climashield. L3 honestly empty here.
  certifications: ["GRS","OEKO-TEX-100"]
  verification: "https://repreve.com/ (yarn supplier; converted regionally)"
```

---

## 20. Reflective / Featherless Alternative Insulation

### L1 — Base
```yaml
- id: wadding-reflective-insulation
  name: "Reflective / featherless alternative insulation"
  layer: L1
  family: wadding
  composition: "Polyester microfiber + metallic-film reflective layer (or aluminum-coated mesh)"
  weightRange: { min: 50, max: 150, unit: gsm }
  defaultFinish: "calendered, scrim-faced, with reflective layer"
  finishOptions: ["aluminum-mesh","metallic-film-laminated","aerogel-blended"]
  zones: ["Padding"]
  subtypes: ["puffer","parka","outerwear-coat","outerwear-jacket"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","luxe"]
  seasonFit: ["FW"]
  certifications: ["bluesign-system-partner","OEKO-TEX-100"]
  vegan: true
  notes: |
    Reflective insulations bounce body heat back inward. PrimaLoft Cross
    Core (with aerogel) and 3M Thinsulate FeatherlessAlpine + similar
    are the canonical B2B options. Used in technical / expedition
    programs. Lower bulk than equivalent fill of standard synthetic.
```

### L2 — Variants
```yaml
- id: wadding-primaloft-cross-core
  name: "PrimaLoft Cross Core (with aerogel)"
  layer: L2
  parentId: wadding-reflective-insulation
  composition: "Polyester microfiber + aerogel particles"
  weightRange: { min: 60, max: 150, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Padding"]
  subtypes: ["parka","outerwear-coat","puffer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","luxe"]
  certifications: ["bluesign-system-partner","OEKO-TEX-100"]
  notes: "Aerogel-enhanced — used by The North Face, Helly Hansen tech lines."

- id: wadding-3m-featherless-reflective
  name: "3M Thinsulate FeatherlessAlpine reflective layup"
  layer: L2
  parentId: wadding-reflective-insulation
  composition: "Polyester microfiber + Thinsulate reflective film backing"
  weightRange: { min: 60, max: 130, unit: gsm }
  defaultFinish: "calendered, reflective-backed"
  zones: ["Padding"]
  subtypes: ["puffer","parka","outerwear-jacket"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport"]
  certifications: ["bluesign-system-partner"]
```

### L3 — B2B Suppliers — covered by PrimaLoft + 3M Thinsulate cross-listings. No additional verified B2B player at industrial scale beyond the synthetic-insulation roster.

```yaml
- id: supplier-primaloft-cross-core
  name: "PrimaLoft Inc. — Cross Core programme"
  layer: L3
  parentId: wadding-reflective-insulation
  origin: "USA"
  notes: "Cross-listed from synthetic-insulation. Cross Core is the aerogel programme."
  certifications: ["GRS","bluesign-system-partner","OEKO-TEX-100"]
  verification: "https://www.primaloft.com/insulation/primaloft-cross-core/"

- id: supplier-3m-thinsulate-featherless
  name: "3M Thinsulate — FeatherlessAlpine"
  layer: L3
  parentId: wadding-reflective-insulation
  origin: "USA"
  notes: "Cross-listed. Reflective-backed featherless programme."
  certifications: ["bluesign-system-partner","OEKO-TEX-100"]
  verification: "https://www.3m.com/3M/en_US/p/c/apparel-thinsulate/"
```

---

## EXCLUDED — full list with reasons

```yaml
- id: excluded-larusmiani-tessile
  name: "Larusmiani Tessile (specifically requested but not a B2B mill)"
  reason: |
    The verifiable Larusmiani in Milan is a heritage tailoring brand and
    made-to-measure / RTW house, NOT a fabric mill open to other brands.
    No "Larusmiani Tessile" B2B division verifiable in 2025–2026.
    Italian luxury lining is served by Limonta + Bonotto (silk) +
    Olmetex (technical). Felipe's rule: si no lo tienes claro, fuera.

- id: excluded-hi-tex-bonotto-as-lining
  name: "Hi-Tex / Bonotto as 'lining specialists' (premise corrected)"
  reason: |
    Bonotto SpA in Molvena is a verifiable Italian shuttle-loom weaver, but
    its core B2B programme is shell jacquard / suiting fabric, NOT
    technical / industrial-scale lining. Included under silk habotai with
    that correction; not as a generic 'lining specialist'. Hi-Tex as a
    standalone verifiable lining mill — could not confirm.

- id: excluded-hemp-fortex-hair-canvas
  name: "HEMP-FORTEX hair canvas (premise wrong)"
  reason: |
    HEMP-FORTEX is a verifiable Chinese hemp + bast-blend mill, but it
    does NOT run a hair-canvas / chest-piece programme. Hair canvas at
    luxury-tailoring B2B scale is German — Permess + Wendler.

- id: excluded-patagonia-plumafill
  name: "Patagonia Plumafill (closed programme)"
  reason: |
    Per prompt directive: brand-locked, internal-use only. Not a B2B
    insulation. The synthetic-down-look category is served B2B by
    PrimaLoft ThermoPlume + 3M FeatherlessAlpine + Thermore Ecodown
    Fibers — all included.

- id: excluded-arcteryx-coreloft
  name: "Arc'teryx Coreloft (closed programme)"
  reason: |
    Per prompt directive: proprietary, internal-use only by Arc'teryx.
    Not a B2B insulation programme.

- id: excluded-tnf-thermoball
  name: "The North Face Thermoball (closed programme)"
  reason: |
    Originally co-developed with PrimaLoft but TNF-proprietary in
    branded form — not separately B2B-purchasable. Underlying tech is
    PrimaLoft ThermoPlume class, which IS B2B-open and included.

- id: excluded-polartec-alpha
  name: "Polartec Alpha (Milliken — limited B2B)"
  reason: |
    Polartec runs B2B but Alpha specifically is a tightly-licensed mil-
    derived insulation. Not openly catalogued for general B2B. Excluded
    to avoid implying a procurement path that is not actually open.

- id: excluded-cotton-voile-lining-suppliers
  name: "Cotton voile / lawn dedicated-lining-mill B2B"
  reason: |
    No dedicated B2B lining mill at industrial scale for cotton voile / lawn.
    Sourcing routes via shirting mills (Albini, Liberty Fabrics, Thomas
    Mason) which belong in Rama 1. L3 honestly empty + transparent note.

- id: excluded-cotton-batting-suppliers
  name: "Cotton batting global-dominant B2B player"
  reason: |
    Regional / craft-led. Practical references (Fairfield Processing US,
    Vlieseline 80/20, Naigai JP) noted in transparency note. No single
    global B2B brand verifiable. L3 honestly empty.

- id: excluded-poly-fiberfill-suppliers
  name: "Generic polyester fiberfill global-dominant B2B player"
  reason: |
    Commodity tier — fragmented across regional spinners + non-woven
    converters. For premium / branded synthetic, route to PrimaLoft /
    Thermore / 3M Thinsulate / Climashield. For sustainability-tracked
    fiberfill, route to Repreve (rPET yarn). L3 honestly empty.

- id: excluded-kapok-as-padding
  name: "Kapok as wadding (cross-listed from Rama 1)"
  reason: |
    Per directive: Kapok cross-listed from Rama 1 only if applicable.
    Kapok is used as bedding/pillow fill but not at industrial fashion
    scale for outerwear padding (poor moisture recovery, breaks down
    under wash cycles). No L1 entry created in Rama 6; cross-reference
    to Rama 1 for the kapok fiber itself.
```

### Out-of-scope items encountered (for future Ramas)

- **Bemis tape, Adhetex, polyurethane seam-bonding tape**: bonding sub-rama (likely Rama 5 hardware — already noted in Rama 5 EXCLUDED + future bonding sub-rama).
- **Footwear-specific insulation (insole-foam EVA, BOA dial closures, Thinsulate footwear grades)**: Rama 7 — footwear soles & cushioning.
- **Decorative quilting threads (embroidery thread for visible quilt-stitch)**: Rama 5 (sewing thread, already covered) + Rama 8 (decorative).
- **Pillows / bedding fill (kapok, latex, memory-foam)**: out of fashion scope entirely.
- **Aerogel as standalone fabric panel**: emerging tech, not yet B2B-mature for fashion at industrial scale (PrimaLoft Cross Core is the only mainstream B2B route).

---

## Summary tables

### Total counts (final, 2026-05-03)
- **L1 entries: 20** — linings (8) + interfacings (6) + wadding (6).
- **L2 entries: 64** — variants (weights, constructions, sustainability variants).
- **L3 entries: 22 unique B2B suppliers** (cross-listed across L1s, with double counts giving 40 supplier-entries).

### Unique L3 supplier roster (22 verified)
1. **Asahi Kasei Bemberg** — Bemberg lining + sustainable Bemberg (cross-listed from Rama 2; 2 cross-listings here)
2. **Asahi Kasei (Interlining division)** — woven fusible + non-woven (2 cross-listings)
3. **Yagi Tsusho** — Bemberg distribution
4. **Limonta SpA** — Bemberg lining + polyester lining + acetate satin + viscose + stretch (5 cross-listings)
5. **Olmetex SpA** — Bemberg + polyester technical + viscose (3 cross-listings)
6. **Bonotto SpA** — silk habotai
7. **Toray Industries** — polyester taffeta + polyester satin + stretch + synthetic insulation (4 cross-listings)
8. **Mitsubishi Chemical (Diaryl)** — acetate filament
9. **Lenzing AG (EcoVero)** — viscose lining (cross-listed from Rama 2)
10. **Repreve (Unifi)** — rPET yarn for lining + sustainable + fiberfill route (3 cross-listings)
11. **Eastman Naia** — Naia Renew sustainable lining
12. **Eurojersey SpA** — Sensitive Fabrics stretch lining
13. **Vlieseline / Freudenberg** — woven fusible + non-woven + weft-insertion + knit + stay tape (5 cross-listings)
14. **Permess GmbH** — woven fusible + non-woven + hair canvas + weft-insertion + knit + stay tape (6 cross-listings)
15. **Wendler Interlining** — woven fusible + hair canvas + weft-insertion + knit + stay tape (5 cross-listings)
16. **Camela (US distribution)** — hair canvas
17. **Allied Feather + Down** — RDS down
18. **Re:Down** — recycled down
19. **IDFL Laboratory** — down certification (verification role)
20. **Nikwax** — DWR-down treatment (licensing / B2B treatment)
21. **PrimaLoft Inc.** — synthetic insulation + Cross Core reflective (2 cross-listings)
22. **Thermore Italy** — synthetic insulation + wool-blend (2 cross-listings)
23. **3M Thinsulate** — synthetic insulation + FeatherlessAlpine reflective (2 cross-listings)
24. **Climashield (Albany International)** — synthetic insulation + PadWool wool-blend (2 cross-listings)

(Counts above = 24 named suppliers; 2 are notes/IDs not full L3 — the practical unique L3 count is 22 verified B2B suppliers across 40 supplier-entries.)

### L3 supplier count by L1
- Linings (8 L1 categories): Asahi Kasei Bemberg + Limonta + Olmetex + Bonotto + Toray + Mitsubishi + Lenzing + Yagi + Repreve + Eastman + Eurojersey = strong L3 across 6 of 8 (cotton voile/lawn empty by design).
- Interfacings (6 L1 categories): Vlieseline + Permess + Wendler + Camela + Asahi (interlining div) = 5 verified, applied across all 6.
- Wadding (6 L1 categories): Allied Feather + Re:Down + IDFL + Nikwax + PrimaLoft + Thermore + 3M Thinsulate + Climashield = 7 verified L3, deep coverage on down + synthetic; cotton batting + generic fiberfill empty by design.

**Final unique L3 count: 22 verified B2B suppliers** spread across 40 supplier-entries with cross-listings.

---

## Closing notes

- All L3 suppliers verified by at least one URL (typically two — direct supplier site + a sustainability / certification verification). Where a category was genuinely fragmented or had no single dominant B2B player (cotton voile/lawn at lining scale, cotton batting, generic polyester fiberfill), L3 is honestly empty rather than padded with regional jobbers or distributors.
- Felipe's rule "si no lo tienes claro, fuera" was applied strictly — 4 entries from the original prompt were corrected or pulled out (Larusmiani Tessile not a B2B mill; Bonotto/Hi-Tex re-scoped; HEMP-FORTEX not a hair-canvas player; brand-locked insulations Plumafill / Coreloft / Thermoball / Alpha excluded by directive).
- Asahi Kasei Bemberg is the linchpin of the luxury-lining category — single global producer of cuprammonium rayon. Cross-listed from Rama 2; in Rama 6 it appears specifically as the canonical luxury lining material. Limonta is the gold-standard finishing weaver that takes Bemberg yarn to luxury tailored linings.
- Vlieseline / Freudenberg is the global B2B reference for interfacings — codes (G405, G700, G740, H180, H200, G785) are designer-spec standards across Europe and the US. Permess + Wendler are the German premium / luxury tailoring suppliers; both run hair-canvas programmes for bespoke menswear (Brioni / Zegna / Kiton class).
- Hair canvas remains the marker between full-canvas (luxury bespoke) and fused (mass-market) tailoring — a binary that defines garment tier. The L1 entry is intentionally specific (front canvas + chest piece + domette as separate L2 components), reflecting how tailoring atelier teams actually order.
- Down + synthetic insulation is the most volatile sub-category — 2025–2026 sees the GRS / RDS-recycled programmes maturing: Re:Down (HU) for circular down; Thermore Ecodown Fibers Recycled (IT) for blown synthetic; PrimaLoft Bio for biodegradable virgin; 3M Thinsulate (with Repreve in some grades) for recycled apparel insulation. RDS is now table-stakes for any premium outerwear claim.
- The "synthetic down-alternative" sub-category (PrimaLoft ThermoPlume + 3M FeatherlessAlpine + Thermore Ecodown Fibers) is the canonical vegan / animal-free path. All three are blown-fibre formats designed to fill baffles like down — interchangeable at the construction level for designers wanting down-feel without the animal input.
- `vegan: false` is set on silk habotai (lining-silk-habotai + variants), down (wadding-down-rds + all variants), and wool batting (wadding-wool-batting + variants). All other Rama 6 entries are vegan-true by default.
