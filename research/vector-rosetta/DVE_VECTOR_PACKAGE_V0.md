# DVE Vector Package v0

`dve-vector-package-v0` is an engine-neutral, deterministic package for SVG-native geometry and Spine-inspired 2D behavior. The JSON Schema is normative; this document explains intent.

## Invariants

- Input format/version, source IDs, rights verdict, and SHA-256 provenance are mandatory.
- Coordinates are normalized explicitly; no adapter may guess axis direction, origin, or scale.
- Geometry is stored as SVG-compatible path data with separate paint.
- Scene nodes use six-number 2D affine transforms and explicit integer draw order.
- Bone transforms are local to parents. Constraint evaluation order is explicit.
- Timeline keys use seconds and exactly one of `hold`, `linear`, or `cubic-bezier`.
- Cubic curves store four control values. Spatial path geometry and temporal easing remain separate domains.
- Events contain data only; expressions and executable callbacks are forbidden.
- Unknown source features are listed under `unsupported` with `OBSERVE`, `REJECT`, or `NEEDS_KERNEL_EXTENSION`. Silent fallback is invalid.

## SVG + Spine binding

A slot names a scene attachment; the attachment references one or more SVG paths. The slot belongs to one bone and participates in deterministic draw order. This preserves SVG as the rendered surface while borrowing Spine's mature hierarchy and timeline vocabulary [S05].

Weighted deformation is defined against path control points rather than raster texture vertices. It is schema-visible now but remains `NEEDS_KERNEL_EXTENSION` until a dedicated visual ablation proves the path changes for the declared weights.

## Compatibility boundary

This package is not Spine JSON, Lottie JSON, Harmony XML, or SWF. Adapters translate supported semantics into the package and must emit explicit unsupported records for everything else.
