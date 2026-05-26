import { CardFilter } from './filter';
import type { CardId, CardInstanceId, Attribute, CardClass, Color, PlayerId, Zone, EndReason, StackPosition, RevealedTo } from './primitives';

// ============================================================
// Shared Types
// ============================================================
export type PlayCause =
    | { kind: "PLAYER" }
    | { kind: "EFFECT"; sourceId: CardInstanceId }
    | { kind: "RULE" };

export type RemovalCause =
    | { kind: "BATTLE"; sourceId: CardInstanceId }
    | { kind: "EFFECT"; sourceId: CardInstanceId }
    | { kind: "OVERFLOW" }
    | { kind: "RULE" };

export type DamageCause =
    | { kind: "BATTLE"; sourceId: CardInstanceId }
    | { kind: "EFFECT"; sourceId: CardInstanceId };

export type SignalCause =
    | { kind: "EFFECT"; sourceId: CardInstanceId }
    | { kind: "RULE" };

// ============================================================
// Signals
// ============================================================

export type GameSignal =
    // Card Plays
    | { type: "CHARACTER_PLAYED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: PlayCause }
    | { type: "STAGE_PLAYED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: PlayCause }
    | { type: "EVENT_PLAYED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: PlayCause }

    // Card Removal from Field
    | { type: "CHARACTER_KOD"; instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
    | { type: "CHARACTER_TRASHED"; instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
    | { type: "CHARACTER_BOUNCED"; instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
    | { type: "CHARACTER_SENT_TO_DECK"; instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause; position: StackPosition }
    | { type: "STAGE_KOD"; instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
    | { type: "STAGE_TRASHED"; instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
    | { type: "STAGE_BOUNCED"; instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
    | { type: "STAGE_SENT_TO_DECK"; instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause; position: StackPosition }

    // Hand & Deck
    | { type: "CARDS_DRAWN"; instanceIds: CardInstanceId[], controller: PlayerId, cause: SignalCause}
    // | { type: "CARD_DISCARDED"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    // | { type: "CARD_RETURNED_TO_HAND"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: SignalCause }
    // | { type: "CARD_MILLED"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    // | { type: "CARD_SENT_TO_DECK"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; position: StackPosition; cause: SignalCause }
    // | { type: "DECK_SHUFFLED"; playerId: PlayerId; cause: SignalCause }

    // Rest State
    | { type: "CHARACTER_RESTED"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "CHARACTER_SET_ACTIVE"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "LEADER_RESTED"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "LEADER_SET_ACTIVE"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "STAGE_RESTED"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "STAGE_SET_ACTIVE"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    // Combat
    | { type: "ATTACK_DECLARED"; attackerId: CardInstanceId; defenderId: CardInstanceId; controller: PlayerId }
    | { type: "BLOCKER_DECLARED"; blockerId: CardInstanceId; attackerId: CardInstanceId; controller: PlayerId }
    | { type: "COUNTER_PLAYED"; counterId: CardInstanceId; targetId: CardInstanceId; controller: PlayerId }
    | { type: "ATTACK_RESOLVED"; attackerId: CardInstanceId; defenderId: CardInstanceId; controller: PlayerId; outcome: "HIT" | "BLOCKED" | "COUNTERED" }
    | { type: "ATTACK_REDIRECTED"; attackerId: CardInstanceId; fromDefenderId: CardInstanceId; toDefenderId: CardInstanceId; turnNumber: number }

    // Life & Damage
    | { type: "DAMAGE_DEALT"; instanceId: CardInstanceId; controller: PlayerId; amount: number; cause: DamageCause }
    | { type: "LIFE_REMOVED"; instanceId: CardInstanceId; playerId: PlayerId; position: StackPosition; cause: SignalCause }
    | { type: "LIFE_TAKEN_TO_HAND"; instanceId: CardInstanceId; playerId: PlayerId; position: StackPosition; cause: SignalCause }
    | { type: "LIFE_TRASHED"; instanceId: CardInstanceId; playerId: PlayerId; position: StackPosition; cause: SignalCause }
    | { type: "LIFE_ADDED"; instanceId: CardInstanceId; playerId: PlayerId; position: StackPosition; cause: SignalCause }
    | { type: "LIFE_REVEALED"; instanceId: CardInstanceId; playerId: PlayerId; position: StackPosition; revealedTo: RevealedTo; cause: SignalCause }
    | { type: "LIFE_FLIPPED"; instanceId: CardInstanceId; playerId: PlayerId; position: StackPosition; cause: SignalCause }
    | { type: "LIFE_REORDERED"; playerId: PlayerId; cause: SignalCause }
    | { type: "LIFE_REVEALED_AS_TRIGGER"; instanceId: CardInstanceId; playerId: PlayerId; position: StackPosition }

    // Game Setup (review this section after finalizing game setup flow)
    | { type: "GAME_SETUP_STARTED"; turnOrder: PlayerId[] }
    | { type: "COIN_FLIP_RESOLVED"; winner: PlayerId; result: "HEADS" | "TAILS" }
    | { type: "TURN_ORDER_DECIDED"; turnOrder: PlayerId[] }
    | { type: "HAND_DEALT"; playerId: PlayerId; instanceIds: CardInstanceId[] }
    | { type: "LIFE_SET_UP"; playerId: PlayerId; instanceIds: CardInstanceId[] }
    | { type: "GAME_STARTED"; firstPlayerId: PlayerId }

    // Game Flow
    | { type: "TURN_STARTED"; playerId: PlayerId; turnNumber: number }
    | { type: "TURN_ENDED"; playerId: PlayerId; turnNumber: number }
    | { type: "REFRESH_PHASE_STARTED"; playerId: PlayerId; turnNumber: number }
    | { type: "REFRESH_PHASE_ENDED"; playerId: PlayerId; turnNumber: number }
    | { type: "DON_PHASE_STARTED"; playerId: PlayerId; turnNumber: number }
    | { type: "DON_PHASE_ENDED"; playerId: PlayerId; turnNumber: number }
    | { type: "DRAW_PHASE_STARTED"; playerId: PlayerId; turnNumber: number }
    | { type: "DRAW_PHASE_ENDED"; playerId: PlayerId; turnNumber: number }
    | { type: "MAIN_PHASE_STARTED"; playerId: PlayerId; turnNumber: number }
    | { type: "MAIN_PHASE_ENDED"; playerId: PlayerId; turnNumber: number }
    | { type: "BATTLE_PHASE_STARTED"; playerId: PlayerId; turnNumber: number }
    | { type: "WHEN_ATTACKING_PHASE_STARTED"; attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
    | { type: "WHEN_ATTACKING_PHASE_ENDED"; attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
    | { type: "ON_OPPONENT_ATTACK_PHASE_STARTED"; attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
    | { type: "ON_OPPONENT_ATTACK_PHASE_ENDED"; attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
    | { type: "BLOCKER_PHASE_STARTED"; attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
    | { type: "BLOCKER_PHASE_ENDED"; attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
    | { type: "COUNTER_PHASE_STARTED"; attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
    | { type: "COUNTER_PHASE_ENDED"; attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
    | { type: "RESOLUTION_PHASE_STARTED"; attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
    | { type: "RESOLUTION_PHASE_ENDED"; attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
    | { type: "BATTLE_PHASE_ENDED"; playerId: PlayerId; turnNumber: number }
    | { type: "MULLIGAN_KEPT"; playerId: PlayerId }
    | { type: "MULLIGAN_TAKEN"; playerId: PlayerId }
    | { type: "GAME_OVER"; winner: PlayerId; endReason: EndReason }

    // DON!!
    | { type: "ADDED_ACTIVE_DON"; instanceIds: CardInstanceId[]; controller: PlayerId; cause: SignalCause }
    | { type: "ADDED_RESTED_DON"; instanceIds: CardInstanceId[]; controller: PlayerId; cause: SignalCause }
    | { type: "DON_RESTED"; instanceIds: CardInstanceId[]; controller: PlayerId; cause: SignalCause }
    | { type: "DON_SET_ACTIVE"; instanceIds: CardInstanceId[]; controller: PlayerId; cause: SignalCause }
    | { type: "DON_RETURNED"; instanceIds: CardInstanceId[]; controller: PlayerId; cause: SignalCause }
    // | { type: "DON_ATTACHED"; donId: CardInstanceId; targetId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    // | { type: "DON_DETACHED"; donId: CardInstanceId; targetId: CardInstanceId; controller: PlayerId; cause: SignalCause }

    // Look Zone
    | { type: "CARD_ADDED_TO_LOOK"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: SignalCause }
    | { type: "CARD_TAKEN_FROM_LOOK"; instanceId: CardInstanceId; controller: PlayerId; toZone: Zone; cause: SignalCause }

    // Generic
    | { type: "CARD_TRASHED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: SignalCause }
    | { type: "CARD_REVEALED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; revealedTo: RevealedTo; cause: SignalCause }

    // Conditional — only emitted if mechanic exists
    | { type: "POWER_THRESHOLD_CROSSED"; instanceId: CardInstanceId; controller: PlayerId; previous: number; current: number };

export type SignalType = GameSignal["type"];

type SignalCategory =
    | "CARD_PLAYED"
    | "CARD_LEFT_FIELD"
    | "CARD_TRASHED"
    | "CARD_RETURNED"
    | "REST_STATE_CHANGED"
    | "CARD_RESTED"
    | "CARD_SET_ACTIVE"
    | "DON_CHANGED"
    | "LIFE_CHANGED"
    | "TURN_BOUNDARY"
    | "BATTLE_BOUNDARY";

export type Listener = {
    listenerId: string;
    instanceId: CardInstanceId;
    activeZones: Zone[];
    condition: CardFilter | null;
    effectDefinitionId: string;
    signalType: SignalType;          // exactly one signal type per listener
};