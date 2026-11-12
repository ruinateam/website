/** World units per Minecraft block in the gallery architecture. */
export const BLOCK_UNIT = 6;
/** skinview3d's PlayerObject is 32 model units tall. */
export const PLAYER_MODEL_HEIGHT = 32;
/** A Minecraft player is two blocks tall on screen. */
export const PLAYER_BLOCK_HEIGHT = 2;
export const PLAYER_SCALE = (PLAYER_BLOCK_HEIGHT * BLOCK_UNIT) / PLAYER_MODEL_HEIGHT;
