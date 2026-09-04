# Format Capability Matrix

Status vocabulary: `ADOPT`, `OBSERVE`, `DEFER`, `REJECT`, `NEEDS_KERNEL_EXTENSION`.

| Capability | SVG/Inkscape | Spine JSON | Lottie/AE | Harmony | SWF | DVE destination |
|---|---|---|---|---|---|---|
| Cubic paths | ADOPT [S02] | path attachments only [S05] | ADOPT later [S10] | OBSERVE export [S13] | DEFER shape records [S15] | `geometry[].d` |
| Paint/stroke | ADOPT [S01] | tint/blend OBSERVE [S05] | DEFER [S10] | OBSERVE | DEFER color transforms | `geometry[].paint` |
| Nested transforms | ADOPT [S01] | ADOPT bone hierarchy [S05] | ADOPT later; strict scope order [S10,S11] | OBSERVE [S13] | DEFER placement matrices [S15] | `scene[].transform` |
| Symbols/instances | ADOPT SVG references | ADOPT attachments/skins [S05] | DEFER assets/precomps | OBSERVE drawing reuse | DEFER character IDs | scene references |
| Draw order | DOM order | ADOPT slots/timeline [S05] | ADOPT later [S10] | OBSERVE | ADOPT conceptually | `drawOrder` tracks |
| Keyframes | declarative subset only | ADOPT [S05] | ADOPT later [S08,S09] | OBSERVE [S13] | DEFER frame tags | `timeline` |
| Cubic easing | path structure only | ADOPT four-value curves [S05] | ADOPT later [S08] | OBSERVE | OBSERVE | `cubic-bezier` |
| Bone rig | none | ADOPT [S05] | parenting only | OBSERVE [S14] | display-list hierarchy only | `rig.bones` |
| IK/path constraints | none | NEEDS_KERNEL_EXTENSION [S05] | REJECT expressions | OBSERVE | none | ordered constraints |
| Weighted deformation | path control points | NEEDS_KERNEL_EXTENSION [S05] | animated shape paths | OBSERVE [S14] | morph pairs | `deform` |
| Events | DOM events | ADOPT timeline events [S05] | markers later | timing columns OBSERVE | frame/script tags separated | `events` |
| Executable code | script exists | none in data | expressions excluded | scripts excluded | ActionScript present | REJECT |

## Extraction order

1. Normalize a strict plain-SVG subset into cubic paths and affine scene nodes.
2. Bind SVG nodes to Spine-style bones and slots without textures.
3. Implement hold, linear, and cubic-Bezier keyed transforms.
4. Add deterministic draw-order and event tracks.
5. Gate IK, path constraints, and weighted deformation behind independent kernel extensions.
6. Research Lottie, Harmony, and SWF adapters only after the first slice has conformance fixtures.
