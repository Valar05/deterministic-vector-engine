# Deterministic Vector Noodle Compiler

This is a model-free prompt-to-vector compiler. It accepts a bounded controlled language, produces a frozen intent, resolves an active capability, executes typed vector operations, and emits pure inline SVG. The compiler and trainer do not call a neural model, network service, Canvas, WebGL, or arbitrary generated code.

## Ownership

- `src/noodle-compiler.mjs` owns parsing, intent hashes, typed vector execution, deterministic training, and bounded kernel evolution.
- `capabilities/registry.v1.json` owns accepted seed capabilities and their provenance.
- `tools/noodle_cli.mjs` owns persistent jobs and the explicit user decision gate.
- `tools/organ_promote.py` asks the recovered Organ v4 kernel to perform the only capability promotion mutation.
- `tools/noodle_server.py` is a loopback terminal adapter for chat, SVG pixels, jobs, and decisions.
- `noodle-app.mjs` is only the browser interaction adapter. Its depth transform is flat two-dimensional SVG math.

Thunder remains an evidence source. Cauldron remains optional local compute. Neither may directly promote a capability. Image generation is not used for known or symbolically derivable requests. A request with unknown visual meaning stops at `NEEDS_REFERENCE` and marks image generation as necessary; any future image result is reference evidence, never production geometry.

## State machine

`PARSED -> COMPILED`

`PARSED -> NEEDS_TRAINING -> AWAITING_USER -> ORGAN_PROMOTED -> ACTIVE`

`NEEDS_TRAINING -> NEEDS_KERNEL_EVOLUTION -> AWAITING_USER`

`NEEDS_KERNEL_EVOLUTION -> NEEDS_REFERENCE`

Unknown prompts never fall back to the box. Ambiguous targets stop. Candidate programs remain inactive until the user submits the exact candidate hash. Organ then creates a permit, sealed plan, atomic mutation, production compile check, and sealed receipt. If Organ or its authority key is unavailable, promotion rejects without writing the registry.

## Training without coding

A new prompt assembled from known parts such as pipes, valves, tendons, connective tissue, frames, legs, and jaws triggers a deterministic search across axial, radial, and bilateral layouts. The objective scores component coverage, typed operation coverage, and domain alignment. Six SVG stages make the learning progression visible: trace, recreation, three mutations, and an exploded canary.

Coils, hinges, bellows, and branches exercise bounded typed kernel evolution. They derive only from existing vector operators. No JavaScript is synthesized. A visually unknown term cannot be guessed and becomes `NEEDS_REFERENCE` after the fixed search budget.

## Run

```sh
node --test tests/m1.test.mjs tests/noodle-compiler.test.mjs
sh tools/server_tmux.sh
curl -fsS http://127.0.0.1:8810/api/noodle/health
```

Play URL is `http://127.0.0.1:8810/`.

Try these prompts:

```text
fleshpunk pressure valve gate exploded rotate
lineart tendon hound assembled crawl
machine with pipes valves tendons connective tissue
machine with pipes coils hinges
```

The first two compile immediately. The third trains a composition. The fourth exercises typed kernel evolution. Drag one finger in any direction over the output. Arrow keys rotate, and Home or double tap resets.

## Acceptance boundary

Node tests, Organ receipts, SVG parsing, and HTTP markers are guardrails. The visible result remains pending until a human judges the fresh browser pixels. A rejected mutation is preserved as a negative example and never activated.
