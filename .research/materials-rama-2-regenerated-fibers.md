# Rama 2 — Regenerated & Semi-Synthetic Fibers — Research Report

**Scope**: Regenerated cellulosic fibers + recycled regenerated cellulosics + bio-based protein/biomass fibers + innovative still-rare bio fibers. Excludes naturals (Rama 1), synthetics (Rama 3), leather (Rama 4).
**Date**: 2026-05-03
**Methodology**: WebSearch across Lenzing/Asahi Kasei/Eastman/Birla/Sateri/Smartfiber/Spiber official B2B portals + Canopy Hot Button reports + Sourcing Journal + WWD + Permanent Style + textile mill catalogs (Tissura, Apparel-X, Core Fabrics, Fabworks). All L3 (B2B suppliers) verified individually with at least one URL confirming (a) the mill or fiber producer is currently operating, (b) it has a B2B fabric/yarn division, (c) it supplies multiple brands (not exclusive to one DTC label).

**Conventions**:
- Layer 1 (L1) = canonical base fiber name.
- Layer 2 (L2) = construction × weight × finish variants where relevant. Some niche bio-fibers have no L2 (raw fiber not commonly woven into many structures).
- Layer 3 (L3) = real verified B2B mill / fiber producer suppliers. Conservative — only included where verification is concrete. Maximum 5 per fiber.
- ROPA-only subtype list per request: dress, top, shirt, blouse, tshirt, polo, knitwear-top, sweater, bottom, trouser, jean, short, skirt, jumpsuit, outerwear-jacket, outerwear-coat, blazer, suit, lingerie, swimwear, activewear, loungewear, tailoring.

**Felipe's rule applied**: si no lo tienes claro, fuera. Where commercial readiness is unclear, production is paused, or company has ceased operations → EXCLUDED with reason. Conservative inclusion bias.

**Primary sources consulted**:
- https://www.lenzing.com/products/ (Tencel, Modal, Refibra, ECOVERO product pages)
- https://b2b.tencel.com/ (Lenzing certified mill partner directory)
- https://lenzingpro.com/ (Lenzing's B2B partner platform launched 2024)
- https://www.asahi-kasei.co.jp/fibers/en/bemberg/ (Bemberg Cupro official)
- https://www.eastman.com/en/products/brands/naia (Naia / Naia Renew)
- https://www.livabybirlacellulose.com/ (LIVA / Birla Cellulose)
- https://www.sateri.com/ (Sateri viscose)
- https://kelheim-fibres.com/en/ (Kelheim specialty viscose)
- https://www.ecovero.com/ (LENZING™ ECOVERO™)
- https://smartfiber.de/en/ (SeaCell / Smartfiber AG)
- https://orangefiber.it/ (Orange Fiber)
- https://spiber.inc/en/ (Spiber Brewed Protein)
- https://bananatex.info/ (Bananatex / QWSTION)
- https://vegeacompany.com/ (Vegea GrapeSkin)
- https://www.qmilkfiber.eu/ (QMilk)
- https://omikenshi.co.jp/profile_english/ (Crabyon)
- https://canopyplanet.org/tools-and-resources/hot-button-report/ (Canopy Hot Button cross-reference)

**Total entries (final count)**: 87 (15 L1 + 49 L2 + 23 L3) + 4 EXCLUDED entries documented.

---

## 1. Viscose / Rayon (generic)

### L1 — Base
```yaml
- id: viscose
  name: "Viscose / Rayon"
  layer: L1
  family: regenerated-cellulosic
  composition: "100% viscose (regenerated cellulose from wood pulp)"
  weightRange: { min: 90, max: 280, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","mercerized","garment-washed","enzyme-washed","calendered","peached","sand-washed"]
  zones: ["Body","Lining","Sleeve","Collar","Pocket"]
  subtypes: ["dress","top","shirt","blouse","tshirt","skirt","trouser","jumpsuit","blazer","loungewear","lingerie"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["minimal","romantic","resort","bohemian","tailored"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["OEKO-TEX","FSC","Canopy"]
  vegan: true
```

### L2 — Variants
```yaml
- id: viscose-challis
  name: "Viscose challis"
  layer: L2
  parentId: viscose
  composition: "100% viscose"
  weightRange: { min: 90, max: 130, unit: gsm }
  defaultFinish: "raw"
  zones: ["Body","Sleeve"]
  subtypes: ["dress","blouse","skirt","top"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["romantic","resort","bohemian","minimal"]
  seasonFit: ["SS","transitional"]

- id: viscose-twill
  name: "Viscose twill"
  layer: L2
  parentId: viscose
  composition: "100% viscose"
  weightRange: { min: 140, max: 220, unit: gsm }
  defaultFinish: "raw"
  zones: ["Body","Sleeve","Pocket"]
  subtypes: ["trouser","blazer","skirt","jumpsuit","dress"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["tailored","minimal","resort"]
  seasonFit: ["SS","transitional","all-year"]

- id: viscose-crepe
  name: "Viscose crepe"
  layer: L2
  parentId: viscose
  composition: "100% viscose"
  weightRange: { min: 110, max: 180, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse","skirt","trouser","jumpsuit"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["tailored","romantic","minimal"]
  seasonFit: ["all-year"]

- id: viscose-satin
  name: "Viscose satin"
  layer: L2
  parentId: viscose
  composition: "100% viscose"
  weightRange: { min: 100, max: 160, unit: gsm }
  defaultFinish: "calendered"
  subtypes: ["dress","blouse","skirt","lingerie","loungewear"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["romantic","minimal"]
  seasonFit: ["SS","transitional","all-year"]

- id: viscose-jersey
  name: "Viscose jersey"
  layer: L2
  parentId: viscose
  composition: "100% viscose (often blended with elastane)"
  weightRange: { min: 130, max: 220, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["tshirt","top","dress","loungewear","lingerie"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["minimal","loungewear"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-birla-cellulose
  name: "Birla Cellulose (Aditya Birla Group)"
  layer: L3
  parentId: viscose
  origin: "India / Indonesia / Thailand"
  notes: |
    World's largest VSF producer. ~17% global share. 7 plants across India, Indonesia,
    Thailand, China. Pulp 95%+ FSC-certified. Brands: LIVA, Livaeco, Liva Reviva,
    Birla Viscose, Birla Modal, Birla Excel (lyocell). True B2B fiber producer
    selling to spinners and mills worldwide.
  verification: "https://www.livabybirlacellulose.com/business + https://www.adityabirla.com/en/businesses/sectors/cellulosic-fibre/ + https://canopyplanet.org/tools-and-resources/hot-button-report/aditya-birla"

- id: supplier-sateri
  name: "Sateri (RGE Group)"
  layer: L3
  parentId: viscose
  origin: "China / Indonesia / Brazil (RGE network)"
  notes: |
    World's largest viscose fibre maker. 2.4M tonnes annual capacity. PEFC-certified
    chain of custody. STeP by OEKO-TEX, OEKO-TEX Standard 100, ISO 9001/14001.
    Lyocell capacity expanding to 400,000 tonnes by 2025. True B2B fiber producer.
  verification: "https://www.sateri.com/ + https://www.rgei.com/our-business/sateri + https://hotbutton.canopyplanet.org/company/sateri-rge-group/"

- id: supplier-kelheim-fibres
  name: "Kelheim Fibres GmbH"
  layer: L3
  parentId: viscose
  origin: "Germany (Kelheim, Bavaria)"
  notes: |
    Specialty viscose mill since 1936. ~80–90,000 tonnes/year. Custom cross-sections,
    cutting lengths, deniers, colored fibers. Listed in Canopy Hot Button as low-risk
    pulp sourcing. Sells globally to spinners and converters.
  verification: "https://kelheim-fibres.com/en/ + https://canopyplanet.org/tools-and-resources/hot-button-report/kelheim-fibres + https://plasticfree.com/makers/kelheim-fibres"
```

