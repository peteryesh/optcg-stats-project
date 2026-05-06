import type { CardInstanceId, CardId, PlayerId} from './state';
import type { Phase } from './constants';

/**
 * Metadata used for debugging and assisting in tracking the history of actions
 */
export interface ActionMetadata {
    actor: PlayerId;
    seq: number;
    timestamp: number;
}

// Setup
export interface StartGameAction {
    type: 'START_GAME';
    meta: ActionMetadata;
    decks: Record<PlayerId, {
        leaderCardId: CardId;
        deckCardIds: CardId[];
        donCardIds: CardId[];
    }>;
    firstPlayer: PlayerId;
}

export interface MulliganAction {
    type: 'MULLIGAN';
    meta: ActionMetadata;
    keep: boolean;
}


// Phases
export interface AdvancePhaseAction {
    type: 'ADVANCE_PHASE';
    meta: ActionMetadata;
    fromPhase: Phase;
}

// Main Phase Actions
export interface PlayCardAction {
    type: 'PLAY_CARD';
    meta: ActionMetadata;
    instanceId: CardInstanceId;
    displaceTargetId?: CardInstanceId;
    count: number;
}

export interface AttachDonAction {
    type: 'ATTACH_DON';
    meta: ActionMetadata;
    targetInstanceId: CardInstanceId;
}

// Combat
export interface DeclareAttackAction {
    type: 'DECLARE_ATTACK';
    meta: ActionMetadata;
    attackerId: CardInstanceId;
    targetId: CardInstanceId;
}

export interface DeclareBlockerAction {
    type: 'DECLARE_BLOCKER';
    meta: ActionMetadata;
    blockerId: CardInstanceId;
}

export interface SkipBlockerAction {
    type: 'SKIP_BLOCKER';
    meta: ActionMetadata;
}

export interface PlayCounterAction {
    type: 'PLAY_COUNTER';
    meta: ActionMetadata;
    counterCardInstanceId: CardInstanceId;
    targetId: CardInstanceId;
}

export interface ResolveAttackAction {
    type: 'RESOLVE_ATTACK';
    meta: ActionMetadata;
}

// Triggers
export interface ResolveTriggerAction {
    type: 'RESOLVE_TRIGGER';
    meta: ActionMetadata;
    activate: boolean;
}

// Concession
export interface ConcedeAction {
    type: 'CONCEDE';
    meta: ActionMetadata;
}

/**
 * Export for Action definitions, used to define the action to use when a player makes a move
 */
export type Action = 
    | StartGameAction
    | MulliganAction
    | AdvancePhaseAction
    | PlayCardAction
    | AttachDonAction
    | DeclareAttackAction
    | DeclareBlockerAction
    | SkipBlockerAction
    | PlayCounterAction
    | ResolveAttackAction
    | ResolveTriggerAction
    | ConcedeAction;

/**
 * Adds the ability for each action definition to be referenced by the string in its type field
 */
export type ActionOfType<T extends Action['type']> = Extract<Action, { type: T }>;