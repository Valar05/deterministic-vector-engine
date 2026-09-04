# Deterministic Offline Vector Engine

> **Status:** experimental, offline-first, deterministic SVG research project. The interactive brutalist box works. The first portrait transcription is **visually rejected**. The durable tracing studio described below is confirmed but not yet implemented.

This repository explores a deliberately small vector engine whose production output is ordinary SVG rather than Canvas, WebGL, a model file, or a runtime AI response. The long-term objective is to turn human intent, authored curves, deformation systems, animation curves, and procedural material logic into compact deterministic vector programs that remain inspectable and runnable on a mobile browser.

The project began with a deliberately simple text-to-shape birth gate and evolved into an interactive pseudo-3D Vector Noodle box. A later portrait experiment exposed a critical failure: structural validation can prove that an SVG is legal, but it cannot prove that a portrait is recognizable or appealing. That failure is retained here as design evidence rather than rewritten as success.

## Current truth

| Surface | Implementation | Machine evidence | Visual truth |
|---|---|---|---|
| Text-to-SVG primitive resolver | Implemented | Covered by deterministic tests | Operational |
| Interactive brutalist Vector Noodle box | Implemented | 23/23 tests pass | Awaiting explicit user pixel acceptance |
| One-finger pseudo-3D rotation | Implemented | Gesture, quaternion, reset, inertia, and reduced-motion tests pass | Awaiting explicit user pixel acceptance |
| Vector Rosetta research corpus | Implemented | Research validator passes | Reference material only |
| Editorial portrait v1 | Implemented artifact | SVG constraints and privacy checks pass | **REJECTED by user: “this is horrific”** |
| Permanent tracing/learning studio | Confirmed design | No production implementation yet | Not available |
| Deterministic image-critique schema | Confirmed design | No production implementation yet | Not available |
| Milestones 2–5 from the original blueprint | Research/design only | Not implemented | Not available |

Machine checks are guardrails. A visual artifact remains red until the user accepts the actual pixels.

## Run locally

```sh
sh tools/server_tmux.sh
```

Then open:

- Vector Noodle box: <http://127.0.0.1:8810/>
- Current rejected portrait surface: <http://127.0.0.1:8810/transcription/>
- Current rejected portrait SVG: <http://127.0.0.1:8810/transcription/portrait.svg>

The portrait links are deliberately labeled rejected. They exist as a reproducible failure and should not be presented as approved art.

## Verify

```sh
node --test tests/m1.test.mjs
python research/vector-rosetta/validate_research.py
python tools/validate_lineart.py --self-test
python tools/validate_transcription.py
curl -fsS http://127.0.0.1:8810/ | grep -F 'dve-noodle-box-v1'
curl -fsS http://127.0.0.1:8810/transcription/ | grep -F 'dve-transcription-v1'
```

Expected current results:

- box tests: 23 passing
- research validator: passing
- portrait structural validator: passing
- portrait visual verdict: rejected

A passing portrait validator must never be reported as aesthetic acceptance.

## Production architecture

### Vector Noodle box

```text
prompt
  -> fixed primitive/material resolver
  -> frozen contour/depth genotype
  -> deterministic curve sweep
  -> projected inline SVG paths
  -> virtual-sphere quaternion controller
  -> flat SVG pixels that imply volume
```

Public boundaries:

- `compileNoodleOrganism({ primitive, color, genotype })`
- `renderPromptToSvg(prompt)`
- `startSvgIllusion(options)`

The runtime uses no Canvas, WebGL, CSS 3D, external models, external images, network data, random source, or runtime AI. Its canonical organism is a pair of authored curves; emitted hulls and caps are transient SVG paths.

### Interaction contract

- One finger or mouse rotates in any direction through a virtual trackball.
- Curved gestures can create roll; there is no Euler pitch clamp or gimbal lock.
- Release creates brief capped deterministic inertia.
- Double-tap or `Home` restores the initial orientation.
- Arrow keys provide an accessible alternative.
- Demonstration motion stops after real interaction.
- Reduced motion disables demonstration and inertia, not direct control.
- Material changes preserve orientation.

## Evolutionary blueprint

### Milestone 1 — Birth gate

A raw prompt resolves a primitive and material and emits immediate SVG pixels. Unknown vocabulary falls back deterministically. This milestone is implemented through the box organism.

### Milestone 2 — Scaling gate

Planned: independent mathematical style modifiers that transform coordinates before projection. Style logic must remain separate from primitive ownership.

### Milestone 3 — Ascension gate

Planned: deterministic `requestAnimationFrame` timelines driven by fixed curves, with prompt vocabulary selecting known trajectories rather than synthesizing arbitrary motion.

### Milestone 4 — Procedural texture gate