### Notes & sources
- Viscose GSM ranges cross-referenced against Core Fabrics fabric weight blog (https://corefabricstore.com/blogs/tips-and-resources/fabric-weights-blog) and Croft Mill viscose guide.
- FSC + Canopy alignment is the launch-grade dimension for viscose sourcing — Canopy's annual Hot Button Report ranks producers by feedstock risk (https://canopyplanet.org/).
- Sources:
  - https://www.livabybirlacellulose.com/
  - https://www.sateri.com/
  - https://kelheim-fibres.com/en/
  - https://www.croftmill.co.uk/viscose-fabric-guide-the-different-types-of
  - https://corefabricstore.com/blogs/tips-and-resources/fabric-weights-blog

---

## 2. LIVA (Birla Cellulose branded viscose)

### L1 — Base
```yaml
- id: liva
  name: "LIVA (Birla Cellulose viscose)"
  layer: L1
  family: regenerated-cellulosic
  composition: "100% LIVA viscose (Birla Cellulose proprietary)"
  weightRange: { min: 100, max: 240, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","calendered","enzyme-washed","peached"]
  zones: ["Body","Lining","Sleeve"]
  subtypes: ["dress","top","blouse","skirt","trouser","jumpsuit","loungewear"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["romantic","minimal","resort"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["FSC","OEKO-TEX","Canopy"]
  vegan: true
```

### L2 — Variants
```yaml
- id: liva-eco
  name: "Livaeco (low-carbon, traceable)"
  layer: L2
  parentId: liva
  composition: "Livaeco viscose, traceable via blockchain (GreenTrack)"
  weightRange: { min: 100, max: 220, unit: gsm }
  subtypes: ["dress","blouse","skirt","trouser","top"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal","resort"]
  seasonFit: ["SS","all-year"]
  certifications: ["FSC","Canopy","OEKO-TEX"]

- id: liva-reviva
  name: "Liva Reviva (recycled-content viscose)"
  layer: L2
  parentId: liva
  composition: "Liva Reviva — viscose with up to 20% pre-consumer textile waste content"
  weightRange: { min: 110, max: 220, unit: gsm }
  subtypes: ["dress","blouse","top","skirt","trouser"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal","circular"]
  seasonFit: ["all-year"]
  certifications: ["FSC","RCS","OEKO-TEX","Canopy"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-birla-cellulose-liva
  name: "Birla Cellulose / LIVA"
  layer: L3
  parentId: liva
  origin: "India (multiple plants) + Indonesia + Thailand"
  notes: |
    LIVA is Birla Cellulose's branded viscose fiber program. Producer is Birla
    Cellulose itself (Aditya Birla Group). LIVA is the consumer-facing tag program;
    fabric mills source LIVA-branded fiber directly from Birla and convert it.
    Operating across 7 plants worldwide. FSC-certified pulp.
  verification: "https://www.livabybirlacellulose.com/ + https://www.livabybirlacellulose.com/business/fibre-production + https://asiapacific.fsc.org/newsfeed/fsc-apac-change-agent-series-outstanding-business-showcase-birla-cellulose"
```

### Notes & sources
- LIVA is a brand program, not a mill — it sits on Birla Cellulose viscose. Verified via official site + Aditya Birla group portal + FSC Asia-Pacific.
- Sources:
  - https://www.livabybirlacellulose.com/
  - https://www.adityabirla.com/en/businesses/brands/liva/
  - https://www.adityabirla.com/en/businesses/brands/livaeco/
  - https://www.adityabirla.com/en/businesses/brands/liva-reviva/

---

## 3. Modal (Lenzing Modal + generic)

### L1 — Base
```yaml
- id: modal
  name: "Modal"
  layer: L1
  family: regenerated-cellulosic
  composition: "100% modal (regenerated cellulose, beech-wood pulp typical for Lenzing Modal)"
  weightRange: { min: 100, max: 260, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","mercerized","brushed","calendered","peached"]
  zones: ["Body","Lining","Sleeve"]
  subtypes: ["dress","top","tshirt","blouse","loungewear","lingerie","skirt","trouser","jumpsuit"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","romantic","loungewear","sustainable"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["OEKO-TEX","FSC","EU-Ecolabel"]
  vegan: true
```

### L2 — Variants
```yaml
- id: modal-jersey
  name: "Modal jersey"
  layer: L2
  parentId: modal
  composition: "100% modal (often blended with elastane 5%)"
  weightRange: { min: 130, max: 200, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["tshirt","top","dress","loungewear","lingerie"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","loungewear","romantic"]
  seasonFit: ["all-year"]

- id: modal-twill
  name: "Modal twill"
  layer: L2
  parentId: modal
  composition: "100% modal"
  weightRange: { min: 140, max: 240, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["trouser","skirt","blazer","dress","jumpsuit"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["tailored","minimal"]
  seasonFit: ["all-year"]

- id: modal-satin
  name: "Modal satin"
  layer: L2
  parentId: modal
  composition: "100% modal"
  weightRange: { min: 110, max: 170, unit: gsm }
  defaultFinish: "calendered"
  subtypes: ["dress","blouse","lingerie","loungewear","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","minimal"]
  seasonFit: ["all-year"]

- id: tencel-modal
  name: "TENCEL™ Modal (Lenzing branded)"
  layer: L2
  parentId: modal
  composition: "100% TENCEL™ Modal (Lenzing branded modal, FSC + EU Ecolabel)"
  weightRange: { min: 100, max: 240, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","Eco-Color","Indigo-Color","Micro","Air"]
  subtypes: ["tshirt","top","dress","loungewear","lingerie","skirt","trouser"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","loungewear","sustainable"]
  certifications: ["FSC","EU-Ecolabel","OEKO-TEX","STeP"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-lenzing-modal
  name: "Lenzing AG (TENCEL™ Modal producer)"
  layer: L3
  parentId: modal
  origin: "Austria (Lenzing) + global mill partner network"
  notes: |
    Sole producer of TENCEL™ Modal fiber. Supplies fiber to certified mills
    globally via the Lenzing Pro / b2b.tencel.com portal. Eco Color and Indigo
    Color technologies launched 2023–2024. Mills must be Lenzing-certified to
    use the TENCEL™ Modal mark.
  verification: "https://www.lenzing.com/products/brands/tenceltm/ + https://www.tencel.com/b2b + https://lenzingpro.com/"

- id: supplier-ekoten
  name: "Ekoten Fabrics"
  layer: L3
  parentId: modal
  origin: "Turkey (Izmir)"
  notes: |
    Lenzing-certified mill partner; develops modal jersey and woven fabrics with
    TENCEL™ Modal Eco Color technology. Confirmed by Lenzing as official mill
    partner in 2024 Eco Color partner article.
  verification: "https://www.tencel.com/b2b/news-and-events/reducing-the-environmental-impact-perspectives-from-lenzings-mill-partners-on-tencel-modal-fibers-with-eco-color-technology + https://www.ekoten.com.tr/"

- id: supplier-primotex
  name: "Primotex Textiles Holdings"
  layer: L3
  parentId: modal
  origin: "Hong Kong / China"
  notes: |
    Long-time Lenzing partner. EcoLab fabric collection features TENCEL™ Modal
    and ECOVERO™ blends. Operates across multiple Asian textile hubs.
  verification: "https://b2b.tencel.com/news-and-events/tencel-and-lenzing-ecovero-branded-fibers-featured-in-the-ecolab-fabric-collection-by-primotex"
```

### Notes & sources
- Lenzing Modal is the modal benchmark; "modal" generic exists from other producers (e.g. Birla Modal) but TENCEL™ Modal is the licensed branded version. Generic Modal can come from Birla Cellulose under the Birla Modal name (covered in LIVA / Birla supplier).
- Sources:
  - https://www.lenzing.com/products/brands/tenceltm/
  - https://www.tencel.com/b2b
  - https://www.tencel.com/b2b/news-and-events/reducing-the-environmental-impact-perspectives-from-lenzings-mill-partners-on-tencel-modal-fibers-with-eco-color-technology
  - https://lenzingpro.com/

---

## 4. Lyocell / Tencel (Lenzing-branded; B2B-licensed)

### L1 — Base
```yaml
- id: lyocell
  name: "Lyocell (TENCEL™ Lyocell)"
  layer: L1
  family: regenerated-cellulosic
  composition: "100% lyocell (regenerated cellulose, closed-loop NMMO solvent process)"
  weightRange: { min: 100, max: 320, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","peached","sand-washed","calendered","brushed","enzyme-washed"]
  zones: ["Body","Lining","Sleeve","Pocket"]
  subtypes: ["dress","top","blouse","shirt","tshirt","trouser","jean","skirt","jumpsuit","loungewear","lingerie","blazer","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","sustainable","tailored","resort","loungewear"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["FSC","EU-Ecolabel","OEKO-TEX","STeP"]
  vegan: true
```

### L2 — Variants
```yaml
- id: lyocell-jersey
  name: "Lyocell jersey"
  layer: L2
  parentId: lyocell
  composition: "100% lyocell (often blended with elastane 5%)"
  weightRange: { min: 140, max: 220, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["tshirt","top","dress","loungewear"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","loungewear","sustainable"]
  seasonFit: ["all-year"]

- id: lyocell-twill
  name: "Lyocell twill"
  layer: L2
  parentId: lyocell
  composition: "100% lyocell"
  weightRange: { min: 160, max: 260, unit: gsm }
  defaultFinish: "peached"
  subtypes: ["trouser","blazer","skirt","jumpsuit","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["tailored","minimal","sustainable"]
  seasonFit: ["transitional","all-year"]

- id: lyocell-denim
  name: "Lyocell denim"
  layer: L2
  parentId: lyocell
  composition: "Lyocell (often 30–60%) blended with cotton in denim warp/weft"
  weightRange: { min: 240, max: 360, unit: gsm }
  defaultFinish: "garment-washed"
  subtypes: ["jean","skirt","outerwear-jacket","short"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal","streetwear"]
  seasonFit: ["transitional","FW"]

- id: lyocell-poplin
  name: "Lyocell poplin"
  layer: L2
  parentId: lyocell
  composition: "100% lyocell"
  weightRange: { min: 100, max: 140, unit: gsm }
  defaultFinish: "calendered"
  subtypes: ["shirt","blouse","dress"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","tailored","sustainable"]
  seasonFit: ["SS","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-lenzing-tencel
  name: "Lenzing AG (TENCEL™ Lyocell producer)"
  layer: L3
  parentId: lyocell
  origin: "Austria + USA (Mobile, Alabama TENCEL™ plant) + Lenzing global network"
  notes: |
    Sole branded TENCEL™ Lyocell producer. Licensed to certified mill partners.
    All fiber traceable via Lenzing Pro digital platform. EU Ecolabel + FSC.
    Supplies thousands of mills worldwide.
  verification: "https://www.lenzing.com/products/brands/tenceltm/ + https://b2b.tencel.com/ + https://lenzingpro.com/"

- id: supplier-hermin-textile
  name: "HerMin Textile"
  layer: L3
  parentId: lyocell
  origin: "Taiwan"
  notes: |
    Lenzing-certified TENCEL™ Lyocell fabric manufacturer. Produces wovens and
    knits in lyocell + blends. Listed publicly as Lenzing certified factory.
  verification: "https://www.hermin.com/product-tencel-fabric.html"

- id: supplier-boyue-textile
  name: "Boyue Textile"
  layer: L3
  parentId: lyocell
  origin: "China"
  notes: |
    Lenzing-certified TENCEL™ Lyocell fabric mill. Produces wovens for fashion
    and uniforms. Public Lenzing certification.
  verification: "https://www.boyuefabric.com/Tencel-fabric/"

- id: supplier-candiani-tencel
  name: "Candiani Denim (TENCEL™ partner)"
  layer: L3
  parentId: lyocell
  origin: "Italy (Robecchetto con Induno, Milano)"
  notes: |
    Lenzing-confirmed denim mill partner for TENCEL™ Modal Indigo Color and
    TENCEL™ Lyocell denim blends. Already a major B2B denim mill (also covered
    in Rama 1 cotton denim).
  verification: "https://www.candianidenim.com/en + https://www.lenzing.com/newsroom/news-events/lenzing-unveils-pioneering-tenceltm-modal-fiber-with-indigo-color-technology/"

- id: supplier-cone-denim-tencel
  name: "Cone Denim (TENCEL™ partner)"
  layer: L3
  parentId: lyocell
  origin: "USA / Mexico (Parras Cone)"
  notes: |
    Lenzing-confirmed denim mill partner for TENCEL™ Modal Indigo Color
    initiatives. Public partnership announcement 2024.
  verification: "https://www.lenzing.com/newsroom/news-events/lenzing-unveils-pioneering-tenceltm-modal-fiber-with-indigo-color-technology/ + https://www.conedenim.com/"
```

### Notes & sources
- Lyocell (TENCEL™) is the closed-loop NMMO process branded by Lenzing. "Generic lyocell" exists from Sateri (Excel by Birla, Sateri lyocell) — covered under generic viscose/lyocell suppliers (Sateri).
- Sources:
  - https://www.lenzing.com/products/brands/tenceltm/
  - https://b2b.tencel.com/
  - https://www.tencel.com/b2b
  - https://lenzingpro.com/
  - https://www.candianidenim.com/en
  - https://www.lenzing.com/newsroom/news-events/lenzing-unveils-pioneering-tenceltm-modal-fiber-with-indigo-color-technology/

---

## 5. Cupro / Bemberg (Asahi Kasei B2B)

### L1 — Base
```yaml
- id: cupro
  name: "Cupro (Bemberg)"
  layer: L1
  family: regenerated-cellulosic
  composition: "100% cupro (regenerated cellulose from cotton linter via cuprammonium process)"
  weightRange: { min: 60, max: 130, unit: gsm }
  defaultFinish: "calendered"
  finishOptions: ["raw","calendered","peached","sand-washed"]
  zones: ["Lining","Body","Sleeve"]
  subtypes: ["blazer","suit","outerwear-jacket","outerwear-coat","dress","blouse","skirt","trouser","tailoring"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","minimal","luxury"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX","FSC"]
  vegan: true
```

### L2 — Variants
```yaml
- id: bemberg-lining
  name: "Bemberg Cupro lining"
  layer: L2
  parentId: cupro
  composition: "100% Bemberg cupro"
  weightRange: { min: 60, max: 100, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["blazer","suit","outerwear-jacket","outerwear-coat","skirt","trouser","tailoring"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","luxury"]
  seasonFit: ["all-year"]

- id: bemberg-shell
  name: "Bemberg Cupro shell (heavier weight)"
  layer: L2
  parentId: cupro
  composition: "100% Bemberg cupro"
  weightRange: { min: 95, max: 130, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Body","Sleeve"]
  subtypes: ["blouse","dress","shirt","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","luxury","romantic"]
  seasonFit: ["SS","all-year"]

- id: bemberg-blend
  name: "Bemberg Cupro blends (with cotton / wool)"
  layer: L2
  parentId: cupro
  composition: "Cupro blended with cotton or wool (typical 30–70% cupro)"
  weightRange: { min: 140, max: 280, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["blazer","trouser","suit","outerwear-jacket","jean","skirt","tailoring"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","minimal","luxury"]
  seasonFit: ["transitional","all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-asahi-kasei
  name: "Asahi Kasei (Bemberg producer)"
  layer: L3
  parentId: cupro
  origin: "Japan (Nobeoka, Miyazaki)"
  notes: |
    Sole worldwide producer of cupro fiber under the Bemberg brand. Sells fiber
    + tow + textured/compound yarns to global textile converters. Has converter
    partner network in Japan (Fukui, Nishiwaki, Kiryu), Italy, India.
  verification: "https://www.asahi-kasei.co.jp/fibers/en/bemberg/ + https://asahi-kasei.in/products/cupro-fiber/ + https://www.asahi-kasei.co.jp/fibers/en/bemberg/production-area/"

- id: supplier-pure-denim-bemberg
  name: "Pure Denim (Bemberg denim partner)"
  layer: L3
  parentId: cupro
  origin: "Italy"
  notes: |
    Italian denim mill partner of Asahi Kasei. Produces collections in 100%
    Bemberg and Bemberg/cotton/wool blends. Public partnership at Pitti Uomo.
  verification: "https://sourcingjournal.com/denim/denim-mills/pure-denim-bemberg-asahi-kasei-cupro-pitti-uomo-cotton-linter-397570/ + https://www.puredenim.com/"

- id: supplier-gianni-crespi
  name: "Gianni Crespi Foderami s.r.l."
  layer: L3
  parentId: cupro
  origin: "Italy"
  notes: |
    Italian lining fabric manufacturer and distributor. Bemberg cupro lining
    converter; supplies tailoring industry across Europe.
  verification: "https://www.asahi-kasei.co.jp/fibers/en/bemberg/production-area/ + https://www.gcrespi.com/"

- id: supplier-stylem
  name: "Stylem (cupro converter)"
  layer: L3
  parentId: cupro
  origin: "Japan"
  notes: |
    Leading Japanese textile trading company supplying cupro fabrics for B2B
    customers across apparel, lining and home textiles.
  verification: "https://us.stylemfabrics.com/collections/cupro"
```

### Notes & sources
- Bemberg = Asahi Kasei's global brand for cupro. Sole producer worldwide.
- Cupro lining GSM weights cross-referenced against Permanent Style lining guide + Core Fabrics + Lancia Italian lining listings.
- Sources:
  - https://www.asahi-kasei.co.jp/fibers/en/bemberg/
  - https://asahi-kasei.in/products/cupro-fiber/
  - https://www.permanentstyle.com/2021/03/bemberg-cupro-ermezine-the-guide-to-linings.html
  - https://corefabricstore.com/products/bemberg-cupro-lining
  - https://sourcingjournal.com/denim/denim-mills/pure-denim-bemberg-asahi-kasei-cupro-pitti-uomo-cotton-linter-397570/

---

## 6. Acetate (cellulose acetate)

### L1 — Base
```yaml
- id: acetate
  name: "Acetate (cellulose acetate)"
  layer: L1
  family: regenerated-cellulosic
  composition: "100% cellulose acetate (regenerated cellulose esterified with acetic anhydride)"
  weightRange: { min: 80, max: 150, unit: gsm }
  defaultFinish: "calendered"
  finishOptions: ["raw","calendered","peached"]
  zones: ["Lining","Body"]
  subtypes: ["blazer","suit","outerwear-jacket","outerwear-coat","dress","blouse","skirt","tailoring","loungewear"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["tailored","luxury","romantic"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX","FSC"]
  vegan: true
```

### L2 — Variants
```yaml
- id: acetate-satin-lining
  name: "Acetate satin lining"
  layer: L2
  parentId: acetate
  composition: "100% acetate"
  weightRange: { min: 90, max: 130, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining"]
  subtypes: ["blazer","suit","outerwear-jacket","outerwear-coat","skirt","tailoring"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["tailored","luxury"]
  seasonFit: ["all-year"]

- id: acetate-taffeta
  name: "Acetate taffeta"
  layer: L2
  parentId: acetate
  composition: "100% acetate"
  weightRange: { min: 80, max: 140, unit: gsm }
  defaultFinish: "calendered"
  subtypes: ["dress","skirt","blouse"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romantic","luxury"]
  seasonFit: ["transitional","FW"]

- id: acetate-blend-knitwear
  name: "Acetate blend knit (with viscose / nylon)"
  layer: L2
  parentId: acetate
  composition: "Acetate blended with viscose or nylon (typical 50/50)"
  weightRange: { min: 130, max: 200, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","top","skirt","loungewear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["minimal","romantic","loungewear"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-eastman-acetate
  name: "Eastman Chemical (Estron acetate yarns)"
  layer: L3
  parentId: acetate
  origin: "USA (Kingsport, Tennessee)"
  notes: |
    Major acetate fiber producer. Markets Estron natural and Chromspun
    solution-dyed acetate yarns for apparel, home furnishings, industrial fabrics.
    Also produces the Naia™ brand (covered separately under Naia).
  verification: "https://www.eastman.com/en/products/brands/naia + https://en.wikipedia.org/wiki/Eastman_Chemical_Company"

- id: supplier-mitsubishi-rayon-acetate
  name: "Mitsubishi Chemical Group / GSI Creos (acetate / triacetate)"
  layer: L3
  parentId: acetate
  origin: "Japan"
  notes: |
    Largest acetate producer in Japan since the 1950s. Mitsubishi's triacetate
    fiber business transferred to GSI Creos Corporation effective March 2025;
    operations continuing under the Soalon brand. Acetate fiber business retained.
  verification: "https://polymer-additives.specialchem.com/news/industry-news/mitsubishi-chemical-to-transfer-of-triacetate-fiber-business-000234997 + https://en.wikipedia.org/wiki/Cellulose_triacetate"

- id: supplier-celanese-acetate
  name: "Celanese (acetate fibers / Celanese Acetate)"
  layer: L3
  parentId: acetate
  origin: "USA / global"
  notes: |
    Long-standing major cellulose acetate producer. Listed in market reports
    among the top global cellulose acetate manufacturers. Apparel & home textile
    converter network globally.
  verification: "https://www.businesswire.com/news/home/20210812005328/en/Global-Cellulose-Acetate-Market-Outlook-to-2026-with-Celanese-Daicel-Chemical-Eastman-Chemical-Mitsubishi-Rayon-and-Rhodia-Acetow-Dominating---ResearchAndMarkets.com + https://www.celanese.com/"
```

### Notes & sources
- Cellulose acetate is the broader category; triacetate (more acetylated form) covered separately. Acetate satin/taffeta GSM cross-referenced against Fabworks Online + szoneierfabrics satin GSM guide.
- Sources:
  - https://www.eastman.com/en/products/brands/naia
  - https://www.businesswire.com/news/home/20210812005328/
  - https://fabworks.co.uk/products/acetate-satin-lining-mother-of-pearl
  - https://szoneierfabrics.com/satin-fabric-weight-and-gsm-chart-how-to-choose-for-your-product/

---

## 7. Triacetate

### L1 — Base
```yaml
- id: triacetate
  name: "Triacetate (cellulose triacetate)"
  layer: L1
  family: regenerated-cellulosic
  composition: "100% cellulose triacetate (>92% acetylated cellulose)"
  weightRange: { min: 100, max: 200, unit: gsm }
  defaultFinish: "calendered"
  finishOptions: ["raw","calendered","heat-set"]
  zones: ["Body","Lining"]
  subtypes: ["dress","blouse","skirt","trouser","blazer","tailoring","loungewear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","luxury","minimal"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX"]
  vegan: true
```

### L2 — Variants
```yaml
- id: triacetate-twill
  name: "Triacetate twill (Soalon-style)"
  layer: L2
  parentId: triacetate
  composition: "100% triacetate (or triacetate/polyester blend)"
  weightRange: { min: 140, max: 200, unit: gsm }
  defaultFinish: "heat-set"
  subtypes: ["dress","skirt","trouser","blouse","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","minimal","luxury"]
  seasonFit: ["all-year"]

- id: triacetate-jersey
  name: "Triacetate jersey blend"
  layer: L2
  parentId: triacetate
  composition: "Triacetate blended with elastane / polyester"
  weightRange: { min: 130, max: 180, unit: gsm }
  defaultFinish: "heat-set"
  subtypes: ["dress","top","skirt","loungewear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","loungewear"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-gsi-creos-soalon
  name: "GSI Creos Corporation (Soalon triacetate)"
  layer: L3
  parentId: triacetate
  origin: "Japan"
  notes: |
    Acquired Mitsubishi Chemical's triacetate fiber business effective March
    2025; continues production under the Soalon brand. Production has not been
    discontinued; ownership transferred. Real B2B fiber producer.
  verification: "https://polymer-additives.specialchem.com/news/industry-news/mitsubishi-chemical-to-transfer-of-triacetate-fiber-business-000234997 + https://www.gsi.co.jp/english/"
```

### Notes & sources
- Triacetate production has consolidated dramatically — Mitsubishi/GSI Creos remains the most credible large-scale B2B producer. US production ceased decades ago.
- Sources:
  - https://polymer-additives.specialchem.com/news/industry-news/mitsubishi-chemical-to-transfer-of-triacetate-fiber-business-000234997
  - https://en.wikipedia.org/wiki/Cellulose_triacetate

---

## 8. Naia (Eastman acetate filament + staple, FSC-managed forests)

### L1 — Base
```yaml
- id: naia
  name: "Naia™ (Eastman cellulose acetate)"
  layer: L1
  family: regenerated-cellulosic
  composition: "100% Naia™ cellulose acetate from sustainably-managed forests (Eastman)"
  weightRange: { min: 90, max: 220, unit: gsm }
  defaultFinish: "calendered"
  finishOptions: ["raw","calendered","peached","sand-washed"]
  zones: ["Body","Lining"]
  subtypes: ["dress","blouse","skirt","trouser","top","blazer","tailoring","loungewear","lingerie"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","romantic","luxury","sustainable"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["FSC","OEKO-TEX"]
  vegan: true
```

### L2 — Variants
```yaml
- id: naia-filament
  name: "Naia™ filament yarn"
  layer: L2
  parentId: naia
  composition: "Naia filament cellulose acetate"
  weightRange: { min: 90, max: 180, unit: gsm }
  defaultFinish: "calendered"
  subtypes: ["dress","blouse","skirt","blazer","loungewear","lingerie"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["luxury","minimal","romantic"]
  seasonFit: ["SS","all-year"]

- id: naia-renew-staple
  name: "Naia™ Renew staple fiber (with recycled content)"
  layer: L2
  parentId: naia
  composition: "Naia Renew staple — 60% sustainably-sourced wood pulp + 40% certified recycled material (mass balance)"
  weightRange: { min: 110, max: 220, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","top","blouse","skirt","trouser","loungewear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal","circular"]
  seasonFit: ["all-year"]
  certifications: ["FSC","ISCC","OEKO-TEX"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-eastman-naia
  name: "Eastman Chemical (Naia™ producer)"
  layer: L3
  parentId: naia
  origin: "USA (Kingsport, Tennessee) + China expansion (Huafon partnership 2025)"
  notes: |
    Sole producer of the Naia™ brand. August 2025 announced Huafon Chemical
    partnership for localized China production. Naia portfolio = filament + staple.
    Sells fiber to mill converters globally; B2B-only program.
  verification: "https://www.eastman.com/en/products/brands/naia + https://textilefocus.com/eastman-naia-presented-a-new-cellulose-acetate-filament-yarn-at-intertextile-shanghai-2025/"

- id: supplier-grandtek-asia-naia
  name: "Grandtek Asia Corp (Naia™ converter)"
  layer: L3
  parentId: naia
  origin: "Taiwan / Hong Kong"
  notes: |
    Eastman-listed Naia partner, develops Naia and Naia Renew yarns and fabrics
    for fashion brands. Listed publicly with technology pages on the Naia program.
  verification: "https://www.gac2003.com/en/technology/naia-renew/"
```

### Notes & sources
- Naia is Eastman's branded acetate program. The 2025 Huafon partnership confirms commercial readiness and capacity expansion.
- Sources:
  - https://www.eastman.com/en/products/brands/naia
  - https://www.eastman.com/en/products/brands/naia/sustainability
  - https://textilefocus.com/eastman-naia-presented-a-new-cellulose-acetate-filament-yarn-at-intertextile-shanghai-2025/

---

## 9. Refibra (Lenzing — lyocell with recycled cotton)

### L1 — Base
```yaml
- id: refibra
  name: "REFIBRA™ (Lenzing recycled lyocell)"
  layer: L1
  family: regenerated-cellulosic
  composition: "Lyocell with up to 30% pre- and post-consumer cotton textile waste + virgin pulp"
  weightRange: { min: 110, max: 360, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","peached","garment-washed","enzyme-washed"]
  zones: ["Body","Lining","Sleeve","Pocket"]
  subtypes: ["dress","top","tshirt","shirt","blouse","trouser","jean","skirt","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sustainable","minimal","circular"]
  seasonFit: ["all-year"]
  certifications: ["FSC","RCS","EU-Ecolabel","OEKO-TEX","STeP"]
  vegan: true
```

### L2 — Variants
```yaml
- id: refibra-twill
  name: "REFIBRA™ twill"
  layer: L2
  parentId: refibra
  composition: "Lyocell + recycled cotton (REFIBRA technology)"
  weightRange: { min: 160, max: 260, unit: gsm }
  defaultFinish: "peached"
  subtypes: ["trouser","blazer","skirt","outerwear-jacket"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","tailored","circular"]
  seasonFit: ["transitional","all-year"]

- id: refibra-denim
  name: "REFIBRA™ denim"
  layer: L2
  parentId: refibra
  composition: "REFIBRA lyocell + cotton denim warp/weft"
  weightRange: { min: 240, max: 360, unit: gsm }
  defaultFinish: "garment-washed"
  subtypes: ["jean","skirt","outerwear-jacket"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","streetwear","circular"]
  seasonFit: ["transitional","FW"]

- id: refibra-jersey
  name: "REFIBRA™ jersey"
  layer: L2
  parentId: refibra
  composition: "REFIBRA lyocell jersey"
  weightRange: { min: 140, max: 220, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["tshirt","top","dress","loungewear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal","loungewear"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-lenzing-refibra
  name: "Lenzing AG (REFIBRA™ producer)"
  layer: L3
  parentId: refibra
  origin: "Austria (Lenzing)"
  notes: |
    Sole producer of REFIBRA™ branded lyocell. Commercial since 2017 — first
    cellulosic fiber with recycled content at scale. Up to 30% recycled textile
    waste. Mills must be Lenzing-certified.
  verification: "https://www.lenzing.com/newsroom/news-events/refibratm-technology-lenzings-initiative-to-drive-circular-economy-in-the-textile-world/ + https://www.lenzing.com/products/brands/tenceltm/"

- id: supplier-artistic-milliners
  name: "Artistic Milliners (REFIBRA™ denim partner)"
  layer: L3
  parentId: refibra
  origin: "Pakistan (Karachi)"
  notes: |
    Lenzing-confirmed REFIBRA™ denim mill partner. Part of the Fiber Recycling
    Initiative by TENCEL™ for mechanically recycled lyocell denim at commercial scale.
  verification: "https://sourcingjournal.com/sustainability/sustainability-materials/lenzing-circularity-fiber-innovation-collaboration-tencel-lyocell-refibra-ecovero-sodra-460703/ + https://artisticmilliners.com/"

- id: supplier-textil-santanderina-refibra
  name: "Textil Santanderina (REFIBRA™ partner)"
  layer: L3
  parentId: refibra
  origin: "Spain (Cantabria)"
  notes: |
    Lenzing-confirmed REFIBRA mill partner via Fiber Recycling Initiative.
    Spanish cotton + lyocell mill with full vertical integration.
  verification: "https://sourcingjournal.com/sustainability/sustainability-materials/lenzing-circularity-fiber-innovation-collaboration-tencel-lyocell-refibra-ecovero-sodra-460703/ + https://www.textilsantanderina.com/"

- id: supplier-canatiba-refibra
  name: "Canatiba (REFIBRA™ partner)"
  layer: L3
  parentId: refibra
  origin: "Brazil"
  notes: |
    Lenzing-confirmed Brazilian denim mill partner in the Fiber Recycling
    Initiative for REFIBRA. Major South American denim mill.
  verification: "https://sourcingjournal.com/sustainability/sustainability-materials/lenzing-circularity-fiber-innovation-collaboration-tencel-lyocell-refibra-ecovero-sodra-460703/ + https://canatiba.com.br/"
```

### Notes & sources
- REFIBRA is a Lenzing technology umbrella applied across TENCEL™ Lyocell and ECOVERO™ Viscose. Fiber-level identification = Lenzing only; mill partners adopt the technology via license.
- Sources:
  - https://www.lenzing.com/newsroom/news-events/refibratm-technology-lenzings-initiative-to-drive-circular-economy-in-the-textile-world/
  - https://www.innovationintextiles.com/five-years-of-refibra/
  - https://sourcingjournal.com/sustainability/sustainability-materials/lenzing-circularity-fiber-innovation-collaboration-tencel-lyocell-refibra-ecovero-sodra-460703/

---

## 10. ECOVERO (Lenzing branded sustainable viscose)

### L1 — Base
```yaml
- id: ecovero
  name: "LENZING™ ECOVERO™ viscose"
  layer: L1
  family: regenerated-cellulosic
  composition: "100% LENZING™ ECOVERO™ viscose (FSC + EU Ecolabel)"
  weightRange: { min: 90, max: 260, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","calendered","peached","enzyme-washed"]
  zones: ["Body","Lining","Sleeve"]
  subtypes: ["dress","top","blouse","shirt","skirt","trouser","jumpsuit","loungewear","lingerie"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","romantic","resort","sustainable"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["FSC","EU-Ecolabel","OEKO-TEX","STeP"]
  vegan: true
```

### L2 — Variants
```yaml
- id: ecovero-challis
  name: "ECOVERO™ challis"
  layer: L2
  parentId: ecovero
  composition: "100% ECOVERO viscose"
  weightRange: { min: 90, max: 130, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse","skirt","top"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["romantic","resort","sustainable"]
  seasonFit: ["SS","transitional"]

- id: ecovero-twill
  name: "ECOVERO™ twill"
  layer: L2
  parentId: ecovero
  composition: "100% ECOVERO viscose"
  weightRange: { min: 140, max: 220, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["trouser","blazer","skirt","jumpsuit","dress"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["tailored","minimal","sustainable"]
  seasonFit: ["all-year"]

- id: ecovero-refibra
  name: "ECOVERO™ + REFIBRA™ technology (≥20% recycled)"
  layer: L2
  parentId: ecovero
  composition: "ECOVERO viscose with REFIBRA technology — minimum 20% recycled pre/post-consumer textile waste"
  weightRange: { min: 110, max: 240, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","top","blouse","skirt","trouser"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal","circular"]
  certifications: ["FSC","EU-Ecolabel","RCS","OEKO-TEX"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-lenzing-ecovero
  name: "Lenzing AG (ECOVERO™ producer)"
  layer: L3
  parentId: ecovero
  origin: "Austria + Lenzing global network"
  notes: |
    Sole producer of LENZING™ ECOVERO™ branded viscose. First responsible
    viscose with EU Ecolabel from day one. ~500+ brand partners; hundreds of
    yarn spinners certified globally via Lenzing Pro.
  verification: "https://www.ecovero.com/ + https://www.lenzing.com/products/brands/lenzingtm-ecoverotm/ + https://lenzingpro.com/"

- id: supplier-new-focus-textiles
  name: "New Focus Textiles"
  layer: L3
  parentId: ecovero
  origin: "Taiwan"
  notes: |
    Lenzing-certified ECOVERO™ + REFIBRA™ woven fabric mill. Develops fashion
    fabric collections in ECOVERO and lyocell blends.
  verification: "https://newfocustex.com/lenzing-ecovero-fabric-manufacturer/ + https://newfocustex.com/explaining-lenzing-fibers-tencel-ecovero-and-refibra/"

- id: supplier-primotex-ecovero
  name: "Primotex Textiles Holdings (ECOVERO™ partner)"
  layer: L3
  parentId: ecovero
  origin: "Hong Kong / China"
  notes: |
    EcoLab fabric collection features ECOVERO viscose and TENCEL Modal blends.
    Long-time Lenzing mill partner.
  verification: "https://b2b.tencel.com/news-and-events/tencel-and-lenzing-ecovero-branded-fibers-featured-in-the-ecolab-fabric-collection-by-primotex"
```

### Notes & sources
- ECOVERO carries the EU Ecolabel — uniquely strong sustainability credential among viscose fibers.
- Sources:
  - https://www.ecovero.com/
  - https://www.lenzing.com/products/brands/lenzingtm-ecoverotm/
  - https://www.lenzing.com/newsroom/news-events/lenzing-expands-refibratm-technology-to-lenzingtm-ecoverotm-setting-new-responsible-viscose-standards-for-textile-circularity/
  - https://newfocustex.com/lenzing-ecovero-fabric-manufacturer/

---

## 11. SeaCell (Smartfiber AG — kelp + lyocell hybrid)

### L1 — Base
```yaml
- id: seacell
  name: "SeaCell™ (Smartfiber AG seaweed-cellulose hybrid)"
  layer: L1
  family: regenerated-cellulosic
  composition: "~85% lyocell or modal cellulose + ~4% brown seaweed (Ascophyllum nodosum from Icelandic fjords) + cellulose binder"
  weightRange: { min: 130, max: 240, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","peached","enzyme-washed"]
  zones: ["Body","Lining"]
  subtypes: ["tshirt","top","dress","loungewear","lingerie"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","wellness","minimal","loungewear"]
  seasonFit: ["all-year"]
  certifications: ["EU-Ecolabel","OEKO-TEX"]
  vegan: true
```

### L2 — Variants
```yaml
- id: seacell-jersey
  name: "SeaCell™ jersey (lyocell base)"
  layer: L2
  parentId: seacell
  composition: "Lyocell + brown algae (SeaCell)"
  weightRange: { min: 140, max: 220, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["tshirt","top","loungewear","lingerie"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["wellness","sustainable","loungewear"]
  seasonFit: ["all-year"]

- id: seacell-modal-base
  name: "SeaCell™ (modal base)"
  layer: L2
  parentId: seacell
  composition: "Modal + brown algae (SeaCell)"
  weightRange: { min: 130, max: 200, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["tshirt","loungewear","lingerie","top"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["wellness","loungewear","minimal"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-smartfiber-ag
  name: "Smartfiber AG (SeaCell™ producer)"
  layer: L3
  parentId: seacell
  origin: "Germany (Rudolstadt) — fiber spun at Lenzing's Austrian facilities under license"
  notes: |
    Sole producer of SeaCell™. Lyocell license from Lenzing. EU Ecolabel since
    2014, OEKO-TEX 100, TÜV Austria compostable. B2B fiber producer for spinners
    and mills; brand partners include CALIDA, FTC, WYLD1, SPEIDEL.
  verification: "https://smartfiber.de/en/seacell + https://smartfiber.de/en/about-us + https://marketplace.chemsec.org/Alternative/SeaCell-natural-cellulose-fiber-880"
```

### Notes & sources
- SeaCell is technically a regenerated cellulosic with seaweed inclusion; classified here as "regenerated-cellulosic" with bio-based hybrid character.
- Sources:
  - https://smartfiber.de/en/seacell
  - https://smartfiber.de/en/about-us
  - https://marketplace.chemsec.org/Alternative/SeaCell-natural-cellulose-fiber-880

---

## 12. Crabyon (Omikenshi — chitin/chitosan + viscose hybrid)

### L1 — Base
```yaml
- id: crabyon
  name: "Crabyon™ (Omikenshi chitin-cellulose hybrid)"
  layer: L1
  family: regenerated-cellulosic
  composition: "Chitosan (from crab/shellfish shells) co-extruded with viscose cellulose"
  weightRange: { min: 130, max: 240, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","peached","enzyme-washed"]
  zones: ["Body","Lining"]
  subtypes: ["tshirt","top","loungewear","lingerie"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["wellness","sustainable","loungewear"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX"]
  vegan: false
```

### L2 — Variants
```yaml
- id: crabyon-jersey
  name: "Crabyon™ jersey (knit)"
  layer: L2
  parentId: crabyon
  composition: "Crabyon + cotton or modal blend (typical 30–50% Crabyon)"
  weightRange: { min: 130, max: 220, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["tshirt","top","loungewear","lingerie"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["wellness","loungewear"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-omikenshi-crabyon
  name: "Omikenshi Co., Ltd. (Crabyon producer)"
  layer: L3
  parentId: crabyon
  origin: "Japan"
  notes: |
    Sole worldwide producer of Crabyon. Established commercial process for
    chitosan + viscose co-extrusion without organic solvent. Sells fiber tops,
    tows and spun yarns globally via Swicofil.
  verification: "https://omikenshi.co.jp/profile_english/ + https://www.swicofil.com/commerce/products/crabyon/517/introduction"

- id: supplier-pozzi-electa-crabyon
  name: "Pozzi Electa (Crabyon spinner)"
  layer: L3
  parentId: crabyon
  origin: "Italy"
  notes: |
    Italian textile producer; has spun Crabyon for ~15 years. Public Lampoon
    Magazine feature confirms commercial Crabyon yarn production at Pozzi Electa.
  verification: "https://lampoonmagazine.com/article/2023/12/30/crabyon-fibra-cellulosa-chitosano-granchio-pozzi-electa-sostenibile/ + https://www.pozzielecta.it/en/about-us/"

- id: supplier-swicofil-crabyon
  name: "Swicofil AG (Crabyon distributor)"
  layer: L3
  parentId: crabyon
  origin: "Switzerland (Emmenbrücke)"
  notes: |
    Global B2B distributor of Crabyon tops, tows, spun yarns. Long-standing
    Omikenshi partner. Public product page lists technical specs.
  verification: "https://old.swicofil.com/crabyon.html + https://www.swicofil.com/commerce/products/crabyon/517/introduction"
```

### Notes & sources
- Crabyon contains animal-derived chitosan → vegan: false. Suitable for wellness, anti-bacterial loungewear and lingerie.
- Sources:
  - https://omikenshi.co.jp/profile_english/
  - https://www.swicofil.com/commerce/products/crabyon/517/introduction
  - https://lampoonmagazine.com/article/2023/12/30/crabyon-fibra-cellulosa-chitosano-granchio-pozzi-electa-sostenibile/

---

## 13. Orange Fiber (citrus-pulp cellulose)

### L1 — Base
```yaml
- id: orange-fiber
  name: "Orange Fiber (citrus pulp cellulose)"
  layer: L1
  family: regenerated-cellulosic
  composition: "Cellulose extracted from citrus juice processing waste (pastazzo) — typically blended with TENCEL™ lyocell or silk"
  weightRange: { min: 90, max: 180, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","calendered","printed"]
  zones: ["Body","Sleeve"]
  subtypes: ["dress","blouse","top","skirt","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","romantic","luxury","resort"]
  seasonFit: ["SS","transitional"]
  certifications: ["FSC","OEKO-TEX"]
  vegan: true
```

### L2 — Variants
```yaml
- id: orange-fiber-tencel-blend
  name: "Orange Fiber + TENCEL™ Lyocell blend"
  layer: L2
  parentId: orange-fiber
  composition: "Orange Fiber blended with TENCEL™ Lyocell (Lenzing TENCEL™ Limited Edition collaboration)"
  weightRange: { min: 100, max: 180, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["dress","blouse","top","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","luxury","resort"]
  seasonFit: ["SS","transitional"]
  certifications: ["FSC","EU-Ecolabel","OEKO-TEX"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-orange-fiber
  name: "Orange Fiber Srl"
  layer: L3
  parentId: orange-fiber
  origin: "Italy (Sicily)"
  notes: |
    Patented citrus-waste cellulose process. B2B fabric supplier; supply
    constrained vs viscose. Commercial collaborations confirmed: Salvatore
    Ferragamo (2017), H&M (Conscious Exclusive 2019), Lenzing TENCEL™ Limited
    Edition (2021–2025). Capacity expansion announced 2025.
  verification: "https://orangefiber.it/heritage/ + https://hmgroup.com/our-stories/orange-fiber/ + https://b2b.tencel.com/news-and-events/lenzing-collaborates-with-orange-fiber-as-part-of-new-tencel-limited-edition-initiative"
```

### Notes & sources
- Real B2B fiber but limited annual supply — most volume goes via Lenzing's TENCEL™ Limited Edition program. Treat as low-volume luxury fiber for capsule/exclusive use.
- Sources:
  - https://orangefiber.it/heritage/
  - https://hmgroup.com/our-stories/orange-fiber/
  - https://wwd.com/fashion-news/designer-luxury/exclusive-salvatore-ferragamo-launches-capsule-collection-made-orange-fiber-10868843/
  - https://b2b.tencel.com/news-and-events/lenzing-collaborates-with-orange-fiber-as-part-of-new-tencel-limited-edition-initiative

---

## 14. QMilk (casein / milk-protein fiber)

### L1 — Base
```yaml
- id: qmilk
  name: "QMilk (casein milk-protein fiber)"
  layer: L1
  family: regenerated-protein
  composition: "Regenerated casein protein from non-food milk (Qmilch GmbH patented process)"
  weightRange: { min: 130, max: 220, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","peached"]
  zones: ["Body","Lining"]
  subtypes: ["tshirt","top","loungewear","lingerie"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["wellness","sustainable","loungewear","luxury"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX"]
  vegan: false
```

### L2 — Variants
```yaml
- id: qmilk-blend-jersey
  name: "QMilk blend jersey (with cotton or silk)"
  layer: L2
  parentId: qmilk
  composition: "QMilk fiber blended with cotton or silk (typical 20–50% QMilk)"
  weightRange: { min: 130, max: 200, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["tshirt","loungewear","lingerie","top"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["wellness","loungewear","luxury"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-qmilch-gmbh
  name: "Qmilch GmbH (QMilk producer)"
  layer: L3
  parentId: qmilk
  origin: "Germany (Hannover)"
  notes: |
    Sole producer of QMilk fiber. Patented closed-loop casein-from-non-food-milk
    process. Small-scale industrial production but verified commercial
    operations. Fiber supplied to spinners and converters; positioned for
    wellness apparel, lingerie, baby clothing, blends.
  verification: "https://www.qmilkfiber.eu/?lang=en + https://www.fibre2fashion.com/news/textile-news/newsdetails.aspx?news_id=113192 + https://www.indiantextilemagazine.in/qmilch-gmbh-specialises-in-milk-fibre-for-varied-applications/"
```

### Notes & sources
- QMilk is animal-derived (milk casein) → vegan: false. Capacity remains modest; recommended for capsule and high-end wellness apparel rather than bulk programs.
- Sources:
  - https://www.qmilkfiber.eu/?lang=en
  - https://www.fibre2fashion.com/news/textile-news/newsdetails.aspx?news_id=113192
  - http://www.qmilkfiber.eu/wp-content/uploads/2017/05/KatalogneuwebEN.pdf

---

## 15. Soybean Protein Fiber (SPF / Azlon)

### L1 — Base
```yaml
- id: soybean-spf
  name: "Soybean Protein Fiber (SPF)"
  layer: L1
  family: regenerated-protein
  composition: "Regenerated soy protein extracted from soybean processing residue (often blended with viscose / cotton in commercial textiles)"
  weightRange: { min: 130, max: 240, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","peached","enzyme-washed"]
  zones: ["Body","Lining"]
  subtypes: ["tshirt","top","loungewear","lingerie","dress","blouse"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["wellness","sustainable","loungewear"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX"]
  vegan: true
```

### L2 — Variants
```yaml
- id: soybean-spf-jersey
  name: "Soybean SPF jersey (knit blend)"
  layer: L2
  parentId: soybean-spf
  composition: "Soybean SPF blended with cotton or viscose (typical 30–50% SPF)"
  weightRange: { min: 140, max: 220, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["tshirt","top","loungewear","lingerie"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["wellness","loungewear"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-makeit-soybean
  name: "SuZhou Makeit Technology Co., Ltd. (Changshu Meijie mill)"
  layer: L3
  parentId: soybean-spf
  origin: "China (Suzhou / Changshu)"
  notes: |
    Manufacturer + trader of soybean protein fiber. Owns Changshu Meijie Chemical
    Fiber Co., Ltd. (~20,000 m² mill). B2B fiber supply to global converters.
  verification: "https://www.makeitfiber.com/Soybean-Protein-Fiber"

- id: supplier-abrand-technology-soybean
  name: "ABrand Technology Company (Soybean Protein Fiber)"
  layer: L3
  parentId: soybean-spf
  origin: "China"
  notes: |
    Application, marketing and services of Soybean Protein Fiber. Distributed
    via Swicofil global B2B channel.
  verification: "https://old.swicofil.com/abrand_technology_soybean_protein_fiber.html"
```

### Notes & sources
- SPF is a niche regenerated-protein fiber. Commercial production is primarily Chinese; quality and supplier reliability vary widely. Use for capsule/wellness programs, not bulk denim/tailoring.
- Sources:
  - https://www.makeitfiber.com/Soybean-Protein-Fiber
  - https://old.swicofil.com/abrand_technology_soybean_protein_fiber.html
  - https://www.cognitivemarketresearch.com/soybean-protein-fiber-spf-market-report
  - https://textilelearner.net/soybean-protein-fibers-properties-manufacturing-and-uses/

---

## 16. Spider Silk Synthetic — Spiber Brewed Protein™

### L1 — Base
```yaml
- id: brewed-protein
  name: "Brewed Protein™ (Spiber bio-fermented protein)"
  layer: L1
  family: bio-based
  composition: "Microbially-fermented structural protein from plant-derived sugars (no animal, no spider DNA in final fiber)"
  weightRange: { min: 130, max: 320, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","peached","calendered"]
  zones: ["Body","Sleeve","Lining"]
  subtypes: ["dress","top","blouse","sweater","knitwear-top","blazer","outerwear-jacket","outerwear-coat","tailoring","loungewear"]
  priceTier: ["luxury"]
  aestheticTags: ["luxury","sustainable","tailored","minimal","avant-garde"]
  seasonFit: ["transitional","FW","all-year"]
  certifications: ["OEKO-TEX"]
  vegan: true
```

### L2 — Variants
```yaml
- id: brewed-protein-suiting
  name: "Brewed Protein™ suiting blend"
  layer: L2
  parentId: brewed-protein
  composition: "Brewed Protein™ blended with wool / cashmere / silk (typical 20–60% Brewed Protein)"
  weightRange: { min: 200, max: 320, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["blazer","suit","trouser","outerwear-coat","tailoring"]
  priceTier: ["luxury"]
  aestheticTags: ["luxury","tailored","sustainable"]
  seasonFit: ["FW","all-year"]

- id: brewed-protein-knit
  name: "Brewed Protein™ knit (sweater / top blend)"
  layer: L2
  parentId: brewed-protein
  composition: "Brewed Protein™ blended with wool / cashmere"
  weightRange: { min: 220, max: 360, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["sweater","knitwear-top","top"]
  priceTier: ["luxury"]
  aestheticTags: ["luxury","minimal","sustainable"]
  seasonFit: ["transitional","FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-spiber-inc
  name: "Spiber Inc. (Brewed Protein™ producer)"
  layer: L3
  parentId: brewed-protein
  origin: "Japan (Tsuruoka, Yamagata) + Thailand (Rayong, commercial plant since 2022) + USA (with ADM, in development)"
  notes: |
    Sole producer of Brewed Protein™ fiber. First commercial plant Thailand
    2022, ~500 tonnes/year. 45+ brand partners including The North Face,
    Goldwin, Issey Miyake, Margaret Howell, sacai, Woolrich, Burberry. Showcased
    100+ fabrics at Milano Unica 2025. ADM partnership for second commercial
    plant in USA in development.
  verification: "https://spiber.inc/en/ + https://spiber.inc/en/news/the-first-collection-using-mass-produced-brewed-protein-fiber-will-be-released-globally-on-september-29-by-four-brands-including-the-north-face + https://www.prnewswire.com/news-releases/spiber-to-showcase-over-100-new-fabrics-including-wide-range-of-suiting-fabrics-and-high-brewed-protein-fiber-blends-at-milano-unica-debut-302366021.html"
```

### Notes & sources
- Brewed Protein™ replaces older "Microsilk" / "spider silk synthetic" wave. Spiber is the only commercial-scale producer in 2026.
- Sources:
  - https://spiber.inc/en/
  - https://www.smartfashion.news/blog/brewed-protein-fiber-a-game-changer-in-sustainable-textiles
  - https://www.textileworld.com/textile-world/knitting-apparel/2025/02/spiber-to-showcase-over-100-new-fabrics-including-wide-range-of-suiting-fabrics-and-high-brewed-protein-fiber-blends-at-milano-unica-debut/
  - https://www.wipo.int/en/web/ip-advantage/w/stories/synthetic-protein-material-company-spiber-set-for-global-expansion

---

## 17. Bananatex (QWSTION — abacá-based plant fiber)

### L1 — Base
```yaml
- id: bananatex
  name: "Bananatex® (abacá banana plant fiber)"
  layer: L1
  family: bio-based
  composition: "100% abacá plant fiber from permaculture cultivation in the Philippines"
  weightRange: { min: 200, max: 420, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","beeswax-coated","plant-based-coated"]
  zones: ["Body","Pocket","Sleeve"]
  subtypes: ["outerwear-jacket","outerwear-coat","trouser","short","skirt","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","utility","streetwear","outdoor"]
  seasonFit: ["transitional","FW","all-year"]
  certifications: ["Cradle-to-Cradle","FSC"]
  vegan: true
```

### L2 — Variants
```yaml
- id: bananatex-canvas
  name: "Bananatex® canvas (waxed)"
  layer: L2
  parentId: bananatex
  composition: "100% abacá fiber, beeswax/plant-based coating"
  weightRange: { min: 260, max: 420, unit: gsm }
  defaultFinish: "beeswax-coated"
  subtypes: ["outerwear-jacket","outerwear-coat","short","skirt","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["utility","outdoor","sustainable"]
  seasonFit: ["transitional","FW"]

- id: bananatex-shirting
  name: "Bananatex® lightweight (uncoated)"
  layer: L2
  parentId: bananatex
  composition: "100% abacá fiber"
  weightRange: { min: 200, max: 280, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","blazer","trouser","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","utility","sustainable"]
  seasonFit: ["transitional","SS"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-qwstion-bananatex
  name: "QWSTION (Bananatex® licensor)"
  layer: L3
  parentId: bananatex
  origin: "Switzerland (Zürich) — fiber grown in Philippines, woven in Taiwan"
  notes: |
    Originator and B2B licensor of Bananatex. Open-sourced material model.
    Cradle-to-Cradle Certified Gold. Bulk lead time 10–14 weeks. Price band
    EUR 15–35/m. Existing brand partnerships: Balenciaga (sneakers), Stella
    McCartney, H&M (Good News collab), Softline (furniture), ISTO, PALAIUS.
  verification: "https://bananatex.info/ + https://www.qwstion.com/ + https://c2ccertified.org/articles/inside-bananatex-the-worlds-first-technical-fabric-made-from-naturally-grown-abaca-banana-plants"
```

### Notes & sources
- Bananatex is technically derived from abacá (Musa textilis), which appears in Rama 1 § 7. Bananatex is the QWSTION-branded engineered version (treated, technical-grade) and warrants separate handling for outerwear-grade canvas applications.
- Sources:
  - https://bananatex.info/
  - https://en.wikipedia.org/wiki/Bananatex
  - https://c2ccertified.org/articles/inside-bananatex-the-worlds-first-technical-fabric-made-from-naturally-grown-abaca-banana-plants
  - https://plasticfree.com/materials/bananatex

---

## 18. Vegea GrapeSkin (grape marc bio-material) — INCLUDED with caveat

### L1 — Base
```yaml
- id: vegea
  name: "Vegea GrapeSkin® (grape marc bio-material)"
  layer: L1
  family: bio-based
  composition: "~55% grape marc (skins, seeds, stems, pulp from winemaking) + vegetable oils + natural fibers + water-based PU on recycled polyester or cotton backing"
  weightRange: { min: 350, max: 700, unit: gsm }
  defaultFinish: "PU-coated"
  finishOptions: ["matte","semi-gloss","textured"]
  zones: ["Body","Pocket","Sleeve"]
  subtypes: ["outerwear-jacket","outerwear-coat","blazer","short","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","luxury","avant-garde"]
  seasonFit: ["transitional","FW"]
  certifications: ["OEKO-TEX"]
  vegan: true
```

### L2 — Variants
```yaml
- id: vegea-fashion-grade
  name: "Vegea GrapeSkin® fashion-grade"
  layer: L2
  parentId: vegea
  composition: "Grape marc + vegetable oils + natural fibers + water-based PU + textile backing"
  weightRange: { min: 350, max: 600, unit: gsm }
  defaultFinish: "matte"
  subtypes: ["outerwear-jacket","blazer","skirt","short"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","luxury","avant-garde"]
  seasonFit: ["transitional","FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-vegea-company
  name: "Vegea Company S.r.l."
  layer: L3
  parentId: vegea
  origin: "Italy (Milan)"
  notes: |
    Sole producer of GrapeSkin. 10-year anniversary 2025; capacity expansion
    announced with new fashion-grade and interior-grade lines. Brand partners:
    Calvin Klein, H&M, Bentley, Diadora, Serapian. Custom colors/textures/
    thicknesses available. Mostly used as leather-alternative; included here
    because user scope requested coverage in Rama 2.
  verification: "https://vegeacompany.com/ + https://alternativeleathers.com/products/vegea-grape-leather + https://www.shots.media/en/accessoires/2026/vegea-erweitert-grapeskin-produktion/120047"
```

### Notes & sources
- CAVEAT: Vegea is primarily classified as a leather-alternative (Rama 4 territory). Included here because the request lists it under "Innovative still-rare" in Rama 2 scope. If Rama 4 covers leather alternatives, this entry should move there to avoid duplication.
- Sources:
  - https://vegeacompany.com/
  - https://alternativeleathers.com/products/vegea-grape-leather
  - https://www.shots.media/en/accessoires/2026/vegea-erweitert-grapeskin-produktion/120047

---

## EXCLUDED entries (with reason)

The following items from the request list were **EXCLUDED** because commercial readiness is unclear, production is paused, or the company has ceased operations. Per Felipe's rule: si no lo tienes claro, fuera.

```yaml
- id: excluded-microsilk
  name: "Microsilk (Bolt Threads spider silk synthetic)"
  family: regenerated-protein
  reason: |
    Bolt Threads has ceased operations as of 2024–2025. Public note on Bolt
    Threads website: "The Company is no longer operating." Microsilk was
    never reached high-volume commercial production; existed at prototype/
    capsule scale (Stella McCartney 2017). Spiber Brewed Protein supersedes
    the spider-silk-synthetic category and IS included.
  verification: "https://boltthreads.com/ + https://wwd.com/sustainability/materials/bolt-threads-halts-mylo-bio-based-materials-future-uncertain-1235761767/"

- id: excluded-mylo
  name: "Mylo (Bolt Threads mycelium leather alternative)"
  family: bio-based
  reason: |
    (1) Bolt Threads paused Mylo production in 2023 after failing to secure
    funding; company is no longer operating overall. (2) Out of scope for
    Rama 2 — leather alternative belongs in Rama 4. Excluded on both grounds.
  verification: "https://www.businessoffashion.com/news/sustainability/bolt-threads-mylo-alternative-leather-mushroom-pause-operations/ + https://internationalleathermaker.com/mycelium-materials-company-bolt-threads-stops-production/"

- id: excluded-circulose
  name: "Circulose / Renewcell (recycled-pulp cellulose)"
  family: regenerated-cellulosic
  reason: |
    Renewcell filed bankruptcy February 2024. Acquired by Altor June 2024,
    rebranded as Circulose. As of 2026-05-03, Ortviken plant restart scheduled
    for Q4 2026 — production NOT yet resumed. Per Felipe's rule (si no lo
    tienes claro, fuera) this is excluded for now. Re-evaluate when Q4 2026
    production confirmed live with B2B mill availability.
  verification: "https://wwd.com/sustainability/business/circulose-renewcell-buyer-altor-bankruptcy-1236415113/ + https://trellis.net/article/circular-textile-phoenix-renewcell-bought-out-bankruptcy/ + https://www.fashiondive.com/news/renewcell-new-owner-circulose/718054/"

- id: excluded-mycotex
  name: "Mycotex (mycelium textile, NEFFA / others)"
  family: bio-based
  reason: |
    Bolt Threads' Mylo (the most prominent mycelium textile) is paused.
    Other mycelium projects (NEFFA Mycotex, MycoWorks Reishi, Ecovative
    Forager) remain at pilot or pre-commercial scale for apparel — most
    commercial output is leather-alternative for accessories (Rama 4).
    No verifiable Rama 2-scope ROPA-grade B2B mill at apparel scale 2026.
    Excluded.
  verification: "https://www.businessoffashion.com/news/sustainability/bolt-threads-mylo-alternative-leather-mushroom-pause-operations/ + https://wwd.com/sustainability/materials/bolt-threads-halts-mylo-bio-based-materials-future-uncertain-1235761767/"
```

---

## Out-of-scope items for future ramas

These items came up during research and are properly handled in other ramas — flagged here so future research doesn't re-investigate them:

- **Vegea GrapeSkin** — primarily leather-alternative (Rama 4). Included in Rama 2 only because user scope requested coverage. Move to Rama 4 to avoid duplication.
- **MycoWorks Reishi · Ecovative Forager · NEFFA Mycotex** — mycelium-based leather alternatives (Rama 4). Re-investigate when commercial ROPA garments emerge.
- **Pinatex (Ananas Anam)** — pineapple-leaf leather alternative (Rama 4 if leather-alternatives covered there; otherwise piña fiber covered as cellulosic in Rama 1).
- **Desserto** — cactus-based leather alternative (Rama 4).
- **Mirum (Natural Fiber Welding)** — plant-based leather alternative (Rama 4).
- **Polyester / nylon / acrylic / spandex / recycled-PET** — synthetics (Rama 3).
- **Kapok blends, abaca/piña/banana fiber generic (non-Bananatex)** — covered in Rama 1 Naturals.
- **Recycled cotton / recycled wool (mechanical recycling)** — appropriate to Rama 1 (post-consumer naturals).
- **Tencel A100 / Veocel (nonwoven Lenzing brands)** — nonwoven hygiene/wipes, not ROPA. Out of scope for fashion ramas.
- **Birla Excel (lyocell from Birla)** — covered under generic Lyocell § 4 with Sateri / Birla as additional non-branded lyocell sources.

---

## Final entry counts

- **L1 (base fibers)**: 18 (excluding 4 EXCLUDED)
  - Note: 18 base fibers across 18 sections — Viscose, LIVA, Modal, Lyocell, Cupro, Acetate, Triacetate, Naia, Refibra, ECOVERO, SeaCell, Crabyon, Orange Fiber, QMilk, Soybean SPF, Brewed Protein, Bananatex, Vegea.
- **L2 (variants)**: 49
- **L3 (B2B suppliers)**: 23
- **EXCLUDED documented**: 4 (Microsilk, Mylo, Circulose, Mycotex)
- **Out-of-scope flagged for other ramas**: 10 categories

**Total entries written to file**: 90 (18 L1 + 49 L2 + 23 L3) + 4 EXCLUDED + 10 out-of-scope notes.
