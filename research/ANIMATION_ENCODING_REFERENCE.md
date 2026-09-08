# Animation Encoding Reference — Pose Lab V1 + V2 + ASCII Kinesis + Flat-Plane Kinship

Status: ACTIVE REFERENCE FOR `fertile/flat-plane-paper-doll-v1`

Purpose: keep the project from repeatedly rediscovering good animation encoding, admiring it, then silently inventing a different timing system.

This is a **reference atlas**, not a new runtime and not a universal file format. Pose Lab V1, Pose Lab V2, ASCII Kinesis, UAPL/UAT, and the deterministic vector engine remain independent systems. The useful vocabulary is cross-indexed here so an experiment can reuse proven ideas without containing another project.

---

## Prime law

**POSE FIRST. TIMING SECOND. APPEARANCE THIRD. IN-BETWEENS LAST, IF THEY ARE NEEDED AT ALL.**

When the source is a recording, the source owns the observed motion evidence. Selected keys own the contact sheet. If selected source-key timestamps already define the experiment's cadence, do not replace them with a favorite SF2 timing recipe.

Street Fighter / Capcom timing is an extremely useful encoding precedent for:

- discrete read poses;
- uneven exposure;
- anticipation;
- snap / commitment;
- contact hold;
- recoil;
- recovery;
- silhouette readability;
- deliberate omission of low-value frames.

It is not an excuse to invent timing when source timing already exists.

---

# 1. Pose Lab V1 — SF2 reduction encoding

Primary repository: `Valar05/pose-lab`

Useful source family:

- `docs/SF2_ANIMATION_CRITIQUE_GUIDE.md`
- `tools/index_gravity_fist_jab.py`
- `tools/index_gravity_fist_attacks.py`
- `assets/pose_indexes/*_sf2_reduction.json`

Representative schema: `pose-lab-sf2-reduction-v1`.

## 1.1 What V1 encodes well

A reduced move records both **where a key came from** and **why it survived reduction**.

Representative top-level fields:

```text
schema
actorKey
clipName
goal
timingPolicy
combatWindowSeconds
combatWindowFrames60fps
discardedTailSeconds
spriteFrames[]
segments[]
attackName
sourceClipName
attackStyle
appealScoring
```

Representative per-key fields:

```text
tag
spriteFrame
sourceFrameIndex
sourceTime
description
attackStyle
reach
effectorHeight
effectorExtension
motionTotal
easingOptions[]
```

Representative segment fields:

```text
from
to
holdFrames
easingOptions[]
```

This is valuable because **key selection, source provenance, display index, and timing opinion are not collapsed into one number**.

## 1.2 V1 phase vocabulary

Common reduced roles include:

```text
start
anticipation
anticipationHold
lift
apex
apexHold
contact
recoil
settle
```

Not every move needs every label. A kick and a jab are allowed to have different phase topology.

## 1.3 V1 timing / interpolation vocabulary

Recovered easing and segment names include:

```text
hold
holdThenSnap
stepHold
snapLunge
easeInQuad
easeOutCubic
easeOutExpo
easeOutSine
ballisticRecoil
criticalDampReturn
dampedRecover
microOvershoot
springLow
```

These names are useful **animation-encoding references**, even when a later experiment chooses step-held photographs and no interpolation.

The important design lesson is that a transition is described by its dramatic/physical role, not merely by generic `linear` or `smooth`.

## 1.4 Representative V1 jab reduction

The recovered Jab reference records five surviving reads:

```text
start -> anticipation -> contact -> recoil -> settle
```

It explicitly says to preserve the source burst around the snap and hold contact before recovery. It records the source frame index and source time for every reduced key, and it records segment-level hold counts separately.

That separation is the key lesson for the flat-plane branch:

```text
SOURCE TIME != DISPLAY EXPOSURE != INTERPOLATION POLICY
```

They may agree. They do not have to be the same field.

## 1.5 V1 visual critique law

The SF2 critique guide breaks an attack into:

```text
Anticipation
Commitment
Contact
Recovery
```

It treats contact as the frame a viewer should want to freeze. Recovery is a combat action, not a neutral interpolation back to idle. It favors exaggerated holds and `Hold -> Burst -> Hold` over evenly distributed timing.

For this branch, steal the **readability test**, not arbitrary hold counts.

---

# 2. Pose Lab V2 — authored prime-key encoding

Primary repository: `Valar05/pose-lab-v2`

Useful sources:

