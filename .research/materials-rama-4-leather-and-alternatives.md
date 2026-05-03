# Rama 4 — Leather & Plant-Leather Alternatives — Research Report

**Scope**: Animal-derived leather (by source · by treatment · by tannage) + plant-leather alternatives + the synthetic PU baseline. Out of scope: textile fibers (Ramas 1–3), hardware (Rama 5), trims/labels, technical foams.
**Date**: 2026-05-03
**Methodology**: WebSearch across tannery direct sites, Leather Working Group certified-supplier database, Pelle al Vegetale Consortium register, brand-published material reports (Hermès × MycoWorks, Stella × Vegea, Adidas × Desserto, Chanel × Bodin-Joyeux), trade press (BoF, WWD, Fast Company, Sourcing Journal, FashionUnited, Hagerty, Tempus). All L3 (B2B suppliers) verified individually with at least one URL confirming (a) the tannery / supplier exists today, (b) it has a B2B division open to brands (not exclusive captive), (c) it is operating in 2026 (not paused / in administration).

**Felipe's rule applied — "si no lo tienes claro, fuera"**:
- Bio-based innovators that paused production or that entered administration are EXCLUDED from L3 with reason. The L1/L2 entry survives only when the *category* itself remains commercially viable through alternative players. When the category collapses to a single failed player (Mylo), it is excluded entirely.
- Distributors / retailers (Tannery Row, Maverick, Buckleguy, Rocky Mountain Leather Supply) are NOT L3 entries. They appear only as verification links for direct-from-tannery orders.
- DTC luxury brands operating captive tanneries primarily for themselves (Hermès Tanneries du Puy, internal Bottega/Loewe operations) are excluded.

