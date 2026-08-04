# Team profile animations

`profiles.animation.json` is a local Blockbench animation set for the team profiles.

The `crouch` action is adapted from `idle_sneak.json` in [Serious Player Animations Template Resource Pack](https://github.com/McVader34/Serious-Player-Animations-Template-Resource-Pack/tree/e559b58b35d2a0caa77e7030f7d68d45ad1ab27f), released under CC0 1.0. It was converted to the `skinview3d-blockbench` bone names and keyframe format, and made non-looping for profile cards.

The `inspect` action is adapted from `hand_view` in [PPLBandage](https://github.com/PPLBandage/pplbandage_site/blob/26cc35ea3e0fdb37ac4e74a8dfe7399d5c7bb10b/src/resources/model.animation.json). It uses a reduced set of keyframes without global rotation and is included with permission from its author, Andcool.

Run `bun run validate:animations` after adding or editing an `.animation.json` file. The validator accepts the bone names supported by `skinview3d-blockbench`, checks numeric timestamps and three-value keyframes, and requires each animated channel to start at `0` and end at `animation_length`.

Export new files from Blockbench using the Minecraft Skin template converted to Bedrock Entity. Keep the default bone names: `Head`, `Body`, `LeftArm`, `RightArm`, `LeftLeg`, and `RightLeg`.
