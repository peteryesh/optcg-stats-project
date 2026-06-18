import { describe, it, expect, beforeEach } from "vitest";
import type { GameState } from "../../types/state";
import { createTestState, makeCharacterInstance, makeLeaderInstance, resetIds } from "../helpers";
import { assertValidGameState } from "../invariants";
import { declareAttack, declareBlocker, redirectAttack, playCounter, resolveBattle } from "../../game/operations/battle";
import { updateCurrentBattle } from "../../game/mechanics/combat";
import { calculatePower } from "../../game/calculations";

let state!: GameState;

beforeEach(() => {
    resetIds();
    state = createTestState();
});

describe("declareAttack", () => {
    it("declare attack from character to rested character", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const defender = { ...makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS" }), isRested: true };
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { characters: [attacker.instanceId] }, p2: { characters: [defender.instanceId] } }
        );
        const next = declareAttack(state, "p1", attacker.instanceId, defender.instanceId);
        // attacker starts standing - covered by makeCharacterInstance default (isRested: false)
        // attacker ends rested
        expect(next.instances[attacker.instanceId].isRested).toBe(true);
        // defender character is rested - covered by setup
        // currentBattle is set
        expect(next.currentBattle).not.toBeNull();
        // currentBattle has attacker as attackerId
        expect(next.currentBattle?.attackerId).toBe(attacker.instanceId);
        // currentBattle has defender as defenderId
        expect(next.currentBattle?.defenderId).toBe(defender.instanceId);
        assertValidGameState(next);
    });

    it("declare attack from character to leader", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const defender = makeLeaderInstance({ controller: "p2" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { characters: [attacker.instanceId] }, p2: { leader: [defender.instanceId] } }
        );
        const next = declareAttack(state, "p1", attacker.instanceId, defender.instanceId);
        // attacker starts standing
        // attacker ends rested
        expect(next.instances[attacker.instanceId].isRested).toBe(true);
        // defender leader is standing - covered by makeLeaderInstance default (isRested: false)
        // currentBattle is set
        expect(next.currentBattle).not.toBeNull();
        // currentBattle has attacker as attackerId
        expect(next.currentBattle?.attackerId).toBe(attacker.instanceId);
        // currentBattle has defender as defenderId
        expect(next.currentBattle?.defenderId).toBe(defender.instanceId);
        assertValidGameState(next);
    });

    it("declare attack from leader to rested character", () => {
        const attacker = makeLeaderInstance({ controller: "p1" });
        const defender = { ...makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS" }), isRested: true };
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { leader: [attacker.instanceId] }, p2: { characters: [defender.instanceId] } }
        );
        const next = declareAttack(state, "p1", attacker.instanceId, defender.instanceId);
        // attacker starts standing
        // attacker ends rested
        expect(next.instances[attacker.instanceId].isRested).toBe(true);
        // defender character is rested - covered by setup
        // currentBattle is set
        expect(next.currentBattle).not.toBeNull();
        // currentBattle has attacker as attackerId
        expect(next.currentBattle?.attackerId).toBe(attacker.instanceId);
        // currentBattle has defender as defenderId
        expect(next.currentBattle?.defenderId).toBe(defender.instanceId);
        assertValidGameState(next);
    });

    it("declare attack from leader to leader", () => {
        const attacker = makeLeaderInstance({ controller: "p1" });
        const defender = makeLeaderInstance({ controller: "p2" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { leader: [attacker.instanceId] }, p2: { leader: [defender.instanceId] } }
        );
        const next = declareAttack(state, "p1", attacker.instanceId, defender.instanceId);
        // attacker starts standing
        // attacker ends rested
        expect(next.instances[attacker.instanceId].isRested).toBe(true);
        // defender leader is standing - covered by makeLeaderInstance default (isRested: false)
        // currentBattle is set
        expect(next.currentBattle).not.toBeNull();
        // currentBattle has attacker as attackerId
        expect(next.currentBattle?.attackerId).toBe(attacker.instanceId);
        // currentBattle has defender as defenderId
        expect(next.currentBattle?.defenderId).toBe(defender.instanceId);
        assertValidGameState(next);
    });
});

