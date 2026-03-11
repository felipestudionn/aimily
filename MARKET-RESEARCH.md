# AIMILY — Market Research & Monetization Strategy

> Fashion Collection Management Platform | Marzo 2026

---

## 1. QUE ES AIMILY HOY

### Features actuales
| Modulo | Descripcion |
|--------|-------------|
| **Collection Planner** | Crear/gestionar colecciones de moda con categorias, temporadas |
| **Timeline/Gantt Calendar** | Calendario interactivo con fases (concepto, sampling, produccion, delivery) con drag & resize |
| **SketchFlow (AI)** | Generacion de sketches de moda con Claude Sonnet (Anthropic) |
| **AI Model Generator** | Generacion de modelos con Fal.ai (Flux 2 Pro) |
| **Trend Analytics** | Analisis de tendencias con scraping (Apify) y AI (Gemini) |
| **Color Palettes** | Paletas de color para colecciones |
| **Go-to-Market** | Planificacion de lanzamiento |
| **Creative Space** | Workspace de diseno |
| **Excel Export** | Exportacion de timelines a Excel (ExcelJS) |
| **Bilingual (EN/ES)** | Soporte completo ingles/espanol |
| **Auth + Multi-user** | Autenticacion con Supabase |

### APIs y Servicios
| Servicio | Uso |
|----------|-----|
| Supabase | Base de datos, auth, storage |
| Google Gemini 2.5 Flash Lite | Analisis de tendencias, sugerencias de coleccion |
| Anthropic Claude Sonnet | SketchFlow — generacion de bocetos y descripciones |
| Fal.ai (Flux 2 Pro) | Generacion de modelos de moda con AI |
| Apify | Web scraping para datos de tendencias |
| Vercel | Hosting y deployment |
| ExcelJS | Exportacion de timelines |

---

## 2. TAMANO DEL MERCADO

### Fashion PLM Market (multiples fuentes)
| Fuente | Valor 2024 | Proyeccion | CAGR | Horizonte |
|--------|-----------|------------|------|-----------|
| Verified Market Research | $1.28B | $3.07B | 11.57% | 2032 |
| Verified Market Reports | $1.2B | $3.5B | 12.5% | 2033 |
| Business Research Insights | $1.62B | $3.47B | 8.5% | 2033 |
| UnivDatos | $2.24B | ~$5.6B | 12.08% | 2033 |
| WiseGuy Reports | $2.48B | $5B | ~7% | 2035 |

- **Consenso**: $1.2B-$2.5B en 2024, creciendo a **$3B-$5B para 2033**
- **Norteamerica**: ~$1.06B (mayor share regional)
- **Drivers**: digitalizacion post-COVID, sostenibilidad, DTC brands, fast fashion, migracion cloud

### Segmentos del mercado
| Segmento | Tamano estimado | Penetracion PLM |
|----------|----------------|-----------------|
| Enterprise (>$100M rev) | 40% del mercado | Alta (Centric, Infor, PTC) |
| Mid-market ($5M-$100M) | 35% del mercado | Media-Baja |
| SMB/Indie (<$5M rev) | 25% del mercado | **Muy baja — OPORTUNIDAD** |

### El gap de mercado
- Las marcas enterprise usan Centric/Infor PLM ($50K-$500K+/ano)
- Las marcas SMB usan **Excel, Google Sheets, WhatsApp, email** (literalmente)
- No existe un "Shopify of PLM" — una solucion accesible, bonita, y con AI para marcas emergentes
- **aimily puede ser esa solucion**

---

## 3. COMPETENCIA DIRECTA

### Tier 1 — Enterprise PLM (NO competimos aqui)
| Competidor | Precio | Target |
|-----------|--------|--------|
| **Centric PLM** | $50K-$500K+/ano (custom) | Enterprise, 475+ companies |
| **Infor PLM** | $100K+/ano | Enterprise manufacturing |
| **PTC FlexPLM** | $80K+/ano | Enterprise |
| **Lectra Kubix Link** | Custom pricing | Mid-to-large brands |

### Tier 2 — Mid-Market PLM (competencia indirecta)
| Competidor | Precio | Target | Fortalezas |
|-----------|--------|--------|------------|
| **Backbone PLM** (adquirido por Bamboo Rose 2023) | $99-$299/user/mo | DTC brands | Shopify App Store, Adobe Illustrator plugin, reduce data entry 40% |
| **Delogue PLM** | $119/user/mo | Sustainable brands | Gratis para suppliers (network effects), sustainability tracking |
| **ApparelMagic** | $120-$145/mo (flat, no per user) | Multi-channel brands | PLM + ERP + CRM combinado |
| **Uphance** | $249-$999/mo | Growing brands | Full ERP con Shopify integration |
| **WFX** | Custom | Mid-market | ERP + PLM modular |