Planned: SVG-native procedural wear and material behavior. Any filters must be deterministic, bounded, optional, and explicitly excluded from line-art exports.

### Milestone 5 — Alchemy gate

Planned: deterministic combination of independent vector packages through validated, license-aware interchange contracts. “Functional” behavior must be proven rather than implied by appearance.

## Vector Rosetta Stone research

`research/vector-rosetta/` records a bounded study of professional vector and 2.5D ecosystems:

- SVG/Inkscape for paths, transforms, paint, clips, symbols, and nested coordinates
- Spine JSON for bones, slots, skins, constraints, deformation, draw order, and timelines
- Lottie/After Effects exports for spatial and temporal curves
- Toon Boom exports for hierarchy and deformation precedents
- SWF documentation for symbol, placement, matrix, morph, and frame archaeology

The retained implementation direction is plain SVG geometry plus behavior patterns learned from documented interchange formats. Proprietary runtimes and opaque editor project files are not copied into production.

Important research artifacts:

- `SOURCE_MANIFEST.jsonl`
- `FORMAT_CAPABILITY_MATRIX.md`
- `DVE_VECTOR_PACKAGE_V0.md`
- `DVE_VECTOR_PACKAGE_V0.schema.json`
- `PATTERN_CARDS.md`
- `RESEARCH_VERDICTS.md`
- `CONFORMANCE_FIXTURE_PLAN.md`
- `visual-atlas/`

## Portrait experiment: what failed

The portrait was authored from observed landmarks without tracing. It satisfied its mechanical contract:

- transparent SVG
- one ink color
- three stroke weights
- no fills, shading, filters, gradients, masks, or embedded raster
- 85 manual paths
- bounded ink region
- source photo and EXIF excluded from the repository
- four distinct drafts retained

It nevertheless failed visibly. The selected result became a symmetrical generic icon with oversized circular eyes, a small generic nose and mouth, a helmet-like hairline, and a triangular beard. It did not preserve the source subject’s:

- heavy asymmetric brows
- narrow tired eye geometry
- long broad nose
- moustache-to-beard structure
- wide irregular beard mass and taper
- messy curl silhouette
- close-camera facial proportions

The file `transcription/critique-final.json` says `AGENT_ART_ACCEPTED`; that historical judgment is superseded and false-green. The authoritative state is user rejection. The artifact and receipts remain to show exactly how a structurally sophisticated harness lied about visible quality.

## Corrected direction: tracing is the learning interface

The next portrait system is not a one-shot generator. It is a durable offline transcription studio in which deliberate tracing and correction teach the engine a reusable line language.

### Required mobile workflow

1. Load a local reference through the browser File API.
2. Keep the reference on-device and outside exported SVG.
3. Draw with one finger or stylus in explicit **Trace** mode.
4. Pan and zoom in explicit **Navigate** mode or with a two-finger gesture.
5. Adjust reference opacity or hide it completely.
6. Label each stroke by semantic feature.
7. Edit, accept, reject, undo, and redo strokes.
8. Review with the reference visible and hidden.
9. Save automatically to IndexedDB.
10. Export portable session JSON, candidate style profile JSON, and raster-free SVG.

### Semantic stroke families

- silhouette
- hair
- brow
- eye
- nose
- mouth/moustache
- beard
- clothing
- detail

Each family learns independently while inheriting global style constraints.

### Self-configuration contract

For every stroke, the studio retains:

- raw pointer samples
- fitted SVG path
- semantic category
- selected line weight
- smoothing and simplification parameters
- corner-retention measurements
- user edits
- accept/rework state
- style profile before and after the correction

Learning is deterministic. Identical input tapes and profiles must reproduce identical paths and profile updates. A capability test must replay the same tape with learning enabled and disabled and demonstrate a measurable difference for the recorded reason.

The session may use a candidate profile immediately, but rejected drawings must never update the durable active profile. Promotion occurs only after explicit user acceptance.

### Persistence contract

- versioned IndexedDB stores for sessions and profiles
- transaction-safe autosave
- crash recovery
- named sessions
- schema-versioned import/export
- deterministic replay hashes
- reference raster persistence disabled by default
- explicit local opt-in before storing reference pixels
- no upload path

## Deterministic image-critique schema

The prior rubric failed because it converted subjective agent confidence into numbers. The replacement schema separates machine facts, registered geometry, and human acceptance.

Planned canonical file:

```text
transcription/schema/image-critique.schema.json
```

### Artifact identity

Every critique binds:

- source-photo SHA-256
- trace-session SHA-256
- exported-SVG SHA-256
- rendered-review-image SHA-256
- exact style-profile version and hash
- build marker
- capture/review timestamp

### Registered feature evidence

Every required feature records:

- reference landmarks
- traced landmarks
- traced contour IDs
- normalized landmark error
- contour coverage
- overshoot and undershoot
- accidental intersections
- missing and duplicated contours
- explicit tolerance and unit

