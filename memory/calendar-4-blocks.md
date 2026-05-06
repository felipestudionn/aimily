---
name: Calendar 4-Block Architecture Bible
description: Complete reference for the 4-block calendar system — blocks, 45 milestones, cross-block dependencies, independent milestones, and flow diagram
type: project
---

## Calendar Structure (as of 2026-03-12)

Reorganized from 9 phases to 4 team blocks. Commit: `b370b60`.

### 4 Blocks (TimelinePhase)

| Block ID | Name | Color | Milestones | Team |
|---|---|---|---|---|
| `creative` | Creative & Brand | #4ECDC4 | cr-1, cr-2, br-1..br-4 (6) | Equipo creativo |
| `planning` | Range Planning & Strategy | #FF6B6B | rp-1..rp-6 (6) | Merchandising/planners |
| `development` | Design & Development | #F5A623 | dd-1..dd-18 (18) | Equipo técnico |
| `go_to_market` | Marketing & Digital | #9C27B0 | gm-1..gm-15 (15) | Equipo marketing |

**Total: 45 milestones across 4 blocks.**

---

### All Milestones by Block

#### BLOCK 1: CREATIVE & BRAND (W-48 → W-34)
| ID | Milestone | Weeks | Responsible |
|---|---|---|---|
| cr-1 | Consumer & Target Definition | W-48→W-46 | US |
| cr-2 | Trend Research & Moodboarding | W-46→W-43 | US |
| br-1 | Brand Naming & Strategy | W-46→W-43 | US |
| br-2 | Logo & Visual Identity | W-43→W-39 | AGENCY/US |
| br-3 | Brand Guidelines | W-39→W-37 | AGENCY/US |
| br-4 | Packaging Design | W-37→W-34 | AGENCY/US |

#### BLOCK 2: RANGE PLANNING & STRATEGY (W-46 → W-36)
| ID | Milestone | Weeks | Responsible |
|---|---|---|---|
| rp-1 | Consumer & Market Analysis | W-46→W-44 | US |
| rp-2 | Channel & Distribution Strategy | W-44→W-42 | US |
| rp-3 | Sales Budget & Financial Framework | W-42→W-40 | US |
| rp-4 | Range Strategy & Framework | W-42→W-40 | US |
| rp-5 | Collection Planning & SKU Definition | W-40→W-37 | US |
| rp-6 | Go-to-Market Strategy | W-37→W-36 | US |

#### BLOCK 3: DESIGN & DEVELOPMENT (W-38 → W-1) — El más grande
| ID | Milestone | Weeks | Responsible |
|---|---|---|---|
| **Design** | | | |
| dd-1 | SketchFlow / Technical Sketches | W-38→W-35 | US |
| dd-2 | Launch Last / Define Forms | W-35→W-31 | US |
| dd-3 | Design Shot 1 | W-31→W-29 | US |
| dd-4 | Design Shot 2 | W-29→W-27.5 | US |
| dd-5 | Paper Pattern Development | W-29→W-27.5 | US |
| dd-6 | Colorways Development | W-27.5→W-25.5 | US |
| **Prototyping** | | | |
| dd-7 | White Proto Development | W-28→W-21 | FACTORY |
| dd-8 | White Proto Delivery | W-21→W-20 | FACTORY |
| dd-9 | White Proto Rectification | W-20→W-16 | US |
| dd-10 | Technical Sheets Completion | W-20→W-16 | US |
| **Sampling** | | | |
| dd-11 | Color Samples Development | W-19→W-13 | FACTORY |
| dd-12 | Fitting Samples Development | W-14→W-11 | FACTORY |
| dd-13 | Fitting Samples Confirmation | W-13→W-10 | US |
| dd-14 | Collection Completed | W-10 (hito) | ALL |
| **Production** | | | |
| dd-15 | Production Order | W-10→W-9 | US |
| dd-16 | Production Timeline | W-9→W-3 | FACTORY |
| dd-17 | Quality Control | W-3→W-2 | FACTORY |
| dd-18 | Production Delivery & Logistics | W-2→W-1 | FACTORY |