### Tier 3 — SMB / Startups (COMPETENCIA DIRECTA)
| Competidor | Precio | Target | Fortalezas | Debilidades |
|-----------|--------|--------|------------|-------------|
| **Techpacker** | $35/user/mo (anual), $70 (mensual). Pro: $95, Premium: $125 | Indie designers | Tech packs baratos, card-based UX | Solo tech packs, no calendar, no AI, export gated en Pro+ |
| **PLMBR** | $30/user/mo | Startups | AI-driven, Gartner Cool Vendor, Shopify integration | Nuevo, poco market share |
| **Wave PLM** | Custom (30-90 dias trial gratis) | Small brands | Affordable, cloud | Features limitados, pricing no transparente |
| **Zedonk** | Custom (trial gratis) | Small fashion | Order mgmt, UK market | UI anticuada, pricing opaco |
| **OnBrand PLM** | Contact sales | Modern teams | 55% faster tech packs, dedicated account rep | Pricing no publicado |

### Tier 4 — Herramientas adjacentes
| Herramienta | Precio | Overlap |
|-------------|--------|---------|
| **Notion/Airtable** | $10-$20/user/mo | Templates para fashion, pero genericos |
| **Monday.com** | $12-$24/user/mo | Project management generico |
| **Fashion Cloud** | Gratis para retailers | B2B showroom, no PLM |

---

## 4. DIFERENCIADORES DE AIMILY

### Lo que NADIE mas ofrece (o no bien):
1. **AI-powered sketch generation** (SketchFlow con Claude + OpenAI gpt-image-1) — unico en el mercado SMB
2. **AI model generation + virtual try-on** (Fal.ai FASHN + Flux 2 Pro) — ningun PLM tiene esto
3. **AI video generation** (Kling Video v3 — runway walks, product videos) — totalmente unico
4. **AI trend analysis con scraping real** (Gemini + Apify, 6 ciudades, Instagram/TikTok/Reddit) — solo Heuritech hace algo similar ($$$)
5. **AI merchandising** que genera SKUs cuadrados matematicamente con revenue targets
6. **Visual Gantt timeline** con drag/resize, 41 milestones, 9 fases especializadas en fashion
7. **Lookbook builder con AI** — generacion automatica de lookbooks
8. **Tech pack completo** (sketches + construction notes + medidas + export PDF)
9. **Bilingual EN/ES** — mercado LATAM completamente desatendido
10. **Precio flat rate** (no per-user) vs competencia que cobra $35-$299/user/mo
11. **9 workspaces dedicados** con wizards por fase (concepto → lanzamiento)

### Competidores AI en fashion (referencia)
| Competidor AI | Que hace | Precio | Overlap con aimily |
|--------------|---------|--------|-------------------|
| **Heuritech** | Analiza 3M+ imagenes/dia, predice tendencias 24 meses, 90% accuracy | Enterprise (Louis Vuitton, Dior) | Solo trends, no PLM |
| **Style3D AI** | AI pattern creation, virtual fabric, 85%+ color prediction | Enterprise | Solo diseno 3D |
| **PLMBR** | "AI-driven PLM", Gartner Cool Vendor | $30/user/mo | PLM basico con AI |
| **Athena Studio** | AI-native OS, deteccion de riesgos, insights en tiempo real | No publicado | Nuevo, enterprise-focused |

**aimily combina trend intelligence + design AI + collection management + timeline en UNA sola plataforma. Nadie mas hace esto.**

### Positioning statement
> "aimily es el primer collection management platform con AI nativo para marcas de moda emergentes. Donde otros ofrecen spreadsheets glorificados, aimily genera sketches, modelos, y analisis de tendencias — todo desde una interfaz que tu equipo querra usar."

---

## 5. PRICING STRATEGY

### Modelo recomendado: Freemium + Tiered SaaS

#### Free (Starter)
- 1 coleccion activa
- 10 AI generations/mes (sketches + models)
- Timeline basico (sin export)
- 1 usuario
- Branding "Powered by aimily"
- **Objetivo**: Adquisicion, viralidad, product-led growth

