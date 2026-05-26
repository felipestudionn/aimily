# Editorial GPT Prompt — Canonical "perfecto" Baseline

> 🔒 **LOCKED 2026-05-26** — Felipe confirmed this combination produces editorial output at production quality. Git tag: `editorial-perfect-2026-05-26` → commit `5616a64`.
>
> **Rule**: any future change to editorial generation must be non-regressive vs this baseline. Felipe's words: *"este prompt no puede ir a peor si añades cosas que sean sólo para mejorar."*

## The 3 components that make this work

### 1. Prompt (`src/app/api/ai/freepik/editorial/route.ts`, line 658-718)

Flat `.join(' ')` array of clauses. **NEVER** restructure into labeled `TASK:` / `INPUTS:` / `NON-NEGOTIABLES:` sections (YOLO 1/3 attempted this per Codex consult — Felipe rejected: *"Lo que no quiero es la reestructuración de bloques, esa que hace rara"*).

Order of clauses (each is a separate array element joined by a single space):

1. **Identity statement**: `HIGH-END EDITORIAL FASHION PHOTOGRAPH.`
2. **Image 1 (product)**: pixel-perfect identical to reference, same shape/colors/materials/details.
3. **Image 2 (model identity)**: identity ONLY — face structure, hair, complexion, skin tone. NOT expression/gaze/pose.
4. **Image 3 (behavior)** (conditional on `style_reference_url`): pose, body position, head tilt, gaze direction, expression, mood, lighting, atmosphere, camera angle, framing, wardrobe styling. Reproduce behavior exactly.
5. **Head-to-body proportion**: 85mm portrait lens + telephoto compression + fashion croquis 8-head ratio + head-to-toe framing + low camera angle. Magazine cover full-figure crop.
6. **CALZADO override** (conditional): footwear MUST be worn on feet, never held in hands.
7. **BLINDAJE 1** — Reference priority order (conditional on `style_reference_url`): Image 2 wins identity, Image 1 wins product, Image 3 wins behavior. Never blend Image 2's identity with the composited face in Image 3.
8. **BLINDAJE 6** — Editorial casting refinement: visible clavicle, slender neck, sharp cheekbones, slim sculpted face, defined jawline. Hair tucked behind one ear. High-fashion editorial, not commercial catalog.
9. **BLINDAJE 2** — Foot anatomy: 2 feet mirrored, big toe medial, heel backward, 5 toes each. Never two left feet.
10. **BLINDAJE 3** — Hand anatomy: 5 fingers each with correct joint orientation, fingers wrap naturally around touched surfaces, no fusion.
11. **BLINDAJE 4** — Reflective surfaces (conditional on `style_reference_url`): mirror/glass/polished metal in scene must show physically coherent reflection (same model, same pose, same product, correct geometric perspective).
12. **Hard anatomy floor**: exactly 2 arms, 2 legs, 2 feet, 10 fingers, 10 toes. No extras, no merges.
13. **Style line**: `Style: magazine editorial quality, natural lighting, realistic skin texture.`
14. **User direction** (conditional): `Additional direction: ${user_prompt}` (already sanitized via `sanitizeUserPromptForGpt`).
15. **BLINDAJE 5** — Critical final verification: 6 numbered checks (face identity, pose+gaze+tilt, product fidelity, foot mirroring, reflection coherence, finger count). Re-verify before finalizing. (4 checks if no style_reference_url.)

### 2. Composite preprocessing (`src/lib/face-blur.ts` — `compositeModelOntoStyleRef`)

When a model IS selected (default GPT path), the style reference image is pre-composited with the model's face BEFORE being sent to GPT:

1. Claude Haiku 4.5 Vision detects the **FACE bbox** in the style ref (face skin only — forehead hairline to chin, ear to ear, NOT including hair).
2. Resize the headshot to the bbox dimensions with `fit: cover, position: top`.
3. **Tone-match** the resized headshot to the style ref's face region: compute per-channel mean RGB of both, apply per-channel `sharp.linear()` scaling clamped to `[0.7, 1.3]`. Removes "pasted sticker" lighting artifacts.
4. Apply a **face-only oval mask**: vertical oval at 75% width × 88% height of bbox, with 4-stop gradient (white → white 60% → white@0.55 85% → transparent 100%). The narrower oval preserves the style ref's hair silhouette around the pasted face.
5. Composite the masked, tone-matched headshot onto the style ref at the detected face position.
6. Output: JPEG quality 95 (any compression artifact degrades GPT face fidelity).

This is Image 3 sent to GPT.

### 3. OpenAI API config (`src/lib/ai/image-generation.ts`)

```
model: 'gpt-image-1.5'
size: '1024x1536'
quality: 'high'
input_fidelity: 'high'   // gpt-image-1.5 specific — do NOT add to gpt-image-2
moderation: 'low'        // required for fashion/editorial; 'auto' false-positives sexual
n: 1
```

**Why not `gpt-image-2`?** gpt-image-2 processes inputs at automatic high-fidelity, which preserves the composited face as a visible pasted sticker instead of blending it. Tested 2026-05-26: gpt-image-2 + this composite = broken (floating face, giant head sticker). gpt-image-1.5 is the only proven model for this composite preprocessing approach.

## The 4 inviolable rules

1. **Never regress the baseline.** Tag `editorial-perfect-2026-05-26` (commit `5616a64`) is ground truth. Any change must be non-regressive.
2. **Never restructure the prompt into labeled blocks.** Keep `.join(' ')`. No `\n\n` section headers.
3. **Never switch model to gpt-image-2** with the current composite preprocessing.
4. **Never bundle reverts** touching multiple variables. One variable per commit when tuning AI generation.

## When asked to "improve" editorial generation

1. Diff your proposed change vs tag `editorial-perfect-2026-05-26`.
2. If additive (new inline clause, parameter knob): test against the SLAIZ collection (`60652ef7-1b06-4be4-9a61-31357be0be65`) with the same red Mary Jane shoe + Asian platinum bob headshot + dressing room style ref before merging.
3. If restructure, model switch, or composite redesign: do **NOT** ship. Ask first.
4. If a Codex/web/research suggestion proposes one of the forbidden changes: reject and cite this document.

## Reference for restore

```bash
# Restore the canonical baseline if it gets drifted:
git checkout editorial-perfect-2026-05-26 -- \
  src/app/api/ai/freepik/editorial/route.ts \
  src/lib/face-blur.ts \
  src/lib/ai/image-generation.ts
```
