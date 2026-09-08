# Flat-Plane Paper Doll ↔ ASCII Kinesis Kinship Contract

Status: ACTIVE BRIDGE / NO RUNTIME DEPENDENCY

Goal: make the flat-plane animation workflow and ASCII Kinesis feel like parts of the same family without nesting either implementation inside the other.

## Relationship

```text
ASCII Kinesis         Flat-Plane Paper Doll
--------------        ---------------------
ASCII pose key        flat-plane pose key
literal contact sheet photographic/art contact sheet
UAT timing opinion    key timing ledger
Motion Dungeon        later connector/interpolation policy
motion.json           paper-doll key/plane data
.motion.html          later sibling review envelope
```

This table describes **kinship**, not file inclusion.

Neither project vendors the other's runtime, schema, builders, or experiment directories.

## Shared semantic nucleus

When the concepts exist, prefer compatible field meanings:

| Concept | ASCII Kinesis family | Flat-plane family |
|---|---|---|
| specimen identity | experiment/id | specimen_id |
| source identity | source + hash | source + hash |
| key identity | key_id / id | id |
| readable role | name / causal_role | label / kinship_role |
| source address | provenance/evidence | source_frame + source_time_seconds |
| timing evidence | timing_provenance | timing_provenance |
| hold/exposure | timing_class / hold frames | step_hold_frames / seconds |
| authored/generated | evidence split | generated boolean + provenance |
| geometry | ASCII joints / characters | plane transforms + vertex offsets |
| contact | contact_state | optional contact_state |
| support/root | support/root state | optional support/root state |
| attachment | usually implicit ASCII glyphs | explicit runtime attachment slot |
| correction | correction hooks | correction hooks / human verdict |

## Current first-gate rule

FPV Thumbs-Up 001 intentionally stops before either system would normally compile connective motion.

```text
USER VIDEO
  -> SELECTED PHOTOGRAPHIC KEYS
  -> KEY-ONLY CONTACT SHEET
  -> EXACT SELECTED-KEY TIMING LEDGER
  -> DREW KEY VERDICT
```

No ASCII conversion is required to approve the photographic keys.
No flat-plane art is required to approve the photographic keys.
No in-betweens are allowed to rescue the photographic keys.

## Later bridge points

After key approval, sibling adapters may consume the same key identity and timing ledger.

### ASCII sibling path

A future adapter may emit an ASCII Kinesis study that preserves:

- the same K0..Kn key IDs;
- the same order;
- source frame/time provenance;
- key-only timing or an explicitly derived UAT opinion;
- causal-role labels where meaningful.

The ASCII study then teaches silhouette, negative space, timing, and causal joins without becoming the source of the paper-doll art.

### Flat-plane sibling path

The paper-doll renderer consumes the accepted keys and supplies:

- part/plane transforms;
- 3D rotation of flat one-sided planes;
- nonuniform scale;
- visibility / z-order;
- attachment swaps;
- optional per-vertex deformation.

Its visual result does not become ASCII motion authority.

## Timing non-duplication rule

If the reference key ledger contains exact source frame/time and step-held exposure, downstream systems must not silently replace it.

Derived timing is allowed only when labeled, for example:

```text
OBSERVED_SELECTED_KEY_SPACING
DERIVED_UAT_OPINION
DERIVED_ONES_TWOS_FOURS
DERIVED_GAMEPLAY_RETIMER
```

The source timing always remains recoverable.

## Delivery kinship

Both systems should eventually provide a human an obvious, compact review object.

Family resemblance is encouraged:

- key/contact-sheet view first;
- machine data available but not dominant;
- assembled playback available;
- source/provenance visible;
- deterministic identity/hash;
- mobile-readable controls;
- old experiments remain openable as the envelope evolves.

The HTML/CSS shell may later share a tiny design package, but motion implementations stay separate.

## Non-goals

Do not:

- copy UAPL into this repo;
- copy flat-plane plane state into Home Center as ASCII source truth;
- make Pose Lab a dependency of either runtime;
- create a universal mega-schema;
- require ASCII for every flat-plane experiment;
- require flat-plane rendering for every ASCII experiment;
- invent one shared worker just to prove the workflows are related.

## Acceptance test for kinship

The systems are sufficiently related when a human or worker can look at a key in either workflow and answer the same basic questions:

1. Which key is this?
2. Where did it come from?
3. When does it occur?
4. How long is it exposed?
5. Is its timing observed, inferred, or derived?
6. What is the readable/casual role?
7. Is the geometry authored or generated?
8. What state is allowed to change after this key?
9. What artifact should the human review?
10. What remains authoritative if a later rendering fails?

That is enough standardization for now.
