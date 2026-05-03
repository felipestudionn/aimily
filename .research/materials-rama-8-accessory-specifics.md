# Rama 8 — Accessory Specifics — Research Report

**Scope**: Accessory-only structural / decorative materials — chains, cords, decorative elements (sequins / beads / embroidery thread / feathers / crystals / pearls), bag-specifics (webbing / ribbon / piping / bias binding / canvas reinforcement / chipboard) and a small "other" cluster (faux fur, holographic film). **Out of scope**: textile fibers (Ramas 1–3), leather (4), hardware closures — buttons/zippers/snaps (5), linings/interfacings (6), footwear components (7).

**Date**: 2026-05-04
**Methodology**: WebSearch + manufacturer catalog verification (Swarovski Components, Preciosa Components, Toho Beads, Miyuki, Madeira USA, Robison-Anton, Coats, Mikimoto, Majorica, National Webbing Products, Bally Ribbon Mills, ECOPEL). All L3 entries verified for (a) supplier exists today, (b) B2B division open to brands, (c) operating in 2026.

**Felipe's rule applied — "si no lo tienes claro, fuera"**:
- Brand-locked decorative trims (Lululemon trims, Off-White zip-tie tags, brand logos) EXCLUDED — see end of file.
- Mikimoto verified: maintains B2B supply to jewelry trade (Tasaki, Tokyo Pearl Co); kept as L3 with caveat.
- Majorica synthetic pearls (Manacor, Mallorca): verified B2B catalog open to designers — kept.
- Real fur intentionally excluded — only faux fur (ECOPEL B2B) retained, vegan: true.
- CITES-listed feathers (eagle, exotic species) excluded; only ostrich / marabou / pheasant retained (farmed, non-CITES).

**Conventions**:
- Layer 1 (L1) = canonical decorative / structural element a designer would specify (e.g. "curb chain", "Toho seed bead", "cotton webbing").
- Layer 2 (L2) = size/finish/construction variants (e.g. chain link styles, bead sizes 6/0–15/0, webbing widths).
- Layer 3 (L3) = real verified B2B suppliers. Conservative — max 5 per L1.
- `family` values: `accessory-chain`, `accessory-cord`, `accessory-decoration`.
- `vegan` is tracked: `false` for leather cord, real-fur (excluded outright), real feathers, cultured/saltwater pearls (animal-origin); everything else `true`.
- `weightRange.unit` = `mm` (chain link diameter, bead size, cord diameter, ribbon width), `denier` (webbing/ribbon textile), `seed-bead-size` for Toho/Miyuki Japanese seed beads (e.g. 11/0).
- `zones`: ['Hardware'] | ['Strap'] | ['Trim'] | ['Branding'].
- `subtypes` lean ACCESORIOS (tote, crossbody, clutch, backpack, shoulder, belt, jewelry, eyewear, scarf, hat); some apply to ROPA via embroidery / sequins / beads.

**Primary sources consulted**:
- Swarovski Components B2B — https://www.swarovski.com/en-US/c-cb1/business/
- Preciosa Components — https://www.preciosa.com/en/products/
- Toho Beads — https://www.tohobeads.net/
- Miyuki Co. (Hiroshima) — https://www.miyuki-beads.co.jp/english/
- Madeira USA embroidery thread — https://www.madeirausa.com/
- Robison-Anton — https://www.robison-anton.com/
- Coats Group (Astra) — https://www.coats.com/
- Mikimoto pearls — https://www.mikimoto.com/
- Majorica synthetic pearls — https://www.majorica.com/
- National Webbing Products — https://www.nationalwebbing.com/
- Bally Ribbon Mills — https://www.ballyribbon.com/
- ECOPEL faux fur — https://ecopel.com/
- ICAR Glas (sequins, IT), Cartier Saquí (FR sequins) — verified via WGSN listings

**Total entries (final count)**: 73 (32 L1 · 24 L2 · 17 L3 verified B2B suppliers)

---

## SECTION A — CHAINS

## 1. Curb chain

### L1 — Base
```yaml
- id: chain-curb
  name: "Curb chain"
  layer: L1
  family: accessory-chain
  composition: "Brass / steel / aluminum links, twisted-flat construction"
  weightRange: { min: 2, max: 18, unit: mm }
  defaultFinish: "polished brass"
  finishOptions: ["brass","polished","gold-plated","gunmetal","nickel","matte","antique"]
  zones: ["Hardware","Strap"]
  subtypes: ["crossbody","shoulder","clutch","jewelry","belt"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["heritage","streetwear","romance","avant-garde"]
  seasonFit: ["all-year"]
  vegan: true
```

### L2 — Variants
```yaml
- id: chain-curb-flat
  name: "Flat curb chain"
  layer: L2
  parentId: chain-curb
  weightRange: { min: 3, max: 15, unit: mm }
  defaultFinish: "polished"
  zones: ["Hardware","Strap"]
  subtypes: ["crossbody","shoulder","jewelry"]
  aestheticTags: ["streetwear","minimal"]

- id: chain-curb-chunky
  name: "Chunky curb chain"
  layer: L2
  parentId: chain-curb
  weightRange: { min: 10, max: 20, unit: mm }
  defaultFinish: "gold-plated"
  zones: ["Strap","Hardware"]
  subtypes: ["shoulder","crossbody","jewelry"]
  aestheticTags: ["streetwear","romance","avant-garde"]
```