describe("declareBlocker", () => {
    it("declare a character as blocker", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const originalDefender = makeLeaderInstance({ controller: "p2" });
        const blocker = makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [originalDefender.instanceId]: originalDefender, [blocker.instanceId]: blocker },
            { p1: { characters: [attacker.instanceId] }, p2: { leader: [originalDefender.instanceId], characters: [blocker.instanceId] } }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: originalDefender.instanceId, counter: 0 });
        const next = declareBlocker(state, "p2", blocker.instanceId);
        // blocker starts standing - covered by makeCharacterInstance default (isRested: false)
        // blocker is different from original defender - covered by setup
        // blocker ends rested
        expect(next.instances[blocker.instanceId].isRested).toBe(true);
        // currentBattle defender is now blocker
        expect(next.currentBattle?.defenderId).toBe(blocker.instanceId);
        // currentBattle still has the same attacker
        expect(next.currentBattle?.attackerId).toBe(attacker.instanceId);
        // phase was BLOCKER, now is COUNTER
        expect(next.phase).toBe("COUNTER");
        assertValidGameState(next);
    });

    it("declare a leader as blocker", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const originalDefender = { ...makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS" }), isRested: true };
        const blocker = makeLeaderInstance({ controller: "p2" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [originalDefender.instanceId]: originalDefender, [blocker.instanceId]: blocker },
            { p1: { characters: [attacker.instanceId] }, p2: { characters: [originalDefender.instanceId], leader: [blocker.instanceId] } }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: originalDefender.instanceId, counter: 0 });
        const next = declareBlocker(state, "p2", blocker.instanceId);
        // blocker starts standing
        // blocker is different from original defender
        // blocker ends rested
        expect(next.instances[blocker.instanceId].isRested).toBe(true);
        // currentBattle defender is now blocker
        expect(next.currentBattle?.defenderId).toBe(blocker.instanceId);
        // currentBattle is still the same attacker
        expect(next.currentBattle?.attackerId).toBe(attacker.instanceId);
        // phase was BLOCKER, now is COUNTER
        expect(next.phase).toBe("COUNTER");
        assertValidGameState(next);
    });
});

describe("redirectAttack", () => {
    it("choose another standing character as the target of redirected attack", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const originalDefender = { ...makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS" }), isRested: true };
        const newTarget = makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [originalDefender.instanceId]: originalDefender, [newTarget.instanceId]: newTarget },
            { p1: { characters: [attacker.instanceId] }, p2: { characters: [originalDefender.instanceId, newTarget.instanceId] } }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: originalDefender.instanceId, counter: 0 });
        const next = redirectAttack(state, "p2", newTarget.instanceId, { kind: "RULE" });
        // new target is the new defender id
        expect(next.currentBattle?.defenderId).toBe(newTarget.instanceId);
        // new target is still standing (legal for redirect)
        expect(next.instances[newTarget.instanceId].isRested).toBe(false);
        // currentBattle still has the same attacker
        expect(next.currentBattle?.attackerId).toBe(attacker.instanceId);
        assertValidGameState(next);
    });

    it("choose another rested character as the target of redirected attack", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const originalDefender = { ...makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS" }), isRested: true };
        const newTarget = { ...makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS" }), isRested: true };
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [originalDefender.instanceId]: originalDefender, [newTarget.instanceId]: newTarget },
            { p1: { characters: [attacker.instanceId] }, p2: { characters: [originalDefender.instanceId, newTarget.instanceId] } }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: originalDefender.instanceId, counter: 0 });
        const next = redirectAttack(state, "p2", newTarget.instanceId, { kind: "RULE" });
        // new target is the new defender id
        expect(next.currentBattle?.defenderId).toBe(newTarget.instanceId);
        // new target is still rested
        expect(next.instances[newTarget.instanceId].isRested).toBe(true);
        // currentBattle still has the same attacker
        expect(next.currentBattle?.attackerId).toBe(attacker.instanceId);
        assertValidGameState(next);
    });

    it("choose the same target as the target of redirected attack", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const defender = { ...makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS" }), isRested: true };
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { characters: [attacker.instanceId] }, p2: { characters: [defender.instanceId] } }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 0 });
        const next = redirectAttack(state, "p2", defender.instanceId, { kind: "RULE" });
        // target starts rested - covered by setup
        // target is still rested
        expect(next.instances[defender.instanceId].isRested).toBe(true);
        // currentBattle still has the same attacker
        expect(next.currentBattle?.attackerId).toBe(attacker.instanceId);
        // currentBattle still has the same defender
        expect(next.currentBattle?.defenderId).toBe(defender.instanceId);
        assertValidGameState(next);
    });
});

