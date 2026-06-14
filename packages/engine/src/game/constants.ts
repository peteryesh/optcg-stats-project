export const DECK_SIZE = 50;
export const OPENING_HAND_SIZE = 5;
export const DON_DECK_SIZE = 10;
export const CHARACTERS_MAX = 5;
export const STAGE_MAX = 1;
export const LEADER_MAX = 1;


/**
 * Effect Resolution
 * - In the case of simultaneous activations, the controlling player may choose which resolve first
 * - The effects of the active player must resolve before the other player's effects
 * - Triggers are resolved before any cards that take place as a result of life manipulation
 * - "Life Damaged" is separated from "Damage dealt" because while [Double Attack] says it deals 2 damage, it really should say deals damage to 2 life cards
 * - [Double Attack] cannot cause lethal damage when opponent is at 1 life (per the above ruling)
 */