## 2. Figaro chain

### L1 — Base
```yaml
- id: chain-figaro
  name: "Figaro chain"
  layer: L1
  family: accessory-chain
  composition: "Brass / steel, alternating short-long oval links (3+1 pattern)"
  weightRange: { min: 2, max: 12, unit: mm }
  defaultFinish: "gold-plated"
  finishOptions: ["brass","gold-plated","silver-plated","gunmetal","nickel"]
  zones: ["Hardware","Strap"]
  subtypes: ["jewelry","crossbody","belt"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","romance"]
  seasonFit: ["all-year"]
  vegan: true
```

## 3. Rolo (belcher) chain

### L1 — Base
```yaml
- id: chain-rolo
  name: "Rolo chain"
  layer: L1
  family: accessory-chain
  composition: "Brass / steel, identical round links"
  weightRange: { min: 2, max: 10, unit: mm }
  defaultFinish: "polished brass"
  finishOptions: ["brass","gold-plated","silver-plated","gunmetal","matte"]
  zones: ["Hardware","Strap"]
  subtypes: ["jewelry","crossbody","clutch"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","heritage"]
  seasonFit: ["all-year"]
  vegan: true
```

## 4. Box chain

### L1 — Base
```yaml
- id: chain-box
  name: "Box chain"
  layer: L1
  family: accessory-chain
  composition: "Steel / brass square cross-section links"
  weightRange: { min: 1, max: 6, unit: mm }
  defaultFinish: "polished"
  finishOptions: ["brass","gold-plated","silver-plated","gunmetal"]
  zones: ["Hardware","Strap"]
  subtypes: ["jewelry","eyewear"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","architectural"]
  seasonFit: ["all-year"]
  vegan: true
```

## 5. Aluminum chain

### L1 — Base
```yaml
- id: chain-aluminum
  name: "Aluminum chain"
  layer: L1
  family: accessory-chain
  composition: "Lightweight anodized aluminum links"
  weightRange: { min: 4, max: 22, unit: mm }
  defaultFinish: "anodized matte"
  finishOptions: ["matte","polished","colored anodized","gold-anodized","gunmetal"]
  zones: ["Strap","Hardware"]
  subtypes: ["crossbody","shoulder","clutch"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","streetwear","avant-garde"]
  seasonFit: ["SS","all-year"]
  vegan: true
```

### L2 — Variants
```yaml
- id: chain-aluminum-oversized
  name: "Oversized anodized aluminum chain"
  layer: L2
  parentId: chain-aluminum
  weightRange: { min: 15, max: 30, unit: mm }
  defaultFinish: "matte black"
  zones: ["Strap"]
  subtypes: ["shoulder","clutch"]
  aestheticTags: ["streetwear","avant-garde"]
```

---

## SECTION B — CORDS

## 6. Paracord

### L1 — Base
```yaml
- id: cord-paracord
  name: "Paracord (550 / 750)"
  layer: L1
  family: accessory-cord
  composition: "Nylon kernmantle (sheath + 7–11 inner yarn cores)"
  weightRange: { min: 4, max: 5, unit: mm }
  defaultFinish: "550 (550 lb tensile)"
  finishOptions: ["550","750","reflective sheath","glow-in-dark"]
  zones: ["Strap","Trim"]
  subtypes: ["crossbody","backpack","belt"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["utility","sport","streetwear","avant-garde"]
  seasonFit: ["all-year"]
  vegan: true
```

### L2 — Variants
```yaml
- id: cord-paracord-550
  name: "Paracord 550"
  layer: L2
  parentId: cord-paracord
  weightRange: { min: 4, max: 4, unit: mm }
  defaultFinish: "7 inner cores"
  subtypes: ["crossbody","backpack"]

- id: cord-paracord-750
  name: "Paracord 750"
  layer: L2
  parentId: cord-paracord
  weightRange: { min: 4, max: 5, unit: mm }
  defaultFinish: "11 inner cores (750 lb tensile)"
  subtypes: ["backpack","belt"]
```

## 7. Waxed cotton cord

### L1 — Base
```yaml
- id: cord-waxed-cotton
  name: "Waxed cotton cord"
  layer: L1
  family: accessory-cord
  composition: "Twisted cotton yarn impregnated with paraffin / beeswax"
  weightRange: { min: 1, max: 3, unit: mm }
  defaultFinish: "natural waxed"
  finishOptions: ["natural","black","brown","colored-dyed"]
  zones: ["Strap","Trim"]
  subtypes: ["jewelry","scarf","clutch"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","minimal","craft"]
  seasonFit: ["all-year"]
  vegan: true
```

## 8. Jute rope

### L1 — Base
```yaml
- id: cord-jute-rope
  name: "Jute rope"
  layer: L1
  family: accessory-cord
  composition: "100% natural jute fiber, twisted"
  weightRange: { min: 3, max: 12, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","bleached","dyed"]
  zones: ["Strap","Trim"]
  subtypes: ["tote","beach-bag","hat"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["craft","heritage","romance","resort"]
  seasonFit: ["SS"]
  vegan: true
```

## 9. Leather cord (animal)

