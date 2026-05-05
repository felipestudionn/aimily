---
name: NO fallbacks · arreglar en origen
description: Cuando la data falta o está mal, NUNCA poner fallback en el render layer. Encontrar la causa raíz (CIS vacío, schema mal, capture point roto) y arreglarla ahí. Los fallbacks enmascaran bugs arquitecturales.
type: feedback
---

# NO fallbacks · arreglar en origen

**Regla**: si encuentro un campo NULL/vacío que debería tener datos, NO añadir fallback en el código de presentación. Investigar por qué la data canónica falta y arreglarlo en el origen.

**Why**: Felipe odia los fallbacks porque enmascaran bugs reales. Caso concreto (2026-05-05): `brand_profiles` para SLAIZ tenía todos los campos NULL (brand_name, tagline, voice, palette, typography, brand_story). Mi primera versión de `loadStorefrontData` tenía un objeto `FALLBACK_BRAND` con valores genéricos ("Untitled", "A new chapter…"). Eso es exactamente lo que NO se debe hacer — esconde que el CIS no está poblado correctamente para SLAIZ.

La acción correcta cuando ocurre esto:
1. NO meter fallback en el loader
2. Investigar dónde DEBERÍA vivir la data canónica (en SLAIZ probablemente está en `collection_decisions`/CIS, no en `brand_profiles`)
3. Si el CIS tampoco lo tiene → es bug del capture point que escribió la data; arreglarlo allí
4. Si el schema fuerza una solo fuente y la data no llega ahí → hacer write-through desde el otro lado para mantener canonicalidad

**How to apply**:
- Loaders/services: **throw** o **return null/error** cuando data canónica falta. Que falle visible.
- En CI/UAT real, los errores se ven y se arreglan en la fuente.
- Si la causa raíz es "CIS no tiene la data porque el capture point no la escribió", añadir el write-through correcto (ver feedback `business-excellence-no-deadline` y caso Sales Dashboard de mayo).
- Solo hay UNA excepción legítima a "no fallback": cuando el campo es **opcional por diseño** (e.g. brand.contact.address puede no existir y se renderiza con `{c.address && ...}`). Pero "el brand profile entero está vacío" NO es opcional — es bug.
