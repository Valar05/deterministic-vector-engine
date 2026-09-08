# Phagocyte Turtle video read — 2026-09-08

Source: Drew-supplied screen recording `812980.mp4` (~27.55 s). Analysis intentionally used a small number of strategically sampled frames rather than exhaustive frame dumping.

## Verdict

The animation reads **better structurally than its age suggests, but less polished than memory**. It is absolutely usable design evidence. The important ideas survive the roughness.

## What the recording proves

### 1. Idle is transform acting

The slime reads alive without frame-by-frame redraw. Its apparent breathing comes from low-cost affine change: independent X/Y scale over time, with phase separation. Even at small amplitude, the silhouette never feels completely dead between actions.

This supports the existing rule: if position / rotation / independent scale / skew can sell the motion, do not add mesh vertices.

### 2. Acid spit is authored graphic + material time

The acid/spit effect reads as one coherent graphic event, not as a cloud of particles. In the sampled sequence, the green spit becomes clearly visible around the attack beat and disappears rapidly afterward. Its strength comes from the authored shape plus timed visibility/breakup, not from simulation complexity.

This is direct evidence for **material time**: one static authored effect + animated dissolve/reveal/threshold can deliver high graphic character cheaply.

### 3. Phagocyte Turtle mouth is discrete replacement animation

The mouth animation reads as a small set of strong frame/attachment states rather than a continuously deformed mouth. It is the least fluid component of the three, but still readable and acceptable in context.

This is useful because it establishes a separate rung in the ladder: when affine acting is insufficient and a genuinely different drawing is required, **attachment/frame replacement can be cheaper and clearer than mesh deformation**.

### 4. Shared melee clip is now design law

The slime melee attack is not demonstrated in this recording. Per Drew's explicit design statement, it uses the **same animation clip as the Phagocyte Turtle melee attack**.

Therefore animation clips are not owned by a species or sprite. A clip is reusable temporal behavior that can be bound to multiple actors.

## Shared animation clip model

A clip owns **time and channels**, not artwork.

Recommended canonical channels:

- translation / position
- pivot offset
- rotation
- independent scale X / Y
- skew / shear X / Y
- optional cage vertices
- optional attachment/frame index
- optional material parameters: dissolve, reveal, alpha threshold, highlight, shadow
- optional event markers: launch, contact, recover, emit

An actor binding supplies:

- target part / sprite / attachment
- local pivot / anchor
- facing direction
- amplitude multipliers
- timing multiplier if explicitly allowed
- optional channel remaps

The same melee clip may therefore drive a slime and a Phagocyte Turtle while each keeps its own art, pivot, size and local proportions.

## Design consequences

1. **Clip != actor.** Animation is reusable temporal grammar.
2. **Artwork != motion.** Static art can receive shared affine/material clips.
3. **Attachment replacement is first-class.** Use it when the drawing truly needs a new pose.
4. **Shared clips reduce authoring cost and increase behavioral consistency.** A good anticipation/impact/recovery curve should be authored once and inherited.
5. **Per-actor override should be sparse.** Reuse the clip unless a visible difference earns a variant.

Pocket rule: **AUTHOR MOTION ONCE. BIND IT MANY TIMES. ART SUPPLIES IDENTITY; CLIPS SUPPLY BEHAVIOR.**
