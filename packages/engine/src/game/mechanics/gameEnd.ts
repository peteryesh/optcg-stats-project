import { produce } from "immer";
import { EndReason, GameState, PlayerId } from "../../types";

export function setGameEnd(state: GameState, winnerId: PlayerId, endReason: EndReason): GameState {
    return produce(state, draft => {
        draft.winner = winnerId;
        draft.endReason = endReason;
    });
}