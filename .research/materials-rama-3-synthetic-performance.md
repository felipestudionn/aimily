# Rama 3 — Synthetic & Performance Fibers — Research Report

**Scope**: Synthetic and performance fibers/fabrics ONLY. Excludes naturals (Rama 1), regenerated cellulosics + bio-based (Rama 2), leather + leather alternatives (Rama 4).
**Date**: 2026-05-03
**Methodology**: WebSearch across producer B2B portals (Unifi/Repreve, Aquafil/ECONYL, Fulgar, Sinterama, Seaqual, The Lycra Company, Hyosung, Asahi Kasei, Polartec, W.L. Gore, eVent, Pertex, 3M Thinsulate, PrimaLoft, Thermore, Arkema Pebax, Yamamoto, Toray, Invista/Cordura) + WWD + Sourcing Journal + Textile World + Innovation in Textiles + Fibre2Fashion + Fashion Dive + corporate press releases. All L3 (B2B suppliers) verified individually with at least one URL confirming (a) the producer/mill exists today, (b) it has a B2B fabric/yarn division, (c) it supplies multiple brands (not exclusive to one DTC label), (d) no current insolvency or production cessation.

**Conventions**:
- Layer 1 (L1) = canonical base fiber/fabric name.
- Layer 2 (L2) = construction × weight × finish variants. For synthetics most L2 entries are denier-based wovens or gsm-based knits/laminates.
- Layer 3 (L3) = real verified B2B mill / fiber producer suppliers. Conservative — only included where verification is concrete. Maximum 5 per L1.
- Subtype list spans ROPA + CALZADO + ACCESORIOS, since synthetics + performance fabrics legitimately enter all three categories. Per-fiber subtype lists cherry-pick what each fiber actually serves in market — not every fiber gets the full list.
- Vegan: true for ALL synthetics by default (no animal-derived inputs).
- Family taxonomy: `synthetic` (virgin), `synthetic-recycled` (closed-loop or post-consumer), `performance` (B2B ingredient brand fabric/membrane/insulation/foam).

**Felipe's rule applied**: si no lo tienes claro, fuera. Sympatex Technologies filed insolvency January 2026 → EXCLUDED. The Lycra Company filed Chapter 11 March 2026 (restructuring, NOT cessation) → included with caveat; Hyosung Creora and Asahi Kasei ROICA remain primary alternatives. Forbidden brand-locked technologies (ZoomX, Boost, Air Max, Flyknit, Primeknit, GEL, Fresh Foam, HOKA Profly, DNA Loft, Lululemon Nulu, Patagonia Capilene) → EXCLUDED with reason.

**Primary sources consulted**:
- https://repreve.com/ + https://unifi.com/sustainability/repreve
- https://econyl.aquafil.com/ + https://www.aquafil.com/
- https://www.seaqual.org/
- https://www.fulgar.com/en/products/58/q-nova-by-fulgar
- https://sinterama.com/ (Newlife)
- https://www.thelycracompany.com/en (LYCRA / Coolmax)
- https://www.coolmax.com/en
- https://cordura.com/
- https://www.polartec.com/
- https://www.gore-tex.com/
- https://www.eventfabrics.com/
- https://pertex.com/
- https://www.3m.com/3M/en_US/thinsulate-us/
- https://primaloft.com/
- https://www.thermore.com/
- https://pebaxpowered.arkema.com/en/
- https://yamamoto-bio.com/
- https://www.toray.com/products/textiles/
- https://www.hyosung.com/ (Creora)
- https://www.asahi-kasei.co.jp/asahi/en/business/material/textile/ (ROICA)

**Total entries (final count)**: 162 (24 L1 + 88 L2 + 50 L3) + 14 EXCLUDED entries documented.

---

## 1. Polyester (generic PET)

### L1 — Base
```yaml
- id: polyester
  name: "Polyester (PET)"
  layer: L1
  family: synthetic
  composition: "100% polyester (polyethylene terephthalate)"
  weightRange: { min: 50, max: 400, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","calendered","brushed","peached","water-repellent-DWR","anti-pill","wicking","antimicrobial","FR-treated"]
  zones: ["Body","Lining","Sleeve","Pocket","Hood","Collar"]
  subtypes: ["dress","top","shirt","blouse","tshirt","polo","trouser","short","skirt","jumpsuit","outerwear-jacket","outerwear-coat","blazer","activewear","loungewear","lingerie","swimwear","sock","scarf","bag-lining","cap"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","minimal","streetwear","utility","resort","tailored"]
  seasonFit: ["SS","FW","transitional","all-year"]
  certifications: ["OEKO-TEX","bluesign","REACH"]
  vegan: true
```

### L2 — Variants
```yaml
- id: polyester-microfiber
  name: "Polyester microfiber"
  layer: L2
  parentId: polyester
  composition: "100% polyester, < 1 denier per filament"
  weightRange: { min: 60, max: 130, unit: gsm }
  defaultFinish: "calendered"
  subtypes: ["lingerie","blouse","activewear","outerwear-jacket"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","minimal","streetwear"]
  seasonFit: ["all-year"]

- id: polyester-jersey
  name: "Polyester jersey"
  layer: L2
  parentId: polyester
  composition: "100% polyester (often 90/10 with elastane for stretch)"
  weightRange: { min: 130, max: 220, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["tshirt","activewear","loungewear","top","dress"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["sport","streetwear","minimal"]
  seasonFit: ["all-year"]

- id: polyester-satin
  name: "Polyester satin"
  layer: L2
  parentId: polyester
  composition: "100% polyester, satin weave"
  weightRange: { min: 70, max: 140, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Body","Lining","Sleeve"]
  subtypes: ["dress","blouse","skirt","lingerie","blazer","loungewear"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["romantic","resort","tailored","minimal"]
  seasonFit: ["SS","transitional","all-year"]

- id: polyester-taffeta
  name: "Polyester taffeta"
  layer: L2
  parentId: polyester
  composition: "100% polyester, plain weave high twist"
  weightRange: { min: 50, max: 90, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining","Body"]
  subtypes: ["outerwear-jacket","blazer","dress","bag-lining"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["tailored","utility","resort"]
  seasonFit: ["all-year"]

- id: polyester-fleece
  name: "Polyester fleece (generic)"
  layer: L2
  parentId: polyester
  composition: "100% polyester (or 95/5 cotton blend), brushed knit"
  weightRange: { min: 180, max: 360, unit: gsm }
  defaultFinish: "anti-pill"
  zones: ["Body","Sleeve","Hood","Lining"]
  subtypes: ["outerwear-jacket","loungewear","activewear","sweater"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","streetwear","utility","loungewear"]
  seasonFit: ["FW","transitional"]

- id: polyester-twill
  name: "Polyester twill (suiting / uniform)"
  layer: L2
  parentId: polyester
  composition: "100% polyester or PES/wool blends"
  weightRange: { min: 180, max: 280, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["trouser","blazer","suit","skirt","outerwear-jacket"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["tailored","utility"]
  seasonFit: ["all-year"]

- id: polyester-mesh
  name: "Polyester mesh / piqué"
  layer: L2
  parentId: polyester
  composition: "100% polyester, open-knit"
  weightRange: { min: 90, max: 180, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["polo","activewear","tshirt"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["sport","streetwear"]
  seasonFit: ["SS","all-year"]

- id: polyester-georgette
  name: "Polyester georgette / chiffon"
  layer: L2
  parentId: polyester
  composition: "100% polyester, sheer plain weave"
  weightRange: { min: 50, max: 90, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["blouse","dress","skirt","scarf"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["romantic","resort","minimal"]
  seasonFit: ["SS","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-toray-polyester
  name: "Toray Industries (polyester / nylon B2B)"
  layer: L3
  parentId: polyester
  origin: "Japan (global plants USA / Korea / China / Indonesia / Italy)"
  notes: |
    Largest integrated polyester producer in Japan; B2B fiber + woven mill
    (Primeflex, ARTIROSA microfiber, Ecodear N510 plant-based nylon). Supplies
    activewear and outerwear brands worldwide; Toray Textiles Europe (UK)
    extends EU coverage. Public B2B catalog.
  verification: "https://www.toray.com/products/textiles/ + https://www.primeflex.toray/ + https://www.ttel.co.uk/"

- id: supplier-eastman-polyester
  name: "Eastman Chemical (polyester filament + Naia partner)"
  layer: L3
  parentId: polyester
  origin: "USA (Kingsport, Tennessee)"
  notes: |
    Major B2B polyester filament producer. Public mill catalog. Note: Naia
    cellulose acetate is a separate Eastman product covered in Rama 2.
  verification: "https://www.eastman.com/en/products/segments/textiles + https://www.eastman.com/en/products/brands/naia"

- id: supplier-indorama-ventures
  name: "Indorama Ventures (PET resin + filament)"
  layer: L3
  parentId: polyester
  origin: "Thailand HQ; global plants in 33 countries"
  notes: |
    World's largest integrated PET producer; owns Sinterama / Indorama Ventures
    Lifestyle Italy (Newlife). B2B yarn + filament + resin to mills worldwide.
  verification: "https://www.indoramaventures.com/en/our-business/textiles + http://www.sinterama.com/"

- id: supplier-far-eastern-new-century
  name: "Far Eastern New Century (FENC)"
  layer: L3
  parentId: polyester
  origin: "Taiwan + Vietnam + USA"
  notes: |
    Major Taiwanese B2B polyester producer; supplies brands directly and via
    Taiwanese mills. Strong rPET + virgin PET lineup; partnerships with sport
    and outdoor labels.
  verification: "https://www.fenc.com/index.aspx?lang=en + https://en.wikipedia.org/wiki/Far_Eastern_New_Century"

- id: supplier-reliance-polyester
  name: "Reliance Industries (Recron polyester)"
  layer: L3
  parentId: polyester
  origin: "India"
  notes: |
    Recron is the brand of Reliance Industries' polyester filament + staple
    for B2B mills worldwide. Recron GreenGold = recycled variant covered also
    in rPET section. Public B2B catalog.
  verification: "https://www.reliancepolyester.com/ + https://www.relianceindustries.com/our-businesses/manufacturing/petrochemicals/polyester"
```

### Notes & sources
- Polyester GSM ranges cross-checked against szoneierfabrics.com performance fabric chart and pictureorganicclothing.com.
- Toray Primeflex + ARTIROSA confirmed live B2B catalog 2026.
- Sources:
  - https://www.toray.com/products/textiles/
  - https://www.fenc.com/
  - https://www.indoramaventures.com/en/our-business/textiles
  - https://www.eastman.com/en/products/segments/textiles
  - https://www.reliancepolyester.com/

---

## 2. Recycled Polyester (rPET)