#### Pro — $49/mes (o $39/mes anual)
- Colecciones ilimitadas
- 100 AI generations/mes
- Timeline con Gantt completo + Excel export
- Trend analytics basico
- Hasta 3 usuarios
- **Target**: Indie designers, freelancers, marcas nuevas

#### Business — $299/mes (o $199/mes anual)
- Todo de Pro
- 500 AI generations/mes
- Trend analytics avanzado
- Go-to-market planning
- Hasta 10 usuarios
- Custom branding en exports
- Priority support
- **Target**: Marcas SMB con equipo

#### Enterprise — $499/mes (o $399/mes anual)
- Todo de Business
- AI generations ilimitadas
- API access
- SSO + roles avanzados
- Dedicated account manager
- Custom integrations
- **Target**: Marcas mid-market en crecimiento

### Por que estos precios?
- **Techpacker cobra $35-$125/user/mo** solo por tech packs — un equipo de 5 = $175-$625/mes
- **Backbone cobra $99-$299/user/mo** — un equipo de 5 = $495-$1,495/mes
- aimily ofrece MAS features (AI generativa, trends, timeline, tech packs) con flat rate
- Business a $299/mes sigue siendo **40-80% mas barato** que Backbone para un equipo
- Enterprise a $499/mes es una fraccion de cualquier PLM serio ($50K+/ano)
- Modelo por workspace (no por usuario) reduce friccion de adopcion

---

## 6. UNIT ECONOMICS & COSTOS DE API

### Costos por servicio (datos precisos 2025-2026)

#### Supabase
- **Free tier**: 500MB DB, 1GB storage, 50K MAU, 2 proyectos (se pausan tras 1 semana inactiva)
- **Pro plan: $25/mes** — 8GB DB, 100GB storage, 250GB bandwidth, 100K MAU
- Overages: storage $0.021/GB, bandwidth $0.09/GB, auth $0.00325/MAU

| Escala | Costo estimado |
|--------|---------------|
| 100 usuarios | $25/mes |
| 1,000 usuarios | $25/mes |
| 10,000 usuarios | ~$75/mes (compute upgrade) |
| 100,000 MAU | ~$630/mes |

#### Google Gemini 2.5 Flash Lite
- Input: **$0.10/1M tokens** | Output: **$0.40/1M tokens**
- **Costo por llamada (~1K input + 500 output)**: $0.0003
- 1,000 llamadas/dia (30K/mes) = **$9/mes** (extremadamente barato)

#### Anthropic Claude Sonnet (SketchFlow)
- Input: **$3.00/1M tokens** | Output: **$15.00/1M tokens**
- Imagen de sketch (1024x1024) = ~1,398 input tokens
- **Costo por sketch call**: ~$0.015 (~$0.0075 con batch API 50% desc)
- Prompt caching: hasta 90% ahorro en system prompts repetidos
- **Claude es el mayor driver de costo (67% a escala)**

#### Fal.ai (Flux 2 Pro — Model Generation)
- ~$0.05-$0.10 por imagen generada
- **1,000 modelos/mes = ~$50-$100/mes**

#### Vercel
- **Pro: $20/user/mes** (1TB bandwidth, 40hrs CPU)
- Team de 2 personas: $40/mes (se mantiene estable hasta mucho trafico)

#### Apify (Scraping)
- Free: 200 llamadas/mes
- Pro: $49/mes (25K llamadas)

#### ExcelJS
- MIT license — **$0 total**

#### Shopify Partner
- Registro unico: **$19**
- Revenue share: **0% primer $1M lifetime**, luego 15%

### Escenarios de costo total (asumiendo 5 Gemini calls/dia + 2 Claude calls/semana por usuario)

| Servicio | 100 usuarios | 1,000 usuarios | 10,000 usuarios |
|----------|-------------|----------------|-----------------|
| Supabase Pro | $25 | $25 | $75 |
| Gemini Flash Lite | $4.50 | $45 | $450 |
| Claude Sonnet | $12 | $120 | $1,200 |
| Vercel Pro | $40 | $40 | $60 |
| **Total** | **~$82/mes** | **~$230/mes** | **~$1,785/mes** |
| **Costo por usuario** | **$0.82** | **$0.23** | **$0.18** |

### Unit Economics

| Metrica | 100 usuarios | 1,000 usuarios | 10,000 usuarios |
|---------|-------------|----------------|-----------------|
| Revenue estimado (avg $39/mo) | $3,900 | $39,000 | $390,000 |
| Costo total | $82 | $230 | $1,785 |
| **Profit** | **$3,818** | **$38,770** | **$388,215** |
| **Gross margin** | **98%** | **99%** | **99.5%** |

