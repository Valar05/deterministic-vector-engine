# Experiment — Flat-Plane Paper Doll v1

Branch: `fertile/flat-plane-paper-doll-v1`
Base: `fertile/spine-paper-doll-v1`
Status: BRANCH CREATED / MOTION SPECIMEN PENDING USER RECORDING

## Intent

Recover the existing Vector Noodle / paper-doll lineage and remove unnecessary geometric depth.

The experiment treats every visible body part as a **completely flat, one-sided plane**. The system may imply volume, but it does not require a volumetric model.

## Plane contract

Each part owns:

- one flat one-sided render plane;
- a local pivot / parent relationship;
- 3D translation;
- 3D rotation;
- independent scale;
- draw order / visibility;
- runtime-replaceable visual content.

A plane may face or rotate through 3D space even though its geometry remains flat.

## Runtime skin replacement

The motion/rig contract must not depend on one art provider. A plane may be replaced at runtime by compatible art, including:

- ordinary sprite/image content;
- Spriter-style parts;
- Spine-style slot/attachment content;
- later compatible vector or raster providers.

Adapters may translate provider-specific attachment data into the flat-plane contract. Provider runtimes are not mandatory dependencies of the core.

## Deformation contract

A plane may optionally expose a lightweight mesh. The mesh exists to deform the plane, not to create mandatory physical depth.

Allowed expressive operations include:

- skew;
- squash/stretch;
- independent per-vertex displacement;
- arbitrary bounded vertex perturbation;
- curvature / bowing;
- perspective-like deformation that makes a flat part appear volumetric.

Every vertex may move independently when the authored motion requires it.

## Cheap transform layer

Before inventing a more elaborate deformation system, preserve the cheapest expressive vocabulary:

`position + rotation + scale`

This is deliberately inherited from the project's earlier *Belly of Defiance* lineage. The recovered repository contains Sprite2D animation tracks for position, rotation, and scale across character/enemy scenes, plus direct code that changes sprite scale and global position. The precedent is important because visible acting can come from simple transforms before mesh sophistication is justified.

Mesh deformation layers **on top of** these transforms; it does not replace them.

## First proof specimen

Do not author the hand motion before the user's reference recording exists.

The first proof is intentionally tiny:

- first-person camera reference supplied by the user;
- subject: user's hand only;
- action: likely a dramatic thumbs-up;
- rendered output: hand only, transparent / no background;
- no ImageGen;
- use recovered Vector Noodle / paper-doll art language;
- use the recording for motion/timing/pose evidence;
- prove the action first with flat planes and cheap transforms;
- add per-vertex deformation only where it purchases a stronger read.

## What this branch must prove

1. A body-part performance can read clearly with one-sided flat planes.
2. The same planes can rotate freely in 3D without becoming volumetric geometry.
3. Position/rotation/scale alone can carry meaningful acting.
4. Per-vertex deformation can add apparent depth and organic motion without changing the core representation.
5. Visual attachments can be replaced at runtime without rewriting motion semantics.
6. The recorded first-person hand motion can be reconstructed as an authored, deterministic performance.

## Evidence boundary

Machine-valid geometry is not artistic acceptance. The first hand specimen remains red until the user sees and accepts the actual rendered motion.
