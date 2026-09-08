# Fertile parent — Spine / Sprite paper-doll 2.5D

The first independent-part 3D escalation is deliberately preserved rather than overwritten.

- Branch: `fertile/spine-paper-doll-v1`
- Frozen branch head: `63bb38ae4246a98a7406e45f562b28b87ef7103b`
- Parent behavior: exact accepted Saint Andrew front face; independent D-handle / shaft / socket / blade; planar Move; free quaternion Rotate; Scale; Light; Reference layout; Assemble; Reset part; touch-first manipulation.
- Depth model: repeated accepted vector-face layers at bounded Z offsets.
- Strength: lightweight, readable 2.5D card volume; useful substrate for Sprite/Spine/paper-doll animation, pose work, and layered prop animation.
- Limitation: the depth is a card stack, not semantic physical cross-section. A shaft can look like a thick card rather than a cylinder; blade and handle can read too flat when edge-on.

Do not delete or silently supersede this parent. It solved a different problem well. The contour-volume descendant on `main` exists because physical-prop interrogation needs semantic cross-sections, not because this animation parent was a failure.
