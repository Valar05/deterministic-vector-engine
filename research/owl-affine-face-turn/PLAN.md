# Owl affine face-turn research plan

## Commission boundary

Bounded research only. No finished character commission, no volumetric 3D, no dense mesh, no polish spiral.

Canonical specimen: **owl**.

Direction: **draw the rest of the fucking owl**. Start with the embarrassingly simple version and add only the mechanism that the next visible failure earns.

## Research question

How far can a flat vector owl head fake a convincing front-to-profile turn using:

1. affine feature migration,
2. sparse vector deformation,
3. occlusion / layer-order changes,
4. selective attachment replacement,

before topology truly forces a different representation?

## Why an owl

The owl makes errors obvious with almost no art:

- nearly circular head / facial disc,
- two huge symmetric eyes,
- central beak,
- bilateral facial structure,
- strong profile transition where one eye compresses and the beak crosses the silhouette.

That makes it a mechanism test, not a style test.

## Turn parameter

Use one normalized shared clip parameter:

- `turn = 0` front,
- `turn = +/-0.5` strong three-quarter,
- `turn = +/-1` profile target.

Mirror the solved side unless a later asymmetric character requires otherwise.

## Mechanism ladder

Always use the cheapest rung that produces the intended read.

### 1. Affine migration first

Animate only:

- feature position,
- pivot,
- rotation,
- independent X/Y scale,
- skew/shear.

Apply to eyes, facial discs, beak, brows/tufts, ears, and optional head ellipse compression.

### 2. Occlusion and ordering

Allow turn-driven visibility and layer-order events:

- near eye / far eye,
- beak crossing silhouette,
- far-side feature suppression,
- ear/tuft ordering.

### 3. Sparse vector noodling

Only when affine motion visibly fails:

- deform eye-ring contours,
- facial disc contours,
- beak contour,
- cheek/head silhouette.

Use four-corner or tiny local cages. No dense mesh.

### 4. Attachment replacement

Only when drawing identity/topology genuinely changes:

- front beak -> profile beak,
- full far eye -> sliver/profile eye,
- silhouette-crossing ear/tuft variants.

Replacement is an event inside the shared clip, not a separate bespoke animation.

### 5. Stop before real 3D

This study does not earn volumetric 3D. Planes/quads/primitives remain sufficient unless a later commissioned shot proves otherwise.

## Prototype stages

### Stage A — two circles and a triangle

Head circle, two eye circles, triangular beak.

Test only affine migration from front to three-quarter.

Success: turn direction reads before any vector morphing.

### Stage B — continuous three-quarter

Add only:

- far-eye compression,
- near-eye migration,
- beak offset/skew,
- facial-disc asymmetry,
- minimal head compression if required.

Success: continuous scrub `0 -> 0.6` has no dead mechanical zone.

### Stage C — find the topology boundary

Push `0.6 -> 1.0` and record the first exact failures:

- when far eye must become a sliver/disappear,
- when beak silhouette must change,
- when facial-disc contour must change,
- when layer order must flip.

Do not automatically add complexity; name the failure and the cheapest rung that fixes it.

### Stage D — minimal replacement events

Introduce only the substitutions that Stage C proves necessary.

Success: replacement thresholds do not create visible pops during scrub.

### Stage E — shared `FACE_TURN` clip

The real deliverable is a reusable clip contract with:

- normalized `turn`,
- per-feature anchor trajectories,
- X/Y scale curves,
- skew/shear curves,
- optional sparse deformation channels,
- visibility curves,
- layer-order events,
- attachment-replacement thresholds,
- optional silhouette deformation.

Character art binds to the clip; the clip owns behavior.

## Research verdict format

At the end, report only:

- which mechanisms were actually necessary,
- where affine acting stopped being sufficient,
- where sparse vector deformation paid for itself,
- where replacement beat deformation,
- whether any requirement still justifies real 3D.

Pocket law: **DRAW TWO CIRCLES. ADD A TRIANGLE. TURN IT. ONLY THEN DRAW THE REST OF THE FUCKING OWL.**