### L1 — Base
```yaml
- id: rpet
  name: "Recycled Polyester (rPET)"
  layer: L1
  family: synthetic-recycled
  composition: "100% post-consumer recycled polyester (mechanical or chemical)"
  weightRange: { min: 50, max: 400, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","calendered","brushed","peached","water-repellent-DWR","anti-pill","wicking"]
  zones: ["Body","Lining","Sleeve","Pocket","Hood"]
  subtypes: ["dress","top","tshirt","trouser","short","skirt","outerwear-jacket","outerwear-coat","activewear","loungewear","swimwear","bag-lining"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","minimal","streetwear","sustainable","utility"]
  seasonFit: ["SS","FW","transitional","all-year"]
  certifications: ["GRS","RCS","OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: rpet-jersey
  name: "rPET jersey"
  layer: L2
  parentId: rpet
  composition: "100% rPET (often 90/10 with elastane)"
  weightRange: { min: 130, max: 220, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["tshirt","activewear","loungewear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","sustainable","minimal"]
  seasonFit: ["all-year"]

- id: rpet-fleece
  name: "rPET fleece"
  layer: L2
  parentId: rpet
  composition: "100% rPET, brushed knit"
  weightRange: { min: 180, max: 360, unit: gsm }
  defaultFinish: "anti-pill"
  subtypes: ["outerwear-jacket","loungewear","sweater"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","sustainable","streetwear"]
  seasonFit: ["FW","transitional"]

- id: rpet-twill
  name: "rPET twill"
  layer: L2
  parentId: rpet
  composition: "100% rPET or rPET/cotton blend"
  weightRange: { min: 160, max: 280, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["trouser","outerwear-jacket","skirt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","tailored","utility"]
  seasonFit: ["all-year"]

- id: rpet-ripstop
  name: "rPET ripstop (lightweight outerwear)"
  layer: L2
  parentId: rpet
  composition: "100% rPET ripstop weave"
  weightRange: { min: 50, max: 110, unit: gsm }
  defaultFinish: "water-repellent-DWR"
  subtypes: ["outerwear-jacket","outerwear-coat"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","sustainable","utility","streetwear"]
  seasonFit: ["transitional","FW"]

- id: rpet-shell
  name: "rPET shell (face fabric for laminates)"
  layer: L2
  parentId: rpet
  composition: "100% rPET, often paired with PU / PTFE membrane"
  weightRange: { min: 90, max: 180, unit: gsm }
  defaultFinish: "water-repellent-DWR"
  subtypes: ["outerwear-jacket","outerwear-coat"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","sustainable","utility"]
  seasonFit: ["FW","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-repreve-unifi
  name: "REPREVE® by Unifi"
  layer: L3
  parentId: rpet
  origin: "USA (Greensboro, NC) + global"
  notes: |
    Branded recycled performance fiber. 46+ billion bottles recycled to date.
    Used by 950+ brands; ninth annual REPREVE Champions of Sustainability
    Awards held April 2026. CiCLO biodegradable variant launched 2025 globally.
    Pure B2B ingredient brand — sells fiber to mills, mills weave for brands.
  verification: "https://repreve.com/ + https://unifi.com/sustainability/repreve + https://www.textileworld.com/textile-world/fiber-world/2026/04/unifi-makers-of-repreve-celebrates-recycled-and-circular-innovation-with-ninth-annual-repreve-champions-of-sustainability-awards/"

- id: supplier-newlife-sinterama
  name: "Newlife™ by Sinterama (Indorama Ventures Lifestyle Italy)"
  layer: L3
  parentId: rpet
  origin: "Italy (Biella region)"
  notes: |
    100% post-consumer PET bottles collected in northern Italy + spun in Italy
    (full Made in Italy traceability). Mechanical process. Sinterama renamed
    Indorama Ventures Lifestyle Italy S.p.A. after Indorama acquisition; B2B
    yarn supply continues. Newlife FR (flame-retardant), Newlife Easy (low-temp
    dye) variants.
  verification: "http://www.sinterama.com/ + https://www.fibre2fashion.com/news/textile-news/sinterama-launches-100-recycled-fibre-newlife--205782-newsdetails.htm + https://www.innovationintextiles.com/polygiene-and-sinterama-to-launch-recycled-fibre-with-permanent-odor-control-technology/"

- id: supplier-seaqual-initiative
  name: "SEAQUAL® Initiative"
  layer: L3
  parentId: rpet
  origin: "Spain HQ; spun in Spain (ANTEX) and Mexico (VICA)"
  notes: |
    rPET yarn containing ~10% SEAQUAL marine plastic (ocean-bound waste). 2,500+
    licensed brands worldwide as of 2026. Crafted by ANTEX (Spain) and VICA
    (Mexico) — both 1969-founded yarn manufacturers. Initiative celebrating
    10th anniversary 2026.
  verification: "https://www.seaqual.org/ + https://www.seaqual.org/seaqual-yarn/ + https://www.seaqual.org/brands/"

- id: supplier-fenc-topgreen
  name: "FENC TOPGREEN® (Far Eastern New Century)"
  layer: L3
  parentId: rpet
  origin: "Taiwan"
  notes: |
    FENC's branded rPET yarn (TOPGREEN); supplies activewear and outdoor
    brands directly. Production at vertically integrated PET-to-yarn plants.
    Pure B2B ingredient. Public catalog and case studies.
  verification: "https://www.fenc.com/csr.aspx?lang=en + https://www.fenc.com/products.aspx?lang=en"

- id: supplier-reliance-recron-greengold
  name: "Recron® GreenGold (Reliance Industries)"
  layer: L3
  parentId: rpet
  origin: "India"
  notes: |
    Reliance's branded recycled polyester (GreenGold). B2B fiber + filament
    to mills worldwide. Strong India + Asia distribution. Public catalog.
  verification: "https://www.reliancepolyester.com/category/recron-greengold/ + https://www.relianceindustries.com/our-businesses/manufacturing/petrochemicals/polyester"
```

### Notes & sources
- GRS (Global Recycled Standard) and RCS (Recycled Claim Standard) are the two leading rPET certifications; both verifiable via Textile Exchange.
- All five L3 brands operate as ingredient brands selling to multiple end-brands — confirmed B2B model.
- Sources:
  - https://textileexchange.org/standards/recycled-claim-global-recycled-standard/
  - https://repreve.com/champions-of-sustainability
  - https://www.seaqual.org/seaqual-yarn/

---

## 3. Nylon / Polyamide (PA 6, PA 6,6)

### L1 — Base
```yaml
- id: nylon
  name: "Nylon / Polyamide (PA 6 + PA 6,6)"
  layer: L1
  family: synthetic
  composition: "100% polyamide (PA 6 or PA 6,6); often blended with elastane 5–20%"
  weightRange: { min: 30, max: 600, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","calendered","water-repellent-DWR","peached","brushed","wicking","antimicrobial","ripstop-grid"]
  zones: ["Body","Lining","Sleeve","Pocket","Hood","Reinforcement"]
  subtypes: ["lingerie","swimwear","activewear","tshirt","top","dress","outerwear-jacket","outerwear-coat","trouser","short","sock","stocking","bag-lining","cap","backpack-shell","glove","hosiery"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","streetwear","utility","minimal","tailored"]
  seasonFit: ["SS","FW","transitional","all-year"]
  certifications: ["OEKO-TEX","bluesign","REACH"]
  vegan: true
```

### L2 — Variants
```yaml
- id: nylon-taffeta
  name: "Nylon taffeta"
  layer: L2
  parentId: nylon
  composition: "100% nylon, plain weave"
  weightRange: { min: 30, max: 80, unit: gsm }
  defaultFinish: "calendered"
  zones: ["Lining","Body"]
  subtypes: ["outerwear-jacket","blazer","bag-lining"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["utility","tailored","sport"]
  seasonFit: ["all-year"]

- id: nylon-ripstop
  name: "Nylon ripstop"
  layer: L2
  parentId: nylon
  composition: "100% nylon, ripstop grid weave (PA 6 or 6,6)"
  weightRange: { min: 30, max: 130, unit: gsm }
  defaultFinish: "water-repellent-DWR"
  zones: ["Body","Sleeve","Hood","Pocket"]
  subtypes: ["outerwear-jacket","outerwear-coat","trouser","short","cap"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","utility","streetwear","minimal"]
  seasonFit: ["transitional","FW","SS"]

- id: nylon-jersey
  name: "Nylon jersey (with elastane)"
  layer: L2
  parentId: nylon
  composition: "Nylon 80–92% + elastane 8–20%"
  weightRange: { min: 130, max: 240, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["activewear","swimwear","lingerie","top","dress"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","minimal","streetwear"]
  seasonFit: ["all-year"]

- id: nylon-tricot
  name: "Nylon tricot (warp knit)"
  layer: L2
  parentId: nylon
  composition: "100% nylon warp knit (often with elastane)"
  weightRange: { min: 80, max: 200, unit: gsm }
  defaultFinish: "calendered"
  subtypes: ["lingerie","swimwear","loungewear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["minimal","romantic","sport"]
  seasonFit: ["all-year"]

- id: nylon-cordura-style
  name: "High-tenacity nylon (Cordura-style)"
  layer: L2
  parentId: nylon
  composition: "100% high-tenacity PA 6,6 air-textured / spun"
  weightRange: { min: 200, max: 600, unit: gsm }
  defaultFinish: "water-repellent-DWR"
  subtypes: ["outerwear-jacket","trouser","backpack-shell","short"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["utility","sport","streetwear"]
  seasonFit: ["all-year"]

- id: nylon-ballistic
  name: "Ballistic nylon (1050D / 1680D)"
  layer: L2
  parentId: nylon
  composition: "PA 6,6 ballistic basketweave, high-denier (1050D 2-ply or 1680D 1-ply)"
  weightRange: { min: 380, max: 700, unit: gsm }
  defaultFinish: "PU-coated"
  zones: ["Body","Reinforcement"]
  subtypes: ["backpack-shell","bag-lining","outerwear-jacket"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["utility","streetwear","sport"]
  seasonFit: ["all-year"]

- id: nylon-mesh-powermesh
  name: "Nylon power-mesh / tulle"
  layer: L2
  parentId: nylon
  composition: "Nylon 75–85% + elastane 15–25%"
  weightRange: { min: 100, max: 200, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["lingerie","activewear","loungewear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","romantic","minimal"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-fulgar-nylon
  name: "Fulgar S.p.A. (PA 6,6 specialist)"
  layer: L3
  parentId: nylon
  origin: "Italy (Castel Goffredo, Lombardy)"
  notes: |
    Major Italian B2B nylon yarn producer; PA 6,6 + microfiber + Q-NOVA
    recycled (covered in §4). Long-running supplier to lingerie / hosiery /
    activewear mills across Europe. Public B2B catalog.
  verification: "https://www.fulgar.com/en/ + https://www.fulgar.com/en/products"

- id: supplier-radici-nylon
  name: "RadiciGroup (RadiciFil polyamide)"
  layer: L3
  parentId: nylon
  origin: "Italy (Bergamo) + global"
  notes: |
    European producer of PA 6 + PA 6,6 polymer + yarn (RadiciFil). B2B mill
    supply for fashion + technical textiles + automotive. Confirmed operating.
  verification: "https://www.radicigroup.com/en/products/polyamide-yarn + https://www.radicifil.com/en/"

- id: supplier-nilit
  name: "NILIT (premium PA 6,6 + Sensil® brand)"
  layer: L3
  parentId: nylon
  origin: "Israel HQ + USA + Brazil + China"
  notes: |
    World leader in premium PA 6,6 yarn for activewear + intimates. Sensil
    is NILIT's branded performance nylon. B2B ingredient + mill licensing
    program. Public catalog and brand-partner program.
  verification: "https://www.nilit.com/ + https://sensil.com/"

- id: supplier-toray-nylon
  name: "Toray Industries (nylon B2B)"
  layer: L3
  parentId: nylon
  origin: "Japan + global plants"
  notes: |
    Toray is the largest Japanese nylon producer. ARTIROSA (PA + PES microfiber
    blend), Ecodear N510 (plant-based nylon). Used in outerwear and intimates
    by global brands. Public B2B catalog; also covered in §1 polyester.
  verification: "https://www.toray.com/global/products/textiles/textiles011.html + https://www.sportstextiles.toray/en/topics/20220121.html"

- id: supplier-asahi-kasei-nylon
  name: "Asahi Kasei (PA 6 + PA 6,6 + LEONA™)"
  layer: L3
  parentId: nylon
  origin: "Japan"
  notes: |
    Major Japanese B2B PA producer (LEONA branded). Also produces ROICA elastane
    (covered in §6). Continues operations 2026. Public B2B portal.
  verification: "https://www.asahi-kasei.co.jp/asahi/en/business/material/leona/ + https://www.asahi-kasei.com/"
```

### Notes & sources
- PA 6 vs PA 6,6: PA 6,6 has higher melting point, higher abrasion resistance — preferred for activewear + technical applications. PA 6 cheaper, more common in lingerie + hosiery.
- Sources:
  - https://www.fulgar.com/en/
  - https://www.nilit.com/
  - https://www.radicigroup.com/en/
  - https://en.wikipedia.org/wiki/Nylon_66

---

## 4. Recycled Nylon (Recycled Polyamide)

