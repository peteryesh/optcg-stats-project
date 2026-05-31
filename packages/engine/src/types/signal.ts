import { CardFilter } from './filter';
import type { CardId, CardInstanceId, Attribute, CardClass, Color, PlayerId, Zone, EndReason, StackPosition, RevealedTo, Phase } from './primitives';

// ============================================================
// Shared Types
// ============================================================
export type PlayCause =
    | { kind: "PLAYER" }
    | { kind: "EFFECT"; sourceId: CardInstanceId }
    | { kind: "RULE" };

export type DamageCause =
    | { kind: "BATTLE"; sourceId: CardInstanceId }
    | { kind: "EFFECT"; sourceId: CardInstanceId }

export type SignalCause =
    | { kind: "PLAYER" }
    | { kind: "BATTLE"; sourceId: CardInstanceId }
    | { kind: "DAMAGE"; sourceId: CardInstanceId }
    | { kind: "EFFECT"; sourceId: CardInstanceId }
    | { kind: "OVERFLOW" }
    | { kind: "RULE" };

// ============================================================
// Signals
// ============================================================

export type GameSignal =
    // Card Movement
    | { type: "CARDS_SENT_TO_TRASH"; instanceIds: CardInstanceId[]; fromZone: Zone; controller: PlayerId; cause: SignalCause }
    | { type: "CARDS_SENT_TO_HAND"; instanceIds: CardInstanceId[]; fromZone: Zone; controller: PlayerId; cause: SignalCause }
    | { type: "CARDS_SENT_TO_DECK"; instanceIds: CardInstanceId[]; fromZone: Zone; position: StackPosition; controller: PlayerId; cause: SignalCause }
    | { type: "CARDS_SENT_TO_LIFE"; instanceIds: CardInstanceId[]; fromZone: Zone; position: StackPosition; controller: PlayerId; cause: SignalCause }
    // | { type: "DECK_SHUFFLED"; controller: PlayerId; cause: SignalCause }

    | { type: "CARDS_SET_ACTIVE"; instanceIds: CardInstanceId[]; controller: PlayerId; cause: SignalCause}
    | { type: "CARDS_RESTED"; instanceIds: CardInstanceId[]; controller: PlayerId; cause: SignalCause}

    // DON!!
    | { type: "DON_ADDED"; instanceIds: CardInstanceId[]; rested: boolean; controller: PlayerId; cause: SignalCause }
    | { type: "DON_RESTED"; instanceIds: CardInstanceId[]; controller: PlayerId; cause: SignalCause }
    | { type: "DON_SET_ACTIVE"; instanceIds: CardInstanceId[]; controller: PlayerId; cause: SignalCause }
    | { type: "DON_RETURNED"; instanceIds: CardInstanceId[]; controller: PlayerId; cause: SignalCause }
    | { type: "DON_ATTACHED"; instanceIds: CardInstanceId[]; targetId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "DON_DETACHED"; instanceIds: CardInstanceId[]; originId: CardInstanceId, controller: PlayerId; cause: SignalCause }

    // Life & Damage
    | { type: "DAMAGE_DEALT"; instanceId: CardInstanceId; controller: PlayerId; cause: DamageCause }
    | { type: "LIFE_DAMAGED"; instanceId: CardInstanceId; controller: PlayerId; cause: DamageCause }
    // | { type: "LIFE_REVEALED"; instanceId: CardInstanceId; controller: PlayerId; position: StackPosition; revealedTo: RevealedTo; cause: SignalCause }
    // | { type: "LIFE_FLIPPED"; instanceId: CardInstanceId; controller: PlayerId; position: StackPosition; cause: SignalCause }
    // | { type: "LIFE_REORDERED"; controller: PlayerId; cause: SignalCause }
    // | { type: "LIFE_REVEALED_AS_TRIGGER"; instanceId: CardInstanceId; controller: PlayerId; position: StackPosition }

    // Card Plays
    | { type: "CHARACTER_PLAYED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; toZone: Zone; cause: PlayCause; replaced?: CardInstanceId }
    | { type: "STAGE_PLAYED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; toZone: Zone; cause: PlayCause; replaced?: CardInstanceId }
    | { type: "EVENT_PLAYED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; toZone: Zone; cause: PlayCause; }
    // | { type: "CARD_PLAYED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; toZone: Zone; cause: PlayCause}

    // Phase Changes
    | { type: "PHASE_CHANGED"; prevPhase: Phase; nextPhase: Phase; cause: SignalCause }
    



    // Card Removal from Field
    | { type: "CHARACTER_KOD"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "CHARACTER_TRASHED"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "CHARACTER_BOUNCED"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "CHARACTER_SENT_TO_DECK"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause; position: StackPosition }
    | { type: "STAGE_KOD"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "STAGE_TRASHED"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "STAGE_BOUNCED"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "STAGE_SENT_TO_DECK"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause; position: StackPosition }

    
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

    
    // Game Setup (review this section after finalizing game setup flow)
    | { type: "GAME_SETUP_STARTED"; turnOrder: PlayerId[] }
    | { type: "COIN_FLIP_RESOLVED"; winner: PlayerId; result: "HEADS" | "TAILS" }
    | { type: "TURN_ORDER_DECIDED"; turnOrder: PlayerId[] }
    | { type: "HAND_DEALT"; controller: PlayerId; instanceIds: CardInstanceId[] }
    | { type: "LIFE_SET_UP"; controller: PlayerId; instanceIds: CardInstanceId[] }
    | { type: "GAME_STARTED"; firstPlayerId: PlayerId }

    // Game Flow
    | { type: "TURN_STARTED"; controller: PlayerId; turnNumber: number }
    | { type: "TURN_ENDED"; controller: PlayerId; turnNumber: number }
    | { type: "REFRESH_PHASE_STARTED"; controller: PlayerId; turnNumber: number }
    | { type: "REFRESH_PHASE_ENDED"; controller: PlayerId; turnNumber: number }
    | { type: "DON_PHASE_STARTED"; controller: PlayerId; turnNumber: number }
    | { type: "DON_PHASE_ENDED"; controller: PlayerId; turnNumber: number }
    | { type: "DRAW_PHASE_STARTED"; controller: PlayerId; turnNumber: number }
    | { type: "DRAW_PHASE_ENDED"; controller: PlayerId; turnNumber: number }
    | { type: "MAIN_PHASE_STARTED"; controller: PlayerId; turnNumber: number }
    | { type: "MAIN_PHASE_ENDED"; controller: PlayerId; turnNumber: number }
    | { type: "BATTLE_PHASE_STARTED"; controller: PlayerId; turnNumber: number }
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
    | { type: "BATTLE_PHASE_ENDED"; controller: PlayerId; turnNumber: number }
    | { type: "MULLIGAN_KEPT"; controller: PlayerId }
    | { type: "MULLIGAN_TAKEN"; controller: PlayerId }
    | { type: "GAME_OVER"; winner: PlayerId; endReason: EndReason }

    // Look Zone
    | { type: "CARD_ADDED_TO_LOOK"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: SignalCause }
    | { type: "CARD_TAKEN_FROM_LOOK"; instanceId: CardInstanceId; controller: PlayerId; toZone: Zone; cause: SignalCause }

    // Generic
    | { type: "CARD_TRASHED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: SignalCause }
    | { type: "CARD_REVEALED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; revealedTo: RevealedTo; cause: SignalCause }

    // Conditional — only emitted if mechanic exists
    | { type: "POWER_THRESHOLD_CROSSED"; instanceId: CardInstanceId; controller: PlayerId; previous: number; current: number };

export type SignalType = GameSignal["type"];

export type Listener = {
    listenerId: string;
    instanceId: CardInstanceId;
    activeZones: Zone[];
    condition: CardFilter | null;
    effectDefinitionId: string;
    signalType: SignalType;          // exactly one signal type per listener
};