- `docs/POSE_IS_GOD.md`
- `docs/ANIMATION_POSE_IS_GOD_PIPELINE.md`
- `docs/ATTACK_AUTHORING_LEARNINGS.md`
- `docs/POSE_LAB_V2_ATTACK_BAKE_DOCTRINE.md`
- `docs/CLOUD_WORKER_ANIMATION_SURFACE.md`
- `tools/attack1_review_urls.mjs`
- `src/review-candidates/attack1-candidate-1.js`
- `src/review-candidates/attack2-candidate-1.js`

## 2.1 V2's strongest rule

**A correct pose is not replaceable by a clever solver.**

V2 separates:

```text
repository truth
authoring truth
runtime truth
human visual truth
```

The flat-plane experiment should inherit this separation. A mathematically valid plane stack does not prove that the hand looks right.

## 2.2 V2 phase families

Two useful V2 phase sequences are already present in the repo.

Attack authoring sequence:

```text
start
anticipation
anticipationHold
contact
contactHold
followThrough
recoil
end
```

Cloud-learning / tripod evidence sequence:

```text
start
windup
anticipation
anticipationHold
contact
contactHold
recoil
settle
```

These are **vocabularies, not mandatory templates**. The FPV thumbs-up can map to them by kinship while keeping native labels such as `THUMB LOCK` and `THRUST / HOLD`.

## 2.3 V2 prime-key timing

One accepted review surface explicitly records named prime keys at exact seconds:

```text
start             0.00
anticipation      0.18
anticipationHold  0.30
contact           0.38
contactHold       0.50
followThrough     0.70
recoil            0.95
end               1.25
```

Another candidate uses a slightly different set including `earlyWindup`, `snapPrep`, `contactHold`, `settle`, and `followThrough`.

The lesson is not those particular seconds. The lesson is:

**named keys own exact times and review URLs can address exact keys.**

Our FPV hand recording follows the same principle, but its times come from the recording rather than this table.

## 2.4 V2 frame record shape

`pose-lab-v2-attack-candidate-v1` records:

```text
schema
label
source{...}
primeKeys{ label -> exactSeconds }
guardReport{...}
frames[]
```

A frame carries:

```text
time
label
note
generated
bones{ boneName -> quaternion }
```

This is particularly valuable for the paper-doll branch because the analogous payload can be:

```text
time
label
generated
planes{
  part -> {
    position
    quaternion or euler rotation
    scale
    zOrder
    visibility
    attachment
    vertexOffsets optional
  }
}
```

The representation changes. The animation bookkeeping does not need to become alien.

## 2.5 Authored vs generated provenance

V2 preserves whether a frame was:

- manually authored;
- duplicated as a hold;
- derived from another key;
- generated as follow-through/recovery;
- sourced from a reference clip.

Representative generated relationships already include concepts like:

```text
anticipationHold = duplicate(anticipation)
contactHold = duplicate(contact)
followThrough = blend(contact, ready, fraction)
recoil = blend(contact, ready, fraction)
end = ready
```

For the current thumbs-up gate: **all nine photographic keys are observed; none are generated.**

## 2.6 Combo inheritance

V2 established an important composition rule: a following action may start from the prior action's contact hold rather than resetting to Ready.

This is useful beyond combat. A paper-doll performance chain can preserve state across actions:

```text
previous.endState -> next.startState
```

without inserting a neutral reset just because the serializer likes one.

## 2.7 Pose packet / contact-sheet evidence

`ANIMATION_POSE_IS_GOD_PIPELINE.md` treats source animation geometry as authority and emits matched grids for:

```text
beauty
silhouette
limb-id
depth
geometry
```

All grids preserve identical frame order and dimensions.

For the current first-person hand proof, we do not yet need five passes. But we should preserve the structural lesson:

**every diagnostic view addresses the same key IDs in the same order.**

That means a later flat-plane packet might grow, additively, into:

```text
photo-key-grid
silhouette-grid
plane-id-grid
vertex-grid
final-art-grid
```

without changing key identity.

## 2.8 Do not feed failures back as source

Pose Lab V2 explicitly forbids using a failed generated sheet as the reference for another generated sheet. Every retry returns to native evidence.

Flat-plane equivalent:

```text
user video / accepted photographic key
    -> authored flat-plane key
```

Never:

```text
bad generated hand
    -> next generated hand
```

unless the user explicitly promotes that generated hand as new source material.

---

# 3. ASCII Kinesis / UAPL / UAT / Motion SPA

Primary repository: `Valar05/home-center`

Useful sources:

- `docs/UAPL_MOTION_SPA.md`
- `docs/ASCII_KINESIS_ANTHOLOGY.md`
- `skills/ascii-kinesis/SKILL.md`
- `experiments/ascii-kinesis/*/motion.json`
- per-experiment deterministic builders and `.motion.html` envelopes