### L1 — Base
```yaml
- id: recycled-nylon
  name: "Recycled Nylon (PA 6 + PA 6,6)"
  layer: L1
  family: synthetic-recycled
  composition: "100% recycled polyamide (chemical depolymerization or mechanical)"
  weightRange: { min: 30, max: 600, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","calendered","water-repellent-DWR","peached","wicking","ripstop-grid"]
  zones: ["Body","Lining","Sleeve","Hood","Pocket"]
  subtypes: ["swimwear","activewear","lingerie","tshirt","outerwear-jacket","trouser","sock","backpack-shell","bag-lining"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sport","sustainable","streetwear","utility","minimal"]
  seasonFit: ["SS","FW","transitional","all-year"]
  certifications: ["GRS","RCS","OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: recycled-nylon-jersey
  name: "Recycled nylon jersey (with elastane)"
  layer: L2
  parentId: recycled-nylon
  composition: "Recycled nylon 80–92% + elastane 8–20%"
  weightRange: { min: 130, max: 240, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["activewear","swimwear","lingerie","top"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","sustainable","minimal"]
  seasonFit: ["all-year"]

- id: recycled-nylon-ripstop
  name: "Recycled nylon ripstop"
  layer: L2
  parentId: recycled-nylon
  composition: "100% recycled nylon, ripstop weave"
  weightRange: { min: 40, max: 130, unit: gsm }
  defaultFinish: "water-repellent-DWR"
  subtypes: ["outerwear-jacket","outerwear-coat","short","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","sustainable","utility","streetwear"]
  seasonFit: ["transitional","FW"]

- id: recycled-nylon-tricot
  name: "Recycled nylon tricot (warp knit)"
  layer: L2
  parentId: recycled-nylon
  composition: "Recycled nylon warp knit (often with elastane)"
  weightRange: { min: 80, max: 200, unit: gsm }
  defaultFinish: "calendered"
  subtypes: ["lingerie","swimwear","loungewear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","minimal","romantic"]
  seasonFit: ["all-year"]

- id: recycled-nylon-shell
  name: "Recycled nylon shell (face fabric for laminates)"
  layer: L2
  parentId: recycled-nylon
  composition: "100% recycled nylon, paired with PU / PTFE membrane"
  weightRange: { min: 80, max: 200, unit: gsm }
  defaultFinish: "water-repellent-DWR"
  subtypes: ["outerwear-jacket","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","sustainable","utility"]
  seasonFit: ["FW","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-econyl-aquafil
  name: "ECONYL® by Aquafil"
  layer: L3
  parentId: recycled-nylon
  origin: "Italy (Arco, Trentino) + Slovenia + USA + Thailand"
  notes: |
    Regenerated nylon from fishing nets, fabric scraps, carpet waste. Chemical
    depolymerization → infinite recycling loop. Trusted by 1,900+ brands across
    fashion, interiors, automotive (Prada Re-Nylon, Burberry, Gucci, Stella
    McCartney). Pure B2B ingredient brand. R2R Regenerated to be Regenerable
    program continues 2026.
  verification: "https://econyl.aquafil.com/ + https://econyl.aquafil.com/brands/ + https://www.aquafil.com/"

- id: supplier-q-nova-fulgar
  name: "Q-NOVA® by Fulgar"
  layer: L3
  parentId: recycled-nylon
  origin: "Italy (Castel Goffredo)"
  notes: |
    Recycled PA 6,6 from regenerated raw materials (mechanical process — no
    chemical regeneration). Saves ~90% water + ~80% CO2e vs virgin PA. Used
    by H&M Group's Arket, Deha and many circular knit / legwear / sportswear
    mills. B2B yarn ingredient.
  verification: "https://www.fulgar.com/en/products/58/q-nova-by-fulgar + https://www.fulgar.com/en/feature/38/recycled-nylon-q-nova-yarn-by-fulgar + https://www.knittingindustry.com/fulgar-introduces-new-qnova-recycled-melange-yarns/"

- id: supplier-q-cycle-fulgar
  name: "Q-CYCLE® by Fulgar (BASF partnership)"
  layer: L3
  parentId: recycled-nylon
  origin: "Italy (Fulgar) + Germany (BASF Ultramid CcycledⓇ)"
  notes: |
    Fulgar's tire-pyrolysis-derived PA 6,6, made from BASF's Ultramid
    Ccycled chemically recycled polymer (end-of-life tires). B2B yarn,
    operating production 2025+.
  verification: "https://www.innovationintextiles.com/fulgars-first-for-polyamides-with-qcycle/ + https://weibold.com/basf-supplies-fulgar-with-new-ecosustainable-qcycle-yarn-crafted-from-endoflife-tires"

- id: supplier-nilit-ecocare
  name: "Sensil® EcoCare (NILIT recycled PA 6,6)"
  layer: L3
  parentId: recycled-nylon
  origin: "Israel + USA + China"
  notes: |
    NILIT's recycled PA 6,6 yarn made from pre-consumer waste; B2B mill supply
    to activewear and intimates brands worldwide.
  verification: "https://sensil.com/ecocare/ + https://www.nilit.com/sensil/ecocare/"

- id: supplier-radici-renycle
  name: "Renycle® by RadiciGroup"
  layer: L3
  parentId: recycled-nylon
  origin: "Italy"
  notes: |
    Renycle = RadiciGroup's recycled polyamide (PA 6) yarn from pre + post
    consumer waste. B2B mill supply across fashion + technical textiles.
  verification: "https://www.radicigroup.com/en/sustainability/renycle + https://www.radicifil.com/en/"
```

### Notes & sources
- ECONYL is by far the most established recycled-nylon ingredient brand globally. Q-NOVA is the most established mechanical recycled PA 6,6.
- Sources:
  - https://econyl.aquafil.com/
  - https://www.fulgar.com/en/products/58/q-nova-by-fulgar
  - https://sensil.com/ecocare/

---

## 5. Acrylic / Modacrylic

### L1 — Base
```yaml
- id: acrylic
  name: "Acrylic / Modacrylic"
  layer: L1
  family: synthetic
  composition: "≥85% acrylonitrile (acrylic) or 35–84% acrylonitrile + halogen-bearing co-monomer (modacrylic)"
  weightRange: { min: 200, max: 600, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","brushed","peached","anti-pill","FR-treated"]
  zones: ["Body","Sleeve","Hood","Lining","Pile"]
  subtypes: ["sweater","knitwear-top","outerwear-jacket","outerwear-coat","cap","scarf","glove","sock","loungewear"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["streetwear","sport","loungewear","utility","romantic"]
  seasonFit: ["FW","transitional"]
  certifications: ["OEKO-TEX","REACH"]
  vegan: true
```

### L2 — Variants
```yaml
- id: acrylic-knit
  name: "Acrylic knitwear yarn (sweater knit)"
  layer: L2
  parentId: acrylic
  composition: "100% acrylic or acrylic-wool blend (typically 70/30 or 50/50)"
  weightRange: { min: 280, max: 480, unit: gsm }
  defaultFinish: "anti-pill"
  subtypes: ["sweater","knitwear-top","cap","scarf","glove"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["streetwear","preppy","loungewear"]
  seasonFit: ["FW","transitional"]

- id: acrylic-fleece-pile
  name: "Acrylic / modacrylic fleece pile (faux fur)"
  layer: L2
  parentId: acrylic
  composition: "Modacrylic (often 60%) + acrylic (40%) high-pile knit"
  weightRange: { min: 380, max: 600, unit: gsm }
  defaultFinish: "brushed"
  subtypes: ["outerwear-jacket","outerwear-coat","scarf","cap"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["romantic","streetwear","resort","luxury"]
  seasonFit: ["FW","transitional"]

- id: acrylic-polartec-sherpa
  name: "Acrylic sherpa pile"
  layer: L2
  parentId: acrylic
  composition: "Acrylic high-pile knit (sometimes acrylic + polyester)"
  weightRange: { min: 320, max: 480, unit: gsm }
  defaultFinish: "brushed"
  subtypes: ["outerwear-jacket","loungewear","sweater"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["loungewear","streetwear","utility"]
  seasonFit: ["FW"]

- id: modacrylic-FR
  name: "Modacrylic FR (flame-retardant)"
  layer: L2
  parentId: acrylic
  composition: "60–100% modacrylic, halogen-co-monomer FR"
  weightRange: { min: 280, max: 460, unit: gsm }
  defaultFinish: "FR-treated"
  subtypes: ["outerwear-jacket","sweater","cap"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["utility","sport"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-aksa
  name: "Aksa Akrilik Kimya Sanayii A.Ş."
  layer: L3
  parentId: acrylic
  origin: "Turkey (Yalova)"
  notes: |
    Largest acrylic fiber producer globally — ~22% market share. B2B fiber
    + tow + yarn supply to mills worldwide. 2026 efficiency upgrades for
    higher-value outdoor + wool-blend staples.
  verification: "https://www.aksa.com/en + https://www.mordorintelligence.com/industry-reports/acrylic-fiber-market/companies"

- id: supplier-dralon
  name: "Dralon GmbH"
  layer: L3
  parentId: acrylic
  origin: "Germany (Dormagen)"
  notes: |
    European premium acrylic fiber producer; B2B fiber to spinning mills
    across Europe + global. Strong knit + outdoor + automotive focus.
  verification: "https://www.dralon.com/ + https://en.wikipedia.org/wiki/Dralon"

- id: supplier-thai-acrylic-aditya-birla
  name: "Thai Acrylic Fibre (Aditya Birla Group)"
  layer: L3
  parentId: acrylic
  origin: "Thailand (Saraburi)"
  notes: |
    Aditya Birla Group's acrylic arm. B2B fiber to spinners across Asia +
    Europe. Branded eco-variants (Amicor, Amicor Pure for antimicrobial).
  verification: "https://www.thaiacrylic.com/ + https://www.adityabirla.com/businesses/companies/thai-acrylic-fibre"

- id: supplier-taekwang
  name: "Taekwang Industrial Co., Ltd."
  layer: L3
  parentId: acrylic
  origin: "South Korea"
  notes: |
    Major Korean producer of acrylic + spandex (Acepora). B2B fiber + yarn
    to global mills. Diversified chemical + textile group.
  verification: "https://www.taekwang.co.kr/eng/ + https://en.wikipedia.org/wiki/Taekwang"

- id: supplier-jilin-chemical-fiber
  name: "Jilin Chemical Fiber Group"
  layer: L3
  parentId: acrylic
  origin: "China"
  notes: |
    Largest Chinese acrylic + carbon-fiber producer. B2B acrylic fiber to
    domestic + export mills.
  verification: "http://www.jlhxxw.com/ + https://www.mordorintelligence.com/industry-reports/acrylic-fiber-market/companies"
```

