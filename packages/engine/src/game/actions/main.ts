import type { GameState } from '../../types/state';
import type { GameAction } from '../../types/action';
import { InvalidActionError } from '../../errors';
import { playCard, donAttach, declareAttack, declareBlocker, playCounter, sendTriggerToHand, sendTriggerToTrash, enterWhenAttackingPhase, enterEndOfTurnPhase, enterOnOpponentAttackPhase, enterCounterPhase, enterBattleResolutionPhase, enterBlockerPhase, enterRefreshPhase, enterMainPhase, resolveBattle, enterStartOfTurnPhase } from '../operations';
import { getZoneArray } from '../mechanics';

// Play card from hand
export function applyPlayCard(state: GameState, action: Extract<GameAction, { type: "PLAY_CARD" }>): GameState {
    return playCard(state, action.playerId, action.instanceId, { kind: "PLAYER" });
}

// Attach DON
export function applyAttachDon(state: GameState, action: Extract<GameAction, { type: "ATTACH_DON" }>): GameState {
    const donIds = getZoneArray(state, action.playerId, "DON_ACTIVE").slice(0, action.count);
    return donAttach(state, action.playerId, donIds, action.targetId, "DON_ACTIVE", { kind: "PLAYER" });
}

// Declare attack
export function applyDeclareAttack(state: GameState, action: Extract<GameAction, { type: "DECLARE_ATTACK" }>): GameState {
    return declareAttack(state, action.playerId, action.attackerId, action.defenderId);
}

export function applyDeclareBlocker(state: GameState, action: Extract<GameAction, { type: "DECLARE_BLOCKER" }>): GameState {
    return declareBlocker(state, action.playerId, action.blockerId);
}

export function applyPlayCounter(state: GameState, action: Extract<GameAction, { type: "PLAY_COUNTER" }>): GameState {
    return playCounter(state, action.playerId, action.counterId);
}

export function applyCompleteBattle(state: GameState, action: Extract<GameAction, { type: "COMPLETE_BATTLE" }>): GameState {
    state = enterBattleResolutionPhase(state);
    return resolveBattle(state);
}

export function applyTriggerActivation(state: GameState, action: Extract<GameAction, { type: "ACTIVATE_TRIGGER" }>): GameState {
    if (!action.activate) {
        // decline trigger, move card from trigger zone to hand
        return sendTriggerToHand(state, action.playerId, { kind: "RULE" });
    }
    // move card from trigger zone to trash
    state = sendTriggerToTrash(state, action.playerId, { kind: "RULE" });
    // queue trigger effect
    // activateTrigger
    return state;
}

// Activate effect - stubbed for now
export function applyActivateEffect(state: GameState, action: Extract<GameAction, { type: "ACTIVATE_EFFECT" }>): GameState {
    throw new InvalidActionError("ACTIVATE_EFFECT is not yet implemented");
}

// End phase
export function applyNextPhase(state: GameState, action: Extract<GameAction, { type: "NEXT_PHASE" }>): GameState {
    // Validate here
    switch (state.phase) {
        case "MAIN":
            return enterEndOfTurnPhase(state);
        case "ON_OPPONENT_ATTACK":
            return enterBlockerPhase(state);
        case "BLOCKER":
            return enterCounterPhase(state);
        default:
            throw new InvalidActionError(`Cannot directly call pass state from phase ${state.phase}`);
    }
}