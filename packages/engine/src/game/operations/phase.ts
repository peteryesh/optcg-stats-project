import { produce } from 'immer';
import type { GameState } from '../../types/state';
import type { Phase, PlayerId } from '../../types/primitives';
import { setPhase } from '../mechanics';
import { emit } from '../emitter';
import { InvalidActionError } from '../../errors';

// Main turn phases

export function enterStartOfTurnPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "END_OF_TURN" && prevPhase !== "SETUP") {
        throw new InvalidActionError(`Cannot enter START_OF_TURN from ${state.phase}`);
    }
    const nextPhase: Phase = "START_OF_TURN";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

export function enterRefreshPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "START_OF_TURN") {
        throw new InvalidActionError(`Cannot enter REFRESH from ${state.phase}`);
    }
    const nextPhase: Phase = "REFRESH";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

export function enterDrawPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "REFRESH") {
        throw new InvalidActionError(`Cannot enter DRAW from ${state.phase}`);
    }
    const nextPhase: Phase = "DRAW";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

export function enterMainPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "DRAW" && prevPhase !== "BATTLE_RESOLUTION") {
        throw new InvalidActionError(`Cannot enter MAIN from ${state.phase}`);
    }
    const nextPhase: Phase = "MAIN";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

export function enterEndOfTurnPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "MAIN") {
        throw new InvalidActionError(`Cannot enter END_OF_TURN from ${state.phase}`);
    }
    const nextPhase: Phase = "END_OF_TURN";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

// GAME_END can be reached from any phase (deck out, concede, disconnect)
export function enterGameEndPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    const nextPhase: Phase = "GAME_END";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

// Battle phases

export function enterWhenAttackingPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "MAIN") {
        throw new InvalidActionError(`Cannot enter WHEN_ATTACKING from ${state.phase}`);
    }
    const nextPhase: Phase = "WHEN_ATTACKING";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

export function enterOnOpponentAttackPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "WHEN_ATTACKING") {
        throw new InvalidActionError(`Cannot enter ON_OPPONENT_ATTACK from ${state.phase}`);
    }
    const nextPhase: Phase = "ON_OPPONENT_ATTACK";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

export function enterBlockerPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "ON_OPPONENT_ATTACK") {
        throw new InvalidActionError(`Cannot enter BLOCKER from ${state.phase}`);
    }
    const nextPhase: Phase = "BLOCKER";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

export function enterCounterPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "BLOCKER") {
        throw new InvalidActionError(`Cannot enter COUNTER from ${state.phase}`);
    }
    const nextPhase: Phase = "COUNTER";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

export function enterBattleResolutionPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "COUNTER") {
        throw new InvalidActionError(`Cannot enter BATTLE_RESOLUTION from ${state.phase}`);
    }
    const nextPhase: Phase = "BATTLE_RESOLUTION";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}
