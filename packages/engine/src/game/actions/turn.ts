import type { GameState } from '../../types/state';
import type { GameAction } from '../../types/action';
import type { PlayerId } from '../../types/primitives';
import type { CharacterInstance, LeaderInstance, StageInstance, EventInstance } from '../../types/card';
import { InvalidActionError } from '../../errors';
import { playCard, donAttach, declareAttack, enterWhenAttackingPhase, enterEndOfTurnPhase, enterOnOpponentAttackPhase } from '../operations';

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
    state = enterWhenAttackingPhase(state);
    // Check for when attacking resolutions here
    return enterOnOpponentAttackPhase(state);
}

// Activate effect - stubbed for now
export function applyActivateEffect(state: GameState, action: Extract<GameAction, { type: "ACTIVATE_EFFECT" }>): GameState {
    // Validate here
    throw new InvalidActionError("ACTIVATE_EFFECT is not yet implemented");
}

// End phase
export function applyEndPhase(state: GameState, action: Extract<GameAction, { type: "END_PHASE" }>): GameState {
    // Validate here
    return enterEndOfTurnPhase(state);
}