# Belly of Defiance — transform acting corpus

Source: Drew's verbal reconstruction, 2026-09-08. This note records the animation logic as design evidence for the 2D-first Vector Noodle deformation system.

## Constraint

The authored sprite/image does not need frame-by-frame redraw to act. The primary animated state is limited to inexpensive transform/material parameters:

- position / translation
- pivot
- rotation
- independent X/Y scale
- skew / shear
- optionally a procedural mask/material parameter

Mesh deformation is a later escalation, not the starting point.

## Slime idle — phase-separated breathing

A static slime sprite appears alive by oscillating X and Y scale out of phase.

- X scale moves between authored `sx_min` and `sx_max` on sine time.
- Y scale moves between authored `sy_min` and `sy_max` on cosine time.
- The quarter-cycle phase difference creates a rolling volume illusion rather than uniform inflation/deflation.
- A tiny positional bob may be layered on top but is not required.

Canonical normalized drivers:

```text
ux = 0.5 + 0.5 * sin(omega * t + phase_x)
uy = 0.5 + 0.5 * cos(omega * t + phase_y)
scale_x = lerp(sx_min, sx_max, ux)
scale_y = lerp(sy_min, sy_max, uy)
```

This is the minimum-cost proof that life can emerge from transform phase, not extra geometry.

## Slime attack — affine force grammar

The attack is a timing sequence, not a new drawing:

1. **Anticipation** — skew/shear toward the recoil direction and squash backward.
2. **Load** — compress against the attack axis, storing visible tension.
3. **Launch** — stretch hard along the attack vector while releasing the skew.
4. **Impact** — compress on contact rather than stopping dead.
5. **Recovery** — overshoot, then damp back to the idle envelope.

Skew is functional: it makes direction and anticipation readable before translation begins. The sequence can remain entirely affine.

## Acid spit — static graphic, animated dissolve

The spit projectile/effect is one authored graphic with a strong handwritten graphic quality. It is not required to be a particle system.

- Keep the source graphic static.
- Drive a deterministic dissolve/reveal through an animation parameter.
- Implement with a threshold mask, clip, alpha field, seeded noise, or equivalent lightweight material/filter operation.
- The dissolve changes visibility over time while preserving the authored shape language.

This demonstrates a second kind of cheap complexity: **material time** instead of geometry time.

## Generalized doctrine

These three animations define a reusable 2D acting ladder:

1. **Transform phase** — life from sine/cosine scale and position.
2. **Transform timing** — force from skew, squash, stretch, impact compression and settle.
3. **Material time** — complexity from a static graphic plus animated mask/dissolve.
4. **Sparse cage deformation** — only when local shape change cannot be expressed by affine acting.
5. **Sprite/attachment replacement** — when a genuinely different drawing is cheaper or clearer.
6. **Real 3D** — only when the shot still proves it necessary.

The system should prefer the lowest rung that produces the intended read.
