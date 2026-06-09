import { describe, it, expect, beforeEach } from "vitest";
import type { GameState } from "../../types/state";

let state!: GameState;

beforeEach(() => {
    // TODO: initialize state
});

describe("_cardsMoveToLife", () => {
    it("moves ids from current zone to top of life", () => {
        // ids removed from origin zone
        // ids are pushed to life stack top in order (life[0] should be the last id in the array)
        // currentZone updated to life for all instances
    });
    it("moves ids from current zone to bottom of life", () => {
        // ids removed from origin zone
        // ids are added to life stack bottom in order (life[-1] should be the last id in the array)
        // currentZone updated to life for all instances
    });
    it("attempts to move id to life when id does not exist in source", () => {
        // throws if id not in source zone
    });
    it("attempts to move DON to life", () => {
        // throws when DON instance is moved
    });
    it("attempts to move LEADER to life", () => {
        // throws when LEADER instance is moved
    });
});

// rework this to work with the damage system
describe("takeDamage", () => {
    it("damage player with 1 life remaining, 1 life damaged", () => {
        // id does not exist in life
        // id exists in hand
        // game does not end
    });
    it("damage player with 2 life remaining, 1 life damaged", () => {
        // top of life is the life that got damaged
        // id does not exist in life
        // id exists in hand
    });
    it("damage player with 2 life remaining, 2 life damaged", () => {
        // ids do not exist in life
        // ids exist in top of hand in reverse order of life damaged
    });
    it("damage player with 0 life remaining, 1 life damaged", () => {
        // game state winner is the winner id
        // endReason is "KNOCKOUT"
    });
    it("damage player with 1 life remaining, 2 life damaged", () => {
        // id does not exist in life
        // id exists in hand
        // life is empty
        // game does not end
    });
});