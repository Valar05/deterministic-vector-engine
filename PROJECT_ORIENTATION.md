# Deterministic Vector Engine

## Current owner

The active Wonder owner is the Empty Glass shovel studio under `/wonder/`.

Production path:

`modern local source → authored pointer stroke → deterministic cubic fit → sparse study → hidden-reference review → ablation → raster-free SVG`

The former Wonder v2 skeleton pipeline is rejected archaeology. Fleshpunk is not part of base learning.

## Public boundaries

- `fitStroke(points, tolerance)` fits deliberate strokes through a measured cubic error objective.
- `validateSparseStudy(study)` rejects non-modern sources, Fleshpunk identifiers, invalid roles, broken negative spaces, and more than 20 strokes.
- `renderSparseSvg(study, options)` is the replaceable SVG terminal adapter.
- `recordUserReview` refuses review while the reference is visible.
- Machine state is limited to `DENY` or `AWAITING_USER_PIXEL_VERDICT`.

The older box compiler remains independent and unchanged.

## Run and verify

```sh
npm run test:wonder:sparse
npm run wonder:sparse
sh tools/server_tmux.sh
curl -fsS http://127.0.0.1:8811/api/noodle/health | grep -F 'empty-glass-shovel-v1'
curl -fsS http://127.0.0.1:8811/api/wonder/status | grep -F 'MODERN_OBJECTS_ONLY'
```

Review URL:

<http://127.0.0.1:8811/wonder/>

## Interaction contract

- Touch, pen, or mouse draws without timing, angle, direction, or pressure requirements.
- Three explicit roles are available: silhouette, identity anchor, correction.
- Undo, redo, deletion, reference replacement, and autosave are immediate.
- Reference visibility is explicit and verdict buttons lock while it is shown.
- Ablation hides one stroke without altering the evidence graph.
- JSON and SVG exports contain no reference pixels.

## Evidence state

- Assembled starter: 16 candidate strokes.
- Exploded starter: 20 candidate strokes.
- Deterministic guardrails: implemented.
- Three-scale and destructive-ablation SVGs: generated.
- Artistic state: `AWAITING_USER_PIXEL_VERDICT`.

Only the user can promote the shovel pixels.
