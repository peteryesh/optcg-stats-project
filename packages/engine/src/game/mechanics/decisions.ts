import { produce } from "immer";
import { GameState, DecisionPoint } from "../../types";

export function setDecisionPoint(state: GameState, dp: DecisionPoint): GameState {
    return produce(state, draft => {
        draft.decisionPoint = dp;
    });
}

export function removeDecisionPoint(state: GameState): GameState {
    return produce(state, draft => {
        draft.decisionPoint = null;
    });
}