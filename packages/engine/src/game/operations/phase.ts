import type { GameState } from '../../types/state';
import type { Phase } from '../../types/primitives';
import { setPhase } from '../mechanics/turn';
import { emit } from '../emitter';
import { InvalidActionError } from '../../errors';
import { donAdd, donRefresh } from './don';
import { setNextActivePlayer, incrementTurn, resetBattleStateForTurn, resetCardsPlayedThisTurn, resetEffectsUsedThisTurn } from '../mechanics/turn';
import { cardsDraw, cardsRefresh } from './cards';
import { processEffects } from '../effects';

// Main turn phases
export function enterStartGamePhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "SETUP") {
        throw new InvalidActionError(`Cannot enter START_GAME from ${state.phase}`);
    }
    const nextPhase: Phase = "START_GAME";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

export function enterStartOfTurnPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "END_OF_TURN" && prevPhase !== "START_GAME") {
        throw new InvalidActionError(`Cannot enter START_OF_TURN from ${state.phase}`);
    }
    // Set next turn state (active player, turn count increment, reset battles and cards played)
    state = setStartTurnState(state);
    const nextPhase: Phase = "START_OF_TURN";
    state = setPhase(state, nextPhase);
    state = emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
    
    // Process start of turn effects
    // Whether there are effects to process or not, we want to return the state and execute effects from before refresh or draw
    // TODO - create a custom status effect that applies a strict "cannot attack" even if the card has rush if it is the first turn for the player (turns 1 and 2 typically)
    state = processEffects(state);
    return state;
}

export function enterRefreshPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "START_OF_TURN") {
        throw new InvalidActionError(`Cannot enter REFRESH from ${state.phase}`);
    }
    const nextPhase: Phase = "REFRESH";
    state = setPhase(state, nextPhase);
    state = emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
    // Set all as active (unrested) during refresh phase
    state = cardsRefresh(state, state.activePlayerId);
    state = donRefresh(state, state.activePlayerId);
    return enterDrawPhase(state);
}

export function enterDrawPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "REFRESH") {
        throw new InvalidActionError(`Cannot enter DRAW from ${state.phase}`);
    }
    const nextPhase: Phase = "DRAW";
    state = setPhase(state, nextPhase);
    state = emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
    if (state.turn > 1) {
        state = cardsDraw(state, state.activePlayerId, 1, { kind: "RULE" });
        state = donAdd(state, state.activePlayerId, 2, false, { kind: "RULE" });
    }
    else {
        state = donAdd(state, state.activePlayerId, 1, false, { kind: "RULE" });
    }
    return enterMainPhase(state);
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
    const nextPhase: Phase = "BLOCKER";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

export function enterCounterPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    const nextPhase: Phase = "COUNTER";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

export function enterBattleResolutionPhase(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "BLOCKER" && prevPhase !== "COUNTER") throw new InvalidActionError(`Cannot resolve battle from phase ${prevPhase}`);
    const nextPhase: Phase = "BATTLE_RESOLUTION";
    state = setPhase(state, nextPhase);
    return emit(state, { type: "PHASE_CHANGED", prevPhase, nextPhase, cause: { kind: "RULE" } });
}

// Phase transition functions
export function setStartTurnState(state: GameState): GameState {
    const prevPhase = state.phase;
    if (prevPhase !== "END_OF_TURN" && prevPhase !== "START_GAME") {
        throw new InvalidActionError(`Cannot set next turn state from ${state.phase}`);
    }
    state = setNextActivePlayer(state);
    state = incrementTurn(state);
    state = resetBattleStateForTurn(state);
    state = resetCardsPlayedThisTurn(state);
    state = resetEffectsUsedThisTurn(state);
    return state;
}