# Minecraft Purpur sources

Unmodified Minecraft Java Edition 1.21.4 textures, mirrored by InventivetalentDev/minecraft-assets:

- https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures/block/purpur_block.png
- https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures/block/purpur_pillar.png
- https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures/block/purpur_pillar_top.png

Minecraft assets belong to Mojang / Microsoft. This website is not an official Minecraft product.

The gallery removes hue at runtime using Rec.709 luminance, preserving every source pixel. No procedural replacement texture is generated.

Vanilla `purpur_stairs` and `purpur_slab` use `purpur_block` for all surfaces; they do not have separate PNGs. Their silhouette and UV regions follow `models/block/stairs.json` and `models/block/slab.json` from the same version. Pillars use their own side and end textures. One Minecraft block is six gallery units; long geometry repeats UVs at that density rather than stretching one tile.
