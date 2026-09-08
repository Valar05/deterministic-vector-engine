# Experiment — Flat-Plane Paper Doll v1

Branch: `fertile/flat-plane-paper-doll-v1`
Base: `fertile/spine-paper-doll-v1`
Status: **REFERENCE RECORDED / KEY CONTACT SHEET BUILT / ART BLOCKED ON DREW KEY VERDICT**

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

The user reference recording now exists.

The first proof remains intentionally tiny:

- first-person camera reference supplied by the user;
- subject: user's hand only;
- action: dramatic thumbs-up;
- rendered output later: hand only, transparent / no background;
- no ImageGen;
- use recovered Vector Noodle / paper-doll art language;
- use the recording for motion/timing/pose evidence;
- prove the action first with flat planes and cheap transforms;
- add per-vertex deformation only where it purchases a stronger read.

### Gate 0 — photographic keys before art

Before one new hand image is authored, the selected photographs must already read as an intentional animation.

Current private-delivery key sheet contains nine keys and **no in-betweens**:

```text
K0 REST
K1 FORM
K2 THUMB LOCK
K3 PRESENT
K4 THRUST / HOLD
K5 RECOIL
K6 SETTLE
K7 RELEASE
K8 CLEAR
```

The source is ~30 fps and the exact selected-key timestamps define the first playback opinion. Each selected photograph is step-held until the next selected key. Street Fighter II / Pose Lab provides encoding and readability precedent; it does **not** overwrite these observed selected-key intervals.

Durable key/timing truth:

- `studies/fpv-thumbs-up-001/README.md`
- `studies/fpv-thumbs-up-001/keys.json`

Animation reference atlas:

- `research/ANIMATION_ENCODING_REFERENCE.md`

ASCII sibling bridge:

- `research/ASCII_KINESIS_KINSHIP.md`

The personal photographic/video media are not committed to this public repository without explicit permission. Their hashes and selected frame addresses are recorded so the private evidence can still be verified.

### Gate 1 — art contact sheet

Only after Drew accepts Gate 0 do we author a flat-plane **key contact sheet**, still with no rescue in-betweens.

Each art key must preserve:

- key identity;
- source address;
- selected-key timing;
- silhouette/read;
- first-person depth relation;
- hand-only scope.

A bad art key is corrected from the native source photograph, never from a failed generated derivative.

### Gate 2 — playback

Only after the art keys read as a sequence may a runtime connect them.

Connector policy may later choose:

- pure step holds;
- transform interpolation;
- explicit hard cuts;
- attachment swaps;
- per-vertex deformation curves;
- other authored connectors.

Connectors may not invent a pose required to make the key sequence understandable.

## Kinship without containment

The flat-plane branch is intentionally kith and kin with Pose Lab and ASCII Kinesis:

- source identity;
- key identity;
- exact source frame/time;
- phase/causal read labels;
- timing provenance;
- authored/generated distinction;
- contact/recoil/recovery semantics when useful;
- immutable evidence before appearance;
- human visual gate after machine validation.

It does not vendor Pose Lab, UAPL/UAT, Motion Dungeon, or ASCII Kinesis. Translation happens at boundaries.

## What this branch must prove

1. A body-part performance can read clearly with one-sided flat planes.
2. The same planes can rotate freely in 3D without becoming volumetric geometry.
3. Position/rotation/scale alone can carry meaningful acting.
4. Per-vertex deformation can add apparent depth and organic motion without changing the core representation.
5. Visual attachments can be replaced at runtime without rewriting motion semantics.
6. The recorded first-person hand motion can be reconstructed as an authored, deterministic performance.
7. The photographic key sequence can define timing without invented in-betweens.
8. The workflow can share animation semantics with ASCII Kinesis and Pose Lab without containing either system.

## Evidence boundary

Machine-valid geometry is not artistic acceptance. The first hand specimen remains red until the user sees and accepts the relevant visual gate.