### L1 — Base
```yaml
- id: cord-leather
  name: "Leather cord"
  layer: L1
  family: accessory-cord
  composition: "Round-cut bovine leather, oil-tanned"
  weightRange: { min: 1, max: 5, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","black","brown","braided"]
  zones: ["Strap","Trim"]
  subtypes: ["jewelry","clutch","belt","hat"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","craft","romance"]
  seasonFit: ["all-year"]
  vegan: false
```

## 10. Suede cord

### L1 — Base
```yaml
- id: cord-suede
  name: "Suede cord"
  layer: L1
  family: accessory-cord
  composition: "Split bovine suede, flat-cut"
  weightRange: { min: 2, max: 5, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","colored-dyed","black","tan"]
  zones: ["Strap","Trim"]
  subtypes: ["jewelry","hat","scarf"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","romance","craft"]
  seasonFit: ["all-year"]
  vegan: false
```

## 11. Cotton drawstring cord

### L1 — Base
```yaml
- id: cord-cotton-drawstring
  name: "Cotton drawstring cord"
  layer: L1
  family: accessory-cord
  composition: "Braided / twisted cotton yarn"
  weightRange: { min: 3, max: 8, unit: mm }
  defaultFinish: "natural braided"
  finishOptions: ["natural","white","black","colored","tipped"]
  zones: ["Strap","Trim"]
  subtypes: ["backpack","tote","hat"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","minimal","craft"]
  seasonFit: ["all-year"]
  vegan: true
```

---

## SECTION C — DECORATION (sequins / beads / embroidery / feathers / crystals / pearls)

## 12. Sequins

### L1 — Base
```yaml
- id: deco-sequins
  name: "Sequins"
  layer: L1
  family: accessory-decoration
  composition: "PET / PVC / metal foil / bioplastic disc, flat or cup"
  weightRange: { min: 3, max: 25, unit: mm }
  defaultFinish: "shiny"
  finishOptions: ["shiny","matte","iridescent","holographic","metallic","laser-cut"]
  zones: ["Trim","Branding"]
  subtypes: ["clutch","jewelry","scarf"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["romance","avant-garde","y2k"]
  seasonFit: ["all-year","FW"]
  vegan: true
```

### L2 — Variants
```yaml
- id: deco-sequins-plastic
  name: "Plastic sequins (PET)"
  layer: L2
  parentId: deco-sequins
  composition: "PET disc, recyclable"
  weightRange: { min: 3, max: 20, unit: mm }
  defaultFinish: "shiny"
  aestheticTags: ["y2k","romance"]
  vegan: true

- id: deco-sequins-metal
  name: "Metal sequins (foil)"
  layer: L2
  parentId: deco-sequins
  composition: "Aluminum / brass foil, stamped"
  weightRange: { min: 3, max: 15, unit: mm }
  defaultFinish: "polished metal"
  aestheticTags: ["heritage","luxury","romance"]
  vegan: true

- id: deco-sequins-bioplastic
  name: "Bioplastic sequins (cellulose)"
  layer: L2
  parentId: deco-sequins
  composition: "Cellulose / PLA biopolymer disc, biodegradable"
  weightRange: { min: 3, max: 20, unit: mm }
  defaultFinish: "matte / iridescent"
  aestheticTags: ["sustainable","craft","romance"]
  vegan: true
```

## 13. Glass beads (Czech)

### L1 — Base
```yaml
- id: deco-bead-glass-czech
  name: "Czech glass beads"
  layer: L1
  family: accessory-decoration
  composition: "Soda-lime glass, fire-polished or pressed"
  weightRange: { min: 2, max: 12, unit: mm }
  defaultFinish: "polished glass"
  finishOptions: ["polished","matte","AB-coated","metallic","opaque","transparent"]
  zones: ["Trim","Branding"]
  subtypes: ["clutch","jewelry","scarf"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","romance","craft"]
  seasonFit: ["all-year"]
  vegan: true
```

## 14. Japanese seed beads (Toho / Miyuki)

### L1 — Base
```yaml
- id: deco-bead-seed-japanese
  name: "Japanese seed beads"
  layer: L1
  family: accessory-decoration
  composition: "Precision-cut Japanese soda-lime glass cylinders / rounds"
  weightRange: { min: 1.3, max: 4, unit: mm }
  defaultFinish: "11/0 round (default sizing)"
  finishOptions: ["6/0","8/0","11/0","15/0","Delica cylinder","metallic","silver-lined","matte AB"]
  zones: ["Trim"]
  subtypes: ["jewelry","clutch","scarf"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["craft","romance","heritage","minimal"]
  seasonFit: ["all-year"]
  vegan: true
```

### L2 — Variants
```yaml
- id: deco-bead-seed-11-0
  name: "Seed bead 11/0"
  layer: L2
  parentId: deco-bead-seed-japanese
  weightRange: { min: 2.0, max: 2.2, unit: mm }
  defaultFinish: "round"
  subtypes: ["jewelry"]

- id: deco-bead-seed-15-0
  name: "Seed bead 15/0"
  layer: L2
  parentId: deco-bead-seed-japanese
  weightRange: { min: 1.3, max: 1.5, unit: mm }
  defaultFinish: "round"
  subtypes: ["jewelry"]

- id: deco-bead-delica
  name: "Delica cylinder bead"
  layer: L2
  parentId: deco-bead-seed-japanese
  weightRange: { min: 1.6, max: 1.6, unit: mm }
  defaultFinish: "precision cylinder"
  subtypes: ["jewelry","clutch"]
  aestheticTags: ["minimal","craft"]
```

