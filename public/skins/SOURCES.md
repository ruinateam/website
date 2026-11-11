# Official skin snapshots

These PNGs are unchanged copies of the official textures already used on `/team`.
The gallery tries the official URL first, then uses the local PNG if loading or decoding fails.
Each attempt has a 1.5-second deadline; a successful remote request does not download the local file.
The gallery session reuses the loaded textures on route re-entry.

- Linaryx: https://textures.minecraft.net/texture/9cffc10b798d3adac173fc1bcf23645018b8606e9a4f7a21acdb2dbbc7e518cf
- Digidro: https://textures.minecraft.net/texture/24544397466101c4d914fa0b60fc9db40b40ffee7a270c248ff4e6f75f47d36
- Faldoor: https://textures.minecraft.net/texture/94f5c2e66f632f61a07c9764e1cca71c09b4386f231d9234f99fe719d15db94a

Snapshot date: 2026-11-10. These official URLs identify immutable textures, not current player profiles.
Update both the remote URL in `pages/team.vue` and its local backup when participants change skins.