describe("playCounter", () => {
    it("discard card with 1000 counter value during counter phase", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const defender = makeLeaderInstance({ controller: "p2" });
        const counterCard = makeCharacterInstance({ controller: "p2", currentZone: "HAND", cardId: "counter-1000" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender, [counterCard.instanceId]: counterCard },
            { p1: { characters: [attacker.instanceId] }, p2: { leader: [defender.instanceId], hand: [counterCard.instanceId] } },
            { "counter-1000": { id: "counter-1000", name: "counter-1000", class: "CHARACTER", counter: 1000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] } }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 0 });
        const next = playCounter(state, "p2", counterCard.instanceId);
        // currentBattle counter value goes up by 1000
        expect(next.currentBattle?.counter).toBe(1000);
        assertValidGameState(next);
    });

    it("discard card with 2000 counter value during counter phase", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const defender = makeLeaderInstance({ controller: "p2" });
        const counterCard = makeCharacterInstance({ controller: "p2", currentZone: "HAND", cardId: "counter-2000" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender, [counterCard.instanceId]: counterCard },
            { p1: { characters: [attacker.instanceId] }, p2: { leader: [defender.instanceId], hand: [counterCard.instanceId] } },
            { "counter-2000": { id: "counter-2000", name: "counter-2000", class: "CHARACTER", counter: 2000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] } }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 0 });
        const next = playCounter(state, "p2", counterCard.instanceId);
        // currentBattle counter value goes up by 2000
        expect(next.currentBattle?.counter).toBe(2000);
        assertValidGameState(next);
    });

    it("discard card with 1000 counter and a card with 2000 counter during counter phase", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const defender = makeLeaderInstance({ controller: "p2" });
        const counterCard1 = makeCharacterInstance({ controller: "p2", currentZone: "HAND", cardId: "counter-1000" });
        const counterCard2 = makeCharacterInstance({ controller: "p2", currentZone: "HAND", cardId: "counter-2000" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender, [counterCard1.instanceId]: counterCard1, [counterCard2.instanceId]: counterCard2 },
            { p1: { characters: [attacker.instanceId] }, p2: { leader: [defender.instanceId], hand: [counterCard1.instanceId, counterCard2.instanceId] } },
            {
                "counter-1000": { id: "counter-1000", name: "counter-1000", class: "CHARACTER", counter: 1000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "counter-2000": { id: "counter-2000", name: "counter-2000", class: "CHARACTER", counter: 2000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 0 });
        state = playCounter(state, "p2", counterCard1.instanceId);
        const next = playCounter(state, "p2", counterCard2.instanceId);
        // currentBattle counter value goes up by 3000
        expect(next.currentBattle?.counter).toBe(3000);
        assertValidGameState(next);
    });
});