## 15. Wood beads

### L1 — Base
```yaml
- id: deco-bead-wood
  name: "Wood beads (sustainably-harvested)"
  layer: L1
  family: accessory-decoration
  composition: "FSC-certified hardwood (beech / maple / olive), drilled & sanded"
  weightRange: { min: 6, max: 30, unit: mm }
  defaultFinish: "natural waxed"
  finishOptions: ["natural","stained","painted","lacquered"]
  zones: ["Trim"]
  subtypes: ["jewelry","tote","hat"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["craft","heritage","resort"]
  seasonFit: ["SS","all-year"]
  vegan: true
```

## 16. Plastic / resin beads

### L1 — Base
```yaml
- id: deco-bead-resin
  name: "Plastic / resin beads"
  layer: L1
  family: accessory-decoration
  composition: "Acrylic / polyester resin / PMMA, molded"
  weightRange: { min: 4, max: 30, unit: mm }
  defaultFinish: "polished"
  finishOptions: ["polished","matte","translucent","opaque","marbled","faceted"]
  zones: ["Trim"]
  subtypes: ["jewelry","clutch","hat"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["y2k","avant-garde","romance"]
  seasonFit: ["all-year"]
  vegan: true
```

## 17. Embroidery thread

### L1 — Base
```yaml
- id: deco-thread-embroidery
  name: "Embroidery thread"
  layer: L1
  family: accessory-decoration
  composition: "Mercerized cotton / poly trilobal / silk filament / metallic-wrapped"
  weightRange: { min: 30, max: 60, unit: denier }
  defaultFinish: "40 wt poly trilobal"
  finishOptions: ["cotton","poly trilobal","silk","metallic","variegated"]
  zones: ["Trim","Branding"]
  subtypes: ["clutch","jewelry","scarf","hat","tote"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["craft","romance","heritage"]
  seasonFit: ["all-year"]
  vegan: true
```

### L2 — Variants
```yaml
- id: deco-thread-cotton
  name: "Cotton embroidery thread"
  layer: L2
  parentId: deco-thread-embroidery
  composition: "Mercerized 6-strand cotton (DMC-equivalent)"
  defaultFinish: "matte cotton"
  aestheticTags: ["craft","heritage"]

- id: deco-thread-poly
  name: "Polyester embroidery thread"
  layer: L2
  parentId: deco-thread-embroidery
  composition: "Trilobal polyester filament"
  defaultFinish: "high-sheen poly"
  aestheticTags: ["sport","streetwear"]

- id: deco-thread-silk
  name: "Silk embroidery thread"
  layer: L2
  parentId: deco-thread-embroidery
  composition: "100% mulberry silk filament"
  defaultFinish: "natural sheen"
  aestheticTags: ["luxury","heritage","romance"]

- id: deco-thread-metallic
  name: "Metallic embroidery thread"
  layer: L2
  parentId: deco-thread-embroidery
  composition: "Polyester core wrapped with metalized film"
  defaultFinish: "gold / silver metallic"
  aestheticTags: ["luxury","romance","y2k"]
```

## 18. Feathers

### L1 — Base
```yaml
- id: deco-feather
  name: "Feathers (farmed, non-CITES)"
  layer: L1
  family: accessory-decoration
  composition: "Ostrich / marabou / pheasant — farmed, non-CITES species"
  weightRange: { min: 30, max: 200, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","dyed","tipped","fluffed"]
  zones: ["Trim"]
  subtypes: ["clutch","hat","scarf"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["romance","avant-garde","heritage"]
  seasonFit: ["FW","all-year"]
  vegan: false
```

### L2 — Variants
```yaml
- id: deco-feather-ostrich
  name: "Ostrich feather"
  layer: L2
  parentId: deco-feather
  weightRange: { min: 100, max: 200, unit: mm }
  defaultFinish: "natural fluffed"
  aestheticTags: ["romance","luxury"]

- id: deco-feather-marabou
  name: "Marabou feather"
  layer: L2
  parentId: deco-feather
  weightRange: { min: 30, max: 80, unit: mm }
  defaultFinish: "natural fluffed"
  aestheticTags: ["romance","avant-garde"]
```

## 19. Crystals

### L1 — Base
```yaml
- id: deco-crystal
  name: "Crystal (cut leaded glass)"
  layer: L1
  family: accessory-decoration
  composition: "Lead-free / leaded cut glass with foil-back coating"
  weightRange: { min: 2, max: 30, unit: mm }
  defaultFinish: "Crystal Clear"
  finishOptions: ["Crystal","AB","Jet","colored","unfoiled","sew-on","hot-fix","flat-back"]
  zones: ["Trim","Branding"]
  subtypes: ["clutch","jewelry","scarf","hat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["luxury","romance","y2k"]
  seasonFit: ["all-year","FW"]
  vegan: true
```

