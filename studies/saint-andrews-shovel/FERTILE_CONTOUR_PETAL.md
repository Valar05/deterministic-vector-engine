# Fertile Contour-Petal Sculpture v1

This branch intentionally preserves the current contoured 3D shovel runtime as a distinct art style, including the properties that make it physically wrong for a real shovel.

## Why preserve it

The current runtime turns accepted vector faces into sliced, articulated contour petals. When rotated, the blade, socket, shaft and handle read as layered technical sculpture rather than ordinary solid props. The failure is visually coherent enough to be useful.

## Known failure modes that define the fork

- Interaction is render-limited rather than input-limited, especially on the blade.
- The blade is not a physically correct forged shovel section.
- The shaft/socket/handle are generated from simplified cross-section fields rather than true object-specific solids.
- Curved strips can separate visually under rotation, creating petal/skeletal reads.
- The style is useful for paper sculpture, exploded technical illustration, abstract vector anatomy, and stylized animation.

## Performance diagnosis

The blade uses 42 strips on each side (84 visible candidates). Every pointer move can recompute orientation, per-strip transforms, normals, facing, brightness, depth sort, and DOM order. Each strip is a clipped reuse of nontrivial accepted SVG artwork, so the browser repeatedly composites a large amount of vector material. The lag is therefore mostly SVG paint/compositing cost, not missed pointer input.

## Physical-3D next step

Do not optimize this branch into the physical model. Preserve it. A physically convincing successor should use semantic solids/cross-sections per part and a much smaller render primitive count, while keeping the accepted assembled shovel immutable and retaining the touch/control contract.
