# Conformance Fixture Plan

## Gate 0 — evidence atlas

Every retained capability has visible inline-SVG pixels, source IDs, and a verdict. Missing citations or link-only content copied into the repo fails the gate.

## Gate 1 — SVG geometry

Fixtures: line/cubic/closed compound paths; nested affine transforms; fill/stroke; clip; symbol reuse; negative scale; `y-down` and `y-up` inputs.

Acceptance: normalized geometry renders equivalently, while malformed path data, external references, scripts, and unknown namespaces fail explicitly. A plain-SVG input is the positive case; the same input with its transform removed is the visual ablation.

## Gate 2 — Spine-style hierarchy over SVG

Fixtures: two-bone mechanical arm, two slots, two SVG attachments, parent rotation, negative scale, and deterministic draw order.

Acceptance: changing the child bone affects only its descendant; ablating the parent edge changes the hand position for the expected causal reason. Missing parents, cycles, duplicate IDs, and dangling attachments reject.

## Gate 3 — timeline

Fixtures: hold, linear, cubic-Bezier rotation; simultaneous translation and opacity; keyed draw order; named event.

Acceptance: exact values at start, key times, midpoints, and end; ordinary frame-step variation converges on the same sampled state. Ablating the curve changes midpoint motion but not endpoints.

## Gate 4 — deformation extensions

Fixtures: one path control point with one bone; normalized two-bone weights; zero weight; malformed total weight; enabled/ablated comparison.

Acceptance: only commissioned control points move, weights normalize deterministically, and disabling deformation restores the undeformed SVG. Until this passes, emit `NEEDS_KERNEL_EXTENSION`.

## Gate 5 — adapter membranes

Each future Lottie, Harmony, or SWF adapter must provide: source version, whitelist, malformed negative cases, unsupported-feature receipts, same-input package hash, and an accepted browser pixel comparison. No sibling adapter's evidence covers another.
