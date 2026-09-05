# Deterministic Offline Vector Engine

> Status: the SVG box remains implemented. The portrait and Wonder v2 skeleton corpus are user-rejected archaeology. The active branch is the Empty Glass modern-shovel apprenticeship and is awaiting the user’s pixel verdict.

This project compiles inspectable vector programs into ordinary SVG. No runtime AI, Canvas, WebGL, Inkscape executable, or hidden raster enters the vector output.

## Current truth

| Surface | State | Visual authority |
|---|---|---|
| Interactive brutalist SVG box | Implemented | User acceptance remains separate from tests |
| Portrait experiment | `USER_REJECTED` | Preserved negative evidence |
| Wonder v2 skeleton and ontology gates | `USER_REJECTED` | Not visual learning evidence |
| Empty Glass shovel studio | Implemented candidate | `AWAITING_USER_PIXEL_VERDICT` |
| Fleshpunk transformation | Excluded from current learner | Later separately confirmed garnish phase |

Machine checks may deny. They cannot grant artistic acceptance.

## Empty Glass law

The active learner asks which few lines make an uploaded modern object unmistakable.

```text
modern reference
  → silhouette
  → identity anchors
  → correction strokes for concrete misreads
  → hide reference at three scales
  → remove every stroke once
  → retain the user-judged recognition core
  → deterministic SVG replay
```

Each assembled or exploded view may retain at most 20 strokes. A stroke has only geometry, one of three roles, a subject-specific note, a human ablation verdict, and a replay identity. Negative space is represented by the strokes that bound it.

The current shovel starter has 16 assembled candidates and 20 exploded candidates. Every candidate is unaccepted until destructive review is complete.

## Run

```sh
npm run test:wonder:sparse
npm run wonder:sparse
sh tools/server_tmux.sh
```

Review surface:

<http://127.0.0.1:8811/wonder/>

Health and status:

<http://127.0.0.1:8811/api/noodle/health>

<http://127.0.0.1:8811/api/wonder/status>

The uploaded contact sheet is copied only into an ignored local source cache after its SHA-256 digest is verified. If it is unavailable, use **Load local source** and choose the modern-object contact sheet. The exported study and SVG never contain source pixels or source paths.

## Studio use

1. Choose assembled or exploded.
2. Draw a silhouette, identity anchor, or correction stroke directly on the visible reference.
3. Hide the reference and inspect thumbnail, normal, and enlarged output.
4. Record `RECOGNIZABLE`, `WRONG`, `GENERIC`, or `OVERDRAWN`.
5. Walk the destructive test and mark each missing stroke `ESSENTIAL` or `REMOVABLE`.
6. Delete removable ink and export the recognition core.

Drawing has no timing, direction, pressure, or gesture-angle requirement. Undo, redo, source replacement, explicit reference hiding, visible budget, autosave, and JSON/SVG export are available from the same mobile surface.

## Source boundary

Base learning accepts only `MODERN_OBJECT` studies. Any source identity containing Fleshpunk, cultivated mutation, or organic mutation is rejected. Normal-to-Fleshpunk correspondences, family labels, and the old 20-of-25 ontology result cannot configure the sparse learner.

The curve fitter consumes deliberate pointer strokes. It uses chord-length parameterization, least-squares cubic control placement, a measured maximum-error split, and recursive fitting. It does not turn raster skeleton pixels into interpolated cubics.

Reference pattern:

<https://github.com/odiak/fit-curve>

## Evidence

- `evidence/wonder-sparse/shovel-three-scale.svg` shows both unaccepted views at three scales.
- `evidence/wonder-sparse/shovel-ablation.svg` removes every candidate stroke independently.
- `evidence/wonder-sparse/visual-gate.json` states the exact missing visual verdict.
- `evidence/wonder-v2/REJECTION.json` prevents the superseded gates from being presented as green.

Static tests verify the 20-stroke ceiling, deterministic fitting and replay, source exclusion, hidden-reference review rule, ablation coverage, negative-space integrity, and raster-free SVG. Those are guardrails, not proof that the shovel is good.

## Repository map

```text
src/sparse-line-study.mjs                 engine-agnostic sparse-study kernel
wonder/                                   mobile tracing and ablation adapter
training/wonder-sparse-v1/                modern shovel study and provenance
evidence/wonder-sparse/                    review SVGs and explicit visual gate
tools/render_sparse_shovel.mjs            deterministic evidence renderer
training/wonder-v2/                        rejected historical corpus
```

The original SVG box, Rosetta research, and rejected portrait remain in the repository as independent surfaces and archaeology.

## Rights

No open-source license is granted to project-authored material at this time. The uploaded source image is not committed. Third-party research links retain their original ownership and licenses.