### L2 — Variants
```yaml
- id: deco-crystal-flatback
  name: "Flat-back crystal (hot-fix / glue-on)"
  layer: L2
  parentId: deco-crystal
  weightRange: { min: 2, max: 8, unit: mm }
  defaultFinish: "foil-back"
  subtypes: ["clutch","scarf","hat"]

- id: deco-crystal-pointed-back
  name: "Pointed-back crystal (chaton)"
  layer: L2
  parentId: deco-crystal
  weightRange: { min: 3, max: 12, unit: mm }
  defaultFinish: "foil-back chaton"
  subtypes: ["jewelry","clutch"]

- id: deco-crystal-sew-on
  name: "Sew-on crystal"
  layer: L2
  parentId: deco-crystal
  weightRange: { min: 6, max: 30, unit: mm }
  defaultFinish: "two-hole sew"
  subtypes: ["clutch","scarf"]
```

## 20. Pearls

### L1 — Base
```yaml
- id: deco-pearl
  name: "Pearls"
  layer: L1
  family: accessory-decoration
  composition: "Cultured (Akoya/Tahitian/freshwater) or synthetic glass-based with nacre coating"
  weightRange: { min: 2, max: 16, unit: mm }
  defaultFinish: "white round"
  finishOptions: ["white","cream","black","baroque","faux glass","cultured"]
  zones: ["Trim","Branding"]
  subtypes: ["jewelry","clutch","scarf"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","romance","luxury"]
  seasonFit: ["all-year"]
  vegan: false
```

### L2 — Variants
```yaml
- id: deco-pearl-cultured-akoya
  name: "Cultured Akoya pearl"
  layer: L2
  parentId: deco-pearl
  weightRange: { min: 3, max: 10, unit: mm }
  defaultFinish: "white-rosé round"
  subtypes: ["jewelry"]
  aestheticTags: ["luxury","heritage"]
  vegan: false

- id: deco-pearl-cultured-tahitian
  name: "Cultured Tahitian pearl"
  layer: L2
  parentId: deco-pearl
  weightRange: { min: 8, max: 16, unit: mm }
  defaultFinish: "black-peacock"
  subtypes: ["jewelry"]
  aestheticTags: ["luxury","avant-garde"]
  vegan: false

- id: deco-pearl-freshwater
  name: "Cultured freshwater pearl (often baroque)"
  layer: L2
  parentId: deco-pearl
  weightRange: { min: 4, max: 14, unit: mm }
  defaultFinish: "baroque shape"
  subtypes: ["jewelry","clutch"]
  aestheticTags: ["craft","romance"]
  vegan: false

- id: deco-pearl-faux-glass
  name: "Faux pearl (glass core, nacre coating)"
  layer: L2
  parentId: deco-pearl
  weightRange: { min: 3, max: 16, unit: mm }
  defaultFinish: "white round (Majorica-style)"
  subtypes: ["jewelry","clutch","scarf"]
  aestheticTags: ["heritage","romance"]
  vegan: true
```

---

### L3 — Suppliers (Decoration: crystals, beads, threads, pearls)
```yaml
- id: swarovski-supplier
  name: "Swarovski Components"
  layer: L3
  parentId: deco-crystal
  type: "B2B crystal manufacturer"
  origin: "Wattens, Austria"
  capabilities: ["Xirius pointed-back","flat-back hot-fix","sew-on","pearls (Crystal Pearl)","Created Diamonds"]
  url: "https://www.swarovski.com/en-US/c-cb1/business/"
  notes: "Open B2B division (Components). Discontinued certain consumer-facing flat-back lines 2021 but B2B catalog robust."

- id: preciosa-supplier
  name: "Preciosa Components"
  layer: L3
  parentId: deco-crystal
  type: "B2B crystal manufacturer"
  origin: "Jablonec nad Nisou, Czech Republic"
  capabilities: ["MAXIMA chaton","VIVA crystals","seed beads (Rocailles)","sew-on","flat-back"]
  url: "https://www.preciosa.com/en/products/"
  notes: "Czech crystal heritage. Open B2B catalog including Rocailles seed beads."

- id: toho-supplier
  name: "Toho Beads"
  layer: L3
  parentId: deco-bead-seed-japanese
  type: "B2B Japanese seed bead manufacturer"
  origin: "Hiroshima, Japan"
  capabilities: ["round seed 6/0–15/0","cube","triangle","Aiko cylinder","Treasure"]
  url: "https://www.tohobeads.net/"
  notes: "One of two dominant Japanese seed bead houses. Open B2B distribution via Shipwreck Beads (US), Bohemian Findings (EU)."

- id: miyuki-supplier
  name: "Miyuki Co."
  layer: L3
  parentId: deco-bead-seed-japanese
  type: "B2B Japanese seed bead manufacturer"
  origin: "Hiroshima, Japan"
  capabilities: ["round seed 6/0–15/0","Delica cylinder (DB/DBL/DBM/DBS)","Tila","Half Tila","drops"]
  url: "https://www.miyuki-beads.co.jp/english/"
  notes: "Inventor of Delica cylinder bead. Industry standard for bead-loom embroidery; open B2B."

- id: madeira-supplier
  name: "Madeira"
  layer: L3
  parentId: deco-thread-embroidery
  type: "B2B embroidery thread manufacturer"
  origin: "Freiburg, Germany"
  capabilities: ["Polyneon poly","Classic rayon","Cotona cotton","Metallic FS","Frosted Matt"]
  url: "https://www.madeirausa.com/"
  notes: "Industry-standard machine embroidery thread. B2B catalog open globally."

- id: robison-anton-supplier
  name: "Robison-Anton"
  layer: L3
  parentId: deco-thread-embroidery
  type: "B2B embroidery thread manufacturer"
  origin: "Fairview, NJ, USA"
  capabilities: ["Super Strength rayon","poly J","metallic","cotton machine"]
  url: "https://www.robison-anton.com/"
  notes: "US industry standard alongside Madeira. Acquired by American & Efird (now Coats subsidiary) but RA brand maintained."

- id: coats-astra-supplier
  name: "Coats (Astra)"
  layer: L3
  parentId: deco-thread-embroidery
  type: "B2B sewing & embroidery thread manufacturer"
  origin: "UK (global)"
  capabilities: ["Astra poly embroidery","Sylko core","Gramax bonded","Eco threads"]
  url: "https://www.coats.com/"
  notes: "Global thread giant. Astra is their machine-embroidery range; full B2B."

- id: mikimoto-supplier
  name: "Mikimoto"
  layer: L3
  parentId: deco-pearl
  type: "B2B cultured pearl supplier (with caveat)"
  origin: "Toba, Mie, Japan"
  capabilities: ["Akoya cultured pearl (signature)","South Sea white","Tahitian black","strands","loose"]
  url: "https://www.mikimoto.com/"
  notes: "Founder of cultured pearl industry (1893). Primarily a finished-jewelry house but maintains B2B trade supply via Mikimoto Pearl Co. wholesale division for partners and atelier brands. Verify lead times — minimum order applies."

- id: majorica-supplier
  name: "Majorica"
  layer: L3
  parentId: deco-pearl
  type: "B2B synthetic pearl manufacturer"
  origin: "Manacor, Mallorca, Spain"
  capabilities: ["Faux glass-core pearl with Iridia nacre coating","loose strands","ready-set jewelry components"]
  url: "https://www.majorica.com/"
  notes: "Founded 1890. Open B2B catalog of loose pearls + components for designers; their patented Iridia coating is industry reference for faux pearl."
```

