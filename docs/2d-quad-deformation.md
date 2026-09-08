# 2D-first quad deformation lane

Status: active research branch. Physical 3D is explicitly paused.

## Mission

Make 2D deformation absurdly capable before deciding whether real volumetric 3D is necessary.

The render primitive is a flat plane that may live as a 3D quad, but the authored object remains 2D vector art. Depth is implied through deformation, layering, shadow, shading and controlled perspective cheats rather than a dense solid mesh.

## Authority and invariants

- Accepted visual art remains immutable.
- No redraw is permitted to gain deformation capability.
- Existing part identity and interaction semantics survive: Assemble, Reference layout, Reset part, part selection, Move, Rotate, Scale, Light, direct pull, no-scroll phone fit, touch-first interaction and keyboard fallback.
- Real 3D contour/extrusion branches remain preserved but are not the active architecture.

## Core representation

Each part owns:

- an accepted source-art group;
- a source-space bounding box;
- a deformation cage;
- a global 2D transform;
- optional shadow/highlight companion planes.

Start cage: four corners of the bounding box.

Upgrade cage: 3x3 lattice with 9 control vertices when local bulge, recoil, bend or anticipation needs more than a projective quad.

The cage is animation data. Source art is not rewritten.

## Rendering strategy

Use piecewise-affine vector reuse, not per-frame path regeneration.

For the four-corner cage:

1. Split the source rectangle into 2-4 triangles.
2. Store the accepted part artwork once under a reusable SVG definition.
3. For each triangle, render a clipped `<use>` of the same source art.
4. Compute one affine transform per triangle from source triangle to deformed triangle.
5. Move cage vertices; update only those transforms and touch handles.

For a 3x3 cage, use a small fixed triangulation. Keep vertex count deliberately low.

This follows the same performance law as Spine meshes: deformation power comes from strategically placed vertices, not density.

## Deformation vocabulary

Global transforms:

- translate
- in-plane rotate
- uniform scale

Cage deformations:

- squash
- stretch
- skew / shear
- taper
- perspective lean
- corner pull
- asymmetric recoil
- anticipation compression
- impact bulge
- directional smear
- settle wobble

Derived presets should be parameterized, not baked into art.

## Faux-depth stack

A single part may use several cheap flat planes:

1. **Face plane** — exact accepted art through the deformation cage.
2. **Shadow plane** — same deformed mesh, black/multiply, offset/sheared/scaled independently.
3. **Highlight plane** — optional masked gradient or screen/additive layer.
4. **Rim/edge plane** — optional sparse line treatment for overlap or turning form.

These layers may respond to a synthetic depth scalar without constructing a volume.

A synthetic Z value may control shadow offset, shadow scale, blur/opacity, highlight direction, overlap ordering and perspective squash. It is animation state, not volumetric geometry.

## Touch contract

- 44px-equivalent minimum targets.
- In Deform mode, cage handles are intentionally much larger than their visual dots.
- Tap selects only.
- Drag assembled part past threshold frees only that part.
- Move manipulates the whole plane.
- Rotate manipulates the whole plane in 2D.
- Scale manipulates the whole plane.
- Deform exposes cage vertices.
- Light remains non-destructive.
- Reset part restores both global transform and cage.
- Assemble restores exact accepted whole-object presentation.

## Performance budget

Hot path may update:

- cage vertex coordinates;
- 2-8 affine SVG matrices per selected part;
- a few shadow/highlight parameters.

Hot path may not:

- clone DOM nodes;
- regenerate accepted paths;
- run heavy SVG filters per triangle;
- depth-sort dozens of strips;
- rebuild mesh topology.

Geometry topology is setup-time. Animation is matrix and parameter updates.

## Spine-derived rules

- Begin with very few vertices.
- Add vertices only where a specific deformation needs local control.
- Edge placement is semantic: it determines where deformation propagates.
- Prefer bone/cage driven deformation over dense keyed vertex noise.
- A duplicate/distorted mesh can act as a fake shadow plane.

## Decision gate for real 3D

Do not resume volumetric 3D until this 2D/2.5D system fails an actual commissioned shot.

Real 3D is justified only by a requirement that cannot be met through:

- quad/cage deformation;
- sprite/attachment replacement;
- layered flat planes;
- synthetic depth ordering;
- deforming fake shadows;
- shader/filter/material language;
- 2D bones and weights.

Pocket law: **FLAT FIRST. FEW VERTICES. DEFORM THE PLANE. FAKE THE DEPTH. EARN THE VOLUME.**
