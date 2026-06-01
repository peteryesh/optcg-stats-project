import type { GameState } from '../../types/state';
import type { GameAction } from '../../types/action';
import { InvalidActionError } from '../../errors';
import { playCard, donAttach, declareAttack, declareBlocker, playCounter, enterWhenAttackingPhase, enterEndOfTurnPhase, enterOnOpponentAttackPhase, enterCounterPhase, enterBattleResolutionPhase, enterBlockerPhase, enterRefreshPhase, enterMainPhase, resolveBattle, enterStartOfTurnPhase } from '../operations';
import { processEffects } from '../effects';

// Play card from hand
export function applyPlayCard(state: GameState, action: Extract<GameAction, { type: "PLAY_CARD" }>): GameState {
    // Validate here
    return playCard(state, action.playerId, action.instanceId, { kind: "PLAYER" });
}

// Attach DON
export function applyAttachDon(state: GameState, action: Extract<GameAction, { type: "ATTACH_DON" }>): GameState {
    // Validate here
    return donAttach(state, action.playerId, action.donIds, action.targetId, "DON_ACTIVE", { kind: "PLAYER" });
}

// Declare attack
export function applyDeclareAttack(state: GameState, action: Extract<GameAction, { type: "DECLARE_ATTACK" }>): GameState {
    // Validate here
    state = declareAttack(state, action.playerId, action.attackerId, action.defenderId);

    // Emit should scan listeners for effects and enqueue them in the proper player's effect sequence
    state = enterWhenAttackingPhase(state);
    state = processEffects(state);
    if (state.pendingDecision !== null) return state;

    state = enterOnOpponentAttackPhase(state);
    state = processEffects(state);
    if (state.pendingDecision !== null) return state;
    return enterBlockerPhase(state);
}

export function applyDeclareBlocker(state: GameState, action: Extract<GameAction, { type: "DECLARE_BLOCKER" }>): GameState {
    // Validate here
    state = declareBlocker(state, action.playerId, action.blockerId);
    state = processEffects(state);
    if (state.pendingDecision !== null) return state;
    return enterCounterPhase(state);
}

export function applyPlayCounter(state: GameState, action: Extract<GameAction, { type: "PLAY_COUNTER" }>): GameState {
    // Validate here
    state = playCounter(state, action.playerId, action.counterId);
    state = processEffects(state);
    return state;
}

export function applyCompleteBattle(state: GameState, action: Extract<GameAction, { type: "COMPLETE_BATTLE" }>): GameState {
    // Validate here
    state = enterBattleResolutionPhase(state);
    state = resolveBattle(state);
    state = processEffects(state);
    if (state.pendingDecision !== null) return state;
    return enterMainPhase(state);
}

// Activate effect - stubbed for now
export function applyActivateEffect(state: GameState, action: Extract<GameAction, { type: "ACTIVATE_EFFECT" }>): GameState {
    // Validate here
    throw new InvalidActionError("ACTIVATE_EFFECT is not yet implemented");
}

// End phase
export function applyNextPhase(state: GameState, action: Extract<GameAction, { type: "NEXT_PHASE" }>): GameState {
    // Validate here
    switch (state.phase) {
        case "START_OF_TURN":
            // enter refresh phase, which will auto resolve refresh actions
            // refresh phase will then auto advance to draw phase, which will auto resolve draw actions
            // draw phase will then auto advance to main phase
            return enterRefreshPhase(state);
        case "MAIN":
            state = enterEndOfTurnPhase(state);
            state = processEffects(state);
            if (state.pendingDecision !== null) return state;
            return enterStartOfTurnPhase(state);
        case "ON_OPPONENT_ATTACK":
            state = processEffects(state);
            if (state.pendingDecision !== null) return state;
            return enterBlockerPhase(state);
        case "BLOCKER":
            return enterCounterPhase(state);
        default:
            throw new InvalidActionError(`Cannot directly call pass state from phase ${state.phase}`);
    }
}