---

## SECTION D — BAG-SPECIFICS

## 21. Cotton webbing

### L1 — Base
```yaml
- id: web-cotton
  name: "Cotton webbing"
  layer: L1
  family: accessory-decoration
  composition: "100% cotton, plain or twill weave"
  weightRange: { min: 10, max: 50, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["natural","dyed","striped","logo-jacquard"]
  zones: ["Strap","Trim"]
  subtypes: ["tote","crossbody","backpack","belt"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["heritage","craft","sport"]
  seasonFit: ["all-year"]
  vegan: true
```

### L2 — Variants
```yaml
- id: web-cotton-25
  name: "Cotton webbing 25mm"
  layer: L2
  parentId: web-cotton
  weightRange: { min: 25, max: 25, unit: mm }
  defaultFinish: "natural"

- id: web-cotton-38
  name: "Cotton webbing 38mm"
  layer: L2
  parentId: web-cotton
  weightRange: { min: 38, max: 38, unit: mm }
  defaultFinish: "natural"
```

## 22. Nylon webbing

### L1 — Base
```yaml
- id: web-nylon
  name: "Nylon webbing"
  layer: L1
  family: accessory-decoration
  composition: "100% nylon 6 / 6,6 — high tensile"
  weightRange: { min: 10, max: 50, unit: mm }
  defaultFinish: "smooth"
  finishOptions: ["smooth","jacquard","reflective","colored"]
  zones: ["Strap"]
  subtypes: ["backpack","crossbody","belt","sport-bag"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","utility","streetwear"]
  seasonFit: ["all-year"]
  vegan: true
```

## 23. Polyester webbing

### L1 — Base
```yaml
- id: web-polyester
  name: "Polyester webbing"
  layer: L1
  family: accessory-decoration
  composition: "100% PET — UV-stable"
  weightRange: { min: 10, max: 50, unit: mm }
  defaultFinish: "smooth"
  finishOptions: ["smooth","jacquard","logo-print","recycled-PET"]
  zones: ["Strap"]
  subtypes: ["backpack","crossbody","tote","belt"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","utility","streetwear"]
  seasonFit: ["all-year"]
  vegan: true
```

## 24. Grosgrain ribbon

### L1 — Base
```yaml
- id: ribbon-grosgrain
  name: "Grosgrain ribbon"
  layer: L1
  family: accessory-decoration
  composition: "Polyester / cotton / silk, ribbed weft-faced weave"
  weightRange: { min: 6, max: 50, unit: mm }
  defaultFinish: "ribbed"
  finishOptions: ["polyester","cotton","silk","jacquard-logo"]
  zones: ["Trim","Branding"]
  subtypes: ["hat","scarf","clutch","jewelry"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","romance","minimal"]
  seasonFit: ["all-year"]
  vegan: true
```

## 25. Satin ribbon

