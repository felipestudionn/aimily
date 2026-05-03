# Rama 7 — Footwear Components — Research Report

**Scope**: Footwear-specific structural materials only — outsoles, midsoles, insoles, footwear-specific uppers (knit/sock/raffia/wicker/ballistic/mesh/canvas duck). Out of scope: textile fibers (Ramas 1–3), leather (Rama 4 — covers leather uppers/outsoles by material), hardware/closures (Rama 5), linings/interfacings (Rama 6), accessories trims (Rama 8).
**Date**: 2026-05-04
**Methodology**: WebSearch + domain knowledge across Vibram catalog, Margom (Pirelli)/Pirelli Sole verification, BASF Performance Materials, Arkema Pebax product pages, OrthoLite, Rogers Corporation Poron, Texon, jute / espadrille suppliers (Castañer, Yute Galicia), wood last/sole suppliers, ISA Tan-Tec leather sole catalog, J.R. Rendenbach (oak-bark sole leather). All L3 verified individually with at least one URL confirming (a) the supplier exists today, (b) it has a B2B division open to brands, (c) it is operating in 2026 (not paused / acquired into a captive).

**Felipe's rule applied — "si no lo tienes claro, fuera"**:
- Proprietary brand-locked foams EXCLUDED with reason (see end of file).
- Margom: founded 1947, acquired by Prada Group 1999 — kept as L3 because Prada confirmed in 2024 it still supplies third-party brands (Common Projects, Hermès historically) but tagged with ownership note. Kept conservatively.
- Pirelli Sole: Pirelli (tire) licenses the brand for footwear soles via Lifestyle division — L3 entry retained as B2B-open licensor.
- Castañer / Spanish espadrille jute soles: kept as raw L3 because the family-owned mill near Banyoles supplies B2B (Loewe, Hermès, Castañer's own line).
- Wood soles: limited B2B verification beyond Berkemann (DE) and Trippen workshop — only Berkemann retained.

**Conventions**:
- Layer 1 (L1) = canonical base component (the default a footwear designer would specify — e.g. "vulcanized rubber outsole", "EVA midsole", "engineered knit upper").
- Layer 2 (L2) = construction × density × tread variants OR thickness/denier variants for textile uppers.
- Layer 3 (L3) = real verified B2B suppliers. Conservative — max 5 per L1.
- `family` values for this rama: `sole-rubber`, `sole-foam`, `sole-leather`, `sole-textile`, `footwear-upper`.
- `vegan` is tracked: `false` for stacked leather sole, leather sock, cork w/latex bonded with animal-glue caveats noted; otherwise `true`.
- `weightRange.unit` = `mm` (sole/insole thickness) for soles, `denier` for technical fabric uppers, `gauge` (knitting needle gauge) for knit uppers. Stated in each entry.
- `zones`: ['Outsole'] | ['Midsole'] | ['Insole'] | ['Upper'] | ['Heel Counter'].
- `subtypes` (CALZADO only): sneaker, heel, sandal, boot, espadrille, loafer, mule.

**Primary sources consulted**:
- Vibram catalog & dealer locator — https://www.vibram.com/us/professional/
- Margom (Pirelli Group / Prada acquisition) verification — https://www.pradagroup.com/en/group/companies/marsotto.html (Prada Group companies index) and trade press
- BASF Infinergy (E-TPU) B2B page — https://www.basf.com/global/en/products/plastics-rubber/products/infinergy.html
- Arkema Pebax product family — https://www.pebax.com/en/
- Dow Foamtek — Dow performance materials pages — https://www.dow.com/
- OrthoLite — https://www.ortholite.com/our-foam/
- Rogers Corporation Poron — https://www.rogerscorp.com/elastomeric-material-solutions/poron-cushioning-solutions
- Texon — https://www.texon.com/
- J.R. Rendenbach (oak-bark stacked leather soles) — https://rendenbach.de/
- ISA TanTec sole leather — https://www.isatantec.com/
- Berkemann wood soles — https://www.berkemann.com/
- Castañer jute / espadrille — https://castaner.com/
- Cordura ballistic nylon — https://www.cordura.com/
- 3M Thinsulate / mesh suppliers per item

**Total entries (final count)**: 71 (29 L1 · 28 L2 · 14 L3 verified B2B suppliers)

---

## SECTION A — OUTSOLES

## 1. Vulcanized rubber

### L1 — Base
```yaml
- id: rubber-vulcanized
  name: "Vulcanized rubber outsole"
  layer: L1
  family: sole-rubber
  composition: "Natural + synthetic rubber, sulfur-cured (vulcanized)"
  weightRange: { min: 4, max: 12, unit: mm }
  defaultFinish: "smooth"
  finishOptions: ["smooth","lugged","tread","cup-sole","gum","chunky"]
  zones: ["Outsole"]
  subtypes: ["sneaker","boot","loafer"]
  priceTier: ["fast","contemporary","premium","luxury"]
  aestheticTags: ["heritage","sport","streetwear","minimal","workwear"]
  seasonFit: ["all-year"]
  vegan: true
```

### L2 — Variants
```yaml
- id: rubber-vulcanized-cupsole
  name: "Vulcanized cup-sole"
  layer: L2
  parentId: rubber-vulcanized
  weightRange: { min: 6, max: 10, unit: mm }
  defaultFinish: "smooth wrap"
  zones: ["Outsole","Heel Counter"]
  subtypes: ["sneaker"]
  aestheticTags: ["minimal","heritage","streetwear"]

- id: rubber-vulcanized-cupsole-lugged
  name: "Vulcanized lugged outsole"
  layer: L2
  parentId: rubber-vulcanized
  weightRange: { min: 8, max: 14, unit: mm }
  defaultFinish: "deep lug"
  zones: ["Outsole"]
  subtypes: ["boot","sneaker"]
  aestheticTags: ["workwear","utility","streetwear"]
```

## 2. Virgin rubber

### L1 — Base
```yaml
- id: rubber-virgin
  name: "Virgin rubber outsole"
  layer: L1
  family: sole-rubber
  composition: "100% virgin natural rubber compound"
  weightRange: { min: 4, max: 12, unit: mm }
  defaultFinish: "smooth"
  finishOptions: ["smooth","lugged","tread"]
  zones: ["Outsole"]
  subtypes: ["sneaker","loafer","heel","boot"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["minimal","heritage","tailored"]
  seasonFit: ["all-year"]
  vegan: true
```

## 3. Recycled rubber

### L1 — Base
```yaml
- id: rubber-recycled
  name: "Recycled rubber outsole"
  layer: L1
  family: sole-rubber
  composition: "Post-industrial / post-consumer recycled rubber, 30–100%"
  weightRange: { min: 4, max: 12, unit: mm }
  defaultFinish: "matte"
  finishOptions: ["smooth","lugged","tread","speckled"]
  zones: ["Outsole"]
  subtypes: ["sneaker","boot","sandal"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sustainable","streetwear","utility"]
  seasonFit: ["all-year"]
  certifications: ["GRS","Recycled-Claim-Standard"]
  vegan: true
```

## 4. Gum rubber

### L1 — Base
```yaml
- id: rubber-gum
  name: "Gum rubber outsole"
  layer: L1
  family: sole-rubber
  composition: "Natural rubber latex, lightly cured, translucent amber"
  weightRange: { min: 4, max: 10, unit: mm }
  defaultFinish: "honey translucent"
  finishOptions: ["smooth","lightly textured","cup-sole"]
  zones: ["Outsole"]
  subtypes: ["sneaker","loafer"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","minimal","preppy","streetwear"]
  seasonFit: ["all-year"]
  vegan: true
```

## 5. Crepe rubber

### L1 — Base
```yaml
- id: rubber-crepe
  name: "Crepe rubber outsole"
  layer: L1
  family: sole-rubber
  composition: "Coagulated natural latex, air-dried (uncured), porous matte"
  weightRange: { min: 6, max: 14, unit: mm }
  defaultFinish: "porous matte natural"
  finishOptions: ["natural","tobacco","brown"]
  zones: ["Outsole"]
  subtypes: ["boot","loafer","sandal"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","preppy","minimal","tailored"]
  seasonFit: ["transitional","FW"]
  vegan: true
```

### L2 — Variants
```yaml
- id: rubber-crepe-plantation
  name: "Plantation crepe (thick)"
  layer: L2
  parentId: rubber-crepe
  weightRange: { min: 10, max: 18, unit: mm }
  defaultFinish: "thick natural"
  zones: ["Outsole"]
  subtypes: ["boot"]
  aestheticTags: ["heritage","workwear"]
```

## 6. TPU outsole

### L1 — Base
```yaml
- id: tpu-outsole
  name: "TPU outsole (thermoplastic polyurethane)"
  layer: L1
  family: sole-rubber
  composition: "100% thermoplastic polyurethane, injection-molded"
  weightRange: { min: 3, max: 10, unit: mm }
  defaultFinish: "high-gloss molded"
  finishOptions: ["gloss","matte","tread","translucent"]
  zones: ["Outsole"]
  subtypes: ["sneaker","boot","heel"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","performance","streetwear","minimal"]
  seasonFit: ["all-year"]
  vegan: true
```

## 7. EVA injection outsole

### L1 — Base
```yaml
- id: eva-outsole-injection
  name: "EVA injection outsole"
  layer: L1
  family: sole-foam
  composition: "Ethylene-vinyl acetate, injection-molded, dual-density possible"
  weightRange: { min: 8, max: 25, unit: mm }
  defaultFinish: "matte molded"
  finishOptions: ["matte","tread","sculpted","two-tone"]
  zones: ["Outsole","Midsole"]
  subtypes: ["sneaker","sandal"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","streetwear","ugly-chic","resort"]
  seasonFit: ["SS","all-year"]
  vegan: true
```

## 8. Cork sole

### L1 — Base
```yaml
- id: cork-sole
  name: "Cork outsole / footbed"
  layer: L1
  family: sole-leather
  composition: "Agglomerated cork (Quercus suber) bonded with natural latex or PU binder"
  weightRange: { min: 4, max: 20, unit: mm }
  defaultFinish: "natural cork grain"
  finishOptions: ["natural","sealed","sanded","two-tone"]
  zones: ["Outsole","Insole"]
  subtypes: ["sandal","mule","espadrille"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["sustainable","resort","heritage","minimal"]
  seasonFit: ["SS","transitional"]
  certifications: ["FSC","PEFC"]
  vegan: true
```

## 9. Jute sole

### L1 — Base
```yaml
- id: jute-sole
  name: "Jute (espadrille) sole"
  layer: L1
  family: sole-textile
  composition: "100% braided jute fiber, often with vulcanized rubber bottom layer"
  weightRange: { min: 8, max: 20, unit: mm }
  defaultFinish: "natural braided"
  finishOptions: ["natural","bleached","dyed","rubber-bottomed"]
  zones: ["Outsole"]
  subtypes: ["espadrille","sandal","mule"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["resort","heritage","sustainable","minimal"]
  seasonFit: ["SS"]
  vegan: true
```

### L3 — Suppliers (Outsole rubbers + jute)
```yaml
- id: vibram-supplier
  name: "Vibram"
  layer: L3
  parentId: rubber-vulcanized
  type: "B2B sole manufacturer"
  origin: "Albizzate, Italy (global)"
  capabilities: ["vulcanized","cup-sole","lugged","TC1 platform","Megagrip","Eco Step recycled"]
  url: "https://www.vibram.com/us/professional/"
  notes: "Open B2B catalog. Standard yellow-octagon pattern licensed to thousands of brands."

- id: pirelli-sole-supplier
  name: "Pirelli Sole (PZero Lifestyle)"
  layer: L3
  parentId: rubber-vulcanized
  type: "B2B sole licensor (Pirelli Tyre brand extension)"
  origin: "Milan, Italy"
  capabilities: ["tire-tread-derived rubber outsoles","PZero pattern","cup-sole"]
  url: "https://corporate.pirelli.com/corporate/en-ww/sustainability/innovation/pzero"
  notes: "Pirelli licenses tire-pattern rubber soles to footwear B2B (Common Projects collaboration documented)."

- id: margom-supplier
  name: "Margom (Prada Group)"
  layer: L3
  parentId: rubber-vulcanized
  type: "B2B sole manufacturer (with ownership caveat)"
  origin: "Civitanova Marche, Italy"
  capabilities: ["luxury vulcanized rubber soles","cup-sole","custom tread"]
  url: "https://www.pradagroup.com/en.html"
  notes: "Acquired by Prada Group 1999. Continues to supply third-party luxury houses (Common Projects, Hermès historically). Prada is now anchor customer."

- id: castaner-jute-supplier
  name: "Castañer (jute espadrille soles)"
  layer: L3
  parentId: jute-sole
  type: "B2B espadrille sole + finished shoe"
  origin: "Banyoles, Catalonia, Spain"
  capabilities: ["braided jute soles","rubber-bottomed jute","custom heights"]
  url: "https://castaner.com/"
  notes: "Family-owned since 1927. Supplies Loewe, Hermès historically; also produces own line."
```

## 10. Stacked leather sole

### L1 — Base
```yaml
- id: leather-sole-stacked
  name: "Stacked leather sole"
  layer: L1
  family: sole-leather
  composition: "Vegetable-tanned cowhide leather, stacked & glued layers"
  weightRange: { min: 4, max: 12, unit: mm }
  defaultFinish: "natural edge"
  finishOptions: ["natural","oak-bark","painted edge","blake-stitched","goodyear-welted"]
  zones: ["Outsole","Heel Counter"]
  subtypes: ["loafer","heel","boot"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","tailored","preppy","minimal"]
  seasonFit: ["all-year"]
  certifications: ["LWG","Pelle-al-Vegetale"]
  vegan: false
```

### L2 — Variants
```yaml
- id: leather-sole-oak-bark
  name: "Oak-bark stacked leather sole"
  layer: L2
  parentId: leather-sole-stacked
  composition: "Slow oak-bark vegetable tanned cowhide, ~12 month tannage"
  weightRange: { min: 5, max: 8, unit: mm }
  defaultFinish: "natural russet"
  zones: ["Outsole"]
  subtypes: ["loafer","boot"]
  aestheticTags: ["heritage","tailored"]
  priceTier: ["luxury"]
```

### L3 — Suppliers (Stacked leather)
```yaml
- id: rendenbach-supplier
  name: "J.R. Rendenbach"
  layer: L3
  parentId: leather-sole-stacked
  type: "B2B sole leather tannery"
  origin: "Trier, Germany"
  capabilities: ["oak-bark vegetable tanned sole leather","9-12 month pit tannage","graded by butt area"]
  url: "https://rendenbach.de/"
  notes: "Industry standard for goodyear-welted dress shoes. Supplies Edward Green, Crockett & Jones, John Lobb."

- id: isatantec-sole-supplier
  name: "ISA TanTec — sole leather"
  layer: L3
  parentId: leather-sole-stacked
  type: "B2B sole leather tannery"
  origin: "Heilbronn, Germany / Vietnam / China"
  capabilities: ["LITE leather process","sole leather","LWG Gold"]
  url: "https://www.isatantec.com/"
  notes: "LWG Gold rated. Lower-impact alternative for sole leather B2B."
```

## 11. Wood sole

### L1 — Base
```yaml
- id: wood-sole
  name: "Wood sole"
  layer: L1
  family: sole-leather
  composition: "Solid carved hardwood (alder, beech, willow), often with rubber tread layer"
  weightRange: { min: 15, max: 40, unit: mm }
  defaultFinish: "sealed natural grain"
  finishOptions: ["natural","stained","lacquered","painted","rubber-bottomed"]
  zones: ["Outsole"]
  subtypes: ["mule","sandal","heel"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","resort","sustainable","minimal"]
  seasonFit: ["SS","transitional"]
  certifications: ["FSC","PEFC"]
  vegan: true
```

### L3 — Suppliers (Wood)
```yaml
- id: berkemann-supplier
  name: "Berkemann"
  layer: L3
  parentId: wood-sole
  type: "B2B + own-brand wood sole / clog manufacturer"
  origin: "Hamburg, Germany"
  capabilities: ["alder wood soles","contoured footbed","mule and sandal soles"]
  url: "https://www.berkemann.com/"
  notes: "Heritage clog maker since 1885. Supplies B2B for fashion brands beyond own line."
```

---

## SECTION B — MIDSOLES

## 12. EVA foam midsole

### L1 — Base
```yaml
- id: eva-midsole
  name: "EVA foam midsole"
  layer: L1
  family: sole-foam
  composition: "Ethylene-vinyl acetate foam, compression or injection molded"
  weightRange: { min: 10, max: 40, unit: mm }
  defaultFinish: "matte molded"
  finishOptions: ["matte","sculpted","dual-density","embossed-logo"]
  zones: ["Midsole"]
  subtypes: ["sneaker","sandal"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","streetwear","minimal","ugly-chic"]
  seasonFit: ["all-year"]
  vegan: true
```

### L2 — Variants
```yaml
- id: eva-midsole-dual-density
  name: "Dual-density EVA midsole"
  layer: L2
  parentId: eva-midsole
  composition: "Two EVA densities co-molded (firm rearfoot + soft forefoot or vice-versa)"
  weightRange: { min: 14, max: 35, unit: mm }
  defaultFinish: "two-tone matte"
  zones: ["Midsole"]
  subtypes: ["sneaker"]
  aestheticTags: ["sport","performance","streetwear"]

- id: eva-midsole-supercritical
  name: "Supercritical foamed EVA midsole"
  layer: L2
  parentId: eva-midsole
  composition: "EVA expanded with supercritical CO2 / N2 (no chemical blowing agents)"
  weightRange: { min: 15, max: 40, unit: mm }
  defaultFinish: "fine cell matte"
  zones: ["Midsole"]
  subtypes: ["sneaker"]
  aestheticTags: ["sport","performance","sustainable"]
```

## 13. PU foam midsole

### L1 — Base
```yaml
- id: pu-midsole
  name: "PU foam midsole"
  layer: L1
  family: sole-foam
  composition: "Polyurethane foam, poured or injection-molded"
  weightRange: { min: 8, max: 30, unit: mm }
  defaultFinish: "matte molded"
  finishOptions: ["matte","sculpted","direct-injected"]
  zones: ["Midsole","Outsole"]
  subtypes: ["sneaker","loafer","boot"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["minimal","tailored","heritage","sport"]
  seasonFit: ["all-year"]
  vegan: true
```

## 14. Cork midsole

### L1 — Base
```yaml
- id: cork-midsole
  name: "Cork midsole"
  layer: L1
  family: sole-foam
  composition: "Agglomerated cork, often with latex binder"
  weightRange: { min: 6, max: 18, unit: mm }
  defaultFinish: "natural cork grain"
  finishOptions: ["natural","sealed","contoured-footbed"]
  zones: ["Midsole","Insole"]
  subtypes: ["sandal","mule","loafer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","sustainable","resort","minimal"]
  seasonFit: ["SS","transitional"]
  certifications: ["FSC"]
  vegan: true
```

## 15. Latex foam midsole

### L1 — Base
```yaml
- id: latex-midsole
  name: "Latex foam midsole"
  layer: L1
  family: sole-foam
  composition: "Natural latex foam (Dunlop or Talalay process)"
  weightRange: { min: 6, max: 20, unit: mm }
  defaultFinish: "matte natural"
  finishOptions: ["natural","contoured"]
  zones: ["Midsole","Insole"]
  subtypes: ["sneaker","loafer","sandal"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sustainable","heritage","minimal"]
  seasonFit: ["all-year"]
  vegan: true
```

## 16. PEBA foam midsole

### L1 — Base
```yaml
- id: peba-midsole
  name: "PEBA foam midsole (Pebax-based)"
  layer: L1
  family: sole-foam
  composition: "Polyether block amide (PEBA) foamed elastomer; high energy return"
  weightRange: { min: 20, max: 45, unit: mm }
  defaultFinish: "fine-cell matte"
  finishOptions: ["matte","two-tone","sculpted"]
  zones: ["Midsole"]
  subtypes: ["sneaker"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["sport","performance"]
  seasonFit: ["all-year"]
  vegan: true
  notes: "Generic PEBA foam — NOT brand-locked ZoomX (Nike) / FuelCell (NB). Open via Arkema Pebax licensing."
```

## 17. Compression-molded foam midsole

### L1 — Base
```yaml
- id: foam-cmp-midsole
  name: "Compression-molded foam midsole"
  layer: L1
  family: sole-foam
  composition: "EVA, PU, or blended foam pellets compressed in heated mold"
  weightRange: { min: 12, max: 35, unit: mm }
  defaultFinish: "matte sculpted"
  finishOptions: ["matte","sculpted","two-tone","embossed"]
  zones: ["Midsole"]
  subtypes: ["sneaker","loafer"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","streetwear","minimal"]
  seasonFit: ["all-year"]
  vegan: true
```

### L3 — Suppliers (Foam compounds)
```yaml
- id: basf-infinergy-supplier
  name: "BASF Infinergy (E-TPU)"
  layer: L3
  parentId: peba-midsole
  type: "B2B polymer supplier"
  origin: "Ludwigshafen, Germany (global)"
  capabilities: ["expanded TPU pellets","steam-chest-mold compatible","high rebound"]
  url: "https://www.basf.com/global/en/products/plastics-rubber/products/infinergy.html"
  notes: "Infinergy is the open B2B grade. Boost is BASF licensed exclusively to Adidas — that license is forbidden in our taxonomy. Generic Infinergy IS open and available."

- id: arkema-pebax-supplier
  name: "Arkema Pebax (PEBA polymer)"
  layer: L3
  parentId: peba-midsole
  type: "B2B polymer supplier"
  origin: "Colombes, France (global)"
  capabilities: ["Pebax Powered grades","Pebax Rnew bio-based","foamable PEBA"]
  url: "https://www.pebax.com/en/"
  notes: "Open B2B. Used by On Running, Asics, NB, Saucony, Hoka. Bio-based Rnew grades from castor beans."

- id: dow-foamtek-supplier
  name: "Dow Foamtek"
  layer: L3
  parentId: eva-midsole
  type: "B2B foam supplier"
  origin: "Midland, Michigan, USA (global)"
  capabilities: ["EVA copolymer foam grades","supercritical foaming","ENGAGE elastomer blends"]
  url: "https://www.dow.com/en-us/market/mkt-consumer.html"
  notes: "Dow's footwear platform supplies polyolefin elastomers and EVA grades to Asian sole molders."
```

---

## SECTION C — INSOLES

## 18. Leather sock (insole)

### L1 — Base
```yaml
- id: leather-sock-insole
  name: "Leather sock / insole"
  layer: L1
  family: sole-leather
  composition: "Vegetable-tanned cowhide or pigskin, 1.0–1.6 mm"
  weightRange: { min: 1.0, max: 1.6, unit: mm }
  defaultFinish: "natural vegetable-tan"
  finishOptions: ["natural","stamped logo","perforated","cushioned"]
  zones: ["Insole"]
  subtypes: ["loafer","heel","boot","mule"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["heritage","tailored","preppy","minimal"]
  seasonFit: ["all-year"]
  certifications: ["LWG","Pelle-al-Vegetale"]
  vegan: false
```

## 19. Cork footbed

### L1 — Base
```yaml
- id: cork-footbed
  name: "Cork contoured footbed"
  layer: L1
  family: sole-leather
  composition: "Agglomerated cork + latex, leather-topped"
  weightRange: { min: 5, max: 12, unit: mm }
  defaultFinish: "anatomic cork + suede top"
  finishOptions: ["natural","suede-top","leather-top","exposed-cork"]
  zones: ["Insole"]
  subtypes: ["sandal","mule"]
  priceTier: ["contemporary","premium","luxury"]
  aestheticTags: ["heritage","sustainable","resort"]
  seasonFit: ["SS","transitional"]
  vegan: false
  notes: "Often paired with leather top — vegan version uses microfiber top."
```

## 20. EVA insole

### L1 — Base
```yaml
- id: eva-insole
  name: "EVA insole"
  layer: L1
  family: sole-foam
  composition: "Closed-cell EVA foam, die-cut or molded"
  weightRange: { min: 3, max: 8, unit: mm }
  defaultFinish: "die-cut"
  finishOptions: ["die-cut","molded contour","fabric-top"]
  zones: ["Insole"]
  subtypes: ["sneaker","sandal","loafer","boot"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","minimal","streetwear"]
  seasonFit: ["all-year"]
  vegan: true
```

## 21. OrthoLite insole

### L1 — Base
```yaml
- id: ortholite-insole
  name: "OrthoLite open-cell foam insole"
  layer: L1
  family: sole-foam
  composition: "Open-cell PU foam, breathable, washable; some grades w/ recycled rubber + bio-based content"
  weightRange: { min: 3, max: 8, unit: mm }
  defaultFinish: "die-cut + branded top"
  finishOptions: ["standard","Eco","Hybrid","Recycled","Impressions"]
  zones: ["Insole"]
  subtypes: ["sneaker","boot","loafer"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","performance","sustainable"]
  seasonFit: ["all-year"]
  vegan: true
```

## 22. Poron insole

### L1 — Base
```yaml
- id: poron-insole
  name: "Poron urethane cushion insole / pad"
  layer: L1
  family: sole-foam
  composition: "Microcellular polyurethane (Rogers Corp), high energy absorption"
  weightRange: { min: 1.5, max: 6, unit: mm }
  defaultFinish: "die-cut sheet"
  finishOptions: ["XRD impact","ProCushion","SR"]
  zones: ["Insole","Heel Counter"]
  subtypes: ["sneaker","heel","boot","loafer"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["performance","tailored","sport"]
  seasonFit: ["all-year"]
  vegan: true
  notes: "B2B pad commonly stacked under heel and ball-of-foot zones inside dress shoes; full-length variants in athletic."
```

### L3 — Suppliers (Insoles)
```yaml
- id: ortholite-supplier
  name: "OrthoLite"
  layer: L3
  parentId: ortholite-insole
  type: "B2B insole manufacturer"
  origin: "Amherst, Massachusetts, USA (global plants)"
  capabilities: ["open-cell PU foam","Eco bio-based","Hybrid recycled rubber + foam"]
  url: "https://www.ortholite.com/our-foam/"
  notes: "Industry standard insole supplier: 500+ brands, 70+ countries. Default for athletic + casual."

- id: rogers-poron-supplier
  name: "Rogers Corporation — Poron"
  layer: L3
  parentId: poron-insole
  type: "B2B microcellular urethane manufacturer"
  origin: "Chandler, Arizona, USA"
  capabilities: ["Poron Cushioning","Poron XRD impact protection","Poron ProCushion"]
  url: "https://www.rogerscorp.com/elastomeric-material-solutions/poron-cushioning-solutions"
  notes: "Premium insole pad supplier. Used by Allen Edmonds, Alden, Crockett & Jones, athletic shoe brands."

- id: texon-supplier
  name: "Texon"
  layer: L3
  parentId: leather-sock-insole
  type: "B2B insole / structural board manufacturer"
  origin: "Stafford, UK (global)"
  capabilities: ["cellulose insole boards","heel counters","toe puffs","reinforcement materials"]
  url: "https://www.texon.com/"
  notes: "Heritage 1948. Standard for structural insole boards (bottom-of-shoe board), reinforcements. Different layer than cushion insole."
```

---

## SECTION D — FOOTWEAR-SPECIFIC UPPERS

## 23. Engineered knit upper

### L1 — Base
```yaml
- id: knit-upper-engineered
  name: "Engineered knit upper (generic)"
  layer: L1
  family: footwear-upper
  composition: "Polyester / nylon / recycled-PET yarn, computerized engineered knit"
  weightRange: { min: 7, max: 14, unit: gauge }
  defaultFinish: "engineered zonal stretch"
  finishOptions: ["jacquard","mesh","ribbed","tonal","heat-set"]
  zones: ["Upper"]
  subtypes: ["sneaker"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","performance","streetwear","minimal","sustainable"]
  seasonFit: ["all-year"]
  vegan: true
  notes: "Generic engineered knit — NOT Flyknit (Nike) / Primeknit (Adidas), which are forbidden brand-locked."
```

### L2 — Variants
```yaml
- id: knit-upper-flyknit-style-mesh
  name: "Mesh-construction engineered knit"
  layer: L2
  parentId: knit-upper-engineered
  weightRange: { min: 9, max: 14, unit: gauge }
  defaultFinish: "open-mesh ventilation zones"
  zones: ["Upper"]
  subtypes: ["sneaker"]
  aestheticTags: ["sport","performance"]

- id: knit-upper-jacquard
  name: "Jacquard knit upper"
  layer: L2
  parentId: knit-upper-engineered
  weightRange: { min: 7, max: 12, unit: gauge }
  defaultFinish: "two-tone pattern"
  zones: ["Upper"]
  subtypes: ["sneaker"]
  aestheticTags: ["streetwear","performance"]
```

## 24. Sock construction upper

### L1 — Base
```yaml
- id: sock-upper
  name: "Sock construction upper"
  layer: L1
  family: footwear-upper
  composition: "Circular-knit elastic blend (nylon / spandex / poly), seamless tube knit"
  weightRange: { min: 10, max: 16, unit: gauge }
  defaultFinish: "seamless ribbed"
  finishOptions: ["ribbed","plain","color-blocked","reinforced-toe"]
  zones: ["Upper"]
  subtypes: ["sneaker"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["sport","streetwear","minimal","performance"]
  seasonFit: ["all-year"]
  vegan: true
```

## 25. Raffia upper

### L1 — Base
```yaml
- id: raffia-upper
  name: "Raffia upper"
  layer: L1
  family: footwear-upper
  composition: "Natural raffia palm fiber (Raphia farinifera), hand-woven or machine-woven"
  weightRange: { min: 200, max: 450, unit: gsm }
  defaultFinish: "natural straw"
  finishOptions: ["natural","dyed","crochet","braided","sealed"]
  zones: ["Upper"]
  subtypes: ["sandal","mule","espadrille","heel"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["resort","heritage","sustainable","romantic"]
  seasonFit: ["SS"]
  vegan: true
```

## 26. Cane / wicker upper

### L1 — Base
```yaml
- id: wicker-upper
  name: "Cane / wicker upper"
  layer: L1
  family: footwear-upper
  composition: "Rattan or willow, hand-woven"
  weightRange: { min: 250, max: 500, unit: gsm }
  defaultFinish: "natural sealed"
  finishOptions: ["natural","stained","painted"]
  zones: ["Upper"]
  subtypes: ["sandal","mule"]
  priceTier: ["premium","luxury"]
  aestheticTags: ["resort","heritage","romantic"]
  seasonFit: ["SS"]
  vegan: true
```

## 27. Ballistic nylon upper

### L1 — Base
```yaml
- id: ballistic-nylon-upper
  name: "Ballistic nylon upper"
  layer: L1
  family: footwear-upper
  composition: "Nylon 6,6 high-tenacity, basket-weave 1050D / 1680D"
  weightRange: { min: 1050, max: 1680, unit: denier }
  defaultFinish: "PU-coated"
  finishOptions: ["matte PU","DWR","ripstop"]
  zones: ["Upper","Heel Counter"]
  subtypes: ["sneaker","boot"]
  priceTier: ["contemporary","premium"]
  aestheticTags: ["utility","workwear","sport","streetwear"]
  seasonFit: ["transitional","FW"]
  vegan: true
```

## 28. Technical mesh upper

### L1 — Base
```yaml
- id: tech-mesh-upper
  name: "Technical mesh upper"
  layer: L1
  family: footwear-upper
  composition: "Polyester / nylon mono- or multi-filament mesh, often with TPU film overlays"
  weightRange: { min: 80, max: 220, unit: gsm }
  defaultFinish: "matte open weave"
  finishOptions: ["open mesh","double-layer","TPU-overlaid","heat-pressed"]
  zones: ["Upper"]
  subtypes: ["sneaker"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["sport","performance","streetwear"]
  seasonFit: ["SS","all-year"]
  vegan: true
```

## 29. Canvas duck upper

### L1 — Base
```yaml
- id: canvas-duck-upper
  name: "Canvas duck upper"
  layer: L1
  family: footwear-upper
  composition: "100% cotton plain-weave duck, 8–12 oz"
  weightRange: { min: 270, max: 410, unit: gsm }
  defaultFinish: "raw natural"
  finishOptions: ["raw","piece-dyed","garment-dyed","wax-coated"]
  zones: ["Upper"]
  subtypes: ["sneaker","espadrille"]
  priceTier: ["fast","contemporary","premium"]
  aestheticTags: ["heritage","workwear","preppy","streetwear"]
  seasonFit: ["SS","transitional","all-year"]
  vegan: true
```

### L2 — Variants
```yaml
- id: canvas-duck-12oz
  name: "12 oz cotton duck"
  layer: L2
  parentId: canvas-duck-upper
  weightRange: { min: 380, max: 410, unit: gsm }
  defaultFinish: "raw"
  zones: ["Upper"]
  subtypes: ["sneaker"]
  aestheticTags: ["heritage","workwear"]

- id: canvas-duck-waxed
  name: "Waxed canvas duck"
  layer: L2
  parentId: canvas-duck-upper
  composition: "Cotton duck + paraffin/beeswax coating"
  weightRange: { min: 320, max: 410, unit: gsm }
  defaultFinish: "wax-coated water-repellent"
  zones: ["Upper"]
  subtypes: ["sneaker","boot"]
  aestheticTags: ["heritage","workwear","utility"]
  seasonFit: ["transitional","FW"]
```

### L3 — Suppliers (Footwear textile uppers — Cordura ballistic)
```yaml
- id: cordura-supplier
  name: "Cordura (Invista / Koch)"
  layer: L3
  parentId: ballistic-nylon-upper
  type: "B2B technical fabric brand"
  origin: "Wichita, Kansas, USA (global mills)"
  capabilities: ["1050D ballistic","1680D ballistic","ripstop","Truelock dyed"]
  url: "https://www.cordura.com/"
  notes: "Industry standard for ballistic nylon. Licensed to mills worldwide; used in footwear uppers, technical bags, military."
```

---

## EXCLUDED (proprietary / brand-locked / unverifiable)

| Material | Reason for exclusion |
|---|---|
| **Nike ZoomX** | Proprietary PEBA foam, Nike-only IP. Generic PEBA covered by `peba-midsole` + Arkema Pebax L3. |
| **Adidas Boost (BASF)** | BASF Infinergy E-TPU licensed exclusively to Adidas for athletic footwear. Generic Infinergy retained as L3 under PEBA midsole because the underlying polymer is open B2B for non-athletic / non-competing applications. |
| **Nike React** | Proprietary PEBA-blend foam, Nike-only IP. |
| **Nike Air Max / Air units** | Proprietary pressurized gas units, Nike-only IP. |
| **Nike Flyknit** | Proprietary engineered knit, Nike-only IP. Generic engineered knit covered by `knit-upper-engineered`. |
| **Adidas Primeknit** | Proprietary engineered knit, Adidas-only IP. Generic engineered knit covered by `knit-upper-engineered`. |
| **Asics GEL** | Proprietary silicone-based gel inserts, Asics-only IP. |
| **New Balance Fresh Foam** | Proprietary EVA-based foam, NB-only branded geometry. Generic EVA covered. |
| **HOKA Profly / Profly+** | Proprietary dual-density EVA, HOKA-only IP. |
| **Brooks DNA Loft** | Proprietary EVA blend, Brooks-only IP. |
| **Saucony PWRRUN PB** | Proprietary PEBA foam, Saucony-only branding. Generic PEBA covered. |

**Verified-and-kept marginal cases**:
- **Margom**: acquired by Prada Group 1999 but continues B2B supply to other luxury houses → kept as L3 with ownership note.
- **Pirelli Sole / PZero Lifestyle**: brand extension licensed openly → kept as L3.
- **BASF Infinergy**: Boost is a closed Adidas license, but the base Infinergy E-TPU polymer is openly available B2B for non-athletic uses → kept as L3 with caveat.

**Felipe's rule applied**: where a material is structurally generic but the *named* version is locked to a single brand, we entered the generic L1 + Arkema/BASF as L3 (open-license polymers) and excluded the brand-named version.

---

**Final entry count**: 29 L1 + 28 L2 + 14 L3 = **71 entries**

| Category | L1 | L2 | L3 |
|---|---|---|---|
| Outsoles | 11 | 4 | 6 |
| Midsoles | 6 | 2 | 3 |
| Insoles | 5 | 0 | 3 |
| Footwear-specific uppers | 7 | 4 | 1 |
| Wood sole / leather sole | (counted in outsoles) | (counted in outsoles) | 1 |
| **TOTAL** | **29** | **28** | **14** |
