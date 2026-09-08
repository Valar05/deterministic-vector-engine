# 2D-first animation doctrine

## Goal

Make 2D so expressive, cheap, and touch-friendly that real volumetric 3D becomes an earned exception rather than a default ambition.

## Primitive

Each authored part is a flat vector/sprite plane. It may have a pivot, affine transform, optional sparse deformation cage, optional linked shadow/highlight planes, and optional procedural mask/material parameters.

The art itself is not redrawn during animation.

## Escalation ladder

1. **Affine acting** — translation, rotation, independent X/Y scale, skew/shear, pivot changes.
2. **Material time** — dissolve, reveal, threshold, clip, highlight, shadow, palette/value changes driven by animation.
3. **Sparse cage deformation** — four-corner cage first; 3x3 only when a named local deformation cannot be achieved affinely.
4. **Attachment/sprite replacement** — swap to a genuinely different drawing when that is cheaper and clearer than deforming the current one.
5. **Real 3D** — only after the previous four fail a visible commissioned requirement.

## Belly of Defiance proofs

- Idle: sine-driven X scale and cosine-driven Y scale create continuous organic breathing from a static sprite.
- Attack: skewed anticipation, backward squash, directional stretch, impact compression, overshoot and settle communicate force without a new drawing.
- Acid spit: a single authored handwritten projectile plus an animated procedural dissolve creates complex motion/effect language without particles.

## Performance law

The hot path should update numbers, not topology. Per frame, prefer a handful of transform matrices and mask parameters. Avoid path regeneration, DOM cloning, topology rebuilds, dense meshes, and heavy filters per triangle.

## Design test

For every requested effect ask, in order:

- Can affine transforms sell it?
- Can a material/mask parameter sell the rest?
- Is a four-corner cage enough?
- Would one replacement attachment be simpler?
- Only then: does the shot truly require volumetric 3D?

Pocket rule: **AFFINE ACTING BEFORE MESH ACTING. MATERIAL TIME BEFORE GEOMETRY TIME.**