## 3.1 Representation stack

The recovered UAPL delivery stack is:

```text
EVIDENCE
-> UAPL ASCII SOURCE
-> DETERMINISTIC ASCII CONTACT SHEET
-> VECTOR NOODLE, only if useful
-> RIG / METARIG, only if useful
-> UAT TIMING PROFILE
-> GIF / VIDEO / RUNTIME PLAYBACK
-> UAPL MOTION SPA DELIVERY ENVELOPE
```

That is **sibling architecture**, not a dependency graph for the flat-plane branch.

The flat-plane experiment should have a parallel shape:

```text
EVIDENCE
-> PHOTOGRAPHIC KEY CONTACT SHEET
-> KEY / TIMING LEDGER
-> FLAT-PLANE RIG KEYS
-> OPTIONAL VERTEX DEFORMATION
-> RUNTIME PLAYBACK
-> HUMAN DELIVERY / REVIEW SURFACE
```

## 3.2 ASCII Kinesis V2 key semantics

Current V2 motion files commonly preserve fields such as:

```text
id / key_id
name / label
timing_class
timing_provenance
causal_role
support_contact
contact_state
root_state
guard_state
readiness
joints
root or motion note
```

Not every field makes sense for a hand-only paper doll. The useful shared principle is that **a key carries both geometry and causal/read semantics**.

## 3.3 Timing classes

ASCII Kinesis uses explicit gameplay-style timing names:

```text
ONES
TWOS
FOURS
```

and stores whether they are observed or inferred.

For FPV Thumbs-Up 001 we do **not** quantize the source into ONES/TWOS/FOURS at the first gate. We preserve exact selected-key frame gaps from the ~30 fps source.

A future export adapter may derive a UAT or ONES/TWOS/FOURS presentation opinion from the accepted key ledger, but that derived timing must declare itself derived.

## 3.4 Motion Dungeon causal joins

Current ASCII Kinesis specimens distinguish between transitions that may interpolate geometry and boundaries where interpolation would invent semantics. Some builders hard-cut when contact/support/root/guard/readiness state changes.

The flat-plane version should keep this idea available:

```text
TRANSFORMABLE JOIN
CAUSAL HARD JOIN
ATTACHMENT SWAP JOIN
VERTEX-DEFORMATION JOIN
OCCLUSION / Z-ORDER JOIN
```

Again: reference vocabulary, not mandatory interpolation at the current gate.

## 3.5 Delivery kinship

ASCII Kinesis has already solved a recurring UX problem: the human should receive one openable artifact that exposes raw source/contact sheet, timing/JSON, and assembled playback.

When the flat-plane hand graduates beyond photographs, its review envelope should feel like family:

- one obvious contact-sheet/key view;
- one boring machine-data view;
- one playback view;
- source/provenance available;
- offline where practical;
- deterministic identity markers;
- no hidden network dependency required to understand the specimen.

But the flat-plane branch should not copy UAPL or contain ASCII Kinesis. Shared shell conventions can be implemented through a thin adapter or shared design tokens later.

---

# 4. Belly of Defiance — cheap transform precedent

Recovered precedent: `Belly-of-defiance`.

The important animation lesson is simple:

```text
position
rotation
scale
```

already produce visible acting.

The old breathing behavior changes X/Y scale with periodic functions and also offsets global Y. Scene animation tracks target Sprite2D position, scale, and rotation.

For the flat-plane branch this means:

1. try plane translation;
2. try 3D rotation;
3. try nonuniform scale;
4. try draw order / visibility;
5. only then spend per-vertex deformation.

Vertex deformation is an escalation layer, not the default tax for every key.

---

# 5. Flat-plane paper-doll native encoding target

This branch should eventually be able to encode a key approximately like:

```json
{
  "id": "K4",
  "label": "THRUST / HOLD",
  "source": {
    "frame": 42,
    "timeSeconds": 1.400015,
    "provenance": "OBSERVED"
  },
  "timing": {
    "holdFrames": 9,
    "holdSeconds": 0.300003,
    "mode": "KEY_ONLY_STEP_HOLD"
  },
  "generated": false,
  "planes": {
    "palm": {
      "position": [0,0,0],
      "rotationQuat": [0,0,0,1],
      "scale": [1,1,1],
      "zOrder": 0,
      "attachment": "palm-A",
      "vertexOffsets": []
    }
  }
}
```

This is illustrative, not yet a frozen schema.

## 5.1 Plane operations to preserve

Base operations:

```text
translate XYZ
rotate XYZ / quaternion
scale XYZ / nonuniform
visibility
z-order
attachment swap
```