#### BLOCK 4: MARKETING & DIGITAL (W-30 → W+4)
| ID | Milestone | Weeks | Responsible |
|---|---|---|---|
| **Digital Presence** | | | |
| gm-1 | Website Design & Development | W-30→W-22 | AGENCY/US |
| gm-2 | E-commerce Setup | W-22→W-18 | AGENCY/US |
| gm-3 | Product Photography / AI Renders | W-17→W-14 | AGENCY/US |
| gm-4 | Copywriting & Brand Story | W-17→W-14 | US |
| gm-5 | Lookbook / Campaign Creative | W-14→W-10 | AGENCY/US |
| **Marketing Pre-launch** | | | |
| gm-6 | Social Media Setup & Profiles | W-20→W-18 | US |
| gm-7 | Content Calendar & Production | W-18→W-13 | US |
| gm-8 | Influencer & PR Outreach | W-14→W-9 | US |
| gm-9 | Email List Building & Flows | W-14→W-6 | AGENCY/US |
| gm-10 | Paid Ads Setup & Creative | W-10→W-6 | AGENCY/US |
| gm-11 | PR & Seeding Shipments | W-8→W-4 | US |
| **Launch** | | | |
| gm-12 | Pre-launch Teasing Campaign | W-4→W-0 | US |
| gm-13 | Launch Day Execution | W-0 | ALL |
| gm-14 | Launch Week Push | W-0→W+1 | ALL |
| gm-15 | Post-launch Analysis & Optimization | W+1→W+4 | US |

---

### Cross-Block Dependencies (milestones que ACTIVAN otro bloque)

| Milestone origen | Bloque origen | Activa / alimenta a | Bloque destino | Razón |
|---|---|---|---|---|
| cr-1 Consumer & Target | Creative | rp-1 Consumer & Market Analysis | Planning | Comparten input de consumidor |
| cr-2 Trend Research | Creative | dd-1 SketchFlow | Development | Necesita dirección creativa para diseñar |
| br-2 Logo & Identity | Creative | gm-1 Website Design | Marketing | Necesita identidad visual para la web |
| br-4 Packaging Design | Creative | dd-6 Colorways | Development | Packaging influye en paleta de color |
| rp-4 Range Strategy | Planning | dd-1 SketchFlow | Development | Define QUÉ se va a diseñar |
| rp-5 Collection Planning & SKUs | Planning | dd-2 Define Forms + cadena design | Development | SKUs determinan las hormas y modelos |
| rp-6 Go-to-Market Strategy | Planning | gm-1 Website + gm-6 Social Media | Marketing | Plan GTM guía toda la estrategia digital |
| dd-14 Collection Completed | Development | gm-3 Product Photography | Marketing | Necesita producto físico para fotografiar |
| dd-14 Collection Completed | Development | gm-5 Lookbook | Marketing | Necesita muestras para lookbook |
| dd-18 Production Delivery | Development | gm-13 Launch Day | Marketing | Sin producto no hay lanzamiento |

### Milestones Independientes (no dependen de otro bloque)

| Bloque | Milestones | Nota |
|---|---|---|
| Creative | br-1 Brand Naming | Puede arrancar en paralelo con trend research |
| Planning | rp-2 Channel Strategy, rp-3 Sales Budget | Solo dependen de rp-1 (interno) |
| Development | Ninguno | Todo depende de Creative/Planning como input |
| Marketing | gm-6 Social Media Setup, gm-9 Email List Building | Pueden empezar sin input de otros bloques |

---

### Flujo General Simplificado

```
 CREATIVE ──────┐
 (W-48 → W-34)  ├──→ DEVELOPMENT ──────→ MARKETING
                │    (W-38 → W-1)        (W-30 → W+4)
 PLANNING ──────┘
 (W-46 → W-36)  ────→ MARKETING
                       (GTM strategy)
```

Creative y Planning arrancan casi en paralelo (W-48 y W-46), alimentan a Development (bloque más largo, 38 semanas), y Marketing corre en paralelo a Development pero depende de él para fotografía/lookbook/lanzamiento.

---

### Milestone ID Scheme
- `cr-*` — Creative block
- `br-*` — Brand milestones (kept from old system, inside creative block)
- `rp-*` — Range Planning block
- `dd-*` — Design & Development block (includes design, prototyping, sampling, production)
- `gm-*` — Go-to-Market block (includes digital, marketing, launch)

### Key Architecture Separation
- `TimelinePhase` = 4 calendar blocks (for Gantt chart grouping)
- `WizardPhaseId` = 10 workspace IDs (product, brand, design, prototyping, sampling, studio, digital, marketing, production, launch)
- Each workspace has a `block: TimelinePhase` field linking it to its calendar block
- `LEGACY_MILESTONE_MAP` in timeline-template.ts maps old IDs (ow-*, ds-*, pt-*, etc.) to new IDs

### Backward Compatibility
Existing timelines in Supabase still have old milestone IDs. The `LEGACY_MILESTONE_MAP` handles translation. A migration may be needed for existing data.