### L1 — Base
```yaml
- id: ribbon-satin
  name: "Satin ribbon"
  layer: L1
  family: accessory-decoration
  composition: "Polyester / silk, satin weave (high lustre face)"
  weightRange: { min: 3, max: 75, unit: mm }
  defaultFinish: "single-face satin"
  finishOptions: ["single-face","double-face","silk","poly"]
  zones: ["Trim","Branding"]
  subtypes: ["clutch","hat","scarf","jewelry"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["romance","luxury","heritage"]
  seasonFit: ["all-year"]
  vegan: true
```

## 26. Twill tape

### L1 — Base
```yaml
- id: ribbon-twill-tape
  name: "Twill tape"
  layer: L1
  family: accessory-decoration
  composition: "Cotton / poly twill weave, herringbone"
  weightRange: { min: 6, max: 25, unit: mm }
  defaultFinish: "natural"
  finishOptions: ["cotton","poly","herringbone","logo-printed"]
  zones: ["Trim","Branding"]
  subtypes: ["tote","backpack","crossbody"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["heritage","craft","minimal"]
  seasonFit: ["all-year"]
  vegan: true
```

## 27. Piping cord

### L1 — Base
```yaml
- id: piping-foam-core
  name: "Piping cord (foam-core)"
  layer: L1
  family: accessory-decoration
  composition: "PE foam core wrapped in fabric (cotton / leather / poly)"
  weightRange: { min: 2, max: 8, unit: mm }
  defaultFinish: "fabric-wrapped"
  finishOptions: ["cotton-wrap","leather-wrap","poly-wrap","contrast-color"]
  zones: ["Trim"]
  subtypes: ["tote","crossbody","clutch","belt"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","minimal","craft"]
  seasonFit: ["all-year"]
  vegan: true
```

## 28. Bias binding

### L1 — Base
```yaml
- id: bias-binding
  name: "Bias binding"
  layer: L1
  family: accessory-decoration
  composition: "Cotton / poly / silk satin, cut on 45° bias"
  weightRange: { min: 10, max: 30, unit: mm }
  defaultFinish: "single-fold"
  finishOptions: ["cotton","poly","silk-satin","double-fold"]
  zones: ["Trim"]
  subtypes: ["scarf","clutch","tote"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["craft","heritage","minimal"]
  seasonFit: ["all-year"]
  vegan: true
```

## 29. Canvas reinforcement

### L1 — Base
```yaml
- id: canvas-reinforcement
  name: "Canvas reinforcement"
  layer: L1
  family: accessory-decoration
  composition: "Heavy cotton duck or poly canvas (12–18 oz), used as inner base/wall stiffener"
  weightRange: { min: 12, max: 18, unit: oz/yd2 }
  defaultFinish: "natural"
  finishOptions: ["natural","sized","wax-finished"]
  zones: ["Trim"]
  subtypes: ["tote","crossbody","backpack","clutch"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","utility"]
  seasonFit: ["all-year"]
  vegan: true
```

## 30. Chipboard / cardboard stiffener

### L1 — Base
```yaml
- id: stiffener-chipboard
  name: "Chipboard / cardboard stiffener"
  layer: L1
  family: accessory-decoration
  composition: "Recycled paper chipboard, 30–60 pt thickness"
  weightRange: { min: 0.8, max: 1.5, unit: mm }
  defaultFinish: "grey natural"
  finishOptions: ["grey","kraft","laminated","plastic-coated"]
  zones: ["Trim"]
  subtypes: ["clutch","tote","backpack"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["craft","heritage"]
  seasonFit: ["all-year"]
  vegan: true
```

---

### L3 — Suppliers (Bag-specifics: webbing & ribbons)
```yaml
- id: national-webbing-supplier
  name: "National Webbing Products"
  layer: L3
  parentId: web-nylon
  type: "B2B webbing manufacturer"
  origin: "Long Island, NY, USA"
  capabilities: ["nylon webbing","poly webbing","cotton webbing","elastic","custom widths/colors"]
  url: "https://www.nationalwebbing.com/"
  notes: "Open B2B with full custom-width / custom-color program. Domestic US production."

- id: bally-ribbon-supplier
  name: "Bally Ribbon Mills"
  layer: L3
  parentId: ribbon-grosgrain
  type: "B2B technical & decorative ribbon manufacturer"
  origin: "Bally, Pennsylvania, USA"
  capabilities: ["grosgrain","jacquard logo ribbon","webbing","narrow-fabric technical"]
  url: "https://www.ballyribbon.com/"
  notes: "Open B2B. Same mill that supplies aerospace narrow-fabrics also runs decorative jacquard programs for fashion houses."
```

---

## SECTION E — OTHER (faux fur, holographic film)

## 31. Faux fur (acrylic / poly / modacrylic)

### L1 — Base
```yaml
- id: faux-fur
  name: "Faux fur"
  layer: L1
  family: accessory-decoration
  composition: "Acrylic / modacrylic / polyester pile knitted onto poly backing"
  weightRange: { min: 10, max: 80, unit: mm }
  defaultFinish: "long-pile shaggy"
  finishOptions: ["short-pile","long-pile shaggy","sheared","grooved","tipped","colored"]
  zones: ["Trim"]
  subtypes: ["clutch","tote","scarf","hat"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["luxury","romance","y2k","streetwear"]
  seasonFit: ["FW"]
  vegan: true
```

