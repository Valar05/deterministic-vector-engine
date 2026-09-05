# Empty Glass Modern-Object Apprenticeship

## Active commission

The first target is the uploaded modern shovel. Learning uses only the modern assembled and exploded views. Fleshpunk is forbidden input and reserved for a later garnish phase.

The prior raster-skeleton, blob-correspondence, and hand-authored ontology pipeline is `USER_REJECTED`. Its artifacts remain preserved under `training/wonder-v2/` and `evidence/wonder-v2/` as negative evidence.

## Recognition loop

1. Keep no more than 20 candidate strokes per view.
2. Establish silhouette before detail.
3. Add identity anchors that distinguish this shovel.
4. Add correction ink only for an observed hidden-reference misread.
5. Review without the source at 96, 220, and 360 pixels.
6. Remove each stroke once and ask whether recognition collapses.
7. Delete redundant strokes.
8. Export a raster-free SVG and deterministic study record.

Only the user can decide that the pixels are recognizable or accepted.

## Run

```sh
npm run test:wonder:sparse
npm run wonder:sparse
sh tools/server_tmux.sh
```

Review:

<http://127.0.0.1:8811/wonder/>

The uncommitted source cache is verified against SHA-256 `e4202ceb87bae2ab00d98b25999ab1105eda878d38904d97d070b63aff1fa923` before use.
