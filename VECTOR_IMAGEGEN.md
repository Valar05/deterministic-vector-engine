# Vector Noodle Imagegen v1

This is a deterministic black-ink image generator. Every valid nonempty prompt produces one isolated SVG subject without a model call. Bare prompts select a stable morphology. Detailed prompts additionally bind counts, named anatomy, proportions, view, and exploded relations. Unknown nouns seed stable invented morphology instead of failing.

## Existing owner and boundary

The existing deterministic-vector-engine owns the capability. `src/vector-imagegen.mjs` is an engine-neutral intent, subject-graph, and vector-program layer. SVG and Pillow PNG are terminal adapters over the same operations. The earlier box and finite compiler APIs remain compatibility surfaces, not the new product classifier.

## Training source

`tools/train_ink_style.py` hashes and measures the newest Pictures contact sheet plus two high-resolution line references. It does not trace or embed source pixels. It derives a compact style genome for stroke scale, rib rhythm, hardware marks, organic displacement, and exploded spacing. The colored sheet is explicitly excluded. Exact provenance is sealed in `training/source-manifest.v1.json`.

## Generate

```sh
node tools/vector_imagegen_cli.mjs generate --prompt "cathedral crab" --out generated/crab.svg
node tools/vector_imagegen_cli.mjs contact-sheet --out-dir generated/vector-noodle-ink-v1
python tools/render_vector_package.py generated/vector-noodle-ink-v1/vector-noodle-contact-package.v1.json generated/vector-noodle-ink-v1/vector-noodle-ink-contact-sheet-v1.png
```

Run the durable local surface with `sh tools/server_tmux.sh`, then open `http://127.0.0.1:8810/`. One-finger dragging changes the SVG depth transform in any direction while all art remains flat vector geometry.

## Hard gates

- Black ink and white paper only, with no shading, filters, gradients, raster embedding, network calls, random calls, or model calls.
- Same prompt and genome yield byte-identical SVG.
- Detailed counts, parts, view, and separated state own explicit clause evidence.
- Genome-enabled and genome-ablated runs must differ.
- Ten commissioned prompts produce ten unique SVG hashes and one PNG contact sheet.
- Structural tests and critique schema are guardrails. Human visual acceptance remains authoritative.

## Current measured result

The 2026-09-05 ten-image run completed in 1172 ms and produced SVG hash `82123399b3b308a25634b94d56fd8f0ed7ea8ffc416fcc45978c3c3222b63a34`. Thirty-nine tests passed. A cold CLI single took 328 ms due to process startup; the persistent server process is the interactive timing owner and reports its internal generation duration. Runtime model calls and runtime model tokens are exactly zero by construction.

## Retrospective

One unavailable timing binary caused a no-op artifact command; the command was not retried blindly and the available platform clock replaced it. The weakest remaining soundness clause is human visual appeal, which cannot be self-certified. Classification is `FRONTIER_EXPANSION`: arbitrary prompt coverage and detailed clause control improved without removing the earlier compatibility surface.