describe("resolveBattle", () => {
    // Character as defender
    it("resolve a battle between characters where attacker power is greater than the defender", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS", cardId: "char-5000" });
        const defender = makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS", cardId: "char-3000" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { characters: [attacker.instanceId] }, p2: { characters: [defender.instanceId] } },
            {
                "char-5000": { id: "char-5000", name: "char-5000", class: "CHARACTER", power: 5000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "char-3000": { id: "char-3000", name: "char-3000", class: "CHARACTER", power: 3000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 0 });
        const next = resolveBattle(state);
        // currentBattle is null
        expect(next.currentBattle).toBeNull();
        // defender is in the trash
        expect(next.playerZones["p2"].trash).toContain(defender.instanceId);
        // defender is not in the character zone
        expect(next.playerZones["p2"].characters).not.toContain(defender.instanceId);
        // battlesThisTurn contains the battle record
        expect(next.battlesThisTurn).toHaveLength(1);
        expect(next.battlesThisTurn[0].attackerId).toBe(attacker.instanceId);
        expect(next.battlesThisTurn[0].defenderId).toBe(defender.instanceId);
        assertValidGameState(next);
    });

    it("resolve a battle between characters where attacker power is equal to the defender", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS", cardId: "char-3000-a" });
        const defender = makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS", cardId: "char-3000-b" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { characters: [attacker.instanceId] }, p2: { characters: [defender.instanceId] } },
            {
                "char-3000-a": { id: "char-3000-a", name: "char-3000-a", class: "CHARACTER", power: 3000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "char-3000-b": { id: "char-3000-b", name: "char-3000-b", class: "CHARACTER", power: 3000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 0 });
        const next = resolveBattle(state);
        // currentBattle is null
        expect(next.currentBattle).toBeNull();
        // defender is in the trash
        expect(next.playerZones["p2"].trash).toContain(defender.instanceId);
        // defender is not in the character zone
        expect(next.playerZones["p2"].characters).not.toContain(defender.instanceId);
        // battlesThisTurn contains the battle record
        expect(next.battlesThisTurn).toHaveLength(1);
        expect(next.battlesThisTurn[0].attackerId).toBe(attacker.instanceId);
        assertValidGameState(next);
    });

    it("resolve a battle between characters where attacker power is less than the defender", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS", cardId: "char-3000" });
        const defender = makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS", cardId: "char-5000" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { characters: [attacker.instanceId] }, p2: { characters: [defender.instanceId] } },
            {
                "char-3000": { id: "char-3000", name: "char-3000", class: "CHARACTER", power: 3000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "char-5000": { id: "char-5000", name: "char-5000", class: "CHARACTER", power: 5000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 0 });
        const next = resolveBattle(state);
        // currentBattle is null
        expect(next.currentBattle).toBeNull();
        // defender is still in the character zone
        expect(next.playerZones["p2"].characters).toContain(defender.instanceId);
        // battlesThisTurn contains the battle record
        expect(next.battlesThisTurn).toHaveLength(1);
        expect(next.battlesThisTurn[0].attackerId).toBe(attacker.instanceId);
        assertValidGameState(next);
    });

    it("defender power is less than attacker power, but counter value makes defender greater and win", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS", cardId: "char-3000" });
        const defender = makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS", cardId: "char-1000" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { characters: [attacker.instanceId] }, p2: { characters: [defender.instanceId] } },
            {
                "char-3000": { id: "char-3000", name: "char-3000", class: "CHARACTER", power: 3000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "char-1000": { id: "char-1000", name: "char-1000", class: "CHARACTER", power: 1000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 3000 });
        const next = resolveBattle(state);
        // currentBattle is null
        expect(next.currentBattle).toBeNull();
        // defender is still in the character zone
        expect(next.playerZones["p2"].characters).toContain(defender.instanceId);
        // expect calculated power of defender to be greater than calculated power of attacker
        expect(calculatePower(next, defender.instanceId) + next.battlesThisTurn[0].counter).toBeGreaterThan(calculatePower(next, attacker.instanceId));
        // battlesThisTurn contains the battle record
        expect(next.battlesThisTurn).toHaveLength(1);
        assertValidGameState(next);
    });

    it("defender power is less than attacker power, and counter value makes defender equal and lose", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS", cardId: "char-3000" });
        const defender = makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS", cardId: "char-1000" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { characters: [attacker.instanceId] }, p2: { characters: [defender.instanceId] } },
            {
                "char-3000": { id: "char-3000", name: "char-3000", class: "CHARACTER", power: 3000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "char-1000": { id: "char-1000", name: "char-1000", class: "CHARACTER", power: 1000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 2000 });
        const next = resolveBattle(state);
        // currentBattle is null
        expect(next.currentBattle).toBeNull();
        // defender is in the trash
        expect(next.playerZones["p2"].trash).toContain(defender.instanceId);
        // defender is not in the character zone
        expect(next.playerZones["p2"].characters).not.toContain(defender.instanceId);
        // expect calculated power of defender to be equal to the calculated power of attacker
        expect(calculatePower(next, defender.instanceId) + next.battlesThisTurn[0].counter).toBe(calculatePower(next, attacker.instanceId));
        // battlesThisTurn contains the battle record
        expect(next.battlesThisTurn).toHaveLength(1);
        assertValidGameState(next);
    });

    it("defender power is less than attacker power, and counter value makes defender still less than attacker and lose", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS", cardId: "char-3000" });
        const defender = makeCharacterInstance({ controller: "p2", currentZone: "CHARACTERS", cardId: "char-1000" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { characters: [attacker.instanceId] }, p2: { characters: [defender.instanceId] } },
            {
                "char-3000": { id: "char-3000", name: "char-3000", class: "CHARACTER", power: 3000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "char-1000": { id: "char-1000", name: "char-1000", class: "CHARACTER", power: 1000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 1000 });
        const next = resolveBattle(state);
        // currentBattle is null
        expect(next.currentBattle).toBeNull();
        // defender is in the trash
        expect(next.playerZones["p2"].trash).toContain(defender.instanceId);
        // defender is not in the character zone
        expect(next.playerZones["p2"].characters).not.toContain(defender.instanceId);
        // expect calculated power of defender to be less than calculated power of attacker
        expect(calculatePower(next, defender.instanceId) + next.battlesThisTurn[0].counter).toBeLessThan(calculatePower(next, attacker.instanceId));
        // battlesThisTurn contains the battle record
        expect(next.battlesThisTurn).toHaveLength(1);
        assertValidGameState(next);
    });

    // Leader as defender
    it("defender leader power is less than attacker power", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS", cardId: "char-5000" });
        const defender = makeLeaderInstance({ controller: "p2", cardId: "leader-3000" });
        const lifeCard = makeCharacterInstance({ controller: "p2", currentZone: "LIFE" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender, [lifeCard.instanceId]: lifeCard },
            { p1: { characters: [attacker.instanceId] }, p2: { leader: [defender.instanceId], life: [lifeCard.instanceId] } },
            {
                "char-5000": { id: "char-5000", name: "char-5000", class: "CHARACTER", power: 5000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "leader-3000": { id: "leader-3000", name: "leader-3000", class: "LEADER", power: 3000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 0 });
        const next = resolveBattle(state);
        // currentBattle is null
        expect(next.currentBattle).toBeNull();
        // previous top life is not in life
        expect(next.playerZones["p2"].life).not.toContain(lifeCard.instanceId);
        // previous top life is in trigger zone
        expect(next.playerZones["p2"].trigger).toContain(lifeCard.instanceId);
        // battlesThisTurn contains the battle record
        expect(next.battlesThisTurn).toHaveLength(1);
        expect(next.battlesThisTurn[0].attackerId).toBe(attacker.instanceId);
        assertValidGameState(next);
    });

    it("defender leader power + counter is less than attacker power", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS", cardId: "char-5000" });
        const defender = makeLeaderInstance({ controller: "p2", cardId: "leader-2000" });
        const lifeCard = makeCharacterInstance({ controller: "p2", currentZone: "LIFE" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender, [lifeCard.instanceId]: lifeCard },
            { p1: { characters: [attacker.instanceId] }, p2: { leader: [defender.instanceId], life: [lifeCard.instanceId] } },
            {
                "char-5000": { id: "char-5000", name: "char-5000", class: "CHARACTER", power: 5000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "leader-2000": { id: "leader-2000", name: "leader-2000", class: "LEADER", power: 2000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 2000 });
        const next = resolveBattle(state);
        // currentBattle is null
        expect(next.currentBattle).toBeNull();
        // previous top life is not in life
        expect(next.playerZones["p2"].life).not.toContain(lifeCard.instanceId);
        // previous top life is in trigger zone
        expect(next.playerZones["p2"].trigger).toContain(lifeCard.instanceId);
        // battlesThisTurn contains the battle record
        expect(next.battlesThisTurn).toHaveLength(1);
        expect(next.battlesThisTurn[0].attackerId).toBe(attacker.instanceId);
        assertValidGameState(next);
    });

    it("defender leader power + counter is equal to attacker power", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS", cardId: "char-3000" });
        const defender = makeLeaderInstance({ controller: "p2", cardId: "leader-1000" });
        const lifeCard = makeCharacterInstance({ controller: "p2", currentZone: "LIFE" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender, [lifeCard.instanceId]: lifeCard },
            { p1: { characters: [attacker.instanceId] }, p2: { leader: [defender.instanceId], life: [lifeCard.instanceId] } },
            {
                "char-3000": { id: "char-3000", name: "char-3000", class: "CHARACTER", power: 3000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "leader-1000": { id: "leader-1000", name: "leader-1000", class: "LEADER", power: 1000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 2000 });
        const next = resolveBattle(state);
        // currentBattle is null
        expect(next.currentBattle).toBeNull();
        // previous top life is not in life
        expect(next.playerZones["p2"].life).not.toContain(lifeCard.instanceId);
        // previous top life is in trigger zone
        expect(next.playerZones["p2"].trigger).toContain(lifeCard.instanceId);
        // battlesThisTurn contains the battle record
        expect(next.battlesThisTurn).toHaveLength(1);
        assertValidGameState(next);
    });

    it("defender leader power + counter is greater than attacker power", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS", cardId: "char-3000" });
        const defender = makeLeaderInstance({ controller: "p2", cardId: "leader-2000" });
        const lifeCard = makeCharacterInstance({ controller: "p2", currentZone: "LIFE" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender, [lifeCard.instanceId]: lifeCard },
            { p1: { characters: [attacker.instanceId] }, p2: { leader: [defender.instanceId], life: [lifeCard.instanceId] } },
            {
                "char-3000": { id: "char-3000", name: "char-3000", class: "CHARACTER", power: 3000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "leader-2000": { id: "leader-2000", name: "leader-2000", class: "LEADER", power: 2000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 2000 });
        const next = resolveBattle(state);
        // currentBattle is null
        expect(next.currentBattle).toBeNull();
        // life cards ids are unchanged
        expect(next.playerZones["p2"].life).toContain(lifeCard.instanceId);
        // battlesThisTurn contains the battle record
        expect(next.battlesThisTurn).toHaveLength(1);
        assertValidGameState(next);
    });

    it("defender leader power is less than attacker and defender leader has 0 life", () => {
        const attacker = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS", cardId: "char-5000" });
        const defender = makeLeaderInstance({ controller: "p2", cardId: "leader-3000" });
        state = createTestState(
            ["p1", "p2"],
            { [attacker.instanceId]: attacker, [defender.instanceId]: defender },
            { p1: { characters: [attacker.instanceId] }, p2: { leader: [defender.instanceId] } },
            {
                "char-5000": { id: "char-5000", name: "char-5000", class: "CHARACTER", power: 5000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
                "leader-3000": { id: "leader-3000", name: "leader-3000", class: "LEADER", power: 3000, colors: [], types: [], attributes: [], aliases: [], restrictions: [] },
            }
        );
        state = updateCurrentBattle(state, { attackerId: attacker.instanceId, defenderId: defender.instanceId, counter: 0 });
        const next = resolveBattle(state);
        // currentBattle is null
        expect(next.currentBattle).toBeNull();
        // winner is set to the attacker's controller
        expect(next.winner).toBe("p1");
        // battlesThisTurn contains the battle record
        expect(next.battlesThisTurn).toHaveLength(1);
        // reason is KNOCKOUT
        expect(next.endReason).toBe("KNOCKOUT");
    });
});