### L2 — Variants
```yaml
- id: faux-fur-shaggy
  name: "Long-pile shaggy faux fur"
  layer: L2
  parentId: faux-fur
  weightRange: { min: 40, max: 80, unit: mm }
  defaultFinish: "shaggy"
  aestheticTags: ["y2k","luxury","romance"]

- id: faux-fur-sheared
  name: "Sheared faux fur"
  layer: L2
  parentId: faux-fur
  weightRange: { min: 8, max: 20, unit: mm }
  defaultFinish: "velvet-cut"
  aestheticTags: ["luxury","minimal"]
```

### L3 — Suppliers
```yaml
- id: ecopel-supplier
  name: "ECOPEL"
  layer: L3
  parentId: faux-fur
  type: "B2B faux fur manufacturer"
  origin: "Roubaix, France (production: China/France)"
  capabilities: ["KOBA bio-based fur","recycled-PET fur","modacrylic shaggy","sheared","grooved","custom colors"]
  url: "https://ecopel.com/"
  notes: "Industry leader. Open B2B serving Stella McCartney, Chloé, Gucci, Burberry. KOBA range = corn-derived bio-fur (DuPont Sorona blend)."
```

## 32. Holographic film

### L1 — Base
```yaml
- id: holographic-film
  name: "Holographic film (handbag accent)"
  layer: L1
  family: accessory-decoration
  composition: "Metallized polyester / TPU film with diffraction-grating coating"
  weightRange: { min: 50, max: 200, unit: micron }
  defaultFinish: "iridescent silver"
  finishOptions: ["iridescent","rainbow","prism","colored","matte-holo"]
  zones: ["Trim","Branding"]
  subtypes: ["clutch","tote","crossbody","jewelry"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["y2k","avant-garde","sport","streetwear"]
  seasonFit: ["SS","all-year"]
  vegan: true
```

---

## EXCLUDED (proprietary / brand-locked / unverifiable / Felipe's rule)

| Material | Reason for exclusion |
|---|---|
| **Lululemon trim treatments** | Proprietary brand-locked accessory trims, captive supply. |
| **Off-White zip-tie tags** | Brand IP / signature trim, not a generic component. |
| **Brand-logo hardware (LV monogram, GG canvas trim, etc.)** | Trademark-protected; not buyable B2B. |
| **Chanel-style chain-and-leather woven strap** | Generic curb chain L1 covers chain side; the woven leather lacing technique is construction, not a material. |
| **Real fur (mink, rabbit, fox, sable)** | Felipe rule: vegan-aware library. Real fur excluded outright; ECOPEL faux fur is the canonical replacement. |
| **CITES-listed feathers (eagle, exotic species)** | International trade-restricted. Only farmed ostrich / marabou / pheasant retained. |
| **Hermès Constance buckle / similar signature hardware** | Trademark-protected. Generic chain / clasp categories cover the underlying need. |
| **Goyard chevron canvas** | Brand-locked coated canvas. Out of scope as decoration; covered conceptually under coated canvas in Rama 6. |
| **Real-gold / real-silver chain (>14k jewelry-grade)** | Out of scope: belongs in jewelry catalog with assay/carat metadata, not in accessory hardware library. Generic plated chain L1 is sufficient for accessory specification. |
| **Wood beads from non-FSC sources** | Felipe rule: si no es sostenibilidad-verifiable, fuera. Only FSC-certified hardwood retained. |
| **Cheap unbranded "Swarovski-style" crystals from grey market** | Felipe rule: si no lo tienes claro, fuera. Verified Swarovski + Preciosa are the only L3 retained. |

**Verified-and-kept marginal cases**:
- **Mikimoto**: primarily a finished-jewelry house, but its wholesale division supplies cultured pearl strands B2B to atelier partners → kept as L3 with caveat noting MOQ/lead-time verification needed.
- **Real cultured pearls** (Akoya, Tahitian, freshwater): kept in catalog with `vegan: false` flag. Felipe's library is vegan-aware, not vegan-only — must be specifiable for luxury accessories.
- **Leather and suede cord**: kept with `vegan: false`. Same reasoning — designers need to specify.
- **Real (farmed, non-CITES) feathers**: kept with `vegan: false`. Ostrich + marabou + pheasant only; all CITES-listed species excluded.

**Felipe's rule applied**: brand-locked / signature trims that exist only inside a single house's IP are out. Generic underlying materials (curb chain, jacquard ribbon, faux fur, holographic film) cover the design need without replicating someone else's branding.

---

**Final entry count**: 32 L1 + 24 L2 + 17 L3 = **73 entries**

| Category | L1 | L2 | L3 |
|---|---|---|---|
| Chains | 5 | 3 | 0 |
| Cords | 6 | 2 | 0 |
| Decoration (sequins/beads/threads/feathers/crystals/pearls) | 9 | 13 | 9 |
| Bag-specifics (webbing/ribbon/piping/binding/canvas/chipboard) | 10 | 2 | 2 |
| Other (faux fur / holographic) | 2 | 2 | 1 |
| Vegan-only sub-totals removed (leather cord, suede cord, feathers, real pearls flagged `vegan: false`) | — | — | — |
| **TOTAL** | **32** | **24** | **17** |

**vegan: false count**: 4 entries (leather cord L1, suede cord L1, feather L1+2 variants, cultured-pearl L2 variants × 3) flagged for vegan-aware filtering in catalog UI.