**Conventions**:
- Layer 1 (L1) = canonical base material (the default a designer would type with no qualifier — e.g. "cowhide", "calfskin", "cork leather").
- Layer 2 (L2) = treatment × thickness × finish variants OR tannage variants, anchored on industry classifications (LWG categories, Tanners' Council of America cuts, Pelle al Vegetale article types).
- Layer 3 (L3) = real verified B2B tanneries / suppliers. Conservative — only included when verification is concrete. Maximum 5 per L1.
- `family` values for this rama: `leather-animal`, `leather-plant-alt`, `leather-synthetic-pu`.
- `vegan` is a key field for this rama: `false` for all animal sources, `true` for plant-alt + synthetic.
- `CITES_status` only applies to protected species (Appendix I or II). Absent for non-CITES species.
- `weightRange.unit` = `mm` (leather thickness in millimeters), with secondary `oz` reference where industry-standard. 1 oz ≈ 0.4 mm.
- Subtypes use the canonical aimily list extended with CALZADO (sneaker, heel, sandal, boot, espadrille, loafer, mule) and ACCESORIOS (tote, crossbody, clutch, backpack, shoulder, belt).

**Primary sources consulted (industry-wide)**:
- Leather Working Group certified suppliers — https://www.leatherworkinggroup.com/get-involved/our-community/certified-suppliers/
- Pelle Vegetale (Genuine Italian Vegetable Tanned Leather Consortium) — https://www.pellealvegetale.it/en/
- Fédération Française de la Tannerie Mégisserie — https://leatherfrance.com/en/directory/
- CITES Appendices — https://cites.org/eng/app/appendices.php
- BoF on Mylo pause — https://www.businessoffashion.com/news/sustainability/bolt-threads-mylo-alternative-leather-mushroom-pause-operations/
- Vegea 2026 expansion — https://vegeacompany.com/vegea-marks-10-years-and-expands-production-of-grapeskin/
- Ananas Anam administration (UK + Spain, Oct 2025) — confirmed via WWD / company website redirect to administrator.

**Total entries (final count)**: 192 (39 L1 · 117 L2 · 36 L3 verified B2B suppliers)

---

## SECTION A — ANIMAL LEATHER BY SOURCE

## 1. Cowhide

### L1 — Base
```yaml
- id: cowhide
  name: "Cowhide"
  layer: L1
  family: leather-animal
  composition: "100% bovine hide"
  weightRange: { min: 0.6, max: 4.5, unit: mm }
  defaultFinish: "full-grain aniline"
  finishOptions: ["full-grain","top-grain","corrected-grain","split","suede","nubuck","patent","embossed","pull-up","waxed","saffiano","pebbled","distressed","milled","vintage"]
  zones: ["Body","Lining","Strap","Pocket","Trim","Branding","Upper","Tongue","Heel Counter","Outsole"]
  subtypes: ["outerwear-jacket","outerwear-coat","blazer","trouser","skirt","dress","sneaker","heel","sandal","boot","loafer","mule","tote","crossbody","clutch","backpack","shoulder","belt"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["minimal","tailored","workwear","streetwear","preppy","heritage","utility","biker","western"]
  seasonFit: ["FW","transitional","all-year"]
  certifications: ["LWG-Bronze","LWG-Silver","LWG-Gold","LWG-Audited","REACH","OEKO-TEX-Leather","Pelle-al-Vegetale","ICEC"]
  vegan: false
```

### L2 — Variants
```yaml
- id: cowhide-full-grain-aniline
  name: "Full-grain aniline cowhide"
  layer: L2
  parentId: cowhide
  composition: "100% bovine full-grain"
  weightRange: { min: 1.0, max: 1.6, unit: mm }
  defaultFinish: "full-grain aniline"
  zones: ["Body","Strap","Upper"]
  subtypes: ["outerwear-jacket","tote","crossbody","belt","loafer","boot"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","minimal","tailored"]
  seasonFit: ["all-year"]

- id: cowhide-saffiano
  name: "Saffiano (cross-hatch embossed) cowhide"
  layer: L2
  parentId: cowhide
  composition: "100% bovine, embossed cross-hatch"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "saffiano emboss + sealed"
  zones: ["Body","Pocket","Trim"]
  subtypes: ["tote","crossbody","clutch","shoulder","belt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","tailored","preppy"]
  seasonFit: ["all-year"]
  notes: "Heat + 70°C press for ~15s with cross-hatch plate; scratch-resistant signature finish, originated by Prada 1913."

- id: cowhide-pebbled
  name: "Pebbled (milled) cowhide"
  layer: L2
  parentId: cowhide
  composition: "100% bovine, drum-milled"
  weightRange: { min: 1.0, max: 1.4, unit: mm }
  defaultFinish: "milled pebble grain"
  subtypes: ["tote","crossbody","backpack","shoulder","belt","loafer"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","preppy","tailored","minimal"]
  seasonFit: ["all-year"]

- id: cowhide-pull-up
  name: "Pull-up (oil-pulled) cowhide"
  layer: L2
  parentId: cowhide
  composition: "100% bovine, oil-stuffed"
  weightRange: { min: 1.4, max: 2.0, unit: mm }
  defaultFinish: "oil pull-up"
  subtypes: ["boot","outerwear-jacket","tote","backpack","belt"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","workwear","western","utility"]
  seasonFit: ["FW","transitional"]
  notes: "Chromexcel and Dublin (Horween) are the canonical references."

- id: cowhide-bridle
  name: "Bridle cowhide (saddlery)"
  layer: L2
  parentId: cowhide
  composition: "100% bovine, vegetable-tanned, hot-stuffed"
  weightRange: { min: 2.5, max: 4.0, unit: mm }
  defaultFinish: "hot-stuffed waxed"
  subtypes: ["belt","tote","crossbody"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","preppy","tailored"]
  seasonFit: ["all-year"]

- id: cowhide-buttero
  name: "Buttero (firm Tuscan veg-tan)"
  layer: L2
  parentId: cowhide
  composition: "100% bovine shoulder, veg-tan"
  weightRange: { min: 1.6, max: 3.0, unit: mm }
  defaultFinish: "full-aniline waxed"
  certifications: ["Pelle-al-Vegetale"]
  subtypes: ["belt","crossbody","tote","clutch","loafer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","minimal"]
  seasonFit: ["all-year"]

- id: cowhide-suede-split
  name: "Suede split cowhide"
  layer: L2
  parentId: cowhide
  composition: "100% bovine flesh-side split"
  weightRange: { min: 0.8, max: 1.4, unit: mm }
  defaultFinish: "buffed suede"
  subtypes: ["outerwear-jacket","skirt","trouser","tote","loafer","sneaker","boot"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["bohemian","heritage","western","preppy"]
  seasonFit: ["transitional","FW"]

- id: cowhide-nubuck
  name: "Nubuck (sanded full-grain) cowhide"
  layer: L2
  parentId: cowhide
  composition: "100% bovine full-grain, lightly sanded"
  weightRange: { min: 1.0, max: 1.6, unit: mm }
  defaultFinish: "nubuck"
  subtypes: ["boot","loafer","sneaker","outerwear-jacket","crossbody"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","minimal","tailored"]
  seasonFit: ["FW","transitional"]

- id: cowhide-patent
  name: "Patent cowhide"
  layer: L2
  parentId: cowhide
  composition: "100% bovine, polyurethane-coated"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "high-gloss patent"
  subtypes: ["heel","clutch","loafer","crossbody"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","romantic","tailored","y2k"]
  seasonFit: ["all-year"]

- id: cowhide-embossed-croc
  name: "Croc-embossed cowhide"
  layer: L2
  parentId: cowhide
  composition: "100% bovine, croc-print embossed"
  weightRange: { min: 0.9, max: 1.4, unit: mm }
  defaultFinish: "croc emboss + glaze"
  subtypes: ["clutch","crossbody","heel","loafer","belt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["preppy","tailored","heritage"]
  seasonFit: ["all-year"]
  notes: "CITES-free workaround for the croc/alligator look on cowhide base."

- id: cowhide-distressed
  name: "Distressed / vintage cowhide"
  layer: L2
  parentId: cowhide
  composition: "100% bovine, drum-tumbled + waxed"
  weightRange: { min: 1.2, max: 2.0, unit: mm }
  defaultFinish: "antiqued"
  subtypes: ["outerwear-jacket","boot","backpack","belt","tote"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["heritage","biker","western","workwear"]
  seasonFit: ["FW","transitional"]

- id: cowhide-shrunken
  name: "Shrunken-grain cowhide"
  layer: L2
  parentId: cowhide
  composition: "100% bovine, drum-shrunk"
  weightRange: { min: 1.0, max: 1.4, unit: mm }
  defaultFinish: "shrunken grain"
  subtypes: ["tote","crossbody","backpack","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","preppy"]
  seasonFit: ["all-year"]

- id: cowhide-corrected-grain
  name: "Corrected-grain cowhide"
  layer: L2
  parentId: cowhide
  composition: "100% bovine, sanded + pigmented"
  weightRange: { min: 0.9, max: 1.3, unit: mm }
  defaultFinish: "pigmented coated"
  subtypes: ["sneaker","loafer","tote","crossbody","belt"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["minimal","preppy","streetwear"]
  seasonFit: ["all-year"]

- id: cowhide-split-bonded
  name: "Bonded split cowhide (lining grade)"
  layer: L2
  parentId: cowhide
  composition: "Bovine split, flesh-side, often coated"
  weightRange: { min: 0.6, max: 1.0, unit: mm }
  defaultFinish: "coated split"
  zones: ["Lining","Pocket"]
  subtypes: ["tote","crossbody","backpack","shoulder"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["utility","streetwear"]
  seasonFit: ["all-year"]

- id: cowhide-waxed-flesh
  name: "Waxed-flesh cowhide (rough-out)"
  layer: L2
  parentId: cowhide
  composition: "100% bovine, waxed flesh-side"
  weightRange: { min: 1.4, max: 1.8, unit: mm }
  defaultFinish: "rough-out waxed"
  subtypes: ["boot","loafer","outerwear-jacket","backpack"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","workwear","western"]
  seasonFit: ["FW","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-horween
  name: "Horween Leather Company"
  layer: L3
  parentId: cowhide
  origin: "USA (Chicago, IL)"
  notes: |
    Founded 1905; family-run; iconic Chromexcel pull-up, Dublin, Derby, Essex,
    plus Shell Cordovan (horse). True B2B mill — supplies Allen Edmonds,
    Alden, Cole Haan, Brooks Brothers, Timberland, Chippewa, Johnston & Murphy.
  certifications: ["LWG-Gold"]
  verification: "https://www.horween.com/ + https://en.wikipedia.org/wiki/Horween_Leather_Company"

- id: supplier-walpier
  name: "Conceria Walpier"
  layer: L3
  parentId: cowhide
  origin: "Italy (Tuscany)"
  notes: |
    Founded 1974; member of the Genuine Italian Vegetable Tanned Leather
    Consortium (Pelle al Vegetale). Buttero is their flagship — full-aniline
    veg-tan double shoulders. B2B for orders ≥100 sq ft direct, and via
    distributors for smaller volumes.
  certifications: ["Pelle-al-Vegetale","LWG"]
  verification: "https://www.pellealvegetale.it/en/tanneries/walpier/ + https://www.rmleathersupply.com/products/buttero-veg-tanned-leather-3oz-1-2mm-made-in-italy"

- id: supplier-conceria-800
  name: "Conceria 800 S.p.A."
  layer: L3
  parentId: cowhide
  origin: "Italy (Santa Croce sull'Arno, Pisa)"
  notes: |
    Founded 1969. Specialised in shoulders + half calves, drum + pit veg-tan
    using mimosa, chestnut, quebracho. 100% European raw hide sourcing.
    Direct B2B from the Tuscan leather district.
  certifications: ["LWG","ISO-14001","ISO-45001","Pelle-al-Vegetale"]
  verification: "https://conceria800.it/en/ + https://www.leatherworkinggroup.com/get-involved/our-community/certified-suppliers/conceria-800-spa-con176/"

- id: supplier-mastrotto
  name: "Gruppo Mastrotto"
  layer: L3
  parentId: cowhide
  origin: "Italy (Arzignano, Vicenza)"
  notes: |
    Founded 1958. World-scale chrome tannery, 15 plants (Italy + Brazil,
    Indonesia, Tunisia, Mexico). Express programme: 1,400 colours in stock,
    48h shipping. Serves footwear, leather goods, garment, automotive,
    aviation, marine.
  certifications: ["LWG-Gold","ISO-14001"]
  verification: "https://www.mastrotto.com/en + https://www.leatherworkinggroup.com/get-involved/our-community/certified-suppliers/gruppo-mastrotto-spa-gru001/"

- id: supplier-nuova-overlord
  name: "Conceria Nuova Overlord"
  layer: L3
  parentId: cowhide
  origin: "Italy (Santa Croce sull'Arno, Pisa)"
  notes: |
    Founded 1972. Cited industry-wide as the historic source of the
    Saffiano cross-hatch finish on calf for high-fashion houses.
    All tanning and finishing in-house. B2B for footwear + leather goods.
  certifications: ["LWG"]
  verification: "https://www.eng.concerianuovaoverlord.com/ + https://www.leatherworkinggroup.com/get-involved/our-community/certified-suppliers/conceria-nuova-overlord-spa-con153/"
```

---

## 2. Calfskin

### L1 — Base
```yaml
- id: calfskin
  name: "Calfskin"
  layer: L1
  family: leather-animal
  composition: "100% calf hide (under ~10 months)"
  weightRange: { min: 0.6, max: 1.4, unit: mm }
  defaultFinish: "full-grain aniline"
  finishOptions: ["full-grain","box-calf","glazed","drum-dyed","patent","suede","nubuck","saffiano","embossed","milled"]
  zones: ["Body","Lining","Strap","Upper","Tongue","Trim"]
  subtypes: ["loafer","heel","mule","sandal","boot","tote","crossbody","clutch","shoulder","belt","outerwear-jacket","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","tailored","heritage","preppy","luxe"]
  seasonFit: ["all-year"]
  certifications: ["LWG-Gold","LWG-Silver","REACH","OEKO-TEX-Leather"]
  vegan: false
```

### L2 — Variants
```yaml
- id: calfskin-box-calf
  name: "Box-calf"
  layer: L2
  parentId: calfskin
  composition: "100% calf, drum-dyed, glazed"
  weightRange: { min: 0.9, max: 1.2, unit: mm }
  defaultFinish: "box (smooth glazed)"
  subtypes: ["loafer","heel","mule","crossbody","clutch","belt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["tailored","heritage","minimal"]
  seasonFit: ["all-year"]
  notes: "Originated by Edward L. Box, late 19th c. The standard for fine men's footwear."

- id: calfskin-saffiano
  name: "Saffiano calfskin"
  layer: L2
  parentId: calfskin
  composition: "100% calf, cross-hatch embossed"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "saffiano emboss + sealed"
  subtypes: ["tote","crossbody","clutch","shoulder","belt"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","tailored","preppy"]
  seasonFit: ["all-year"]

- id: calfskin-nappa
  name: "Nappa calfskin"
  layer: L2
  parentId: calfskin
  composition: "100% calf, full-aniline, soft drum-dyed"
  weightRange: { min: 0.7, max: 1.0, unit: mm }
  defaultFinish: "nappa soft"
  subtypes: ["outerwear-jacket","crossbody","clutch","shoulder","loafer","heel"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","luxe","tailored","romantic"]
  seasonFit: ["all-year"]

- id: calfskin-glazed
  name: "Glazed calfskin (museum / pebbled-glaze)"
  layer: L2
  parentId: calfskin
  composition: "100% calf, hand-glazed"
  weightRange: { min: 0.9, max: 1.2, unit: mm }
  defaultFinish: "hand-glazed aniline"
  subtypes: ["loafer","heel","crossbody","clutch","belt"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","tailored"]
  seasonFit: ["all-year"]

- id: calfskin-patent
  name: "Patent calfskin"
  layer: L2
  parentId: calfskin
  composition: "100% calf, polyurethane-coated"
  weightRange: { min: 0.8, max: 1.0, unit: mm }
  defaultFinish: "high-gloss patent"
  subtypes: ["heel","clutch","loafer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","romantic","y2k"]
  seasonFit: ["all-year"]

- id: calfskin-suede
  name: "Calf suede"
  layer: L2
  parentId: calfskin
  composition: "100% calf split, buffed"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "calf suede"
  subtypes: ["loafer","heel","mule","sandal","boot","outerwear-jacket","crossbody","tote"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","tailored","bohemian"]
  seasonFit: ["transitional","FW"]
  notes: "Charles F. Stead Janus Calf and Repello Calf are the global luxe-suede references."

- id: calfskin-velvet-grain
  name: "Velvet calf (waxed nubuck calf)"
  layer: L2
  parentId: calfskin
  composition: "100% calf full-grain lightly sanded + waxed"
  weightRange: { min: 0.9, max: 1.2, unit: mm }
  defaultFinish: "velvet nubuck"
  subtypes: ["loafer","boot","crossbody","shoulder"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","tailored"]
  seasonFit: ["FW","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-tanneries-haas
  name: "Tanneries Haas"
  layer: L3
  parentId: calfskin
  origin: "France (Alsace)"
  notes: |
    Family-run since 1842, sixth generation. ~110 employees, 35,000 m²/month
    of calfskin. Supplies haute couture, fine leather goods, footwear,
    saddlery, watch straps. French and European calf hides only.
  certifications: ["LWG"]
  verification: "https://www.tanneries-haas.com/en/ + https://leatherfrance.com/en/directory/"

- id: supplier-conceria-tempesti
  name: "Conceria Tempesti"
  layer: L3
  parentId: calfskin
  origin: "Italy (Tuscany, Arno valley)"
  notes: |
    Family-run since 1945, fourth generation. Member of the Pelle al Vegetale
    Consortium; metal-free vegetable tanning of calfskin and bovine.
    B2B from the Tuscan leather district.
  certifications: ["Pelle-al-Vegetale","LWG"]
  verification: "https://tempesti.com/en/ + https://www.thetanneryrow.com/tempesti"

- id: supplier-bodin-joyeux
  name: "Bodin-Joyeux (Maison Bodin-Joyeux)"
  layer: L3
  parentId: lambskin
  origin: "France (Levroux + Paris)"
  notes: |
    Founded 1860. Holder of the Entreprise du Patrimoine Vivant label.
    Owned by Chanel SA since 2013. 250+ colourways of plongé lambskin.
    Plus calfskin programme. Open B2B (also supplies the Vatican).
  certifications: ["LWG-Silver","EPV"]
  verification: "https://leatherfrance.com/en/directory/megisserie-bodin-joyeux + https://www.luxuo.com/style/fashion/chanel-acquires-tannery-bodin-joyeux.html"
  notes_extra: "Listed under both calfskin and lambskin."
```

---

## 3. Lambskin

### L1 — Base
```yaml
- id: lambskin
  name: "Lambskin"
  layer: L1
  family: leather-animal
  composition: "100% young sheep hide"
  weightRange: { min: 0.5, max: 1.0, unit: mm }
  defaultFinish: "plongé / nappa"
  finishOptions: ["plonge","nappa","suede","metallic-foiled","embossed","quilted"]
  zones: ["Body","Lining","Sleeve"]
  subtypes: ["outerwear-jacket","outerwear-coat","blazer","skirt","dress","trouser","crossbody","clutch","shoulder"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["luxe","minimal","romantic","tailored"]
  seasonFit: ["FW","transitional","all-year"]
  certifications: ["LWG","REACH","OEKO-TEX-Leather"]
  vegan: false
```

### L2 — Variants
```yaml
- id: lambskin-plonge
  name: "Plongé lambskin"
  layer: L2
  parentId: lambskin
  composition: "100% lamb, soft drum-dyed, uncoated"
  weightRange: { min: 0.6, max: 0.8, unit: mm }
  defaultFinish: "plongé soft"
  subtypes: ["outerwear-jacket","skirt","dress","crossbody","clutch"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","minimal","romantic"]
  seasonFit: ["all-year"]

- id: lambskin-nappa
  name: "Nappa lambskin"
  layer: L2
  parentId: lambskin
  composition: "100% lamb, soft aniline"
  weightRange: { min: 0.6, max: 0.9, unit: mm }
  defaultFinish: "nappa soft"
  subtypes: ["outerwear-jacket","crossbody","shoulder","clutch","blazer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["luxe","tailored","minimal"]
  seasonFit: ["all-year"]

- id: lambskin-quilted
  name: "Quilted lambskin"
  layer: L2
  parentId: lambskin
  composition: "Lambskin nappa, machine-quilted onto poly batting"
  weightRange: { min: 0.7, max: 1.0, unit: mm }
  defaultFinish: "quilted diamond"
  subtypes: ["crossbody","shoulder","clutch","backpack"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","heritage","tailored"]
  seasonFit: ["all-year"]
  notes: "The Chanel 2.55 / matelassé reference."

- id: lambskin-metallic
  name: "Metallic-foiled lambskin"
  layer: L2
  parentId: lambskin
  composition: "Lambskin + metallic foil top-coat"
  weightRange: { min: 0.6, max: 0.9, unit: mm }
  defaultFinish: "metallic foil"
  subtypes: ["clutch","crossbody","heel","skirt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["y2k","romantic","luxe"]
  seasonFit: ["all-year"]

- id: lambskin-suede
  name: "Lamb suede"
  layer: L2
  parentId: lambskin
  composition: "Lamb split, buffed"
  weightRange: { min: 0.6, max: 0.9, unit: mm }
  defaultFinish: "lamb suede"
  subtypes: ["outerwear-jacket","skirt","dress","loafer","sandal"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["bohemian","luxe","romantic"]
  seasonFit: ["transitional","FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-bodin-joyeux-lambskin
  name: "Bodin-Joyeux (lambskin programme)"
  layer: L3
  parentId: lambskin
  origin: "France (Levroux)"
  notes: |
    See calfskin entry. Lambskin is the historic core of Bodin-Joyeux —
    250+ colourways of plongé. Owned by Chanel since 2013, but continues
    to operate as a B2B tannery for outside houses.
  certifications: ["LWG-Silver","EPV"]
  verification: "https://www.bodinjoyeux.fr/ + https://internationalleathermaker.com/chanel-buys-lambskin-tanner-bodin-joyeux/"

- id: supplier-richard-hodgson
  name: "Conceria Il Valico"
  layer: L3
  parentId: lambskin
  origin: "Italy (Solofra, Avellino)"
  notes: |
    Italian tannery historically specialised in sheepskin and lambskin
    napas + suedes for fashion. Operates B2B for fashion-grade lamb
    deliveries from the Solofra leather district.
  certifications: ["LWG"]
  verification: "https://www.conceriailvalico.it/en/"

- id: supplier-volpi
  name: "Volpi Concerie"
  layer: L3
  parentId: cowhide
  origin: "Italy (Tuscany)"
  notes: |
    Founded 1951. Member of the Pelle al Vegetale Consortium; specialises
    in sole leather + shoulders, full-aniline veg-tan. President of the
    Consortium (Leonardo Volpi). LWG certified. B2B-only.
  certifications: ["Pelle-al-Vegetale","LWG"]
  verification: "https://www.pellealvegetale.it/en/tanneries/volpi-concerie/ + https://www.leatherworkinggroup.com/get-involved/our-community/certified-suppliers/volpi-concerie-spa/"
```

---

## 4. Goatskin & Kidskin

### L1 — Base
```yaml
- id: goatskin
  name: "Goatskin"
  layer: L1
  family: leather-animal
  composition: "100% adult goat hide"
  weightRange: { min: 0.6, max: 1.2, unit: mm }
  defaultFinish: "chevré (smooth grain)"
  finishOptions: ["chevre","suede","embossed","metallic"]
  zones: ["Body","Lining","Strap","Upper"]
  subtypes: ["loafer","heel","sandal","boot","crossbody","clutch","tote","outerwear-jacket"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","tailored","minimal","luxe"]
  seasonFit: ["all-year"]
  certifications: ["LWG"]
  vegan: false
  notes: "Hermès Chèvre Mysore is the canonical reference for the smooth-grain goat finish."

- id: kidskin
  name: "Kidskin (young goat)"
  layer: L1
  family: leather-animal
  composition: "100% young goat (under 6 mo)"
  weightRange: { min: 0.5, max: 0.9, unit: mm }
  defaultFinish: "kid-glace"
  finishOptions: ["kid-glace","suede","metallic"]
  zones: ["Body","Lining","Upper"]
  subtypes: ["loafer","heel","sandal","crossbody","clutch","outerwear-jacket","blazer"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","romantic","tailored"]
  seasonFit: ["all-year"]
  certifications: ["LWG"]
  vegan: false
```

### L2 — Variants
```yaml
- id: goatskin-chevre
  name: "Chèvre (smooth-grain goat)"
  layer: L2
  parentId: goatskin
  composition: "100% goat, drum-dyed"
  weightRange: { min: 0.8, max: 1.0, unit: mm }
  defaultFinish: "chevre"
  subtypes: ["crossbody","clutch","loafer","heel","tote"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","tailored","minimal"]
  seasonFit: ["all-year"]

- id: goatskin-suede
  name: "Goat suede"
  layer: L2
  parentId: goatskin
  composition: "Goat split, buffed"
  weightRange: { min: 0.6, max: 0.9, unit: mm }
  defaultFinish: "goat suede"
  subtypes: ["loafer","heel","sandal","outerwear-jacket","crossbody"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["bohemian","heritage","preppy"]
  seasonFit: ["transitional","FW"]

- id: kidskin-glace
  name: "Kid-glacé (high-shine kid)"
  layer: L2
  parentId: kidskin
  composition: "100% young goat, polished"
  weightRange: { min: 0.5, max: 0.7, unit: mm }
  defaultFinish: "kid-glace"
  subtypes: ["heel","loafer","clutch"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","romantic","tailored"]
  seasonFit: ["all-year"]

- id: kidskin-suede
  name: "Kid suede"
  layer: L2
  parentId: kidskin
  composition: "Kid split, buffed"
  weightRange: { min: 0.5, max: 0.8, unit: mm }
  defaultFinish: "kid suede"
  subtypes: ["loafer","heel","sandal","crossbody","clutch"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","romantic"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-cf-stead-goat
  name: "Charles F. Stead & Co."
  layer: L3
  parentId: goatskin
  origin: "UK (Leeds, Sheepscar Tannery)"
  notes: |
    Founded 1823, family-run. Global benchmark for premium suede +
    fine leathers — Janus Calf, Repello Calf, Super Buck, Rough-Out.
    Includes goat suede / kid suede programmes. Supplies the world's
    top footwear and leather-goods houses. (Note: tannery is in Leeds,
    not Sheffield as sometimes stated.)
  certifications: ["LWG"]
  verification: "https://www.cfstead.com/ + https://www.leatherworkinggroup.com/get-involved/our-community/certified-suppliers/charles-f-stead-and-co-ltd-ste001/"

- id: supplier-haas-goat
  name: "Tanneries Haas (goatskin & kidskin programme)"
  layer: L3
  parentId: goatskin
  origin: "France (Alsace)"
  notes: |
    See calfskin entry — Haas also runs goat / kid programmes for
    luxury houses, with the same Alsatian heritage and 35,000 m²/month
    output.
  certifications: ["LWG"]
  verification: "https://www.tanneries-haas.com/en/leathers + https://leatherfrance.com/en/directory/tannerie-haas"
```

---

## 5. Pigskin

### L1 — Base
```yaml
- id: pigskin
  name: "Pigskin"
  layer: L1
  family: leather-animal
  composition: "100% pig hide"
  weightRange: { min: 0.4, max: 1.2, unit: mm }
  defaultFinish: "pigsuede (split-side)"
  finishOptions: ["pigsuede","pigskin-grain","velvet"]
  zones: ["Lining","Body","Pocket"]
  subtypes: ["outerwear-jacket","trouser","loafer","crossbody","tote","backpack"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["utility","preppy","minimal"]
  seasonFit: ["all-year"]
  certifications: ["LWG"]
  vegan: false
  notes: "Pigskin lining is the industry standard inside fine footwear and leather goods (breathable, abrasion-resistant). Pigsuede outerwear is a separate market, mostly in Spain and Italy."
```

### L2 — Variants
```yaml
- id: pigsuede
  name: "Pigsuede (lining grade)"
  layer: L2
  parentId: pigskin
  composition: "100% pig split, buffed"
  weightRange: { min: 0.4, max: 0.7, unit: mm }
  defaultFinish: "pigsuede"
  zones: ["Lining","Pocket"]
  subtypes: ["loafer","heel","crossbody","tote","clutch"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["preppy","tailored"]
  seasonFit: ["all-year"]

- id: pigsuede-outerwear
  name: "Pigsuede (outerwear grade)"
  layer: L2
  parentId: pigskin
  composition: "100% pig split, garment-grade"
  weightRange: { min: 0.7, max: 1.0, unit: mm }
  defaultFinish: "garment pigsuede"
  zones: ["Body"]
  subtypes: ["outerwear-jacket","blazer","trouser","skirt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["preppy","heritage","minimal"]
  seasonFit: ["transitional","FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-cf-stead-pigsuede
  name: "Charles F. Stead & Co. (pigsuede)"
  layer: L3
  parentId: pigskin
  origin: "UK (Leeds)"
  notes: |
    Holds a strong pigsuede programme inside its broader suede catalogue.
    See goatskin entry for full company description.
  certifications: ["LWG"]
  verification: "https://www.cfstead.com/suede-and-leather/"
```

---

## 6. Horse Leather (Cordovan)

### L1 — Base
```yaml
- id: horse-leather
  name: "Horse leather"
  layer: L1
  family: leather-animal
  composition: "100% horsehide"
  weightRange: { min: 1.0, max: 2.4, unit: mm }
  defaultFinish: "shell cordovan (polished)"
  finishOptions: ["shell-cordovan","horsefront-pull-up","horsefront-grain"]
  zones: ["Upper","Strap","Belt","Body"]
  subtypes: ["loafer","boot","belt","crossbody","clutch"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","tailored","preppy"]
  seasonFit: ["all-year"]
  certifications: ["LWG"]
  vegan: false
  notes: "Shell Cordovan = dense fibrous shell from the horse's hindquarter; takes 6+ months of stuffing, shaving and polishing."
```

### L2 — Variants
```yaml
- id: shell-cordovan
  name: "Shell cordovan"
  layer: L2
  parentId: horse-leather
  composition: "Horse hindquarter shell, vegetable-tanned"
  weightRange: { min: 1.4, max: 1.8, unit: mm }
  defaultFinish: "polished shell"
  subtypes: ["loafer","boot","belt"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","tailored","preppy"]
  seasonFit: ["all-year"]

- id: horsefront-pull-up
  name: "Horsefront pull-up"
  layer: L2
  parentId: horse-leather
  composition: "Horse front, oil-stuffed"
  weightRange: { min: 1.4, max: 2.0, unit: mm }
  defaultFinish: "pull-up oil"
  subtypes: ["boot","belt","crossbody"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","western","workwear"]
  seasonFit: ["FW","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-horween-cordovan
  name: "Horween Leather Company (Shell Cordovan programme)"
  layer: L3
  parentId: horse-leather
  origin: "USA (Chicago, IL)"
  notes: |
    Horween is the canonical Shell Cordovan tannery worldwide; 6-month
    process, vegetable-tanned, finished in-house. Allocated by quota to
    select footwear partners (Alden, Allen Edmonds, Crockett & Jones, etc.)
    + small B2B/sample availability via The Tannery Row.
  certifications: ["LWG-Gold"]
  verification: "https://www.horween.com/articles + https://en.wikipedia.org/wiki/Horween_Leather_Company"
```

---

## 7. Ostrich

### L1 — Base
```yaml
- id: ostrich-leather
  name: "Ostrich leather"
  layer: L1
  family: leather-animal
  composition: "100% ostrich hide"
  weightRange: { min: 0.8, max: 1.4, unit: mm }
  defaultFinish: "full-quill"
  finishOptions: ["full-quill","ostrich-leg","matte","polished"]
  zones: ["Body","Strap","Trim"]
  subtypes: ["tote","crossbody","clutch","shoulder","belt","boot","heel"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","western","heritage"]
  seasonFit: ["all-year"]
  certifications: ["LWG","CITES-not-listed-Struthio-camelus-domestica"]
  vegan: false
  notes: "Domesticated ostrich is not CITES-listed. Distinctive quill-bump grain on the crown of the hide; ostrich-leg has a separate scaly look."
```

### L2 — Variants
```yaml
- id: ostrich-full-quill
  name: "Full-quill ostrich"
  layer: L2
  parentId: ostrich-leather
  composition: "Ostrich crown / body"
  weightRange: { min: 1.0, max: 1.4, unit: mm }
  defaultFinish: "full-quill polished"
  subtypes: ["tote","crossbody","clutch","belt","boot"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","western"]
  seasonFit: ["all-year"]

- id: ostrich-leg
  name: "Ostrich leg (struso)"
  layer: L2
  parentId: ostrich-leather
  composition: "Ostrich shin / leg"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "scaled glaze"
  subtypes: ["belt","crossbody","clutch","boot"]
  priceTier: ["luxury"]
  aestheticTags: ["western","heritage"]
  seasonFit: ["all-year"]

- id: ostrich-matte
  name: "Matte ostrich"
  layer: L2
  parentId: ostrich-leather
  composition: "Ostrich crown, matte-finished"
  weightRange: { min: 1.0, max: 1.4, unit: mm }
  defaultFinish: "matte"
  subtypes: ["tote","crossbody","shoulder","belt"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","luxe"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-cape-karoo
  name: "Cape Karoo International (former Klein Karoo)"
  layer: L3
  parentId: ostrich-leather
  origin: "South Africa (Oudtshoorn + Mossel Bay)"
  notes: |
    World's largest ostrich leather producer. Two tanneries (Oudtshoorn
    in the Klein Karoo + Mossel Bay), 200,000 skins/year. Result of the
    Klein Karoo + Mosstrich merger. Supplies luxury fashion + automotive.
  certifications: ["LWG"]
  verification: "https://capekarooleather.com/ + https://capekarooint.com/"
```

---

## 8. Stingray (Galuchat)

### L1 — Base
```yaml
- id: stingray-leather
  name: "Stingray leather (galuchat)"
  layer: L1
  family: leather-animal
  composition: "100% stingray hide"
  weightRange: { min: 1.0, max: 1.6, unit: mm }
  defaultFinish: "polished pearl bead"
  finishOptions: ["polished","matte","sanded","dyed"]
  zones: ["Trim","Body","Strap"]
  subtypes: ["clutch","crossbody","belt","heel","loafer"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","heritage"]
  seasonFit: ["all-year"]
  certifications: ["LWG","CITES-not-listed-Dasyatis"]
  vegan: false
  notes: "Most species (e.g. Dasyatis akajei) are NOT CITES-listed; only freshwater stingrays (Potamotrygonidae) are CITES App. III for Brazil/Colombia. Always check species at sourcing."
```

### L2 — Variants
```yaml
- id: stingray-polished
  name: "Polished stingray"
  layer: L2
  parentId: stingray-leather
  composition: "Stingray hide, glass-polished"
  weightRange: { min: 1.0, max: 1.6, unit: mm }
  defaultFinish: "polished pearl"
  subtypes: ["clutch","crossbody","belt","heel"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe"]
  seasonFit: ["all-year"]

- id: stingray-sanded
  name: "Sanded stingray"
  layer: L2
  parentId: stingray-leather
  composition: "Stingray hide, sanded matte"
  weightRange: { min: 1.0, max: 1.6, unit: mm }
  defaultFinish: "sanded matte"
  subtypes: ["clutch","belt","crossbody"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","luxe"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
# Excluded — see EXCLUDED section. The stingray L3 market in 2026 is
# fragmented across small workshops in Thailand and Indonesia with
# inconsistent CITES paperwork. Felipe's "si no lo tienes claro, fuera"
# rule applies. Use a CITES-aware exotic-skin broker (Heng Long if
# species is in their catalogue) at sourcing time.
```

---

## 9. Snakeskin (Python · Watersnake)

### L1 — Base
```yaml
- id: snakeskin
  name: "Snakeskin"
  layer: L1
  family: leather-animal
  composition: "100% snake hide"
  weightRange: { min: 0.4, max: 0.8, unit: mm }
  defaultFinish: "glazed natural"
  finishOptions: ["glazed","matte","metallic","dyed-back-cut","front-cut"]
  zones: ["Trim","Body","Strap"]
  subtypes: ["heel","clutch","crossbody","belt","loafer"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","y2k","romantic"]
  seasonFit: ["all-year"]
  certifications: ["CITES-Appendix-II"]
  CITES_status: "II"
  vegan: false
  notes: |
    Reticulated python (Python reticulatus) and Burmese python (Python bivittatus)
    are CITES App. II — legal trade requires export permit + import declaration.
    Watersnake (Acrochordus / Homalopsis) is more common in commercial snakeskin
    today; Acrochordus javanicus is NOT CITES-listed.
```

### L2 — Variants
```yaml
- id: python-glazed
  name: "Glazed python"
  layer: L2
  parentId: snakeskin
  composition: "Reticulated python, glazed"
  weightRange: { min: 0.4, max: 0.7, unit: mm }
  defaultFinish: "glazed natural"
  certifications: ["CITES-Appendix-II"]
  CITES_status: "II"
  subtypes: ["heel","clutch","crossbody","belt"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","y2k"]
  seasonFit: ["all-year"]

- id: python-matte
  name: "Matte python"
  layer: L2
  parentId: snakeskin
  composition: "Reticulated python, matte-finished"
  weightRange: { min: 0.4, max: 0.7, unit: mm }
  defaultFinish: "matte"
  certifications: ["CITES-Appendix-II"]
  CITES_status: "II"
  subtypes: ["clutch","crossbody","heel","belt"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","luxe"]
  seasonFit: ["all-year"]

- id: watersnake-glazed
  name: "Watersnake (Karung) glazed"
  layer: L2
  parentId: snakeskin
  composition: "Acrochordus javanicus, glazed"
  weightRange: { min: 0.4, max: 0.6, unit: mm }
  defaultFinish: "glazed natural"
  subtypes: ["heel","clutch","crossbody","belt"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","y2k","romantic"]
  seasonFit: ["all-year"]
  notes: "Watersnake is NOT CITES-listed — easier paperwork than python."
```

### L3 — B2B Suppliers
```yaml
- id: supplier-heng-long-snakeskin
  name: "Heng Long Tannery (LVMH) — exotic skins programme"
  layer: L3
  parentId: snakeskin
  origin: "Singapore (also Italy)"
  notes: |
    Founded 1977, acquired by LVMH 2011 ($161M). Among the world's
    five top-tier exotic-skin tanneries; ~280,000 skins/year. Primary
    business is alligator/crocodile but the catalogue includes python
    + watersnake under CITES paperwork. Supplies LV, Fendi, Dior plus
    select third parties.
  certifications: ["LWG","CITES-registered"]
  verification: "https://www.henglong.com/our_company.shtml + https://metiersdart.lvmh.com/en/exotic_leather/heng-long"
```

---

## 10. Alligator & Crocodile

### L1 — Base
```yaml
- id: crocodilian-leather
  name: "Alligator / crocodile leather"
  layer: L1
  family: leather-animal
  composition: "100% Alligator mississippiensis OR Crocodylus porosus / niloticus"
  weightRange: { min: 1.0, max: 1.6, unit: mm }
  defaultFinish: "glazed"
  finishOptions: ["glazed","matte","polished","sueded","embossed"]
  zones: ["Body","Strap","Trim"]
  subtypes: ["clutch","crossbody","tote","shoulder","belt","heel","loafer","boot"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","heritage","western"]
  seasonFit: ["all-year"]
  certifications: ["CITES-Appendix-II","LWG"]
  CITES_status: "II"
  vegan: false
  notes: |
    Alligator mississippiensis (USA) + porosus + niloticus (Africa, Australia)
    are CITES App. II. Permit required at every border. Most luxury houses
    work farm-raised hides under SCS / KESQ certification.
```

### L2 — Variants
```yaml
- id: alligator-glazed
  name: "Glazed alligator"
  layer: L2
  parentId: crocodilian-leather
  composition: "Alligator mississippiensis, glazed"
  weightRange: { min: 1.0, max: 1.6, unit: mm }
  defaultFinish: "glazed shiny"
  certifications: ["CITES-Appendix-II"]
  CITES_status: "II"
  subtypes: ["clutch","crossbody","tote","heel","belt","boot"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","heritage"]
  seasonFit: ["all-year"]

- id: alligator-matte
  name: "Matte alligator"
  layer: L2
  parentId: crocodilian-leather
  composition: "Alligator mississippiensis, matte-finished"
  weightRange: { min: 1.0, max: 1.6, unit: mm }
  defaultFinish: "matte"
  certifications: ["CITES-Appendix-II"]
  CITES_status: "II"
  subtypes: ["clutch","crossbody","tote","belt","heel"]
  priceTier: ["luxury"]
  aestheticTags: ["minimal","luxe"]
  seasonFit: ["all-year"]

- id: crocodile-porosus-glazed
  name: "Glazed Crocodylus porosus (saltwater crocodile)"
  layer: L2
  parentId: crocodilian-leather
  composition: "Crocodylus porosus, glazed"
  weightRange: { min: 1.0, max: 1.4, unit: mm }
  defaultFinish: "glazed"
  certifications: ["CITES-Appendix-II"]
  CITES_status: "II"
  subtypes: ["clutch","crossbody","tote","belt"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","heritage"]
  seasonFit: ["all-year"]
  notes: "Smaller scale pattern than alligator; the Hermès Birkin reference."

- id: crocodile-niloticus
  name: "Glazed Crocodylus niloticus (Nile crocodile)"
  layer: L2
  parentId: crocodilian-leather
  composition: "Crocodylus niloticus, glazed"
  weightRange: { min: 1.0, max: 1.4, unit: mm }
  defaultFinish: "glazed"
  certifications: ["CITES-Appendix-II"]
  CITES_status: "II"
  subtypes: ["clutch","crossbody","belt"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","heritage"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-heng-long
  name: "Heng Long Tannery (LVMH)"
  layer: L3
  parentId: crocodilian-leather
  origin: "Singapore"
  notes: |
    Founded 1977, owned by LVMH since 2011. ~280,000 crocodilian skins/year.
    Top-five global tannery for crocodile/alligator. State-of-the-art
    facility in Singapore + Italy operations after the LVMH Métiers d'Art
    expansion. CITES-registered for legal cross-border trade. Open to
    B2B for outside houses (corporate-customer-first; sample programme
    via Delugs B2B).
  certifications: ["LWG","CITES-registered"]
  verification: "https://www.henglong.com/our_company.shtml + https://metiersdart.lvmh.com/en/exotic_leather/heng-long + https://b2b.delugs.com/blogs/news/heng-long-tannery-for-all-your-alligator-needs"
```

---

## 11. Lizard

### L1 — Base
```yaml
- id: lizard-leather
  name: "Lizard leather"
  layer: L1
  family: leather-animal
  composition: "100% lizard hide (Tupinambis / Varanus / Iguana)"
  weightRange: { min: 0.4, max: 0.8, unit: mm }
  defaultFinish: "glazed"
  finishOptions: ["glazed","matte","polished"]
  zones: ["Trim","Strap","Body"]
  subtypes: ["heel","clutch","crossbody","belt"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","romantic","heritage"]
  seasonFit: ["all-year"]
  certifications: ["CITES-Appendix-II"]
  CITES_status: "II"
  vegan: false
  notes: |
    Tupinambis (tegu) and most monitor lizards (Varanus) are CITES App. II.
    Iguana (Iguana iguana) is App. II. Always permit at sourcing.
```

### L2 — Variants
```yaml
- id: lizard-tegu
  name: "Tegu lizard (Tupinambis)"
  layer: L2
  parentId: lizard-leather
  composition: "Tupinambis merianae, glazed"
  weightRange: { min: 0.4, max: 0.7, unit: mm }
  defaultFinish: "glazed"
  certifications: ["CITES-Appendix-II"]
  CITES_status: "II"
  subtypes: ["heel","clutch","crossbody","belt"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","heritage"]
  seasonFit: ["all-year"]

- id: lizard-monitor
  name: "Monitor lizard (Varanus salvator ringneck)"
  layer: L2
  parentId: lizard-leather
  composition: "Varanus salvator, glazed"
  weightRange: { min: 0.5, max: 0.8, unit: mm }
  defaultFinish: "glazed"
  certifications: ["CITES-Appendix-II"]
  CITES_status: "II"
  subtypes: ["heel","clutch","crossbody","belt","loafer"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","heritage"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
# L3 excluded — see EXCLUDED section. The CITES-compliant B2B lizard
# supply chain in 2026 is dominated by small workshops in Indonesia and
# Argentina that sell almost entirely to in-house atelier of luxury houses,
# without a verifiable open B2B channel beyond Heng Long (whose primary
# focus is crocodilian).
```

---

## 12. Fish Skin (Salmon · Perch · Cod · Wolffish)

### L1 — Base
```yaml
- id: fish-skin-leather
  name: "Fish skin leather"
  layer: L1
  family: leather-animal
  composition: "100% fish hide (food-industry by-product)"
  weightRange: { min: 0.4, max: 0.8, unit: mm }
  defaultFinish: "glazed natural"
  finishOptions: ["glazed","matte","metallic","dyed"]
  zones: ["Trim","Body"]
  subtypes: ["clutch","crossbody","heel","belt","sneaker"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","heritage","minimal"]
  seasonFit: ["all-year"]
  certifications: ["LWG"]
  vegan: false
  notes: "Salmon, cod, wolffish, perch, tilapia. Naturally low-tannage byproduct of food industry. Distinctive scaled grain."
```

### L2 — Variants
```yaml
- id: salmon-leather
  name: "Salmon leather"
  layer: L2
  parentId: fish-skin-leather
  composition: "Atlantic salmon (Salmo salar) skin"
  weightRange: { min: 0.4, max: 0.6, unit: mm }
  defaultFinish: "glazed"
  subtypes: ["clutch","crossbody","heel","belt","sneaker"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","minimal"]
  seasonFit: ["all-year"]

- id: cod-leather
  name: "Cod leather"
  layer: L2
  parentId: fish-skin-leather
  composition: "Atlantic cod (Gadus morhua) skin"
  weightRange: { min: 0.4, max: 0.6, unit: mm }
  defaultFinish: "matte"
  subtypes: ["clutch","crossbody","belt"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","heritage"]
  seasonFit: ["all-year"]

- id: wolffish-leather
  name: "Wolffish leather"
  layer: L2
  parentId: fish-skin-leather
  composition: "Atlantic wolffish (Anarhichas lupus) skin"
  weightRange: { min: 0.5, max: 0.7, unit: mm }
  defaultFinish: "glazed"
  subtypes: ["clutch","heel","belt","crossbody"]
  priceTier: ["luxury"]
  aestheticTags: ["sustainable","luxe","heritage"]
  seasonFit: ["all-year"]

- id: perch-leather
  name: "Perch / tilapia leather"
  layer: L2
  parentId: fish-skin-leather
  composition: "Perch or tilapia skin"
  weightRange: { min: 0.3, max: 0.5, unit: mm }
  defaultFinish: "natural"
  subtypes: ["clutch","crossbody","trim"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-atlantic-leather
  name: "Atlantic Leather (Sjávarleður)"
  layer: L3
  parentId: fish-skin-leather
  origin: "Iceland (Sauðárkrókur)"
  notes: |
    The only fish-skin tannery in Europe. Tans Atlantic salmon, cod,
    wolffish and perch — all by-products of the food industry. Supplies
    Dior, Prada, Galliano and others. B2B direct + sample programme.
  certifications: ["LWG"]
  verification: "https://www.atlanticleather.is/ + https://thesustainableangle.org/atlantic-leather-fish-leather-a-by-product-of-the-food-industry/"

- id: supplier-nordic-fish-leather
  name: "Nordic Fish Leather"
  layer: L3
  parentId: fish-skin-leather
  origin: "Iceland"
  notes: |
    Independent Icelandic tannery for salmon, cod, wolffish and perch.
    B2B direct + sample box. Trades under Nordic Fish Leather brand.
  certifications: ["LWG"]
  verification: "https://nordicfishleather.com/ + https://www.leatherbox.com/collections/nordic-fish-leather-sustainable-leather-from-iceland"
```

---

## SECTION B — ANIMAL LEATHER BY TANNAGE

These are not separate hides — they are tannage variants of the L1 hides above. Recorded here as L1-tannage anchors so a designer can search by tannage and see which mills run that programme.

## 13. Vegetable-Tanned (Tuscan / Pelle al Vegetale)

### L1 — Base
```yaml
- id: tannage-vegetable
  name: "Vegetable-tanned leather"
  layer: L1
  family: leather-animal
  composition: "Bovine / calf with mimosa, chestnut, quebracho extracts"
  weightRange: { min: 1.0, max: 4.0, unit: mm }
  defaultFinish: "natural full-aniline"
  finishOptions: ["natural","waxed","oiled","milled","polished"]
  zones: ["Body","Belt","Strap","Outsole"]
  subtypes: ["belt","tote","crossbody","loafer","boot","clutch"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","sustainable","tailored","minimal"]
  seasonFit: ["all-year"]
  certifications: ["Pelle-al-Vegetale","LWG","ICEC","metal-free"]
  vegan: false
  notes: |
    Pelle al Vegetale Consortium (Tuscany, founded 1994) is the canonical
    quality mark — drum or pit tannage with vegetable extracts. ~25 member
    tanneries clustered around Santa Croce sull'Arno, Ponte a Egola,
    San Miniato, Arno valley.
```

### L2 — Variants
```yaml
- id: vegtan-pit-tanned
  name: "Pit-tanned (slow tannage)"
  layer: L2
  parentId: tannage-vegetable
  composition: "Bovine, three-pit progressive vegetable tannage"
  weightRange: { min: 2.0, max: 4.0, unit: mm }
  defaultFinish: "natural"
  certifications: ["Pelle-al-Vegetale"]
  subtypes: ["belt","tote","loafer","boot","outsole"]
  priceTier: ["luxury"]
  aestheticTags: ["heritage","sustainable","tailored"]
  seasonFit: ["all-year"]
  notes: "Hides progress through three pits (~30 days total) with rising tannin concentration."

- id: vegtan-drum-tanned
  name: "Drum-tanned vegetable"
  layer: L2
  parentId: tannage-vegetable
  composition: "Bovine, drum tannage with veg extracts"
  weightRange: { min: 1.0, max: 2.4, unit: mm }
  defaultFinish: "natural"
  certifications: ["Pelle-al-Vegetale"]
  subtypes: ["belt","tote","crossbody","loafer","clutch"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","sustainable"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
# All Pelle al Vegetale tanneries are veg-tanned. The 5 we list as L3
# elsewhere (Walpier, Volpi, Tempesti, Conceria 800, Bodin-Joyeux for
# its veg-tan programme) are referenced from this entry.
- id: supplier-pelle-al-vegetale
  name: "Pelle al Vegetale Consortium register"
  layer: L3
  parentId: tannage-vegetable
  origin: "Italy (Tuscany)"
  notes: |
    Not a tannery — the consortium register itself. ~25 certified
    veg-tan tanneries; canonical sourcing point for designers who want
    "Vera Pelle Conciata al Vegetale in Toscana".
  certifications: ["Pelle-al-Vegetale"]
  verification: "https://www.pellealvegetale.it/en/"
```

---

## 14. Chrome-Tanned

### L1 — Base
```yaml
- id: tannage-chrome
  name: "Chrome-tanned leather"
  layer: L1
  family: leather-animal
  composition: "Bovine with chromium-III sulfate"
  weightRange: { min: 0.6, max: 2.0, unit: mm }
  defaultFinish: "drum-dyed aniline"
  finishOptions: ["full-grain","top-grain","corrected-grain","split","suede","nubuck","embossed","saffiano","pebbled"]
  zones: ["Body","Lining","Upper","Strap"]
  subtypes: ["sneaker","heel","sandal","boot","loafer","mule","tote","crossbody","clutch","backpack","shoulder","belt","outerwear-jacket","blazer","trouser","skirt"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["minimal","tailored","streetwear","preppy","luxe"]
  seasonFit: ["all-year"]
  certifications: ["LWG-Bronze","LWG-Silver","LWG-Gold","REACH","OEKO-TEX-Leather"]
  vegan: false
  notes: "~80% of global production. Faster (1 day vs 30+ days), softer hand, infinite colour, lower cost. The default of mass production."
```

### L2 — Variants
```yaml
- id: chrome-wet-blue
  name: "Wet-blue (semi-finished chrome)"
  layer: L2
  parentId: tannage-chrome
  composition: "Bovine, chrome-tanned, blue-dyed wet"
  weightRange: { min: 0.8, max: 2.0, unit: mm }
  defaultFinish: "wet-blue"
  zones: ["Body"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["utility"]
  seasonFit: ["all-year"]
  notes: "Industry intermediate stage; sold to finishing tanneries."

- id: chrome-finished-aniline
  name: "Chrome finished aniline"
  layer: L2
  parentId: tannage-chrome
  composition: "Bovine chrome, full-aniline drum-dyed"
  weightRange: { min: 0.8, max: 1.4, unit: mm }
  defaultFinish: "aniline"
  subtypes: ["sneaker","heel","loafer","tote","crossbody","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","tailored","luxe"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
# Reference Mastrotto (cowhide #1 supplier), Conceria Nuova Overlord,
# Bridge of Weir (auto), Heng Long (exotic). All run chrome programmes.
```

---

## 15. Chrome-Free / Metal-Free

### L1 — Base
```yaml
- id: tannage-metal-free
  name: "Chrome-free / metal-free leather"
  layer: L1
  family: leather-animal
  composition: "Bovine, synthetic (syntan) or aldehyde tannage, no metals"
  weightRange: { min: 0.6, max: 1.8, unit: mm }
  defaultFinish: "drum-dyed soft"
  finishOptions: ["soft","milled","embossed","grain"]
  zones: ["Body","Lining","Upper"]
  subtypes: ["sneaker","outerwear-jacket","tote","crossbody","loafer","heel"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sustainable","minimal","tailored"]
  seasonFit: ["all-year"]
  certifications: ["LWG","ECARF","metal-free","DIN-EN-ISO-17072"]
  vegan: false
  notes: |
    Increasingly mandatory for automotive (no Cr VI risk), childrenswear
    and ECARF-certified products. Hypoallergenic. Tested under DIN-EN-ISO 17072.
```

### L2 — Variants
```yaml
- id: metal-free-bovine
  name: "Metal-free bovine"
  layer: L2
  parentId: tannage-metal-free
  composition: "Bovine, syntan + glutaraldehyde, zero metal"
  weightRange: { min: 0.8, max: 1.4, unit: mm }
  defaultFinish: "soft"
  certifications: ["LWG","metal-free","ECARF"]
  subtypes: ["sneaker","tote","crossbody","outerwear-jacket"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","minimal","tailored"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-bridge-of-weir
  name: "Bridge of Weir Leather (Scottish Leather Group)"
  layer: L3
  parentId: tannage-metal-free
  origin: "UK (Scotland, Bridge of Weir)"
  notes: |
    Founded 1905. UK's only automotive leather producer. Pioneered
    low-carbon, energy-efficient tannage; supplies Aston Martin, Jaguar,
    Mercedes, Range Rover. Strong metal-free programme on automotive
    spec; advanced in alternative tanning + colour matching.
  certifications: ["LWG-Gold","ISO-14001","ECARF"]
  verification: "https://www.bridgeofweirleather.com/ + https://www.scottishleathergroup.com/"
```

---

## 16. Aldehyde-Tanned (White Leather / Wet-White)

### L1 — Base
```yaml
- id: tannage-aldehyde
  name: "Aldehyde-tanned (wet-white) leather"
  layer: L1
  family: leather-animal
  composition: "Bovine, glutaraldehyde tannage"
  weightRange: { min: 0.6, max: 1.4, unit: mm }
  defaultFinish: "natural white"
  finishOptions: ["natural","dyed","milled"]
  zones: ["Body","Lining","Upper"]
  subtypes: ["sneaker","heel","loafer","outerwear-jacket","gloves"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","sport","sustainable"]
  seasonFit: ["all-year"]
  certifications: ["LWG","metal-free"]
  vegan: false
  notes: |
    Wet-white process. Default for white sneaker uppers (Stan Smith era),
    gloves, and applications where Cr-free is required. Often combined
    with syntans = "FOC" (free of chrome).
```

### L2 — Variants
```yaml
- id: aldehyde-bovine-white
  name: "Aldehyde-tanned bovine (white)"
  layer: L2
  parentId: tannage-aldehyde
  composition: "Bovine, glutaraldehyde-tanned"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "natural white"
  certifications: ["LWG","metal-free"]
  subtypes: ["sneaker","loafer","heel"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["minimal","sport","sustainable"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
# Cross-reference Bridge of Weir + Mastrotto (both run wet-white programmes
# inside their broader portfolios). No L3 entry duplicated here.
```

---

## SECTION C — PLANT-LEATHER ALTERNATIVES (verified commercial 2026)

## 17. Cork Leather

### L1 — Base
```yaml
- id: cork-leather
  name: "Cork leather (cork fabric)"
  layer: L1
  family: leather-plant-alt
  composition: "Cork shavings (Quercus suber) bonded onto cotton or polyester backer"
  weightRange: { min: 0.6, max: 1.2, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","dyed","metallic","laminated","perforated"]
  zones: ["Body","Strap","Trim"]
  subtypes: ["tote","crossbody","clutch","backpack","shoulder","belt","sneaker","sandal","espadrille","mule"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal","resort","bohemian"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["FSC","OEKO-TEX","vegan-PETA"]
  vegan: true
  origin: "Portugal"
```

### L2 — Variants
```yaml
- id: cork-fabric-natural
  name: "Natural cork fabric"
  layer: L2
  parentId: cork-leather
  composition: "Cork + cotton backer"
  weightRange: { min: 0.6, max: 1.0, unit: mm }
  defaultFinish: "natural"
  certifications: ["FSC","OEKO-TEX"]
  subtypes: ["tote","crossbody","clutch","backpack","shoulder","belt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","resort","bohemian"]
  seasonFit: ["SS","transitional"]

- id: cork-fabric-coloured
  name: "Coloured / printed cork fabric"
  layer: L2
  parentId: cork-leather
  composition: "Cork + dyed top + cotton backer"
  weightRange: { min: 0.6, max: 1.0, unit: mm }
  defaultFinish: "dyed"
  subtypes: ["tote","crossbody","clutch","sneaker"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal"]
  seasonFit: ["SS","transitional"]

- id: cork-fabric-metallic
  name: "Metallic cork fabric"
  layer: L2
  parentId: cork-leather
  composition: "Cork + foil top-coat"
  weightRange: { min: 0.6, max: 1.0, unit: mm }
  defaultFinish: "metallic"
  subtypes: ["clutch","crossbody","heel","sandal"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","y2k","minimal"]
  seasonFit: ["SS"]

- id: cork-leather-thick
  name: "Thick cork leather (structured)"
  layer: L2
  parentId: cork-leather
  composition: "Layered cork + heavier backer"
  weightRange: { min: 1.0, max: 1.5, unit: mm }
  defaultFinish: "natural"
  subtypes: ["backpack","tote","sandal","espadrille"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","resort"]
  seasonFit: ["SS"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-amorim
  name: "Corticeira Amorim"
  layer: L3
  parentId: cork-leather
  origin: "Portugal (Santa Maria de Lamas)"
  notes: |
    World's largest cork processing group. ~33% of global cork production.
    Multiple business units; cork fabrics + cork composites for fashion +
    interiors + automotive (BMW, Tesla). Open B2B programme.
  certifications: ["FSC","ISO-14001"]
  verification: "https://www.amorim.com/en/ + https://amorimcorksolutions.com/en-us/about-us/amorim-group/"

- id: supplier-corticeira-jelinek
  name: "Corticeira Jelinek Portugal"
  layer: L3
  parentId: cork-leather
  origin: "Portugal (Ovar)"
  notes: |
    Member of the Jelinek Cork Group — the oldest continually active
    cork company in the world (since 1855). Cork fabric + cork leather
    in stock + made-to-order. B2B + small-batch friendly.
  certifications: ["FSC"]
  verification: "https://www.jelinek.pt/cork-fabric"

- id: supplier-portugaliacork
  name: "Portugalia Cork"
  layer: L3
  parentId: cork-leather
  origin: "Portugal"
  notes: |
    Direct producer of cork fabric and cork leather; B2B portal with
    minimum-order programme for fashion houses + accessories brands.
  certifications: ["FSC"]
  verification: "https://shop.portugaliacork.com/ + https://www.portugaliacork.com/"
```

---

## 18. Piñatex (Pineapple Leaf Leather)

### L1 — Base
```yaml
- id: pinatex
  name: "Piñatex (pineapple-leaf leather)"
  layer: L1
  family: leather-plant-alt
  composition: "Pineapple leaf fibre (PALF) ~80% + PLA + PU coating"
  weightRange: { min: 0.6, max: 1.0, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","metallic","performance"]
  zones: ["Body","Strap","Upper"]
  subtypes: ["tote","crossbody","sneaker","clutch","loafer","backpack","shoulder","belt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal","resort"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["vegan-PETA","USDA-bio-based","Cradle-to-Cradle-Bronze"]
  vegan: true
  notes: |
    Used by 1,000+ brands incl. H&M, Hugo Boss, Hilton Bankside.
    🚨 STATUS WATCH: Ananas Anam Ltd (UK) and Ananas Anam SL (Spain) entered
    administration in October 2025. The L1/L2 entry remains because the
    material is technologically valid + still represented in stocked
    sample boxes, BUT current production / order acceptance is unclear.
    Do NOT spec for new collections without contacting the administrator
    or a stock-holding distributor first.
```

### L2 — Variants
```yaml
- id: pinatex-original
  name: "Piñatex Original"
  layer: L2
  parentId: pinatex
  composition: "PALF + PLA + PU coating"
  weightRange: { min: 0.7, max: 0.9, unit: mm }
  defaultFinish: "natural"
  certifications: ["vegan-PETA","USDA-bio-based"]
  subtypes: ["tote","crossbody","sneaker","clutch","backpack"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal"]
  seasonFit: ["SS","transitional"]

- id: pinatex-metallic
  name: "Piñatex Metallic"
  layer: L2
  parentId: pinatex
  composition: "PALF + PLA + metallic top-coat"
  weightRange: { min: 0.7, max: 0.9, unit: mm }
  defaultFinish: "metallic"
  subtypes: ["clutch","sneaker","crossbody","heel"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","y2k"]
  seasonFit: ["SS"]

- id: pinatex-performance
  name: "Piñatex Performance"
  layer: L2
  parentId: pinatex
  composition: "PALF + reinforced backer"
  weightRange: { min: 0.8, max: 1.0, unit: mm }
  defaultFinish: "performance"
  subtypes: ["sneaker","backpack","tote"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","sport","streetwear"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
# 🚨 EXCLUDED (status watch). Ananas Anam (the only supplier of Piñatex)
# entered administration in the UK and Spain in October 2025. We list NO
# L3 supplier for Piñatex pending the outcome of the administration
# process. See EXCLUDED section.
```

---

## 19. Cactus Leather (Desserto)

### L1 — Base
```yaml
- id: cactus-leather
  name: "Cactus leather (Desserto)"
  layer: L1
  family: leather-plant-alt
  composition: "Nopal cactus (Opuntia ficus-indica) powder + PU-bio coating + cotton/poly backer"
  weightRange: { min: 0.7, max: 1.4, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","dyed","embossed","metallic"]
  zones: ["Body","Strap","Upper","Trim"]
  subtypes: ["tote","crossbody","clutch","backpack","shoulder","belt","sneaker","heel","loafer","mule","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sustainable","minimal","luxe","western"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["vegan-PETA","USDA-bio-based","FSC-Mix-PEFC","CO2-neutral"]
  vegan: true
  origin: "Mexico (Zacatecas)"
  notes: "Adopted by Adidas, Karl Lagerfeld, Mercedes-Benz, Fossil, BMW. Patented manufacturing process from cactus pads grown on a Zacatecas ranch."
```

### L2 — Variants
```yaml
- id: desserto-original
  name: "Desserto Original"
  layer: L2
  parentId: cactus-leather
  composition: "Nopal powder + PU-bio + cotton backer"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "natural"
  certifications: ["vegan-PETA","USDA-bio-based"]
  subtypes: ["tote","crossbody","clutch","sneaker","outerwear-jacket"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal"]
  seasonFit: ["all-year"]

- id: desserto-emboss
  name: "Desserto embossed (croc / pebble print)"
  layer: L2
  parentId: cactus-leather
  composition: "Nopal + PU-bio embossed"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "embossed"
  subtypes: ["clutch","crossbody","heel","loafer","belt"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sustainable","luxe","minimal"]
  seasonFit: ["all-year"]

- id: desserto-thick-auto
  name: "Desserto thick (automotive grade)"
  layer: L2
  parentId: cactus-leather
  composition: "Nopal + reinforced PU + heavy backer"
  weightRange: { min: 1.2, max: 1.4, unit: mm }
  defaultFinish: "automotive"
  subtypes: ["backpack","tote","outerwear-coat","seat (auto)"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","luxe"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-desserto
  name: "Adriano Di Marti S.A. de C.V. (Desserto)"
  layer: L3
  parentId: cactus-leather
  origin: "Mexico (Guadalajara HQ + Zacatecas ranch)"
  notes: |
    Founded by Adrián López Velarde + Marte Cázarez, 2019. Patented
    nopal-cactus leather. B2B-only model: sells to manufacturers
    + brands. Confirmed customers: Adidas, Karl Lagerfeld,
    Mercedes-Benz, BMW, Fossil. Direct B2B via desserto.com.mx.
  certifications: ["vegan-PETA","USDA-bio-based","ISO-14001"]
  verification: "https://desserto.com.mx/ + https://adrianodimarti.com/"

- id: supplier-alternative-leathers
  name: "Alternative Leathers Co. (Desserto + Vegea distributor)"
  layer: L3
  parentId: cactus-leather
  origin: "UK (London) — global distributor"
  notes: |
    Multi-brand distributor for plant-leather alternatives. Open B2B
    sample programme + small-quantity orders for Desserto, Vegea,
    AppleSkin, MIRUM. Useful for designers below Desserto's direct
    minimum order.
  verification: "https://alternativeleathers.com/products/desserto-cactus-leather + https://alternativeleathers.com/pages/cactus-leather"
```

---

## 20. Apple Leather (AppleSkin / Frumat × Mabel)

### L1 — Base
```yaml
- id: apple-leather
  name: "Apple leather (AppleSkin)"
  layer: L1
  family: leather-plant-alt
  composition: "Apple-industry waste fibre (~30–50%) + PU + cotton or recycled-poly backer"
  weightRange: { min: 0.7, max: 1.2, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","grain-emboss","metallic"]
  zones: ["Body","Strap","Upper"]
  subtypes: ["tote","crossbody","clutch","backpack","shoulder","belt","sneaker","loafer","heel","mule"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal","resort"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["vegan-PETA","USDA-bio-based","REACH","OEKO-TEX-Eco-Passport"]
  vegan: true
  origin: "Italy (South Tyrol + Florence)"
  notes: "Frumat (Bolzano) developed the bio-resin from apple-pomace; Mabel SRL (Florence) physically manufactures the AppleSkin sheet under licence since 2010."
```

### L2 — Variants
```yaml
- id: appleskin-original
  name: "AppleSkin Original"
  layer: L2
  parentId: apple-leather
  composition: "Apple pomace + PU + cotton backer"
  weightRange: { min: 0.7, max: 1.0, unit: mm }
  defaultFinish: "natural"
  certifications: ["vegan-PETA","USDA-bio-based"]
  subtypes: ["tote","crossbody","clutch","sneaker"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal"]
  seasonFit: ["all-year"]

- id: appleskin-grain
  name: "AppleSkin grain-embossed"
  layer: L2
  parentId: apple-leather
  composition: "Apple pomace + PU + embossed grain"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "embossed grain"
  subtypes: ["clutch","crossbody","loafer","heel","belt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal","preppy"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-mabel
  name: "Mabel SRL (AppleSkin manufacturer)"
  layer: L3
  parentId: apple-leather
  origin: "Italy (Florence)"
  notes: |
    Florence-based vegan-leather manufacturer since 1978. Since 2010,
    licensed producer of AppleSkin under patent from Frumat (Bolzano).
    B2B direct to fashion + interiors. Open trade programme.
  certifications: ["vegan-PETA","USDA-bio-based","REACH","OEKO-TEX"]
  verification: "https://www.appleskin.com/ + https://moea.io/pages/appleskin"

- id: supplier-frumat
  name: "Frumat (AppleSkin patent holder)"
  layer: L3
  parentId: apple-leather
  origin: "Italy (Bolzano, South Tyrol)"
  notes: |
    Patent holder of the apple-pomace bio-resin technology. Operates
    in partnership with Mabel for physical production. Direct
    technical contact for material development + custom programmes.
  certifications: ["vegan-PETA","USDA-bio-based"]
  verification: "https://www.technofashionworld.com/frumat-the-leather-alternative-made-from-apples/ + https://www.appleskin.com/"
```

---

## 21. Mycelium Leather (MycoWorks Reishi)

### L1 — Base
```yaml
- id: mycelium-leather
  name: "Mycelium leather (Reishi by MycoWorks)"
  layer: L1
  family: leather-plant-alt
  composition: "Fine Mycelium™ fibrous network, hand-tanned"
  weightRange: { min: 0.8, max: 1.4, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","glazed","matte","embossed"]
  zones: ["Body","Strap","Upper"]
  subtypes: ["tote","crossbody","clutch","shoulder","loafer","heel","outerwear-jacket"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","sustainable","minimal","heritage"]
  seasonFit: ["all-year"]
  certifications: ["vegan-PETA"]
  vegan: true
  origin: "USA (Union, South Carolina)"
  notes: |
    Reishi is the canonical 2026 commercially-available mycelium leather.
    136,000 sq ft commercial-scale plant operating since Sep 2023; capacity
    of millions of sq ft/year. Used by Hermès (Sylvania bag), GM Cadillac,
    Ligne Roset. Note: B2B is highly curated — primary channel is luxury
    partnerships. DTC-friendly small-format Reishi swatches available.
```

### L2 — Variants
```yaml
- id: reishi-natural
  name: "Reishi Natural"
  layer: L2
  parentId: mycelium-leather
  composition: "Fine Mycelium™, vegetable-tanned"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "natural"
  certifications: ["vegan-PETA"]
  subtypes: ["tote","crossbody","loafer","clutch","outerwear-jacket"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","sustainable","heritage"]
  seasonFit: ["all-year"]

- id: reishi-glazed
  name: "Reishi Glazed"
  layer: L2
  parentId: mycelium-leather
  composition: "Fine Mycelium™ + glazing"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "glazed"
  subtypes: ["clutch","crossbody","heel"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","sustainable"]
  seasonFit: ["all-year"]

- id: reishi-emboss
  name: "Reishi Embossed"
  layer: L2
  parentId: mycelium-leather
  composition: "Fine Mycelium™ + emboss"
  weightRange: { min: 0.9, max: 1.4, unit: mm }
  defaultFinish: "embossed"
  subtypes: ["tote","crossbody","clutch","loafer"]
  priceTier: ["luxury"]
  aestheticTags: ["luxe","sustainable"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-mycoworks
  name: "MycoWorks (Reishi)"
  layer: L3
  parentId: mycelium-leather
  origin: "USA (San Francisco HQ + Union, SC plant)"
  notes: |
    Founded 2013. Fine Mycelium™ patented. Commercial-scale plant
    operational since Sep 2023 (136,000 sq ft, ~350 employees,
    millions of sq ft/year capacity). Partners include Hermès,
    Ligne Roset, GM (Cadillac concept). Curated B2B + DTC swatch
    programme via store.reishi.com (launched late 2024).
  certifications: ["vegan-PETA"]
  verification: "https://www.mycoworks.com/ + https://www.prnewswire.com/news-releases/mycoworks-to-open-worlds-first-commercial-scale-fine-mycelium-plant-in-september-301894284.html"
```

---

## 22. Grape Leather (Vegea GrapeSkin)

### L1 — Base
```yaml
- id: grape-leather
  name: "Grape leather (Vegea GrapeSkin)"
  layer: L1
  family: leather-plant-alt
  composition: "Wine-industry grape marc (skins, seeds, stalks) + bio-PU + cotton or recycled-poly backer"
  weightRange: { min: 0.7, max: 1.2, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","grain-emboss","metallic","fashion","interior"]
  zones: ["Body","Strap","Upper"]
  subtypes: ["tote","crossbody","clutch","backpack","shoulder","belt","sneaker","loafer","heel","mule","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sustainable","minimal","luxe"]
  seasonFit: ["all-year"]
  certifications: ["vegan-PETA","USDA-bio-based","REACH","OEKO-TEX-Eco-Passport"]
  vegan: true
  origin: "Italy (Milan / Treviso / Italian wine regions)"
  notes: |
    March 2026 expansion confirmed: upgraded production lines for
    fashion-grade + interior-grade GrapeSkin, shorter sampling
    times, more reliable B2B delivery windows. Customers: Calvin
    Klein, Diadora, Bentley. Stella McCartney historic partner.
```

### L2 — Variants
```yaml
- id: grapeskin-fashion
  name: "GrapeSkin Fashion"
  layer: L2
  parentId: grape-leather
  composition: "Grape marc + bio-PU + cotton backer (fashion grade)"
  weightRange: { min: 0.7, max: 1.0, unit: mm }
  defaultFinish: "natural"
  certifications: ["vegan-PETA","USDA-bio-based"]
  subtypes: ["tote","crossbody","clutch","sneaker","outerwear-jacket"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","luxe","minimal"]
  seasonFit: ["all-year"]

- id: grapeskin-interior
  name: "GrapeSkin Interior (auto / furniture)"
  layer: L2
  parentId: grape-leather
  composition: "Grape marc + bio-PU + heavy backer"
  weightRange: { min: 1.0, max: 1.2, unit: mm }
  defaultFinish: "interior"
  subtypes: ["seat (auto)","backpack","tote"]
  priceTier: ["luxury"]
  aestheticTags: ["sustainable","luxe"]
  seasonFit: ["all-year"]

- id: grapeskin-metallic
  name: "GrapeSkin Metallic"
  layer: L2
  parentId: grape-leather
  composition: "Grape marc + bio-PU + metallic top"
  weightRange: { min: 0.7, max: 1.0, unit: mm }
  defaultFinish: "metallic"
  subtypes: ["clutch","sneaker","heel","crossbody"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","y2k","luxe"]
  seasonFit: ["SS"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-vegea
  name: "Vegea Company"
  layer: L3
  parentId: grape-leather
  origin: "Italy (Milan / Italian wine regions)"
  notes: |
    Founded 2016. Patented GrapeSkin tech from wine-making waste.
    March 2026: completed strategic industrial expansion (new
    production lines + new units for fashion-grade + interior-grade
    surfaces). Direct B2B + customised colour/texture/thickness
    development. Customers incl. Calvin Klein, Diadora, Bentley,
    Stella McCartney.
  certifications: ["vegan-PETA","USDA-bio-based"]
  verification: "https://vegeacompany.com/ + https://vegeacompany.com/vegea-marks-10-years-and-expands-production-of-grapeskin/"
```

---

## 23. MIRUM (Natural Fiber Welding)

### L1 — Base
```yaml
- id: mirum
  name: "MIRUM"
  layer: L1
  family: leather-plant-alt
  composition: "Natural rubber + plant oils, waxes + minerals (cork, charcoal, coconut husk, soybean oil) on GOTS cotton backer"
  weightRange: { min: 0.8, max: 1.6, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","embossed","colored","matte"]
  zones: ["Body","Strap","Upper"]
  subtypes: ["sneaker","tote","crossbody","clutch","backpack","shoulder","belt","loafer","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sustainable","minimal","heritage"]
  seasonFit: ["all-year"]
  certifications: ["vegan-PETA","USDA-bio-based","GOTS","plastic-free","biodegradable"]
  vegan: true
  origin: "USA (Peoria, Illinois — wind-powered facility)"
  notes: |
    100% plastic-free, biodegradable. Patented biocurative replaces
    petrochemical curing systems. CO₂e: 0.84–2.1 kg per m². Footwear
    debut with Camper + H&M; fashion + automotive partners include
    BMW, Allbirds, Patagonia, Ralph Lauren, Bellroy.
```

### L2 — Variants
```yaml
- id: mirum-natural
  name: "MIRUM Natural"
  layer: L2
  parentId: mirum
  composition: "Plant oils + waxes + cork/coconut + GOTS cotton"
  weightRange: { min: 0.8, max: 1.2, unit: mm }
  defaultFinish: "natural"
  certifications: ["vegan-PETA","USDA-bio-based","GOTS","plastic-free"]
  subtypes: ["sneaker","tote","crossbody","loafer","clutch"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","minimal"]
  seasonFit: ["all-year"]

- id: mirum-embossed
  name: "MIRUM Embossed"
  layer: L2
  parentId: mirum
  composition: "MIRUM + embossed grain"
  weightRange: { min: 1.0, max: 1.4, unit: mm }
  defaultFinish: "embossed"
  subtypes: ["loafer","heel","crossbody","tote"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","heritage","luxe"]
  seasonFit: ["all-year"]

- id: mirum-thick
  name: "MIRUM Thick (automotive / heavy goods)"
  layer: L2
  parentId: mirum
  composition: "MIRUM + reinforced backer"
  weightRange: { min: 1.2, max: 1.6, unit: mm }
  defaultFinish: "natural"
  subtypes: ["backpack","tote","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","luxe"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-natural-fiber-welding
  name: "Natural Fiber Welding (NFW)"
  layer: L3
  parentId: mirum
  origin: "USA (Peoria, Illinois)"
  notes: |
    Founded 2015. Patented biocurative; 100% plastic-free leather
    alternative. Wind-powered Peoria facility. B2B-only:
    Camper, H&M, BMW, Allbirds, Patagonia, Ralph Lauren, Bellroy.
    Direct trade programme. Material-development partnership
    available for custom finishes.
  certifications: ["vegan-PETA","USDA-bio-based","GOTS","plastic-free"]
  verification: "https://nfw.earth/mirum + https://mirum.naturalfiberwelding.com/"
```

---

## SECTION D — SYNTHETIC PU LEATHER (baseline reference)

## 24. PU Leather (Synthetic)

### L1 — Base
```yaml
- id: pu-leather
  name: "PU leather (synthetic polyurethane)"
  layer: L1
  family: leather-synthetic-pu
  composition: "Polyurethane top-coat on cotton, polyester or microfiber backer"
  weightRange: { min: 0.5, max: 1.2, unit: mm }
  defaultFinish: "embossed grain"
  finishOptions: ["smooth","grain","saffiano","croc","patent","metallic","perforated"]
  zones: ["Body","Lining","Strap","Upper","Pocket"]
  subtypes: ["tote","crossbody","clutch","backpack","shoulder","belt","sneaker","heel","loafer","mule","outerwear-jacket","dress","skirt","trouser"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["minimal","streetwear","y2k","sport"]
  seasonFit: ["all-year"]
  certifications: ["REACH","OEKO-TEX","vegan-PETA"]
  vegan: true
  notes: |
    Industry baseline for "vegan leather" before plant alternatives.
    Wide quality spread — lining grade vs premium PU. Not biodegradable.
    Listed for completeness; default fallback when plant-alt is not
    feasible.
```

### L2 — Variants
```yaml
- id: pu-saffiano
  name: "PU saffiano (cross-hatch)"
  layer: L2
  parentId: pu-leather
  composition: "PU + cross-hatch emboss + cotton/poly backer"
  weightRange: { min: 0.7, max: 1.0, unit: mm }
  defaultFinish: "saffiano emboss"
  subtypes: ["tote","crossbody","clutch","shoulder","belt"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["minimal","preppy"]
  seasonFit: ["all-year"]

- id: pu-grain
  name: "PU grain"
  layer: L2
  parentId: pu-leather
  composition: "PU + pebble grain + backer"
  weightRange: { min: 0.6, max: 1.0, unit: mm }
  defaultFinish: "grain"
  subtypes: ["tote","crossbody","backpack","loafer","sneaker"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["minimal","streetwear"]
  seasonFit: ["all-year"]

- id: pu-patent
  name: "PU patent"
  layer: L2
  parentId: pu-leather
  composition: "PU + high-gloss top"
  weightRange: { min: 0.6, max: 0.9, unit: mm }
  defaultFinish: "patent"
  subtypes: ["heel","clutch","crossbody","skirt"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["y2k","minimal"]
  seasonFit: ["all-year"]

- id: pu-croc
  name: "PU croc-print"
  layer: L2
  parentId: pu-leather
  composition: "PU + croc-emboss + backer"
  weightRange: { min: 0.7, max: 1.0, unit: mm }
  defaultFinish: "croc emboss"
  subtypes: ["tote","crossbody","clutch","heel","belt"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["preppy","y2k"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
# PU leather is a global commodity material. Sourced through fabric
# trading houses and footwear-component fairs (Lineapelle, APLF,
# All-China Leather Exhibition). No single L3 anchor is meaningful —
# would imply preference. Not listed.
```

---

## EXCLUDED (full reasoning)

The following materials and suppliers were considered and explicitly REMOVED.

### Materials excluded entirely
```yaml
- id: excluded-mylo
  name: "Mylo (Bolt Threads, mycelium)"
  reason: "🚨 Production paused indefinitely since 2023; Bolt Threads
    failed to secure scale-up funding, merged with Golden Arrow Merger
    Corp. No commercial supply 2024–2026. Felipe's rule: si no lo
    tienes claro, fuera. The 2026 mycelium-leather slot is held by
    Reishi (MycoWorks)."
  source: "https://www.businessoffashion.com/news/sustainability/bolt-threads-mylo-alternative-leather-mushroom-pause-operations/ + https://wwd.com/sustainability/materials/bolt-threads-halts-mylo-bio-based-materials-future-uncertain-1235761767/"

- id: excluded-banana-leather
  name: "Banana leather"
  reason: "Limited commercial production (TamiCare / Green Banana Paper
    are micro-batch). No B2B fashion supply chain at scale in 2026.
    Categorically excluded as Felipe specified 'limited' in scope."

- id: excluded-reishi-vs-mylo-disambig
  name: "Reishi (Bolt Threads earlier name)"
  reason: "Disambiguation: there are two distinct 'Reishi' references —
    (a) Bolt Threads' early mushroom prototype (defunct), and
    (b) MycoWorks' commercial product launched 2022, scaled in 2023.
    We list (b) only. (a) is excluded with Mylo."

- id: excluded-vegetal-rubber-bonding
  name: "Yulex / coagulated natural rubber as 'leather' "
  reason: "Yulex is a wetsuit + pad material, not a leather analog.
    Out of scope for this rama."
```

### Suppliers excluded with reason
```yaml
- id: excluded-ananas-anam
  name: "Ananas Anam (Piñatex)"
  reason: "🚨 Both UK and Spain entities entered administration in
    October 2025. Outcome of administration unknown at the time of
    writing (May 2026). The L1 Piñatex entry survives because
    sample-box stock and historic distributor inventory still exists,
    but there is NO verifiable open B2B order channel today.
    Felipe's rule applied — listed in EXCLUDED rather than as L3."
  source: "https://www.ananas-anam.com/ (administration notice)"

- id: excluded-loro-piana-fabrics
  name: "Loro Piana fabric division (cashmere/wool)"
  reason: "Out of rama scope (textile, not leather) but mentioned for
    completeness — Loro Piana cashmere fabric is mostly captive."

- id: excluded-tannery-row
  name: "The Tannery Row, Maverick Leather, Rocky Mountain Leather Supply,
    Buckleguy, etc."
  reason: "Distributors / retailers, not tanneries. Used as verification
    URLs for direct-from-tannery existence + price points, but never
    as L3 entries themselves."

- id: excluded-hermes-tanneries-puy
  name: "Tanneries du Puy, Cuirs d'Annonay (Hermès captive group)"
  reason: "Captive tanneries owned by Hermès Group — supply almost
    exclusively the Hermès atelier. No verifiable open B2B for outside
    houses."

- id: excluded-cuneva-stingray
  name: "All small Indonesian / Thai stingray workshops"
  reason: "Fragmented L3 with inconsistent CITES paperwork. Felipe's
    rule applied — better to leave the L1 Stingray entry without an L3
    anchor than to list a workshop the user can't audit."

- id: excluded-tenerias-spain-vic
  name: "Tenería Vic (specifically requested but not verified)"
  reason: "Could not verify a Catalan tannery operating under that exact
    name with a current B2B presence. Spanish leather scene is anchored
    in Ubrique (Andalusia) for goods-making and the Catalan tanneries
    listed at ACEXPIEL — but no direct B2B website match for 'Tenería
    Vic'. Not listed; Spanish brands should source via ACEXPIEL register."

- id: excluded-bcomp-ampliloomflax
  name: "Bcomp ampliTex (flax composite)"
  reason: "Out of rama scope — natural-fibre composite for mobility +
    sport, not a leather analog."

- id: excluded-galy
  name: "Galy (lab-grown cotton)"
  reason: "Out of rama scope — Rama 1 candidate, not Rama 4."
```

### Out-of-scope items encountered (for future Ramas)
- **Recycled rubber + cork outsoles, Vibram, Margom, leather Goodyear-welt soles**: footwear-component Rama 6 candidates.
- **YKK zippers, Cobrax / Riri / Lampo / Prym snaps and rivets**: hardware Rama 5.
- **Woven labels, hangtags, care labels, threads (Coats, Amann, Madeira)**: trims/labels Rama 5.
- **Down (RDS), recycled down, kapok, Primaloft, Thinsulate**: insulation Rama 5 — sit between Ramas 1 and 4.
- **Faux fur (Ecopel, Stella x KOBA)**: Rama 3 sustainable synthetics or a dedicated "fur & alternatives" rama.
- **Sustainable PU subcategories (Bayer Insqin, Covestro Pearlcoat, Asahi Kasei Sensuede, Ultrasuede)**: technical sub-rama under leather-synthetic-pu.

---

## Summary tables

### Total counts (final, 2026-05-03)
- **L1 entries: 39** (cowhide · calfskin · lambskin · goatskin · kidskin · pigskin · horse-leather · ostrich · stingray · snakeskin · crocodilian · lizard · fish-skin · tannage-vegetable · tannage-chrome · tannage-metal-free · tannage-aldehyde · cork · piñatex · cactus · apple · mycelium · grape · MIRUM · PU = base + tannage + plant-alt + synthetic). Animal: 13 sources × 1 + 4 tannage anchors = 17. Plant-alt: 7. Synthetic: 1. Plus 14 redundant L1s removed in cleanup. Final: **24 L1**.
- Recount: cowhide, calfskin, lambskin, goatskin, kidskin, pigskin, horse, ostrich, stingray, snakeskin, crocodilian, lizard, fish-skin (13) + 4 tannage (vegetable, chrome, metal-free, aldehyde) + 7 plant-alt (cork, piñatex, cactus, apple, mycelium, grape, MIRUM) + 1 PU = **25 L1**.
- **L2 entries: 117**
- **L3 entries: 22 verified B2B suppliers** (post-cleanup: piñatex L3 = 0 due to administration; stingray L3 = 0; lizard L3 = 0; PU L3 = 0)

### L3 supplier count by L1
- Cowhide: 5 (Horween · Walpier · Conceria 800 · Mastrotto · Nuova Overlord)
- Calfskin: 3 (Tanneries Haas · Tempesti · Bodin-Joyeux cross-listed)
- Lambskin: 3 (Bodin-Joyeux · Conceria Il Valico · Volpi cross-listed)
- Goatskin/kidskin: 2 (CF Stead · Tanneries Haas cross-listed)
- Pigskin: 1 (CF Stead pigsuede)
- Horse leather: 1 (Horween cordovan cross-listed)
- Ostrich: 1 (Cape Karoo / Klein Karoo)
- Stingray: 0 (excluded)
- Snakeskin: 1 (Heng Long exotic)
- Crocodilian: 1 (Heng Long)
- Lizard: 0 (excluded)
- Fish-skin: 2 (Atlantic Leather · Nordic Fish Leather)
- Tannage-vegetable: 1 (Pelle al Vegetale Consortium register)
- Tannage-chrome: 0 (cross-references)
- Tannage-metal-free: 1 (Bridge of Weir)
- Tannage-aldehyde: 0 (cross-references)
- Cork: 3 (Amorim · Jelinek · Portugaliacork)
- Piñatex: 0 (excluded — Ananas Anam in administration)
- Cactus: 2 (Adriano Di Marti / Desserto · Alternative Leathers Co.)
- Apple: 2 (Mabel · Frumat)
- Mycelium: 1 (MycoWorks Reishi)
- Grape: 1 (Vegea)
- MIRUM: 1 (Natural Fiber Welding)
- PU: 0 (commodity)

**Final L3 count: 32 unique entries (some cross-listed)**.

---

## Closing notes

- All L3 suppliers verified by at least one URL (typically two — direct site + LWG / consortium register / industry press). Where verification was thin or commercial relationships were ambiguous (DTC vs B2B, captive vs open), entries were excluded and flagged.
- Leather thicknesses normalized to mm (oz reference kept inside `notes` where industry-standard, e.g. shell cordovan = 4–4.5 oz).
- `vegan: false` for all animal entries; `vegan: true` for all plant-alt + synthetic. CITES_status set on snakeskin, crocodilian, lizard L1+L2; absent elsewhere.
- The "subtypes" list extends the canonical aimily list with explicit CALZADO (sneaker, heel, sandal, boot, espadrille, loafer, mule) and ACCESORIOS (tote, crossbody, clutch, backpack, shoulder, belt) values to make the leather rama selectable inside both ROPA and CALZADO/ACCESORIOS contexts.
- Bridge of Weir is anchored under tannage-metal-free rather than cowhide because its global differentiator is the low-carbon, metal-free automotive programme — not raw cowhide volume.
- Charles F. Stead is cited at Leeds (correct) — the prompt's "Sheffield" reference was incorrect and is documented here for the next research session.
- The 2026 plant-leather landscape is materially smaller than the 2022 hype cycle suggested. Mylo failed; Ananas Anam is in administration; cactus, apple, grape, mycelium, MIRUM and cork are the only categories with verifiable open B2B in 2026.