Optional deformation operations:

```text
skew
squash/stretch
per-vertex XY/Z offset
vertex perturbation
bow / curvature
perspective-like warp
```

The plane remains one-sided and fundamentally flat even when deformation creates apparent volume.

## 5.2 Runtime attachment replacement

Motion semantics should refer to part/slot identity, not to one art provider.

Possible attachments:

```text
plain sprite
vector sprite
Spriter-like part
Spine-like slot attachment
procedural plane material
later compatible raster/vector provider
```

The animation key owns the transform/deformation state. The attachment provides appearance.

---

# 6. Common kinship nucleus — shared ideas, separate formats

The following concepts should use similar names across systems where practical:

```text
specimen_id
source identity / hash
key id
key label
source frame
source time
phase or causal role
timing provenance
hold/exposure
generated/authored flag
geometry payload
contact/support state optional
attachment identity optional
human verdict
correction hooks
```

This is the **kinship layer**.

It deliberately does not define one mega-schema.

Why:

- ASCII wants literal character geometry and causal topology;
- Pose Lab wants bones/quaternions and visual verification;
- flat-plane paper dolls want part transforms, attachment identity, and optional vertex offsets;
- future sprite systems may want cell/slot/mesh semantics.

A translator can map common ideas without one system embedding another.

---

# 7. FPV Thumbs-Up 001 — exact key timing

Source:

```text
29.9996875 fps
96 frames
3.200033 s
```

Selected keys:

```text
K0 REST           frame  0   0.000000s
K1 FORM           frame  9   0.300003s
K2 THUMB LOCK     frame 21   0.700007s
K3 PRESENT        frame 30   1.000010s
K4 THRUST / HOLD  frame 42   1.400015s
K5 RECOIL         frame 51   1.700018s
K6 SETTLE         frame 66   2.200023s
K7 RELEASE        frame 72   2.400025s
K8 CLEAR          frame 84   2.800029s
clip end                    3.200033s
```

Key-only exposures:

```text
K0  9 frames
K1 12 frames
K2  9 frames
K3 12 frames
K4  9 frames
K5 15 frames
K6  6 frames
K7 12 frames
K8 12 frames
```

This is the current animation.

**There are no in-betweens.**

The photographs must read as deliberate motion under these step-held exposures before one new hand image is authored.

---

# 8. Anti-failure rules

1. Do not import SF2 hold counts when exact selected-key timestamps already exist.
2. Do not smooth all keys because interpolation is available.
3. Do not make an in-between to rescue a bad key.
4. Do not generate appearance until the photographic contact sheet reads.
5. Do not use generated art as the next generation's motion source unless promoted.
6. Do not let a runtime attachment own motion semantics.
7. Do not make mesh deformation mandatory when translate/rotate/scale works.
8. Do not flatten authored timing into one global FPS assumption; preserve source time and playback opinion separately.
9. Do not confuse repository/build success with visual acceptance.
10. Do not create a universal animation engine just to make sibling systems feel related.

---

# 9. Source pointers

Pose Lab V1:

- `Valar05/pose-lab/docs/SF2_ANIMATION_CRITIQUE_GUIDE.md`
- `Valar05/pose-lab/assets/pose_indexes/ares_jab_sf2_reduction.json`
- `Valar05/pose-lab/tools/index_gravity_fist_attacks.py`

Pose Lab V2:

- `Valar05/pose-lab-v2/docs/ANIMATION_POSE_IS_GOD_PIPELINE.md`
- `Valar05/pose-lab-v2/docs/ATTACK_AUTHORING_LEARNINGS.md`
- `Valar05/pose-lab-v2/docs/POSE_LAB_V2_ATTACK_BAKE_DOCTRINE.md`
- `Valar05/pose-lab-v2/docs/CLOUD_WORKER_ANIMATION_SURFACE.md`
- `Valar05/pose-lab-v2/tools/attack1_review_urls.mjs`
- `Valar05/pose-lab-v2/src/review-candidates/attack1-candidate-1.js`

ASCII Kinesis:

- `Valar05/home-center/docs/UAPL_MOTION_SPA.md`
- `Valar05/home-center/docs/ASCII_KINESIS_ANTHOLOGY.md`
- `Valar05/home-center/skills/ascii-kinesis/SKILL.md`
- `Valar05/home-center/experiments/ascii-kinesis/`

Current specimen:

- `studies/fpv-thumbs-up-001/README.md`
- `studies/fpv-thumbs-up-001/keys.json`

This reference should grow by adding proven encodings and counterexamples, not by replacing older source systems.
