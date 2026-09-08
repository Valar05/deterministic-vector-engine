# Cognitive-match vector study

Purpose: reproduce an accepted raster visual oracle as a deterministic, raster-free SVG/HTML artifact whose stopping condition is human cognitive match.

1. Freeze the accepted oracle and immutable object silhouette/ontology.
2. Work whole-object first. No decomposition, touch engine, animation, or interaction until the visual parent is accepted.
3. Build from paths, gradients, filters, masks/clips, and deterministic seeded procedural texture. Never embed or trace a raster at runtime.
4. Line jurisdiction is hierarchical: silhouette > overlap/manufacture > material seam > selected wear. Uniform outlining is a failure.
5. Maintain material truth separately from line truth. Wood, steel, paint, grime, dents, abrasion, and reflections must behave as surfaces, not costumes.
6. Every procedural source has an explicit seed. Same source must build byte-identically.
7. Regnet records every visible wound. Fix the cause at the owning layer; do not paint over symptoms.
8. Saint Andrew forbids stopping at machine green. Hashes prove identity only. Drew's visual verdict is the acceptance surface.
9. Commit source SVG, builder, manifest, tests, and wound ledger to the Vector Noodle repository on every material iteration before delivery.
10. After acceptance, preserve the accepted whole-object visual as immutable parent while adding interaction around it.

## 2D-first deformation authority

11. Physical 3D is paused until a commissioned shot proves it is necessary. Do not escalate to volumetric geometry merely because the runtime can.
12. The default post-acceptance primitive is a flat vector plane, optionally positioned as a simple 3D quad. The source remains 2D art.
13. Before mesh deformation, exhaust **affine acting**: position, pivot, rotation, independent X/Y scale, skew/shear, and attachment replacement. The drawing remains unchanged while transforms perform the acting.
14. Each part may own a deformation cage only when affine acting cannot express the required local change. Begin with the four bounding-box corners. Add a sparse 3x3 lattice only when a named local deformation requires it.
15. Deformation vocabulary includes squash, stretch, skew, shear, taper, perspective lean, asymmetric recoil, anticipation compression, impact bulge, directional smear, and settle wobble.
16. Render nonlinear-looking deformation through a small fixed piecewise-affine mesh: clipped reusable source-art triangles plus affine transforms. Do not regenerate accepted path data every frame.
17. Keep vertices scarce and semantic. Add a vertex only to control a specific local deformation. Dense meshes are a performance failure unless a visible result earns them.
18. Faux depth may use linked flat planes: accepted face, distorted multiply shadow, masked highlight, sparse rim/edge treatment. Synthetic Z may drive shadow offset/scale, ordering and perspective cheats without constructing a volume.
19. A duplicated distorted mesh is a valid fake-shadow mechanism. Shadow deformation should reinforce motion and depth cues, not require physical lights.
20. Preserve all established interaction semantics: Assemble, Reference layout, Reset part, part selection, Move, Rotate, Scale, Light, direct pull threshold, no-scroll phone fit, haptics, keyboard fallback. Add Deform; do not pay for it by removing previous controls.
21. Touch stays first class. Cage control handles use generous hit areas; the visual control point may be small while its touch target remains large.
22. Animation hot path may update affine transforms, cage coordinates, a few affine matrices, and a few material/shadow parameters. It may not clone nodes, rebuild topology, regenerate source paths, or run heavy filters per triangle.
23. Sprite/attachment replacement, affine acting, sparse mesh deformation, masks, and flat-plane shadow tricks must all be exhausted before real volume is reconsidered.

## Belly of Defiance transform-animation language

24. **Idle = phase-separated affine breathing.** The sprite artwork stays static. Let X scale oscillate between authored minimum and maximum on a sine phase, while Y scale oscillates between its authored minimum and maximum on a cosine phase. The quarter-cycle phase offset prevents mechanical uniform pulsing and creates a continuous organic volume illusion with only scale transforms. A canonical normalized driver is `u = 0.5 + 0.5*sin(omega*t)` for X and `v = 0.5 + 0.5*cos(omega*t)` for Y, then lerp each through its own min/max range. Position may carry a much smaller secondary bob if required.
25. **Attack = skewed anticipation -> compressed recoil -> directional stretch -> impact compression -> settle.** Use skew/shear as part of anticipation, not decoration. Squash the body backward against the attack direction, then stretch aggressively along the attack vector. At contact, compress rather than merely stopping. Recover through a brief overshoot and damped settle. This sequence is allowed to be entirely affine: no mesh, no frame-by-frame redraw, no particles.
26. **Acid spit = one authored graphic plus procedural animated disappearance.** The projectile/spit may be a beautiful handwritten/static graphic. Do not require a particle effect. Animate a deterministic dissolve/reveal mask, threshold, clip, or shader-like alpha field over the single authored image. The animation controls the dissolve progression; the source graphic remains intact. Procedural breakup is a visual effect on one sprite, not a cloud of simulated particles.
27. These three patterns form a reusable **transform acting corpus**: idle demonstrates continuous life from phase-offset scale; attack demonstrates force and intent from skew + squash/stretch timing; spit demonstrates temporal complexity from one static graphic plus a controlled material/mask effect.
28. Default escalation order for character or prop animation is now: **static accepted art -> affine acting -> procedural mask/material effect -> sparse cage deformation -> attachment/sprite replacement as needed -> real 3D only if still visibly necessary.**
29. If an animation can be made convincing with position/rotation/scale/skew alone, adding mesh vertices is a regression in simplicity unless the extra deformation produces a visible gain Drew can name.

## Preserved 3D research

30. Existing paper-doll and contour-volume branches remain fertile evidence, not active authority. Do not delete or rewrite them.
31. If real 3D is later justified, reuse the nearest proven mechanism and preserve the exact accepted face as an heirloom. No redraw is allowed merely to gain depth.

Pocket form: **ACCEPT FACE. FREEZE FACE. AFFINE FIRST. FEW VERTICES. DEFORM THE PLANE. FAKE THE DEPTH. EARN THE VOLUME.**
