# Universal Vector Rosetta Stone

## Decision

The first parser slice is **plain SVG geometry plus Spine JSON behavior**. SVG remains the pixel contract; Spine is studied as the mature 2D/2.5D hierarchy, constraint, deformation, draw-order, and timeline precedent. No 3D runtime is introduced.

AI is permitted only for research classification. Production adapters, package emission, validation, and playback must be deterministic code.

## Treasure pile

| Ecosystem | Defensible intake | Useful treasure | Explicit exclusion | Verdict |
|---|---|---|---|---|
| SVG / Inkscape | Plain rendered SVG | paths, paint, transforms, clips, symbols, nested coordinates | editor-only metadata as runtime truth | ADOPT |
| Spine | documented JSON export | bones, slots, skins, ordered constraints, weighted deform, curves, events, draw order | copied runtime code or opaque project files | ADOPT_WITH_LICENSE_GATE |
| After Effects | Lottie / Bodymovin JSON | temporal and spatial curves, shape-layer transform scopes | direct `.aep` parsing and arbitrary expressions | DEFER |
| Toon Boom Harmony | Raw Game Data XML / SDK exports | deformation hierarchy, bones, timing columns | opaque scenes and raster bake presented as vector | OBSERVE |
| Flash / SWF | published SWF 19 tag format | symbols, placement, matrices, morph shapes, frame state | ActionScript, embedded video, unbounded execution | DEFER_ARCHAEOLOGY |

## Source anchors

- SVG geometry and morph compatibility: [S01](https://www.w3.org/TR/SVG2/), [S02](https://www.w3.org/TR/SVG2/paths.html).
- Inkscape rendered-path and editor-metadata boundary: [S03](https://inkscape.org/en/develop/about-svg/), [S04](https://wiki.inkscape.org/wiki/LivePathEffects).
- Spine data, runtime separation, and license gate: [S05](https://us.esotericsoftware.com/spine-json-format), [S06](https://us.esotericsoftware.com/spine-runtime-architecture), [S07](https://en.esotericsoftware.com/spine-runtimes-license).
- AE/Lottie export and rendering semantics: [S08](https://helpx.adobe.com/after-effects/desktop/animate-in-after-effects/animation-keyframes/keyframe-interpolation.html), [S09](https://lottiefiles.github.io/lottie-spec/), [S10](https://lottiefiles.github.io/lottie-spec/specs/shapes/), [S11](https://lottiefiles.github.io/lottie-docs/rendering/), [S12](https://github.com/airbnb/lottie/blob/master/after-effects.md).
- Harmony export and deformation boundary: [S13](https://docs.toonboom.com/help/harmony-24/installation/gaming/about-gaming-book.html), [S14](https://docs.toonboom.com/help/harmony-25/premium/getting-started/deformation.html).
- SWF archaeology and preservation context: [S15](https://open-flash.github.io/mirrors/swf-spec-19.pdf), [S16](https://www.loc.gov/preservation/digital/formats/fdd/fdd000629.shtml).

## Artifact map

- `SOURCE_MANIFEST.jsonl`: link-only evidence and rights records.
- `FORMAT_CAPABILITY_MATRIX.md`: semantic comparison and implementation order.
- `DVE_VECTOR_PACKAGE_V0.md` plus JSON Schema: canonical interchange contract.
- `PATTERN_CARDS.md`: reusable abstractions without copied implementations.
- `RESEARCH_VERDICTS.md`: ADOPT, OBSERVE, REJECT, and NEEDS_KERNEL_EXTENSION decisions.
- `CONFORMANCE_FIXTURE_PLAN.md`: future parser and playback falsifiers.
- `visual-atlas/`: inline-SVG pixels for each retained research gate.

The existing cube runtime is quarantined by hash and is not modified by this campaign.