### Notes & sources
- Modacrylic = halogen-modified acrylic for inherent flame retardancy (firefighter, military, children's sleepwear).
- Sources:
  - https://www.aksa.com/en
  - https://www.dralon.com/
  - https://en.wikipedia.org/wiki/Acrylic_fiber

---

## 6. Polypropylene

### L1 — Base
```yaml
- id: polypropylene
  name: "Polypropylene (PP)"
  layer: L1
  family: synthetic
  composition: "100% polypropylene"
  weightRange: { min: 80, max: 280, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","wicking","antimicrobial","brushed"]
  zones: ["Body","Lining","Sock"]
  subtypes: ["sock","activewear","baselayer","tshirt","loungewear","backpack-shell"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","utility","minimal"]
  seasonFit: ["FW","transitional"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: polypropylene-baselayer
  name: "Polypropylene baselayer knit"
  layer: L2
  parentId: polypropylene
  composition: "100% polypropylene knit"
  weightRange: { min: 100, max: 180, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["baselayer","activewear","tshirt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","utility","minimal"]
  seasonFit: ["FW","transitional"]

- id: polypropylene-sock
  name: "Polypropylene sock yarn"
  layer: L2
  parentId: polypropylene
  composition: "Polypropylene 60–100% (often blended with merino)"
  weightRange: { min: 120, max: 280, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["sock"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","utility"]
  seasonFit: ["FW","all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-meraklon-fibrant
  name: "Meraklon (Indorama Polypropylene Fibers)"
  layer: L3
  parentId: polypropylene
  origin: "Italy (Terni) — owned by Indorama Ventures"
  notes: |
    Specialty PP fiber producer; B2B fiber for sport baselayer + sock + nonwoven
    industries. Multi-decade heritage; now operates under Indorama Ventures.
  verification: "https://www.meraklon.com/ + https://www.indoramaventures.com/en/our-business/textiles"

- id: supplier-fitesa
  name: "Fitesa (PP nonwoven + fiber)"
  layer: L3
  parentId: polypropylene
  origin: "Brazil + global plants"
  notes: |
    Major PP nonwoven + fiber B2B supplier. Used in performance apparel
    interlining + technical applications.
  verification: "https://www.fitesa.com/ + https://www.fitesa.com/products"
```

### Notes & sources
- PP is the lightest mass-market synthetic and most hydrophobic — preferred for technical socks + baselayers + nonwoven backings. Limited in fashion outerwear due to low UV + heat resistance.
- Sources:
  - https://www.meraklon.com/
  - https://www.fitesa.com/

---

## 7. Spandex / Elastane / Lycra-class

### L1 — Base
```yaml
- id: elastane
  name: "Elastane / Spandex"
  layer: L1
  family: synthetic
  composition: "Polyurethane-polyurea copolymer (≥85% polyurethane)"
  weightRange: { min: 20, max: 120, unit: dtex }
  defaultFinish: "raw"
  finishOptions: ["raw","heat-set","chlorine-resistant"]
  zones: ["Stretch component","Body","Sleeve","Waistband","Cuff"]
  subtypes: ["activewear","swimwear","lingerie","hosiery","jean","trouser","top","dress","loungewear","sock"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","minimal","streetwear"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: elastane-standard
  name: "Standard elastane (20–80 dtex)"
  layer: L2
  parentId: elastane
  composition: "Polyurethane elastomer, dry-spun"
  weightRange: { min: 20, max: 80, unit: dtex }
  defaultFinish: "raw"
  subtypes: ["activewear","jean","trouser","top"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","minimal"]
  seasonFit: ["all-year"]

- id: elastane-chlorine-resistant
  name: "Chlorine-resistant elastane"
  layer: L2
  parentId: elastane
  composition: "Polyurethane elastomer with chlorine-resistant chemistry"
  weightRange: { min: 40, max: 120, unit: dtex }
  defaultFinish: "chlorine-resistant"
  subtypes: ["swimwear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","resort"]
  seasonFit: ["SS","all-year"]

- id: elastane-recycled
  name: "Recycled / bio-based elastane"
  layer: L2
  parentId: elastane
  composition: "Recycled or partially bio-based polyurethane elastomer"
  weightRange: { min: 20, max: 80, unit: dtex }
  defaultFinish: "raw"
  subtypes: ["activewear","lingerie","jean","top"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","sustainable","minimal"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-hyosung-creora
  name: "creora® by Hyosung"
  layer: L3
  parentId: elastane
  origin: "South Korea + Vietnam + Brazil + Turkey + India"
  notes: |
    World's largest single elastane producer (340,000 tonnes/year capacity ≈
    1/3 of global demand). Plants spanning Asia / Americas / Europe / Türkiye.
    creora® regen = recycled variant. B2B yarn ingredient brand to thousands
    of mills. Growing share since LYCRA Chapter 11.
  verification: "https://www.creora.com/ + https://www.hyosung.com/en/"

- id: supplier-asahi-kasei-roica
  name: "ROICA™ by Asahi Kasei"
  layer: L3
  parentId: elastane
  origin: "Japan + Taiwan + Thailand + Germany"
  notes: |
    Premium elastane brand (ROICA + Dorlastan). ROICA EF = recycled variant.
    Cradle-to-Cradle Gold variants exist. B2B yarn ingredient with
    multi-brand mill program.
  verification: "https://www.asahi-kasei.com/sustainability/material/roica/ + https://www.roica.com/"

- id: supplier-lycra-company
  name: "LYCRA® by The LYCRA Company (Chapter 11 — operating)"
  layer: L3
  parentId: elastane
  origin: "USA + global"
  notes: |
    Inventor of spandex (1958 as DuPont). Filed voluntary Chapter 11 March 17
    2026 (restructuring, NOT liquidation). LYCRA EcoMade recycled variant
    available. Continues B2B operations under DIP financing as of 2026-Q2.
    Treat as included with caveat — Hyosung creora and Asahi Kasei ROICA
    are stable alternatives if procurement needs zero risk.
  verification: "https://www.thelycracompany.com/en + https://www.fiberjournal.com/elastane-materials-expand-with-responsible-stretch/ + https://www.reuters.com/legal/transactional/lycra-files-chapter-11-bankruptcy-protection-2026-03-17/"

- id: supplier-indorama-inviya
  name: "INVIYA® (Indorama Industries)"
  layer: L3
  parentId: elastane
  origin: "India + Indonesia"
  notes: |
    Indorama's branded spandex; B2B yarn for activewear + denim + intimates
    mills across Asia. Multiple eco variants.
  verification: "https://www.inviya.com/ + https://www.indoramaindustries.com/our-businesses/textiles/"

- id: supplier-taekwang-acepora
  name: "Acepora® by Taekwang Industrial"
  layer: L3
  parentId: elastane
  origin: "South Korea"
  notes: |
    Korean elastane brand by Taekwang chemical group. B2B mill supply for
    activewear + intimate + denim + hosiery applications.
  verification: "https://www.taekwang.co.kr/eng/business/textile.do + https://www.acepora.com/"
```

### Notes & sources
- LYCRA Chapter 11 update verified March 2026; Reuters and SEC filings confirm DIP financing + ongoing operations; the brand and product line remain available through restructuring. Hyosung creora is the safest single-source alternative.
- Sources:
  - https://www.creora.com/
  - https://www.roica.com/
  - https://www.thelycracompany.com/en
  - https://www.inviya.com/
  - https://en.wikipedia.org/wiki/Spandex

---

## 8. Cordura® (Invista — abrasion-resistant nylon B2B)

### L1 — Base
```yaml
- id: cordura
  name: "CORDURA® Advanced Fabrics"
  layer: L1
  family: performance
  composition: "High-tenacity PA 6,6 (some 100%, some blended with cotton/polyester for hybrid lines)"
  weightRange: { min: 160, max: 1000, unit: denier }
  defaultFinish: "PU-coated"
  finishOptions: ["raw","PU-coated","water-repellent-DWR","abrasion-finish","ripstop-grid"]
  zones: ["Body","Reinforcement","Pocket","Hem","Knee-patch"]
  subtypes: ["outerwear-jacket","outerwear-coat","trouser","short","backpack-shell","bag-lining","cap","glove","footwear-upper"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["utility","streetwear","sport","tactical"]
  seasonFit: ["all-year","FW","transitional"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: cordura-classic-500D
  name: "CORDURA Classic 500D"
  layer: L2
  parentId: cordura
  composition: "500D high-tenacity PA 6,6"
  weightRange: { min: 220, max: 320, unit: gsm }
  defaultFinish: "PU-coated"
  subtypes: ["outerwear-jacket","backpack-shell","bag-lining"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["utility","streetwear","tactical"]
  seasonFit: ["all-year"]

- id: cordura-1000D
  name: "CORDURA 1000D heavy-duty"
  layer: L2
  parentId: cordura
  composition: "1000D high-tenacity PA 6,6"
  weightRange: { min: 360, max: 480, unit: gsm }
  defaultFinish: "PU-coated"
  subtypes: ["backpack-shell","outerwear-jacket","trouser"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["utility","tactical","streetwear"]
  seasonFit: ["all-year"]

- id: cordura-ballistic
  name: "CORDURA Ballistic (1050D / 1680D)"
  layer: L2
  parentId: cordura
  composition: "PA 6,6 ballistic basketweave"
  weightRange: { min: 380, max: 700, unit: gsm }
  defaultFinish: "PU-coated"
  subtypes: ["backpack-shell","outerwear-jacket","bag-lining"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["utility","tactical","streetwear"]
  seasonFit: ["all-year"]

- id: cordura-naturalle
  name: "CORDURA Naturalle / Combat Wool"
  layer: L2
  parentId: cordura
  composition: "Cordura PA 6,6 + cotton (or wool) blended for soft-hand workwear"
  weightRange: { min: 220, max: 360, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["trouser","outerwear-jacket","short"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["utility","workwear","streetwear"]
  seasonFit: ["all-year"]

- id: cordura-truelock
  name: "CORDURA TRUELOCK™ (solution-dyed)"
  layer: L2
  parentId: cordura
  composition: "Solution-dyed PA 6,6 (color-locked, lower water/energy)"
  weightRange: { min: 200, max: 460, unit: gsm }
  defaultFinish: "PU-coated"
  subtypes: ["outerwear-jacket","backpack-shell","trouser"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["utility","sustainable","streetwear"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-cordura-invista
  name: "INVISTA / CORDURA® Advanced Fabrics (brand owner)"
  layer: L3
  parentId: cordura
  origin: "USA HQ; certified mills global"
  notes: |
    INVISTA retained Cordura ownership 2025 after strategic review. B2B
    ingredient brand with global certified-mill program. 55-year heritage.
  verification: "https://cordura.com/ + https://www.textileworld.com/textile-world/nonwovens-technical-textiles/2025/09/cordura-advanced-fabrics-proud-legacy-bold-future-open-for-business-and-committed-to-growth/"

- id: supplier-delcotex
  name: "Delcotex Delius Techtex (CORDURA certified mill)"
  layer: L3
  parentId: cordura
  origin: "Germany"
  notes: |
    Long-standing Cordura B2B authorized mill. European weaver of Cordura
    fabrics for outdoor + workwear + technical brands.
  verification: "https://delcotex.de/en/cordura-1 + https://www.delcotex.de/"

- id: supplier-carolina-pf
  name: "Carolina Performance Fabrics (CORDURA certified)"
  layer: L3
  parentId: cordura
  origin: "USA (North Carolina)"
  notes: |
    US weaver of Endurance Cordura Tactical Fabrics from INVISTA Cordura
    Nylon 6,6. B2B woven mill to tactical + military + workwear brands.
  verification: "https://carolinapf.com/ballistic/cordura/ + https://carolinapf.com/"

- id: supplier-formosa-taffeta
  name: "Formosa Taffeta Co. (CORDURA partner)"
  layer: L3
  parentId: cordura
  origin: "Taiwan"
  notes: |
    Major Taiwanese B2B technical fabric mill; weaves CORDURA fabrics for
    backpack + outerwear brands. Public mill catalog.
  verification: "https://www.ftc.com.tw/ + https://en.wikipedia.org/wiki/Formosa_Taffeta"

- id: supplier-thai-textile-cordura
  name: "Thai Textile Industry Public Co. (CORDURA partner)"
  layer: L3
  parentId: cordura
  origin: "Thailand"
  notes: |
    Authorized CORDURA mill in Thailand for backpack + outerwear + workwear
    weavers. B2B woven fabric supply.
  verification: "https://cordura.com/ + https://www.thaitextile.org/"
```

### Notes & sources
- Cordura is THE canonical B2B abrasion-resistant ingredient brand for backpacks, technical outerwear, and workwear. Sold to hundreds of brands.
- Sources:
  - https://cordura.com/
  - https://en.wikipedia.org/wiki/Cordura

---

## 9. Coolmax® (The Lycra Company — moisture-wicking polyester B2B)

### L1 — Base
```yaml
- id: coolmax
  name: "COOLMAX®"
  layer: L1
  family: performance
  composition: "Specially-engineered polyester filament with 4-channel cross-section for moisture wicking"
  weightRange: { min: 80, max: 220, unit: gsm }
  defaultFinish: "wicking"
  finishOptions: ["wicking","antimicrobial","UV-protection","FreshFX-odor-control"]
  zones: ["Body","Sleeve","Waistband","Sock"]
  subtypes: ["tshirt","polo","activewear","baselayer","sock","loungewear","top","dress"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","minimal","streetwear"]
  seasonFit: ["all-year","SS"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: coolmax-everyday
  name: "COOLMAX Everyday"
  layer: L2
  parentId: coolmax
  composition: "Polyester engineered for moisture management"
  weightRange: { min: 130, max: 200, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["tshirt","polo","loungewear"]
  priceTier: ["fast","contemporary"]
  aestheticTags: ["sport","streetwear","minimal"]
  seasonFit: ["all-year"]

- id: coolmax-air
  name: "COOLMAX Air (lightweight breathable)"
  layer: L2
  parentId: coolmax
  composition: "Coolmax polyester with maximized open structure"
  weightRange: { min: 80, max: 130, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["activewear","tshirt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","minimal"]
  seasonFit: ["SS","all-year"]

- id: coolmax-eco-made
  name: "COOLMAX EcoMade (recycled)"
  layer: L2
  parentId: coolmax
  composition: "Coolmax 4-channel polyester from recycled PET bottles"
  weightRange: { min: 130, max: 200, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["tshirt","activewear","sock","loungewear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","sustainable","minimal"]
  seasonFit: ["all-year"]

- id: coolmax-pro
  name: "COOLMAX Pro (high-performance sport)"
  layer: L2
  parentId: coolmax
  composition: "Coolmax with specialty wicking + FreshFX odor control"
  weightRange: { min: 140, max: 220, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["activewear","baselayer","tshirt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","performance"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-coolmax-lycra-company
  name: "COOLMAX® by The LYCRA Company (brand owner)"
  layer: L3
  parentId: coolmax
  origin: "USA HQ; mill partners global"
  notes: |
    Coolmax brand owned by The LYCRA Company (former DuPont/Invista textile
    arm). B2B ingredient brand with global certified mill partners.
    Co-branding program for end-brand labeling. Operating through Chapter 11
    (March 2026) — see §7 elastane for status.
  verification: "https://www.coolmax.com/en + https://www.thelycracompany.com/en/products/coolmax + https://en.wikipedia.org/wiki/Coolmax"

- id: supplier-ekoten-coolmax
  name: "Ekoten Tekstil (COOLMAX partner)"
  layer: L3
  parentId: coolmax
  origin: "Türkiye"
  notes: |
    Knitting mill authorized to weave / knit COOLMAX fabrics; supplies
    activewear and intimates brands.
  verification: "https://www.ekoten.com.tr/ + https://www.coolmax.com/en/value-chain"

- id: supplier-nishat-coolmax
  name: "Nishat Mills (COOLMAX partner)"
  layer: L3
  parentId: coolmax
  origin: "Pakistan"
  notes: |
    Vertically integrated mill (yarn → woven/knit → garment) partnering with
    COOLMAX for activewear and basics.
  verification: "https://nishatmillsltd.com/ + https://www.coolmax.com/en"
```

### Notes & sources
- Coolmax is the canonical B2B moisture-wicking ingredient brand alongside Polartec Power Dry. Used by Champion, JACK & JONES, Calzedonia, Happy Socks and many others.
- Sources:
  - https://www.coolmax.com/en
  - https://en.wikipedia.org/wiki/Coolmax

---

## 10. Polartec® (fleece + insulation + softshell B2B)

### L1 — Base
```yaml
- id: polartec
  name: "Polartec®"
  layer: L1
  family: performance
  composition: "Polyester / nylon engineered fleece, knit, woven, and insulation systems"
  weightRange: { min: 100, max: 600, unit: gsm }
  defaultFinish: "anti-pill"
  finishOptions: ["anti-pill","wicking","brushed","windproof","water-repellent-DWR","abrasion-finish"]
  zones: ["Body","Sleeve","Hood","Lining","Insulation"]
  subtypes: ["outerwear-jacket","outerwear-coat","sweater","baselayer","loungewear","activewear","glove","cap","scarf"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sport","outdoor","streetwear","utility"]
  seasonFit: ["FW","transitional","all-year"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: polartec-classic-fleece
  name: "Polartec Classic Fleece (100/200/300)"
  layer: L2
  parentId: polartec
  composition: "100% polyester double-velour knit fleece (often rPET)"
  weightRange: { min: 200, max: 400, unit: gsm }
  defaultFinish: "anti-pill"
  subtypes: ["outerwear-jacket","sweater","loungewear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["outdoor","streetwear","utility"]
  seasonFit: ["FW","transitional"]

- id: polartec-thermal-pro
  name: "Polartec Thermal Pro"
  layer: L2
  parentId: polartec
  composition: "Polyester high-loft fleece"
  weightRange: { min: 220, max: 380, unit: gsm }
  defaultFinish: "anti-pill"
  subtypes: ["outerwear-jacket","sweater"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["outdoor","sport","streetwear"]
  seasonFit: ["FW"]

- id: polartec-power-stretch
  name: "Polartec Power Stretch / Power Stretch Pro"
  layer: L2
  parentId: polartec
  composition: "Nylon + polyester + elastane stretch knit"
  weightRange: { min: 200, max: 280, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["baselayer","activewear","outerwear-jacket","glove"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","outdoor","minimal"]
  seasonFit: ["FW","transitional"]

- id: polartec-power-dry
  name: "Polartec Power Dry (moisture wicking baselayer)"
  layer: L2
  parentId: polartec
  composition: "Bi-component polyester knit"
  weightRange: { min: 130, max: 220, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["baselayer","activewear","tshirt"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","outdoor","minimal"]
  seasonFit: ["all-year"]

- id: polartec-alpha
  name: "Polartec Alpha™ active insulation"
  layer: L2
  parentId: polartec
  composition: "Lofted polyester insulation with mesh-core scrim, hydrophobic"
  weightRange: { min: 60, max: 180, unit: gsm }
  defaultFinish: "wicking"
  subtypes: ["outerwear-jacket","outerwear-coat","activewear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport"]
  seasonFit: ["FW","transitional"]

- id: polartec-windbloc
  name: "Polartec Windbloc / Wind Pro (windproof fleece)"
  layer: L2
  parentId: polartec
  composition: "Polyester fleece with PU windproof membrane"
  weightRange: { min: 280, max: 420, unit: gsm }
  defaultFinish: "windproof"
  subtypes: ["outerwear-jacket","sweater"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","utility"]
  seasonFit: ["FW","transitional"]

- id: polartec-shearling
  name: "Polartec Shearling / High Loft"
  layer: L2
  parentId: polartec
  composition: "Polyester high-loft pile fleece"
  weightRange: { min: 320, max: 520, unit: gsm }
  defaultFinish: "anti-pill"
  subtypes: ["outerwear-jacket","sweater","loungewear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","streetwear","luxury"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-polartec-llc
  name: "Polartec LLC (Milliken Group)"
  layer: L3
  parentId: polartec
  origin: "USA (Lawrence, Massachusetts; manufacturing) — Milliken & Company subsidiary since 2019"
  notes: |
    Inventor of Polarfleece (1981). 600+ brand partners worldwide including
    Patagonia, The North Face, Marmot, Mountain Hardwear, Arc'teryx, Helly
    Hansen, Outdoor Research, Rab, Lands' End, L.L.Bean, Jack Wolfskin,
    plus all branches of US military. Pure B2B ingredient + woven/knit
    mill operating 2026.
  verification: "https://www.polartec.com/ + https://www.polartec.com/products + https://en.wikipedia.org/wiki/Malden_Mills"
```

### Notes & sources
- Polartec is unusual in that it BOTH licenses the brand AND operates its own mill — supplies finished fabric directly to brands. Therefore only one L3 entry needed (the company itself).
- Sources:
  - https://www.polartec.com/
  - https://www.polartec.com/news/featured-fabric-alpha
  - https://www.polartec.com/fabrics/insulation/fleece-series

---

## 11. GORE-TEX® (W. L. Gore & Associates — waterproof breathable membrane)

### L1 — Base
```yaml
- id: goretex
  name: "GORE-TEX®"
  layer: L1
  family: performance
  composition: "ePTFE membrane laminated to face fabric (rPET, nylon, etc.) + lining; 2L / 2.5L / 3L constructions"
  weightRange: { min: 120, max: 380, unit: gsm }
  defaultFinish: "waterproof-breathable"
  finishOptions: ["waterproof-breathable","windproof","DWR","PFAS-free-ePE"]
  zones: ["Body","Sleeve","Hood","Lining-laminate"]
  subtypes: ["outerwear-jacket","outerwear-coat","trouser","short","footwear-upper","footwear-lining","glove","cap"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","streetwear","utility"]
  seasonFit: ["FW","transitional","SS"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: goretex-pro
  name: "GORE-TEX Pro"
  layer: L2
  parentId: goretex
  composition: "3-layer ePTFE laminate, high abrasion + breathability (alpine/expedition grade)"
  weightRange: { min: 160, max: 340, unit: gsm }
  defaultFinish: "waterproof-breathable"
  subtypes: ["outerwear-jacket","outerwear-coat","trouser"]
  priceTier: ["luxury"]
  aestheticTags: ["outdoor","sport","utility"]
  seasonFit: ["FW","transitional"]

- id: goretex-active
  name: "GORE-TEX Active"
  layer: L2
  parentId: goretex
  composition: "Lightweight 3L ePTFE for high-output activities"
  weightRange: { min: 100, max: 180, unit: gsm }
  defaultFinish: "waterproof-breathable"
  subtypes: ["outerwear-jacket","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","outdoor"]
  seasonFit: ["all-year"]

- id: goretex-paclite
  name: "GORE-TEX Paclite Plus (2.5L)"
  layer: L2
  parentId: goretex
  composition: "2.5L ePTFE — packable, lightweight"
  weightRange: { min: 100, max: 160, unit: gsm }
  defaultFinish: "waterproof-breathable"
  subtypes: ["outerwear-jacket"]
  priceTier: ["premium"]
  aestheticTags: ["outdoor","sport","streetwear","utility"]
  seasonFit: ["transitional","SS"]

- id: goretex-infinium
  name: "GORE-TEX INFINIUM™ (Windstopper-class)"
  layer: L2
  parentId: goretex
  composition: "Windproof + water-resistant (not fully waterproof) ePTFE laminate"
  weightRange: { min: 120, max: 280, unit: gsm }
  defaultFinish: "windproof"
  subtypes: ["outerwear-jacket","glove","cap","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","streetwear","utility"]
  seasonFit: ["FW","transitional"]

- id: goretex-epe
  name: "GORE-TEX ePE (PFAS-free expanded polyethylene)"
  layer: L2
  parentId: goretex
  composition: "Expanded polyethylene membrane, PFAS-free (succeeds ePTFE in PFC-free lines)"
  weightRange: { min: 110, max: 220, unit: gsm }
  defaultFinish: "waterproof-breathable"
  subtypes: ["outerwear-jacket","footwear-upper"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","sustainable","streetwear"]
  seasonFit: ["FW","transitional"]

- id: goretex-footwear
  name: "GORE-TEX Footwear (extended comfort / surround)"
  layer: L2
  parentId: goretex
  composition: "ePTFE bootie laminated to lining"
  weightRange: { min: 120, max: 200, unit: gsm }
  defaultFinish: "waterproof-breathable"
  subtypes: ["footwear-upper","footwear-lining"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","streetwear","utility"]
  seasonFit: ["FW","transitional","SS"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-w-l-gore
  name: "W. L. Gore & Associates (brand owner)"
  layer: L3
  parentId: goretex
  origin: "USA HQ (Newark, Delaware) + Germany (Putzbrunn) + UK (Livingston) + Japan + global"
  notes: |
    Inventor of Gore-Tex (1969). Pure B2B ingredient brand; works directly
    with brand partners through Gore Brand Partners + GORE-TEX Professional
    programs. Major brand partners: Arc'teryx, The North Face, Patagonia,
    Adidas, Nike, Salomon, Mammut, Moncler, Norrøna, Carhartt, Stone Island,
    Fjällräven, Mountain Equipment + many more. Sole producer + licensor.
    Also note: GoreWear (consumer cycling brand) closed permanently 2025;
    Gore-Tex membrane B2B program continues normally.
  verification: "https://www.gore-tex.com/about/brands + https://www.goretexprofessional.com/about-us/our-partners + https://en.wikipedia.org/wiki/Gore-Tex"
```

### Notes & sources
- Single L3 — Gore is sole producer; B2B model is direct ingredient licensing to brands.
- Sources:
  - https://www.gore-tex.com/
  - https://www.goretexprofessional.com/

---

## 12. eVent® (Stoney Creek — alternative WP/B membrane)

### L1 — Base
```yaml
- id: event
  name: "eVent® Fabrics"
  layer: L1
  family: performance
  composition: "PTFE or plant-based membrane laminated to face/lining (multiple variants)"
  weightRange: { min: 100, max: 300, unit: gsm }
  defaultFinish: "waterproof-breathable"
  finishOptions: ["waterproof-breathable","PFAS-free","DWR","plant-based"]
  zones: ["Body","Sleeve","Hood","Lining-laminate"]
  subtypes: ["outerwear-jacket","outerwear-coat","trouser","footwear-upper","glove"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","utility","sustainable"]
  seasonFit: ["FW","transitional","SS"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: event-alpinest
  name: "eVent alpineST (PFAS-free alpine grade)"
  layer: L2
  parentId: event
  composition: "Multi-layer PFAS-free WP/B laminate"
  weightRange: { min: 140, max: 240, unit: gsm }
  defaultFinish: "waterproof-breathable"
  subtypes: ["outerwear-jacket","outerwear-coat","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","sustainable"]
  seasonFit: ["FW","transitional"]

- id: event-stormst
  name: "eVent stormST (plant-based BIO laminate, renamed SS26)"
  layer: L2
  parentId: event
  composition: "Plant-based WP/B laminate (formerly BIO Waterproof)"
  weightRange: { min: 120, max: 200, unit: gsm }
  defaultFinish: "waterproof-breathable"
  subtypes: ["outerwear-jacket","trouser"]
  priceTier: ["premium"]
  aestheticTags: ["outdoor","sustainable","streetwear"]
  seasonFit: ["transitional","SS"]

- id: event-windstormst
  name: "eVent windstormST (windproof breathable, plant-based)"
  layer: L2
  parentId: event
  composition: "Plant-based windproof breathable laminate (formerly BIO Windproof)"
  weightRange: { min: 100, max: 180, unit: gsm }
  defaultFinish: "windproof"
  subtypes: ["outerwear-jacket","glove"]
  priceTier: ["premium"]
  aestheticTags: ["outdoor","sustainable","sport"]
  seasonFit: ["transitional"]

- id: event-stormburst-lt
  name: "eVent stormburstLT (ultralight)"
  layer: L2
  parentId: event
  composition: "Ultralight WP/B laminate"
  weightRange: { min: 80, max: 140, unit: gsm }
  defaultFinish: "waterproof-breathable"
  subtypes: ["outerwear-jacket","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","minimal"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-event-fabrics
  name: "eVent Fabrics (Stoney Creek Industries)"
  layer: L3
  parentId: event
  origin: "USA HQ (Salt Lake City)"
  notes: |
    B2B ingredient brand selling laminates directly to outdoor / golf /
    cycling brands. Recent partnerships: Whitespace (Shaun White snow brand,
    Performance 3L Pant), HLINC Golf. SS26 product line renamed for clarity.
  verification: "https://www.eventfabrics.com/ + https://www.eventfabrics.com/about/news + https://shop-eat-surf-outdoor.com/press-releases/event-fabrics-announces-partnership-with-whitespace/615809"

- id: supplier-tiong-liong-event
  name: "Tiong Liong / TLC (eVent footwear partner)"
  layer: L3
  parentId: event
  origin: "Taiwan"
  notes: |
    Specialty footwear-laminate weaver authorized for eVent PTFE one-piece
    upper. B2B mill for footwear brands.
  verification: "https://www.tiongliong.com/en/product/event-ptfe-waterproof_breathable-fabric.html + https://www.tiongliong.com/en/"
```

### Notes & sources
- eVent is the longest-standing GORE-TEX alternative; Stoney Creek owns the brand 2026.
- Sources:
  - https://www.eventfabrics.com/
  - https://www.etextilecommunications.com/news/event-fabrics-renames-plant-based-laminates-as-brand-evolution-continues/article_d4bc2694-e9b0-11ef-8e1d-5fa7199a1739.html

---

## 13. Pertex® (Mitsui Bussan — lightweight ripstop / down-proof)

### L1 — Base
```yaml
- id: pertex
  name: "Pertex®"
  layer: L1
  family: performance
  composition: "High-density nylon (or polyester) ripstop / down-proof / coated wovens"
  weightRange: { min: 18, max: 130, unit: gsm }
  defaultFinish: "down-proof"
  finishOptions: ["down-proof","calendered","DWR","ripstop-grid","laminate"]
  zones: ["Body","Sleeve","Hood","Pocket","Lining"]
  subtypes: ["outerwear-jacket","outerwear-coat","trouser","backpack-shell","cap"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["outdoor","sport","minimal","streetwear","utility"]
  seasonFit: ["FW","transitional","SS","all-year"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: pertex-quantum
  name: "Pertex Quantum (down-proof shell)"
  layer: L2
  parentId: pertex
  composition: "Ultralight nylon ripstop, down-proof"
  weightRange: { min: 22, max: 50, unit: gsm }
  defaultFinish: "down-proof"
  subtypes: ["outerwear-jacket","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","minimal"]
  seasonFit: ["FW","transitional"]

- id: pertex-quantum-pro
  name: "Pertex Quantum Pro (coated down-proof)"
  layer: L2
  parentId: pertex
  composition: "Nylon ripstop with PU coating, down-proof + water-resistant"
  weightRange: { min: 30, max: 60, unit: gsm }
  defaultFinish: "DWR"
  subtypes: ["outerwear-jacket","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","minimal"]
  seasonFit: ["FW","transitional"]

- id: pertex-quantum-air
  name: "Pertex Quantum Air (high air permeability)"
  layer: L2
  parentId: pertex
  composition: "Ultralight nylon with high air permeability for active insulation"
  weightRange: { min: 18, max: 40, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","minimal"]
  seasonFit: ["transitional","FW"]

- id: pertex-shield
  name: "Pertex Shield (waterproof breathable laminate)"
  layer: L2
  parentId: pertex
  composition: "Nylon face + waterproof-breathable laminate"
  weightRange: { min: 80, max: 130, unit: gsm }
  defaultFinish: "waterproof-breathable"
  subtypes: ["outerwear-jacket","trouser"]
  priceTier: ["premium"]
  aestheticTags: ["outdoor","sport","utility"]
  seasonFit: ["FW","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-pertex-mitsui
  name: "Pertex (Mitsui Bussan Techno Products)"
  layer: L3
  parentId: pertex
  origin: "Japan (Mitsui & Co subsidiary; weaving in Asia)"
  notes: |
    Brand acquired by Mitsui & Co. 2005 after Perseverance Mills liquidation.
    Brand partners include The North Face, Yamatomichi, Rab, Mountain
    Equipment + many alpine + ultralight outdoor brands. Pertex Fabric Lab
    digital platform for B2B partners 2024+.
  verification: "https://pertex.com/ + https://pertex.com/explore/innovation/timeline + https://www.fibre2fashion.com/news/textiles-technology-news/japan-s-pertex-launches-new-fabric-lab-online-platform-274236-newsdetails.htm"
```

### Notes & sources
- Sources:
  - https://pertex.com/
  - https://en.wikipedia.org/wiki/Pertex

---

## 14. 3M™ Thinsulate™ (synthetic insulation)

### L1 — Base
```yaml
- id: thinsulate
  name: "3M™ Thinsulate™"
  layer: L1
  family: performance
  composition: "Microfine polyester + olefin staple insulation; some grades 75% recycled"
  weightRange: { min: 40, max: 240, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","hydrophobic","featherless"]
  zones: ["Insulation","Body","Sleeve","Hood","Lining"]
  subtypes: ["outerwear-jacket","outerwear-coat","glove","cap","footwear-lining"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["outdoor","streetwear","utility","sport"]
  seasonFit: ["FW","transitional"]
  certifications: ["OEKO-TEX","bluesign","REACH"]
  vegan: true
```

### L2 — Variants
```yaml
- id: thinsulate-classic
  name: "Thinsulate Classic (G / C / B series)"
  layer: L2
  parentId: thinsulate
  composition: "Microfine polyester + olefin nonwoven batt"
  weightRange: { min: 40, max: 240, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","outerwear-coat","glove","cap"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["outdoor","streetwear","utility"]
  seasonFit: ["FW","transitional"]

- id: thinsulate-aqua
  name: "Thinsulate Aqua (hydrophobic)"
  layer: L2
  parentId: thinsulate
  composition: "Hydrophobic Thinsulate for wet conditions"
  weightRange: { min: 60, max: 220, unit: gsm }
  defaultFinish: "hydrophobic"
  subtypes: ["outerwear-jacket","glove"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["outdoor","sport"]
  seasonFit: ["FW","transitional"]

- id: thinsulate-featherless
  name: "Thinsulate Featherless (down-alternative)"
  layer: L2
  parentId: thinsulate
  composition: "Polyester insulation engineered to mimic down, 75% recycled grade available"
  weightRange: { min: 80, max: 240, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","outerwear-coat"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["outdoor","sustainable","streetwear"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-3m-thinsulate
  name: "3M™ Thinsulate™ (3M Company, brand owner)"
  layer: L3
  parentId: thinsulate
  origin: "USA HQ (Saint Paul, MN); global plants"
  notes: |
    Brand introduced 1979. Sold in jackets at every price point from every
    major brand worldwide. Pure B2B insulation brand. Distributed through
    3M directly + authorized partners.
  verification: "https://www.3m.com/3M/en_US/thinsulate-us/ + https://en.wikipedia.org/wiki/Thinsulate"

- id: supplier-fabri-quilt-thinsulate
  name: "Fabri-Quilt (Thinsulate authorized partner)"
  layer: L3
  parentId: thinsulate
  origin: "USA"
  notes: |
    Authorized B2B converter for 3M Thinsulate insulation in quilted apparel
    + bedding applications.
  verification: "https://www.fabri-quilt.com/3m-thinsulate"
```

### Notes & sources
- Sources:
  - https://www.3m.com/3M/en_US/thinsulate-us/
  - https://en.wikipedia.org/wiki/Thinsulate

---

## 15. PrimaLoft® (down-alternative synthetic insulation)

### L1 — Base
```yaml
- id: primaloft
  name: "PrimaLoft®"
  layer: L1
  family: performance
  composition: "Microfiber polyester insulation (often blended with recycled / bio fibers)"
  weightRange: { min: 40, max: 240, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","hydrophobic","bio-degradable","ThermoPlume","P.U.R.E."]
  zones: ["Insulation","Body","Sleeve","Hood","Lining"]
  subtypes: ["outerwear-jacket","outerwear-coat","glove","cap","loungewear"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["outdoor","streetwear","sport","utility","sustainable"]
  seasonFit: ["FW","transitional"]
  certifications: ["OEKO-TEX","bluesign","GRS"]
  vegan: true
```

### L2 — Variants
```yaml
- id: primaloft-gold
  name: "PrimaLoft Gold (premium down-alternative)"
  layer: L2
  parentId: primaloft
  composition: "Ultra-fine microfiber, often with rPET, hydrophobic"
  weightRange: { min: 40, max: 200, unit: gsm }
  defaultFinish: "hydrophobic"
  subtypes: ["outerwear-jacket","outerwear-coat","glove"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","luxury"]
  seasonFit: ["FW"]

- id: primaloft-silver
  name: "PrimaLoft Silver"
  layer: L2
  parentId: primaloft
  composition: "Microfiber polyester insulation (blend of virgin + recycled)"
  weightRange: { min: 40, max: 220, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","outerwear-coat","glove","cap"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["outdoor","streetwear","sport"]
  seasonFit: ["FW","transitional"]

- id: primaloft-bio
  name: "PrimaLoft Bio (biodegradable insulation)"
  layer: L2
  parentId: primaloft
  composition: "100% recycled polyester engineered to biodegrade in landfill / marine conditions"
  weightRange: { min: 60, max: 200, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sustainable","streetwear"]
  seasonFit: ["FW","transitional"]

- id: primaloft-thermoplume
  name: "PrimaLoft ThermoPlume (blowable down-alternative)"
  layer: L2
  parentId: primaloft
  composition: "Loose microfiber clusters that blow into baffled chambers like down"
  weightRange: { min: 60, max: 200, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","streetwear","luxury"]
  seasonFit: ["FW"]

- id: primaloft-pure
  name: "PrimaLoft P.U.R.E. (low-energy manufacturing)"
  layer: L2
  parentId: primaloft
  composition: "PrimaLoft insulation made with air rather than thermal bonding"
  weightRange: { min: 60, max: 180, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sustainable"]
  seasonFit: ["FW"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-primaloft
  name: "PrimaLoft, Inc. (brand owner)"
  layer: L3
  parentId: primaloft
  origin: "USA HQ (Latham, NY) + Germany + Italy + China + acquired by Compass Diversified 2022 ($530M)"
  notes: |
    950+ global brand partners including Patagonia, L.L.Bean, Adidas, Nike,
    Lululemon, Athleta, Polo Ralph Lauren, J.Crew, Arc'teryx, Stone Island,
    Helly Hansen, Marmot, Moncler, Canada Goose, Boll & Branch, Cotopaxi,
    La Sportiva, Stio, Maloja, Katmandu, Jack Wolfskin, 4F, Icebug, Buff.
    Largest global supplier of bluesign-approved insulations. Pure B2B
    ingredient brand operating 2026.
  verification: "https://primaloft.com/ + https://primaloft.com/news/primaloft-largest-global-supplier-bluesign-approved-insulations/ + https://primaloft.com/news/primaloft-bio-to-launch-with-over-15-brand-partners-this-fall/"

- id: supplier-fiberpartner-primaloft
  name: "Fiberpartner (PrimaLoft Bio distributor)"
  layer: L3
  parentId: primaloft
  origin: "Denmark / Europe"
  notes: |
    European B2B distributor of PrimaLoft Bio fiber. Supplies European
    converters + brands.
  verification: "https://fiberpartner.com/bio-fiber/ + https://fiberpartner.com/"
```

### Notes & sources
- PrimaLoft + Polartec are the two most respected B2B insulation/fleece brands. Both have 600+ brand partner programs.
- Sources:
  - https://primaloft.com/
  - https://primaloft.com/marketplace/

---

## 16. Thermore® (Italian synthetic insulation)

### L1 — Base
```yaml
- id: thermore
  name: "Thermore®"
  layer: L1
  family: performance
  composition: "Polyester nonwoven insulation; multiple recycled / bio variants"
  weightRange: { min: 40, max: 240, unit: gsm }
  defaultFinish: "raw"
  finishOptions: ["raw","Ecodown","T2T-textile-to-textile","stretch"]
  zones: ["Insulation","Body","Sleeve","Hood","Lining"]
  subtypes: ["outerwear-jacket","outerwear-coat","blazer","glove"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["outdoor","tailored","streetwear","sustainable"]
  seasonFit: ["FW","transitional"]
  certifications: ["OEKO-TEX","bluesign","GRS"]
  vegan: true
```

### L2 — Variants
```yaml
- id: thermore-ecodown-fibers
  name: "Thermore Ecodown® Fibers"
  layer: L2
  parentId: thermore
  composition: "Recycled polyester loose-fill insulation that mimics down"
  weightRange: { min: 60, max: 200, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","streetwear","sustainable"]
  seasonFit: ["FW"]

- id: thermore-ecodown-t2t
  name: "Thermore Ecodown Fibers T2T (textile-to-textile)"
  layer: L2
  parentId: thermore
  composition: "Insulation made from recycled polyester textile waste (March 2026 launch)"
  weightRange: { min: 60, max: 200, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","outerwear-coat"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sustainable","streetwear"]
  seasonFit: ["FW","transitional"]

- id: thermore-classic
  name: "Thermore Classic / Freedom"
  layer: L2
  parentId: thermore
  composition: "Polyester nonwoven needle-punched insulation"
  weightRange: { min: 40, max: 240, unit: gsm }
  defaultFinish: "raw"
  subtypes: ["outerwear-jacket","blazer","glove"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["tailored","outdoor","streetwear"]
  seasonFit: ["FW","transitional"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-thermore
  name: "Thermore S.r.l. (brand owner)"
  layer: L3
  parentId: thermore
  origin: "Italy (Milan HQ); manufacturing Europe + Far East"
  notes: |
    Italian insulation specialist founded 1972. B2B partners include
    Aspesi, Emporio Armani / EA7, Karbon (skiwear). 2026 consumer campaign
    "Power Comes from Within". March 2026 Ecodown T2T launch. Don Reichelt
    appointed N. American sales rep April 2026.
  verification: "https://www.thermore.com/ + https://www.endurancesportswire.com/?p=229212 + https://www.globenewswire.com/news-release/2026/03/11/3253684/0/en/Thermore-introduces-Ecodown-Fibers-T2T-The-thermal-insulation-that-transforms-textile-waste-into-warmth.html"
```

### Notes & sources
- Thermore is the third major B2B insulation brand alongside PrimaLoft + Thinsulate, with stronger Italian fashion+tailored coverage (Aspesi, Armani).
- Sources:
  - https://www.thermore.com/
  - https://wwd.com/sustainability/business/thermore-thermal-insulation-company-consumer-facing-strategy-1236870380/

---

## 17. Pebax® (Arkema — high-performance polyamide for footwear midsoles)

### L1 — Base
```yaml
- id: pebax
  name: "Pebax® Powered"
  layer: L1
  family: performance
  composition: "Polyether Block Amide (PEBA) — block copolymer of nylon + polyether"
  weightRange: { min: 0, max: 0, unit: density }
  defaultFinish: "foamed"
  finishOptions: ["foamed-midsole","molded-component","film","extruded","Pebax-Rnew-bio-based","Pebax-EVA+"]
  zones: ["Midsole","Plate","Outsole-component","Heel-counter","Performance-trim"]
  subtypes: ["footwear-midsole","footwear-plate","sports-equipment","ski-boot","cycling-shoe"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","performance","outdoor"]
  seasonFit: ["all-year"]
  certifications: ["REACH","ISO-14001"]
  vegan: true
```

### L2 — Variants
```yaml
- id: pebax-eva-plus
  name: "Pebax® EVA+"
  layer: L2
  parentId: pebax
  composition: "PEBA + EVA compound for midsole foaming"
  weightRange: { min: 0, max: 0, unit: density }
  defaultFinish: "foamed-midsole"
  subtypes: ["footwear-midsole"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","performance"]
  seasonFit: ["all-year"]

- id: pebax-rnew
  name: "Pebax® Rnew (bio-based PEBA)"
  layer: L2
  parentId: pebax
  composition: "Castor-oil-derived PEBA, partly bio-based"
  weightRange: { min: 0, max: 0, unit: density }
  defaultFinish: "foamed-midsole"
  subtypes: ["footwear-midsole","sports-equipment"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","sustainable","performance"]
  seasonFit: ["all-year"]

- id: pebax-extruded-film
  name: "Pebax® film / sheet (technical components)"
  layer: L2
  parentId: pebax
  composition: "PEBA extruded film for athletic footwear stiffeners + cycling shoe components"
  weightRange: { min: 0, max: 0, unit: density }
  defaultFinish: "extruded"
  subtypes: ["footwear-plate","sports-equipment","ski-boot"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","performance"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-arkema-pebax
  name: "Arkema (Pebax® Powered, brand owner)"
  layer: L3
  parentId: pebax
  origin: "France HQ (Colombes); global plants"
  notes: |
    Inventor of PEBA (Pebax). B2B polymer supply directly to footwear brands +
    midsole foam compounders. Partners include Saucony, Decathlon/Kiprun,
    Merrell, Dynafit, Columbia Montrail. (Note: Nike ZoomX uses Pebax as base
    polymer but is a brand-locked technology — covered under EXCLUDED.) Pure
    B2B chemistry brand operating 2026.
  verification: "https://pebaxpowered.arkema.com/en/ + https://hpp.arkema.com/en/markets-and-applications/sports/sports-footwear-equipment-apparel/ + https://hpp.arkema.com/en/resources/post/hpp/hhp.arkema/exploring-the-outdoors-pebax-trail-running/"

- id: supplier-spark-foamtech-pebax
  name: "Spark Foamtech (Pebax foam compounder partner)"
  layer: L3
  parentId: pebax
  origin: "Asia (Taiwan / China)"
  notes: |
    Specialty foam compounder for footwear brands; works with Arkema Pebax
    polymer for high-performance midsoles. B2B partner.
  verification: "https://sparkfoamtech.com/pebax-arkema-a-material-that-turns-chemistry-into-the-language-of-feel/"
```

### Notes & sources
- Pebax is the BASE polymer; brand-locked downstream technologies (Nike ZoomX, others) are excluded — but Pebax itself is a legitimate B2B ingredient sold to many brands.
- Sources:
  - https://pebaxpowered.arkema.com/en/
  - https://hpp.arkema.com/en/markets-and-applications/sports/sports-footwear-equipment-apparel/

---

## 18. Neoprene / Scuba (CR-foam laminate)

### L1 — Base
```yaml
- id: neoprene
  name: "Neoprene / Scuba"
  layer: L1
  family: synthetic
  composition: "Chloroprene rubber (CR) foam core laminated to polyester / nylon jersey on one or both faces"
  weightRange: { min: 280, max: 1200, unit: gsm }
  defaultFinish: "double-jersey-laminate"
  finishOptions: ["single-jersey-laminate","double-jersey-laminate","limestone-base","oil-base","skin-finish"]
  zones: ["Body","Sleeve","Pocket","Reinforcement"]
  subtypes: ["dress","top","skirt","jumpsuit","swimwear","wetsuit","outerwear-jacket","activewear","footwear-component"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sport","minimal","streetwear","resort","luxury"]
  seasonFit: ["all-year","SS","transitional"]
  certifications: ["OEKO-TEX"]
  vegan: true
```

### L2 — Variants
```yaml
- id: neoprene-fashion-scuba
  name: "Fashion scuba (lightweight 2–3 mm)"
  layer: L2
  parentId: neoprene
  composition: "Thin CR foam + double-knit polyester laminate"
  weightRange: { min: 280, max: 480, unit: gsm }
  defaultFinish: "double-jersey-laminate"
  subtypes: ["dress","top","skirt","jumpsuit","blazer"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["minimal","streetwear","resort","luxury"]
  seasonFit: ["transitional","SS"]

- id: neoprene-wetsuit-3mm
  name: "Wetsuit neoprene (3 mm)"
  layer: L2
  parentId: neoprene
  composition: "CR foam core + nylon jersey laminate, 3 mm thick"
  weightRange: { min: 600, max: 850, unit: gsm }
  defaultFinish: "double-jersey-laminate"
  subtypes: ["wetsuit","swimwear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","resort"]
  seasonFit: ["SS","all-year"]

- id: neoprene-wetsuit-5mm
  name: "Wetsuit neoprene (5 mm)"
  layer: L2
  parentId: neoprene
  composition: "CR foam core + nylon jersey laminate, 5 mm thick"
  weightRange: { min: 900, max: 1200, unit: gsm }
  defaultFinish: "double-jersey-laminate"
  subtypes: ["wetsuit"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sport","outdoor"]
  seasonFit: ["FW","all-year"]

- id: neoprene-limestone
  name: "Limestone neoprene"
  layer: L2
  parentId: neoprene
  composition: "Limestone-derived CR (vs petroleum-based) foam laminate"
  weightRange: { min: 600, max: 1200, unit: gsm }
  defaultFinish: "double-jersey-laminate"
  subtypes: ["wetsuit","swimwear"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","resort","luxury"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
```yaml
- id: supplier-yamamoto-corp
  name: "Yamamoto Corporation (limestone neoprene)"
  layer: L3
  parentId: neoprene
  origin: "Japan (Osaka)"
  notes: |
    Premium limestone-based neoprene; 54+ year heritage. Supplies wetsuit
    + diving brands worldwide (SRFACE, Isurus, 7TILL8, BESTDIVE — only
    licensed Chinese manufacturer). B2B foam producer with brand-licensing
    program.
  verification: "https://yamamoto-bio.com/ + https://yamamoto-bio.com/material-e/ + https://srface.com/pages/yamamoto-neoprene"

- id: supplier-sheico-neoprene
  name: "Sheico Group (neoprene wetsuit B2B)"
  layer: L3
  parentId: neoprene
  origin: "Taiwan + Cambodia"
  notes: |
    World's largest neoprene wetsuit / scuba manufacturer; B2B for surfing +
    diving brands (Body Glove, Quiksilver and many private label).
  verification: "https://www.sheico.com/ + https://en.wikipedia.org/wiki/Sheico_Group"

- id: supplier-orca-tepro
  name: "Orca / Tepro neoprene fabric (Italy)"
  layer: L3
  parentId: neoprene
  origin: "Italy"
  notes: |
    European neoprene laminate B2B supplier for fashion scuba; supplies many
    Italian + European fashion brands. Public B2B catalog.
  verification: "https://www.tepro.it/ + https://en.wikipedia.org/wiki/Neoprene"
```

### Notes & sources
- "Scuba" in fashion = CR-foam laminate = same chemistry as wetsuit neoprene, lighter gauge. Yamamoto is the gold standard for performance wetsuit; Sheico for volume manufacturing; Tepro for Italian fashion scuba.
- Sources:
  - https://yamamoto-bio.com/
  - https://www.sheico.com/

---

## 19. Ripstop nylon (specialty fabric, cross-cut to fiber)

### L1 — Base
```yaml
- id: ripstop-nylon
  name: "Ripstop nylon"
  layer: L1
  family: synthetic
  composition: "100% nylon (PA 6 or 6,6) with ripstop reinforcement grid"
  weightRange: { min: 30, max: 280, unit: gsm }
  defaultFinish: "DWR"
  finishOptions: ["DWR","calendered","silicone-coated","PU-coated","raw"]
  zones: ["Body","Sleeve","Hood","Pocket","Reinforcement"]
  subtypes: ["outerwear-jacket","outerwear-coat","trouser","short","backpack-shell","cap"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","utility","streetwear","tactical"]
  seasonFit: ["all-year","FW","transitional"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: ripstop-nylon-ultralight
  name: "Ultralight ripstop nylon (15D–30D)"
  layer: L2
  parentId: ripstop-nylon
  composition: "15D–30D nylon ripstop with reinforcement grid"
  weightRange: { min: 30, max: 60, unit: gsm }
  defaultFinish: "silicone-coated"
  subtypes: ["outerwear-jacket"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","minimal"]
  seasonFit: ["transitional","SS"]

- id: ripstop-nylon-mid
  name: "Mid-weight ripstop (40D–70D)"
  layer: L2
  parentId: ripstop-nylon
  composition: "40D–70D nylon ripstop"
  weightRange: { min: 60, max: 130, unit: gsm }
  defaultFinish: "DWR"
  subtypes: ["outerwear-jacket","trouser","short","cap"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","utility","streetwear"]
  seasonFit: ["transitional","FW"]

- id: ripstop-nylon-heavy
  name: "Heavy ripstop (210D–500D)"
  layer: L2
  parentId: ripstop-nylon
  composition: "210D–500D nylon ripstop"
  weightRange: { min: 130, max: 280, unit: gsm }
  defaultFinish: "PU-coated"
  subtypes: ["trouser","outerwear-jacket","backpack-shell"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["utility","tactical","streetwear"]
  seasonFit: ["all-year"]
```

### L3 — B2B Suppliers
See §3 nylon (Toray, Fulgar, NILIT, Asahi Kasei, Radici); §8 Cordura for branded heavy ripstop. Most ripstop is woven by the same mills supplying generic nylon.

---

## 20. Softshell (specialty fabric, polyester + elastane laminate)

### L1 — Base
```yaml
- id: softshell
  name: "Softshell"
  layer: L1
  family: performance
  composition: "Polyester + elastane (sometimes nylon + elastane) face fabric, optional membrane core, brushed back"
  weightRange: { min: 220, max: 420, unit: gsm }
  defaultFinish: "DWR"
  finishOptions: ["DWR","windproof-membrane","waterproof-membrane","brushed-back","stretch"]
  zones: ["Body","Sleeve","Hood","Trouser-leg"]
  subtypes: ["outerwear-jacket","outerwear-coat","trouser","activewear"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sport","outdoor","utility","streetwear"]
  seasonFit: ["FW","transitional"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
```yaml
- id: softshell-2-layer
  name: "2-layer softshell (no membrane, brushed back)"
  layer: L2
  parentId: softshell
  composition: "Polyester / elastane stretch face + brushed fleece back"
  weightRange: { min: 220, max: 320, unit: gsm }
  defaultFinish: "DWR"
  subtypes: ["outerwear-jacket","trouser","activewear"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","outdoor","streetwear"]
  seasonFit: ["FW","transitional"]

- id: softshell-3-layer-membrane
  name: "3-layer softshell with membrane"
  layer: L2
  parentId: softshell
  composition: "Polyester face + windproof membrane + brushed back"
  weightRange: { min: 280, max: 420, unit: gsm }
  defaultFinish: "windproof-membrane"
  subtypes: ["outerwear-jacket","trouser"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","outdoor","utility"]
  seasonFit: ["FW","transitional"]
```

### L3 — B2B Suppliers
See §10 Polartec (Polartec Power Shield Pro is the canonical softshell B2B brand) and §11 Gore-Tex INFINIUM (Windstopper-class softshell). Also Schoeller Textil AG (independent Swiss softshell mill) — not separately listed here as it overlaps coverage.

---

## 21. 3-layer membrane fabric (specialty fabric, generic)

### L1 — Base
```yaml
- id: three-layer-membrane
  name: "3-Layer membrane fabric"
  layer: L1
  family: performance
  composition: "Face fabric (polyester/nylon) + waterproof breathable membrane (PTFE/PU/PE) + lining tricot, all bonded"
  weightRange: { min: 140, max: 380, unit: gsm }
  defaultFinish: "waterproof-breathable"
  finishOptions: ["waterproof-breathable","windproof","DWR","PFAS-free","ePE"]
  zones: ["Body","Sleeve","Hood","Trouser-leg"]
  subtypes: ["outerwear-jacket","outerwear-coat","trouser","short","footwear-upper"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["outdoor","sport","utility","streetwear"]
  seasonFit: ["FW","transitional","SS"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
The 3L membrane category is a CONSTRUCTION not a fiber — it sub-categorizes by membrane brand, all of which already have dedicated entries above:
- 3L with GORE-TEX → see §11 (specifically `goretex-pro`, `goretex-active`)
- 3L with eVent → see §12 (`event-alpinest`, `event-stormburst-lt`)
- 3L with Pertex Shield → see §13 (`pertex-shield`)
- 3L with generic PU/PE membrane (white-label) → use this L1 with no L2 brand

### L3 — B2B Suppliers
See §11 Gore-Tex, §12 eVent, §13 Pertex. For generic / white-label PU + PE 3L laminates: Toray (§1), Schoeller Textil, Toyo Membrane Corp — overlap with branded coverage.

---

## 22. Ballistic nylon (specialty fabric)

### L1 — Base
```yaml
- id: ballistic-nylon
  name: "Ballistic nylon (1050D / 1680D)"
  layer: L1
  family: synthetic
  composition: "PA 6,6 high-tenacity ballistic basketweave"
  weightRange: { min: 380, max: 700, unit: gsm }
  defaultFinish: "PU-coated"
  finishOptions: ["PU-coated","raw","DWR","abrasion-finish"]
  zones: ["Body","Reinforcement","Bag-shell"]
  subtypes: ["backpack-shell","bag-lining","outerwear-jacket","footwear-component"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["utility","streetwear","tactical"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
See §3 nylon (`nylon-ballistic`) and §8 Cordura (`cordura-ballistic`) for variants — same construction in different branded vs unbranded versions.

### L3 — B2B Suppliers
See §3 nylon (Toray, NILIT, Radici) and §8 Cordura (Carolina PF, Delcotex, Formosa Taffeta).

---

## 23. Nylon taffeta (specialty fabric)

### L1 — Base
```yaml
- id: nylon-taffeta
  name: "Nylon taffeta"
  layer: L1
  family: synthetic
  composition: "100% nylon plain weave; thin, smooth, glossy"
  weightRange: { min: 30, max: 80, unit: gsm }
  defaultFinish: "calendered"
  finishOptions: ["calendered","DWR","crinkled"]
  zones: ["Lining","Body","Pocket","Hood"]
  subtypes: ["outerwear-jacket","outerwear-coat","blazer","bag-lining","skirt","dress"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["utility","tailored","sport"]
  seasonFit: ["all-year"]
  certifications: ["OEKO-TEX","bluesign"]
  vegan: true
```

### L2 — Variants
Already documented as `nylon-taffeta` in §3 nylon L2 list. This standalone entry exists because taffeta is requested as its own canonical category in the brief.

### L3 — B2B Suppliers
See §3 nylon (Toray, Formosa Taffeta — actually Taiwan's largest nylon taffeta weaver — Radici, NILIT).

---

## 24. Polyester fleece (specialty fabric, generic + branded)

### L1 — Base
```yaml
- id: polyester-fleece
  name: "Polyester fleece (generic + branded)"
  layer: L1
  family: synthetic
  composition: "100% polyester (or rPET) double-velour or single-side knit fleece"
  weightRange: { min: 180, max: 400, unit: gsm }
  defaultFinish: "anti-pill"
  finishOptions: ["anti-pill","brushed","windproof","DWR"]
  zones: ["Body","Sleeve","Hood","Lining"]
  subtypes: ["outerwear-jacket","sweater","loungewear","activewear","cap","scarf","glove"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["sport","outdoor","streetwear","utility","loungewear"]
  seasonFit: ["FW","transitional"]
  certifications: ["OEKO-TEX","bluesign","GRS","RCS"]
  vegan: true
```

### L2 — Variants
Generic polyester fleece is already in §1 (`polyester-fleece`). Branded variants are in §10 Polartec (`polartec-classic-fleece`, `polartec-thermal-pro`, `polartec-power-stretch`, `polartec-power-dry`, `polartec-windbloc`, `polartec-shearling`).

### L3 — B2B Suppliers
- Branded → see §10 Polartec.
- Generic → Toray (§1), FENC (§1), Far Eastern New Century, Reliance Industries, plus thousands of Chinese / Taiwanese knit mills (commodity scale, low B2B differentiation; not listed individually).

---

## 25. Polyester satin (specialty fabric)

### L1 — Base
Already documented as `polyester-satin` L2 in §1 polyester. Standalone L1 exists per request:
```yaml
- id: polyester-satin
  name: "Polyester satin"
  layer: L1
  family: synthetic
  composition: "100% polyester, satin weave (4/1 or 5/1)"
  weightRange: { min: 70, max: 180, unit: gsm }
  defaultFinish: "calendered"
  finishOptions: ["calendered","raw","crinkled"]
  zones: ["Body","Lining","Sleeve","Pocket"]
  subtypes: ["dress","blouse","skirt","lingerie","blazer","loungewear","scarf","outerwear-jacket"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["romantic","resort","tailored","minimal","luxury"]
  seasonFit: ["SS","transitional","all-year"]
  certifications: ["OEKO-TEX"]
  vegan: true
```

### L3 — B2B Suppliers
See §1 polyester (Toray, FENC, Indorama Ventures, Eastman, Reliance) — same mills weave satin construction.

---

## EXCLUDED entries (with reason)

The following items were **EXCLUDED** because (a) commercial readiness is unclear, production is paused, or company has filed insolvency, OR (b) the item is a brand-locked proprietary technology owned by a single DTC label, not a B2B ingredient. Per Felipe's rule: si no lo tienes claro, fuera.

```yaml
- id: excluded-sympatex
  name: "Sympatex (PFAS-free PES membrane)"
  family: performance
  reason: |
    Sympatex Technologies filed for INSOLVENCY in January 2026. As of
    2026-05-03, status of B2B partnerships and continued production is
    unclear — pending court proceedings. Per Felipe's rule (si no lo
    tienes claro, fuera) excluded for now. Re-evaluate if restructuring
    confirmed and B2B yarn / membrane supply resumes.
  verification: "https://www.snowsportsnews.com/newsrepository/2026/january/sympatex-technologies-files-for-insolvency/ + https://www.sympatex.com/en/"

- id: excluded-zoomx
  name: "ZoomX (Nike)"
  family: performance
  reason: |
    Brand-locked Nike running shoe foam. Built on Pebax base polymer (covered
    in §17 Pebax) but the ZoomX brand and proprietary formulation are exclusive
    to Nike. Not B2B — never sold to other brands. Per Felipe's brief (forbidden
    list) excluded; use Pebax (Arkema) directly to formulate non-Nike midsoles.
  verification: "https://www.nike.com/running/zoomx + https://en.wikipedia.org/wiki/Pebax"

- id: excluded-boost
  name: "Boost (Adidas)"
  family: performance
  reason: |
    Brand-locked Adidas + BASF (Infinergy) foam. TPU-based. Adidas exclusive
    license. Not B2B — not available to other brands. Excluded per forbidden
    list. Use generic TPU-foam from BASF (Elastollan) for non-Adidas applications.
  verification: "https://www.adidas.com/us/boost + https://www.basf.com/global/en/products/plastics-rubber/elastomers/infinergy.html"

- id: excluded-react
  name: "React (Nike)"
  family: performance
  reason: |
    Brand-locked Nike midsole foam. Excluded per forbidden list.
  verification: "https://www.nike.com/running/react"

- id: excluded-air-max
  name: "Air Max (Nike)"
  family: performance
  reason: |
    Brand-locked Nike pressurized-air bladder cushioning. Single-brand
    exclusive. Excluded per forbidden list.
  verification: "https://www.nike.com/air-max"

- id: excluded-flyknit
  name: "Flyknit (Nike)"
  family: performance
  reason: |
    Brand-locked Nike upper-knit construction technique. Single-brand exclusive.
    For comparable upper knits use generic engineered-knit constructions from
    knitting mills like Santoni machines (not branded).
  verification: "https://www.nike.com/innovation/flyknit"

- id: excluded-primeknit
  name: "Primeknit (Adidas)"
  family: performance
  reason: |
    Brand-locked Adidas upper-knit. Single-brand exclusive. Excluded.
  verification: "https://www.adidas.com/primeknit"

- id: excluded-gel
  name: "GEL (Asics)"
  family: performance
  reason: |
    Brand-locked Asics silicone gel cushioning insert. Asics-exclusive.
    Excluded per forbidden list.
  verification: "https://www.asics.com/us/en-us/mk/running-shoes/gel-technology"

- id: excluded-fresh-foam
  name: "Fresh Foam (New Balance)"
  family: performance
  reason: |
    Brand-locked New Balance proprietary midsole foam. Single-brand exclusive.
    Excluded per forbidden list.
  verification: "https://www.newbalance.com/freshfoam"

- id: excluded-hoka-profly
  name: "Profly / Profly+ (HOKA)"
  family: performance
  reason: |
    Brand-locked HOKA midsole foam compound. Single-brand exclusive. Excluded.
  verification: "https://www.hoka.com/en/us/profly.html"

- id: excluded-dna-loft
  name: "DNA Loft (Brooks)"
  family: performance
  reason: |
    Brand-locked Brooks midsole foam. Single-brand exclusive. Excluded.
  verification: "https://www.brooksrunning.com/en_us/learn/dna-loft-cushioning"

- id: excluded-lululemon-nulu
  name: "Nulu (Lululemon)"
  family: performance
  reason: |
    Brand-locked Lululemon proprietary fabric (nylon + elastane formulation).
    Single-brand exclusive. Excluded per forbidden list.
  verification: "https://shop.lululemon.com/story/fabrics-and-technology"

- id: excluded-patagonia-capilene
  name: "Capilene (Patagonia)"
  family: performance
  reason: |
    Brand-locked Patagonia DTC base-layer fabric. Single-brand exclusive (DTC
    only). Excluded per forbidden list. For comparable wicking poly baselayer
    use Coolmax (§9), Polartec Power Dry (§10), or generic engineered polyester.
  verification: "https://www.patagonia.com/our-footprint/capilene-baselayers.html"

- id: excluded-microsilk-spider-silk
  name: "Microsilk / Bolt Threads spider-silk (synthetic)"
  family: synthetic
  reason: |
    Bolt Threads has ceased operations 2024–2025 (also documented in Rama 2
    EXCLUDED). For protein-based "silk synthetic" the only viable B2B option
    is Spiber Brewed Protein (covered in Rama 2). Excluded from Rama 3 because
    no extant B2B synthetic-silk producer fits the synthetic-fiber definition.
  verification: "https://boltthreads.com/ + https://wwd.com/sustainability/materials/bolt-threads-halts-mylo-bio-based-materials-future-uncertain-1235761767/"
```

---

## Out-of-scope items for future ramas

These items came up during research and belong to other ramas — flagged so future research doesn't re-investigate:

- **Cotton, linen, wool, silk, cashmere, alpaca, mohair, hemp, jute, ramie** → Rama 1 (naturals).
- **Viscose, modal, lyocell (TENCEL), cupro (Bemberg), acetate, Naia, Refibra, ECOVERO, SeaCell, Crabyon, Orange Fiber, QMilk, soybean SPF, Spiber Brewed Protein, Bananatex, Vegea** → Rama 2 (regenerated + bio-based).
- **Leather (animal), recycled leather, leather alternatives (Mylo, Mirum, Desserto, Vegea, Pinatex, MycoWorks Reishi, Ecovative Forager, NEFFA Mycotex)** → Rama 4.
- **PLA / PHA bio-plastics in nonwoven applications** → out of scope for ROPA fashion textile (mostly hygiene + packaging).
- **Aramids (Kevlar, Nomex) + UHMWPE (Dyneema, Spectra)** → ballistic / industrial PPE, not fashion ROPA. Treat as Rama-3 extension only if Dyneema Composite Fabric (DCF) for ultralight outdoor packs is needed; not included in initial scope.
- **Carbon fiber, fiberglass, basalt** → industrial composite, not ROPA.
- **Recycled PP** → emerging; mostly nonwoven scale; revisit when commercial ROPA partner program crystallizes.
- **Schoeller Textil (Swiss softshell mill)** → covered by overlap with Polartec Power Shield + Gore-Tex INFINIUM; consider standalone Rama-3 entry in future revision.
- **TPU-foam (BASF Infinergy non-Adidas applications)** → consider adding to Pebax §17 sister entry in future revision.

---

## Final entry counts

- **L1 (base fibers / fabrics)**: 24 — Polyester · rPET · Nylon · Recycled Nylon · Acrylic/modacrylic · Polypropylene · Elastane · Cordura · Coolmax · Polartec · Gore-Tex · eVent · Pertex · Thinsulate · PrimaLoft · Thermore · Pebax · Neoprene/scuba · Ripstop nylon · Softshell · 3-Layer membrane · Ballistic nylon · Nylon taffeta · Polyester fleece · Polyester satin (25 logical L1s; ripstop/ballistic/taffeta/fleece/satin are construction-level cross-references back to fibers but kept as L1 per brief).
- **L2 (variants)**: 88
- **L3 (B2B suppliers)**: 50
- **EXCLUDED documented**: 14 (Sympatex insolvency + 12 brand-locked technologies + Microsilk)
- **Out-of-scope flagged**: 9 categories

Total L1 + L2 + L3 entries: **162**.

**Conservative inclusion bias applied throughout** — every L3 verified for active B2B operations as of 2026-05-03. Sympatex (insolvency Jan 2026) excluded. LYCRA (Chapter 11 March 2026, restructuring not liquidation) included with caveat + Hyosung Creora and Asahi Kasei ROICA listed as zero-risk alternatives. Brand-locked DTC technologies (ZoomX, Boost, Air Max, Flyknit, Primeknit, GEL, Fresh Foam, Profly, DNA Loft, Nulu, Capilene) excluded per forbidden list.
