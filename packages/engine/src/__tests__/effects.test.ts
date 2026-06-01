import { describe, it, expect } from "vitest";
import { produce } from "immer";
import { processEffects, advanceCurrentEffect, promoteChosenEffect } from "../game/effects";
import { setupTestGame } from "./fixtures";
import type { PlayerId, CardInstanceId } from "../types";
import type { EffectSequence, EffectStep } from "../types/effect";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

function makeSequence(sequenceId: string, playerId: PlayerId, steps: EffectStep[] = []): EffectSequence {
    return {
        sequenceId,
        sourceInstanceId: "p1-CARD-0" as CardInstanceId,
        activatingSignal: null,
        controllerAtQueueTime: playerId,
        steps,
        resolved: {},
        optional: false,
    };
}

const AUTO_STEP: EffectStep = {
    type: "DRAW_CARDS",
    resolution: { kind: "AUTO" },
    target: null,
    effect: null,
    min: 0,
    max: 0,
    from: null,
    to: null,
    duration: null,
};

// ============================================================
// processEffects
// ============================================================

describe("processEffects", () => {
    it("returns the same state reference when no effects are pending", () => {
        const state = setupTestGame();
        const next = processEffects(state);
        expect(next).toBe(state);
    });

    it("returns unchanged state when currentEffect is already set", () => {
        const seq = makeSequence("seq-1", P1);
        let state = setupTestGame();
        state = produce(state, draft => { draft.currentEffect = seq; });
        const next = processEffects(state);
        expect(next.currentEffect).toBe(seq);
    });

    it("promotes and exhausts a single staged sequence with no steps", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.pendingEffects[P1] = [makeSequence("seq-1", P1)];
        });
        const next = processEffects(state);
        expect(next.currentEffect).toBeNull();
        expect(next.pendingEffects[P1]).toHaveLength(0);
    });

    it("creates a NEXT_EFFECT decision when active player has multiple staged sequences", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.pendingEffects[P1] = [
                makeSequence("seq-1", P1),
                makeSequence("seq-2", P1),
            ];
        });
        const next = processEffects(state);
        expect(next.pendingDecision).not.toBeNull();
        expect(next.pendingDecision!.type).toBe("NEXT_EFFECT");
        expect((next.pendingDecision as any).playerId).toBe(P1);
    });

    it("processes non-active player effects when active player has no staged effects", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.activePlayerId = P1;
            draft.pendingEffects[P2] = [makeSequence("p2-seq", P2)];
        });
        const next = processEffects(state);
        expect(next.currentEffect).toBeNull();
        expect(next.pendingEffects[P2]).toHaveLength(0);
    });

    it("active player effects are processed before other players' effects", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.activePlayerId = P1;
            draft.pendingEffects[P1] = [makeSequence("p1-seq", P1)];
            draft.pendingEffects[P2] = [makeSequence("p2-seq", P2)];
        });
        // P1 has one effect -> promote and exhaust, then P2's effect
        const next = processEffects(state);
        // Both empty-step sequences exhaust -> all clear
        expect(next.currentEffect).toBeNull();
        expect(next.pendingEffects[P1]).toHaveLength(0);
        expect(next.pendingEffects[P2]).toHaveLength(0);
    });
});

// ============================================================
// advanceCurrentEffect
// ============================================================

describe("advanceCurrentEffect", () => {
    it("returns unchanged state when currentEffect is null", () => {
        const state = setupTestGame();
        const next = advanceCurrentEffect(state);
        expect(next).toBe(state);
    });

    it("clears currentEffect when sequence has no steps", () => {
        let state = setupTestGame();
        state = produce(state, draft => { draft.currentEffect = makeSequence("seq-1", P1); });
        const next = advanceCurrentEffect(state);
        expect(next.currentEffect).toBeNull();
    });

    it("executes and removes an AUTO step, exhausting the sequence", () => {
        let state = setupTestGame();
        const seq = makeSequence("seq-1", P1, [AUTO_STEP]);
        state = produce(state, draft => { draft.currentEffect = seq; });
        const next = advanceCurrentEffect(state);
        // AUTO step executed (stub no-op), step removed, sequence exhausted
        expect(next.currentEffect).toBeNull();
    });

    it("calls processEffects after exhausting the current sequence", () => {
        let state = setupTestGame();
        const seq1 = makeSequence("seq-1", P1);
        const seq2 = makeSequence("seq-2", P1);
        state = produce(state, draft => {
            draft.currentEffect = seq1;
            draft.pendingEffects[P1] = [seq2];
        });
        // After seq1 is exhausted, processEffects promotes seq2 (also empty -> exhausts)
        const next = advanceCurrentEffect(state);
        expect(next.currentEffect).toBeNull();
        expect(next.pendingEffects[P1]).toHaveLength(0);
    });

    it("does not mutate original state", () => {
        let state = setupTestGame();
        state = produce(state, draft => { draft.currentEffect = makeSequence("seq-1", P1); });
        advanceCurrentEffect(state);
        expect(state.currentEffect).not.toBeNull();
    });
});

// ============================================================
// promoteChosenEffect
// ============================================================

describe("promoteChosenEffect", () => {
    it("promotes the chosen effect by sequenceId and exhausts it", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.pendingEffects[P1] = [makeSequence("seq-a", P1), makeSequence("seq-b", P1)];
        });
        // Promote seq-b specifically
        const next = promoteChosenEffect(state, P1, "seq-b");
        expect(next.currentEffect).toBeNull(); // exhausted (no steps)
    });

    it("removes the chosen sequence from pendingEffects", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.pendingEffects[P1] = [makeSequence("seq-a", P1), makeSequence("seq-b", P1)];
        });
        const next = promoteChosenEffect(state, P1, "seq-b");
        // seq-b was promoted; seq-a then also auto-promoted and exhausted (both empty steps)
        expect(next.pendingEffects[P1]).toHaveLength(0);
    });

    it("throws if the given sequenceId is not found in pending effects", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.pendingEffects[P1] = [makeSequence("seq-a", P1)];
        });
        expect(() => promoteChosenEffect(state, P1, "nonexistent")).toThrow();
    });
});
