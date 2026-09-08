# Sherman canary — simple-shape 3D composition

## Thesis

Real 3D is allowed when the object can be composed from a small vocabulary of cheap primitives. Complexity belongs in **composition, proportion, hierarchy, surface language, and responsive transforms**, not in sculpted mesh density.

The Sherman tank is the canary because it is visually recognizable, mechanically legible, compositionally dense, and hostile to vague geometry. If a primitive-first system can make a Sherman read correctly and remain responsive, the architecture is credible.

## Representation law

**Vector is not the final form. Vector is one authoring and intermediate representation.**

The runtime representation is whatever preserves the intended visual/behavioral read at the lowest practical cost on weak hardware. The compiler may choose or bake to:

- SVG/vector paths
- affine quads or sparse deformable planes
- primitive instances
- tiny indexed triangle meshes
- sprite or texture atlases
- cached/baked raster layers
- signed-distance or mask fields
- precomputed gradients/material lookup data
- hybrid combinations of the above

No representation receives ideological priority. The target is not “pure vector”; the target is **maximum visual leverage per unit of runtime cost**.

The performance canary is an intentionally hostile target: the result should remain usable on a roughly 25-year-old, opinionated potato-class machine. Modern hardware may increase headroom but may not justify wasteful architecture.

## Primitive vocabulary

Begin with a deliberately tiny set:

- box / beveled box
- wedge / trapezoidal prism
- cylinder / capped tube
- disc
- plane / quad
- simple track loop or segmented belt

A new primitive is admitted only when an existing combination cannot produce the required read without disproportionate complexity.

## Sherman decomposition hypothesis

A Sherman should be expressible approximately as:

- lower hull: one beveled box + front/rear wedges
- upper hull: one tapered box/wedge assembly
- turret: low-sided cylinder or faceted rounded primitive + mantlet block
- gun: capped tube/cylinder
- tracks: repeated low-cost segments or one baked/deformed strip per side
- road wheels: repeated discs/cylinders
- hatches, lights, stowage, seams: mostly planes/quads/decals/attachments, not topology

Recognition must come primarily from silhouette, proportion, overlap, negative space, and part hierarchy.

## Visual density without geometric density

Surface richness should come from cheap channels before more mesh:

- line hierarchy
- gradients and value fields
- decals / attachments
- masks and wear maps
- baked shadows and highlights
- sparse deformation
- shared animation clips
- controlled sprite replacement
- material-time effects

Geometry answers **where surfaces exist**. Surface language answers **what they feel like**.

## Responsiveness law

The hot path should update transforms and compact material parameters, not rebuild topology. Repeated parts should instance shared data. Expensive source artwork should be compiled or baked once and reused.

The Sherman fails the canary if it is visually convincing but requires a modern GPU to remain manipulable.

## Success criteria

The canary passes only if all are true:

1. Sherman identity is obvious from multiple useful views.
2. Major mechanical relationships remain legible.
3. The primitive count stays intentionally small and explainable.
4. Surface treatment carries more detail than geometry does.
5. Interaction and animation remain responsive under weak-hardware assumptions.
6. The compiled runtime representation is allowed to differ radically from the authoring representation.
7. Adding a primitive, vertex, draw call, texture, or filter requires a visible gain.

Pocket rule: **SIMPLE FORMS. DENSE COMPOSITION. COMPILE FOR THE POTATO.**
