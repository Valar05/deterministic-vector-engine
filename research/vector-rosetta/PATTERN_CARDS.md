# Reusable Pattern Cards

## 1. Rendered path over editor recipe

**Sources:** S02, S03, S04.

Use the visible standards-compliant SVG path as geometry truth. Preserve editor recipes as provenance, never as required runtime behavior.

## 2. Canonical cubic path topology

**Sources:** S02, S10, S11.

Normalize accepted shapes to explicit cubic segments. Morph only paths with compatible command/control-point topology; otherwise reject or pre-author correspondence.

## 3. Stateless data, mutable instance

**Sources:** S05, S06.

Keep sealed geometry/rig/timeline data immutable. Runtime pose, mixes, active skin, and current time live in a separate instance.

## 4. Bone → slot → SVG attachment

**Sources:** S05.

A bone owns transform inheritance; a slot owns attachment and draw order; an attachment references SVG geometry. This prevents hierarchy, rendering, and artwork identity from collapsing into one object.

## 5. Ordered constraint stack

**Sources:** S05, S14.

Evaluate constraints by explicit order after ordinary bone transforms. Each constraint type remains a separable kernel extension with its own enabled/ablated proof.

## 6. Two Bezier domains

**Sources:** S02, S05, S08.

Do not confuse a spatial cubic path with a temporal easing curve. They may share evaluation math but require different units, endpoints, and conformance fixtures.

## 7. Draw order is animation data

**Sources:** S05, S10, S15.

Layer order is not incidental array placement. Preserve setup order and allow explicit keyed changes without sorting by name or hierarchy.

## 8. Safe archaeology membrane

**Sources:** S13, S15, S16.

Legacy/proprietary inputs cross a tag whitelist. Geometry and timeline data may enter; scripts, bytecode, expressions, video, and undocumented effects cannot.
