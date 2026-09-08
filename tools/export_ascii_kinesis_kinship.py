#!/usr/bin/env python3
"""Export flat-plane key timing as a non-authoritative ASCII Kinesis kinship bridge.

This does NOT emit UAPL, UAT, ASCII geometry, video, or a Motion SPA. It only
preserves shared key identity/timing/provenance so the sibling workflow can
consume the same evidence without either project containing the other.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

SOURCE_SCHEMA = "kinetic-key-contact.v1"
OUTPUT_SCHEMA = "ascii-kinesis-kinship-bridge.v1"


def build_bridge(source: dict) -> dict:
    if source.get("schema") != SOURCE_SCHEMA:
        raise ValueError(f"expected {SOURCE_SCHEMA!r}, got {source.get('schema')!r}")

    playback = source.get("playback") or {}
    keys = source.get("keys")
    if not isinstance(keys, list) or not keys:
        raise ValueError("source keys must be a non-empty list")

    out_keys = []
    seen = set()
    previous_frame = -1
    for key in keys:
        key_id = key.get("id")
        if not key_id or key_id in seen:
            raise ValueError(f"invalid or duplicate key id: {key_id!r}")
        seen.add(key_id)

        source_frame = key.get("source_frame")
        if not isinstance(source_frame, int) or source_frame <= previous_frame:
            raise ValueError("source_frame values must be strictly increasing integers")
        previous_frame = source_frame

        out_keys.append(
            {
                "key_id": key_id,
                "name": key.get("label"),
                "kinship_role": key.get("kinship_role"),
                "source_frame": source_frame,
                "source_time_seconds": key.get("source_time_seconds"),
                "hold_frames": key.get("step_hold_frames"),
                "hold_seconds": key.get("step_hold_seconds"),
                "timing_provenance": key.get("timing_provenance"),
                "generated": bool(key.get("generated", False)),
            }
        )

    return {
        "schema": OUTPUT_SCHEMA,
        "source_system": "flat-plane-paper-doll",
        "source_specimen_id": source.get("specimen_id"),
        "source_media_sha256": (source.get("source") or {}).get("sha256"),
        "timing": {
            "mode": playback.get("mode"),
            "inbetweens": playback.get("inbetweens"),
            "rule": playback.get("timing_rule"),
            "authority": "SOURCE_KEY_LEDGER",
        },
        "keys": out_keys,
        "non_authority": [
            "This bridge does not contain UAPL or ASCII pose geometry.",
            "This bridge does not define a UAT timing opinion.",
            "This bridge does not retime source keys into ONES/TWOS/FOURS.",
            "This bridge does not authorize interpolation or Motion Dungeon connectors.",
            "ASCII Kinesis remains a sibling system with its own source/delivery contracts.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    source = json.loads(args.source.read_text(encoding="utf-8"))
    bridge = build_bridge(source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(bridge, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