Initial feature inventory:

- silhouette
- hair
- left/right brow
- left/right eye
- nose
- moustache
- mouth
- beard
- shoulders/clothing

### Line measurements

- forbidden fills, raster, script, filters, shading, and external URLs
- allowed stroke-weight vocabulary
- nodes per 100 pixels
- curvature spikes
- sub-threshold accidental segments
- open endpoints
- inconsistent weights
- exported ink bounds
- replay hash equality

### Initial deterministic thresholds

- every required identity feature present
- landmark RMS error no greater than 4.5% of interocular distance
- required contour coverage at least 90%
- zero forbidden visual constructs
- zero accidental intersections after approved contour exclusions
- identical replay hashes
- profile ablation produces the predicted measurable change

Thresholds establish geometric and structural readiness, not beauty.

### Critique state machine

```text
STRUCTURAL_REJECT
  -> GEOMETRY_REVIEW_REQUIRED
  -> USER_VISUAL_REVIEW_REQUIRED
  -> USER_ACCEPTED
```

Only the user may issue `USER_ACCEPTED`. A user rejection is permanent negative evidence attached to that artifact hash. Neither source tests, the agent, nor a generated rubric may promote it.

## Privacy and provenance

The reference selfie is private and is **not committed to this repository**. Exported portrait SVGs must never contain:

- `<image>` elements
- data URLs
- source file bytes
- EXIF
- external reference URLs
- hidden raster layers

The existing provenance record contains a private source filename and digest but not the source image. Keep this repository private unless that metadata is deliberately redacted and the user authorizes publication.

## Repository map

```text
index.html                         box play surface
engine.js                          deterministic organism compiler and controller
styles.css                         box presentation
tests/m1.test.mjs                  box/compiler/interaction contract
tools/server_tmux.sh               durable localhost server
transcription/                     portrait experiment and failure evidence
transcription/drafts/              retained SVG iterations and critiques
transcription/qa/                  diagnostic renders, not runtime inputs
research/vector-rosetta/           format research, manifests, schemas, atlas
PROJECT_ORIENTATION.md             operational owner and handoff
```

## Token and process incident

During the portrait/tracing discussion, the agent repeatedly loaded long instruction documents, produced large plans and preflights, transferred image data, and performed many agentic turns before delivering corrected pixels. The user reported that the weekly allowance meter fell from approximately 80% remaining to 7% remaining.

[OpenAI’s Codex plan documentation](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) states that allowance use varies with task size, complexity, model, execution location, and extended-session behavior. This repository cannot independently reconstruct the account’s exact credit ledger, and local exact token counters were unavailable. Therefore:

- the reported meter change is treated as credible user evidence
- this session likely contributed materially
- no fabricated exact attribution is recorded
- the prior workflow is classified as wasteful

### Mandatory operating correction

Future work on this project must:

- prioritize pixels before expansive documentation
- avoid rereading giant instruction files when a bounded owner file suffices
- cap tool output aggressively
- avoid base64 image output unless no smaller accepted lane exists
- make one bounded implementation pass per confirmation
- stop after a visible red verdict and revise the visual premise first
- keep status messages short
- never call structural validation artistic success
- check the usage meter before another long-running campaign when available

## Friction audit

### Missing scripts

- No single tracing-studio bootstrap or recovery script.
- No deterministic replay runner for pointer tapes.
- No profile enabled/ablated comparison command.

### Missing tools

- No mobile SVG stroke editor.
- No feature-landmark registration tool.
- No candidate-profile promotion/rollback tool.

### Missing tests

- No same-tape learning ablation.
- No IndexedDB reload/recovery test.
- No malformed session import suite.
- No gesture interruption and accidental-touch suite.
- No schema-bound critique fixture.
- No accepted visual evidence integration.

### Missing documentation

This README is the first consolidated project narrative. The previous orientation described implemented surfaces but did not make the portrait’s user rejection authoritative.

### Missing automation

- User rejection does not yet automatically quarantine a false-green receipt.
- Visual verdicts do not yet bind artifact hashes.
- The current validator can pass a portrait the user finds unacceptable.

## Build next

Build the smallest end-to-end tracing slice before any more theory:

1. local photo loader
2. Trace/Navigate modes
3. one semantic stroke family
4. raw tape capture
5. deterministic path fitting
6. IndexedDB autosave and reload
7. raster-free SVG export
8. enabled/disabled learning replay
9. schema-bound critique record
10. user review of actual traced pixels

Only after that slice is visibly accepted should the system expand to every feature family or more advanced vector ingestion.

## Rights

No open-source license is granted at this time. All rights are reserved by the project owner. Third-party research links retain their original ownership and licenses.