**Los margenes SaaS tipicos son 70-80%. aimily puede lograr 95%+ gracias a APIs baratas (Gemini es 30x mas barato que Claude por token).**

### Optimizacion de costos
- Migrar funciones de Claude a Gemini donde sea posible (reduce 67% del costo AI)
- Usar Claude Batch API (50% descuento) para generaciones no real-time
- Prompt caching en Claude (90% ahorro en system prompts repetidos)
- Rate limiting por tier para controlar consumo AI

---

## 7. SHOPIFY ADD-ON STRATEGY

### Oportunidad
- **Backbone PLM ya esta en Shopify App Store** — validando el mercado
- Backbone reduce data entry en 40% con su sync a Shopify
- No hay NINGUN competidor con AI en Shopify App Store para fashion
- Shopify tiene **2M+ merchants**, miles en fashion/apparel

### Modelo de Shopify App

#### Revenue share de Shopify
- Shopify cobra **0% de comision** en los primeros $1M de revenue de apps
- Despues: **15% revenue share** (bajo en comparacion con Apple's 30%)

#### Pricing en Shopify App Store
| Plan | Precio | Features |
|------|--------|----------|
| **Free** | $0/mes | Sync basico de productos, 1 coleccion |
| **Starter** | $29/mes | 5 colecciones, 50 AI generations, timeline |
| **Pro** | $79/mes | Ilimitado, trend analytics, AI completo |
| **Enterprise** | $199/mes | API, multi-store, white label |

#### Integracion tecnica con Shopify
1. **Product sync**: Push colecciones de aimily a Shopify products
2. **Collection planning**: Planificar lanzamientos con fechas de publicacion automaticas
3. **Inventory planning**: Usar trend analytics para proyectar inventory
4. **Content generation**: AI sketches/modelos para product images
5. **Seasonal calendar**: Sync timeline milestones con Shopify discounts/promotions

### Datos clave de Shopify
- **Backbone PLM** tiene solo ~3 reviews y 5.0 stars — el mercado es NACIENTE
- **No existe NINGUN app de collection calendar/timeline** en Shopify
- Shopify revenue share: **0% en primer $1M lifetime**, luego 15% + 2.9% processing
- Fee de registro: **$19 unica vez** para Partner account
- A $79/mo promedio, necesitas ~1,055 merchants para $1M/year

### Posicionamiento en Shopify
**NO posicionar como "PLM"** — suena caro y enterprise.
**SI posicionar como "Collection Calendar" o "Collection Planner"** — mas approachable.

**El pitch killer**: "Reemplaza tus spreadsheets de planificacion de coleccion"

### Flujo de integracion Shopify
1. Planificar coleccion en aimily (timeline, SKUs, AI)
2. Push productos a Shopify cuando estan listos
3. Usar Shopify B2B para vender wholesale
4. **Nadie hace esto end-to-end hoy**

### Ventaja competitiva en pricing
La mayoria cobra **per user** — un equipo de 5 en Backbone = $495/mo.
aimily con **flat rate por workspace** ($39-$89/mo) es 5-10x mas barato.

### Go-to-market Shopify
1. Lanzar como **app gratuita** con features basicos
2. Crecer con reviews y word-of-mouth
3. Upsell a planes paid con AI
4. Targeted marketing a merchants de fashion/apparel

---

## 8. GO-TO-MARKET STRATEGY

### Fase 1: Product-Led Growth (Meses 1-6)
- **Free tier agresivo** — dejar que designers prueben sin friccion
- **Templates pre-hechos** — "SS26 Collection Template", "FW26 Capsule Template"
- **Social proof**: Instagram/TikTok mostrando AI sketch generation (viral potential)
- **SEO**: "fashion collection planner", "free tech pack tool", "AI fashion design"
- **Content marketing**: Blog/YouTube sobre collection planning tips
- **Community**: Discord/Slack para fashion designers
- **Partnerships**: Fashion schools (FIT, Parsons, Central Saint Martins) — free access para estudiantes

### Fase 2: Channel Growth (Meses 6-12)
- **Shopify App Store** launch
- **Integrations**: Figma, Adobe Illustrator, Google Workspace
- **Referral program**: "Invite a designer, get 1 month free"
- **Case studies**: 3-5 marcas usando aimily con resultados medibles
- **PR**: Fashion tech press (Business of Fashion, Sourcing Journal, WWD)

### Fase 3: Scale (Meses 12-24)
- **B2B sales** para marcas mid-market
- **White label** para agencias de moda
- **API marketplace** — terceros construyen sobre aimily
- **International expansion** — LATAM (ventaja bilingual), Europe
- **Enterprise features**: SSO, audit logs, advanced permissions

### Canales de adquisicion (orden de prioridad)
1. **SEO + Content** (bajo costo, alto ROI a largo plazo)
2. **Shopify App Store** (distribucion masiva, baja friccion)
3. **Social media** (Instagram, TikTok — AI demos son muy virales)
4. **Partnerships** con fashion schools
5. **Paid ads** (Google Ads, Instagram Ads — solo cuando unit economics validados)
6. **PR/Press** (Business of Fashion, Vogue Business)

---

## 9. VERSIONES Y ROADMAP DE PRODUCTO

### v1.0 — MVP (ACTUAL)
- Collection management
- Timeline/Gantt
- SketchFlow AI
- Basic trend analytics
- Auth + multi-user

### v1.5 — Monetization Ready
- [ ] Stripe billing integration
- [ ] Usage tracking (AI generations counter)
- [ ] Free/Pro/Business tier gating
- [ ] Onboarding flow mejorado
- [ ] Landing page de conversion

### v2.0 — Shopify Integration
- [ ] Shopify App embebida
- [ ] Product sync bidireccional
- [ ] Collection launch scheduler
- [ ] Shopify App Store listing

### v2.5 — Collaboration
- [ ] Real-time collaboration (como Figma)
- [ ] Comments/annotations en sketches
- [ ] Supplier portal (compartir tech packs con fabricas)
- [ ] Line sheets automaticos

### v3.0 — Intelligence
- [ ] AI trend forecasting predictivo
- [ ] Competitor monitoring automatico
- [ ] Cost estimation AI
- [ ] Sustainability scoring
- [ ] AI-powered merchandising suggestions

### v3.5 — Platform
- [ ] API publica
- [ ] Marketplace de templates
- [ ] Plugin ecosystem
- [ ] White-label para agencias

---

## 10. METRICAS CLAVE (KPIs)

### Product
- MAU (Monthly Active Users)
- Collections created/month
- AI generations used/month
- Feature adoption rate

### Revenue
- MRR (Monthly Recurring Revenue)
- ARPU (Average Revenue Per User) — target: $45-$65
- Churn rate — target: <5% monthly
- LTV (Lifetime Value) — target: >$500
- CAC (Customer Acquisition Cost) — target: <$50

### Growth
- Sign-up to paid conversion — target: 5-8%
- Free to Pro upgrade rate
- NPS score — target: >50
- Time to value — target: <10 minutes

---

## 11. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|------------|
| Competidor grande anade AI | Alta | Medio | First-mover advantage, mejor UX, precio |
| Costos AI suben | Baja | Alto | Multi-model strategy (Gemini es barato), caching |
| Adopcion lenta | Media | Alto | Free tier, Shopify distribution, content marketing |
| Churn alto | Media | Alto | Onboarding excelente, value loops, community |
| Shopify cambia terms | Baja | Medio | No depender 100% de Shopify, web app independiente |

---

## 12. RESUMEN EJECUTIVO

### La oportunidad
- Mercado de $1.6B creciendo 8-10%/ano
- Gap enorme entre enterprise PLM ($50K+) y "usar Excel"
- Nadie ofrece AI-native collection management para SMB fashion
- LATAM es un mercado completamente desatendido

### El modelo
- **SaaS freemium** con pricing $0-$89/mes (vs competencia $35-$299/user/mo)
- **Shopify add-on** como segundo canal de distribucion
- **Margenes 90%+** gracias a APIs baratas

### Los numeros
| Milestone | Timeline | MRR Target |
|-----------|----------|------------|
| 100 usuarios paid | Mes 6 | $4,500 |
| 500 usuarios paid | Mes 12 | $25,000 |
| 2,000 usuarios paid | Mes 24 | $110,000 |
| 5,000 usuarios paid | Mes 36 | $300,000 |

### Next steps inmediatos
1. Implementar Stripe + billing tiers
2. Crear landing page de conversion
3. Lanzar free tier agresivo
4. Aplicar a Shopify Partner Program
5. Crear 3-5 collection templates pre-hechos
6. Video demo de AI features para social media

---

*Research compilado: Marzo 2026*
*Fuentes: G2, Capterra, Shopify App Store, Supabase Pricing, Google AI Pricing, Anthropic Pricing, Verified Market Research, Sourcing Journal, Business of Fashion*
