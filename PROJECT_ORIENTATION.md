# Deterministic Vector Engine

## Current owner

This standalone static-web project owns the deterministic text-to-SVG birth gate and the first Vector Noodle organism: an interactive brutalist box.

Production path:

`prompt -> fixed primitive/material resolver -> frozen Noodle genotype -> contour/depth sweep -> projected inline SVG paths -> one-finger quaternion trackball -> browser pixels`

The box is not a model file or a WebGL object. Its canonical form is a closed cubic contour noodle plus a cubic depth noodle. The compiler deterministically emits transient cap and hull surfaces; JavaScript projects them into flat SVG paths.

## Public boundaries

- `compileNoodleOrganism({ primitive, color, genotype })` compiles and validates a frozen curve/sweep package.
- `renderPromptToSvg(prompt)` resolves exactly one primitive and one material, compiles genotype 0, and updates the inline SVG.
- `startSvgIllusion(options)` owns trackball input, inertia, reset, keyboard control, and reduced-motion behavior.
- Unsupported compiler inputs throw explicit `REJECT:*` errors.

No Canvas, WebGL, CSS 3D, external model, image, library, random source, network data, or runtime AI is used.

## Run and verify

```sh
node --test tests/m1.test.mjs
python research/vector-rosetta/validate_research.py
sh tools/server_tmux.sh
curl -fsS http://127.0.0.1:8810/ | grep -F 'dve-noodle-box-v1'
```

Play URL: <http://127.0.0.1:8810/>

## Interaction contract

- One finger or mouse controls a virtual-sphere quaternion trackball in any direction with no dead zone.
- Curved gestures can roll the object; there is no pitch clamp or gimbal lock.
- Release provides brief capped deterministic inertia.
- Double-tap or press Home to restore the opening orientation.
- Arrow keys provide accessible manual rotation.
- Automatic demonstration rotation stops permanently after the first real interaction.
- Reduced motion disables demonstration motion and inertia, never direct control or reset.
- Changing material preserves orientation.

## Evidence state

- Compiler and interaction contract: 23/23 deterministic tests green.
- Exact URL and runtime resources require post-promotion HTTP verification.
- The visible brutalist read and interaction remain `RED_PENDING_USER_PIXEL_CONFIRMATION` until the user accepts the live artifact.

## Transcription surface

The isolated `/transcription/` route owns DVE Editorial Contour Portrait v1. Its production artifact is `transcription/portrait.svg`: a transparent 800 x 1000, one-ink, line-only SVG authored from artistic landmark observation without tracing or embedded raster data.

Validation:

```sh
python tools/validate_lineart.py --self-test
python tools/validate_transcription.py
```

Review URL: <http://127.0.0.1:8810/transcription/?v=dve-transcription-v1>
Direct SVG: <http://127.0.0.1:8810/transcription/portrait.svg?v=dve-transcription-v1>

Evidence state: structural, privacy, draft-distinctness, preview-bounds, and agent critique gates are green. Final visible acceptance remains `USER_PIXEL_CONFIRMATION_PENDING`.

## Wonder apprenticeship branch

The current replacement owner is `/wonder/`. It quarantines the rejected capsule generator and learns causal visual grammar from eleven hash-sealed exploded source plates. The v2 curriculum contains 25 normal-to-Fleshpunk quartets, five macro studies, 110 panels, source-derived centerline graphs, explicit correspondence proposals, and leave-one-object-out evidence.

The current structural result is 20 of 25 held-out mechanism-family predictions. Five misses remain first-class training evidence. VTracer and pinned Florence data are offline teacher tools only; neither enters the model-free deterministic runtime or owns artistic acceptance. The three weapon mutations remain `HUMAN_LABEL_REQUIRED`.

Run `npm run wonder:corpus`, `npm run test:wonder:corpus`, `npm run test:wonder`, and `sh tools/server_tmux.sh`. The review URL is `http://127.0.0.1:8811/`.
