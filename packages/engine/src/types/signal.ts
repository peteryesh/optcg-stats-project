import { CardFilter } from './filter';
import type { CardId, CardInstanceId, Attribute, CardClass, Color, PlayerId, Zone, EndReason, StackPosition, RevealedTo, Phase, BattleRecord } from './primitives';

// ============================================================
// Shared Types
// ============================================================
export type PlayCause =
    | { kind: "PLAYER" }
    | { kind: "EFFECT"; sourceId: CardInstanceId }
    | { kind: "RULE" };

export type SignalCause =
    | { kind: "PLAYER" }
    | { kind: "BATTLE"; sourceId: CardInstanceId }
    | { kind: "EFFECT"; sourceId: CardInstanceId }
    | { kind: "OVERFLOW" }
    | { kind: "RULE" };

export type RemovalMethod = 
    | "KO"
    | "TRASH_CARD"
    | "BOUNCE_TO_HAND"
    | "SEND_TO_DECK"
    | "SEND_TO_LIFE"
    | "REPLACE"

// ============================================================
// Signals
// ============================================================

export type GameSignal =
    // Card Movement
    | { type: "CARDS_SENT_TO_TRASH"; instanceIds: CardInstanceId[]; fromZone: Zone; controller: PlayerId; cause: SignalCause }
    | { type: "CARDS_SENT_TO_HAND"; instanceIds: CardInstanceId[]; fromZone: Zone; controller: PlayerId; cause: SignalCause }
    | { type: "CARDS_SENT_TO_DECK"; instanceIds: CardInstanceId[]; fromZone: Zone; position: StackPosition; controller: PlayerId; cause: SignalCause }
    | { type: "CARDS_SENT_TO_LIFE"; instanceIds: CardInstanceId[]; fromZone: Zone; position: StackPosition; controller: PlayerId; cause: SignalCause }
    | { type: "CARDS_SENT_TO_LOOK"; instanceIds: CardInstanceId[]; fromZone: Zone; controller: PlayerId; cause: SignalCause }
    | { type: "CARD_SENT_TO_TRIGGER"; instanceId: CardInstanceId; fromZone: Zone; controller: PlayerId; cause: SignalCause }
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
    | { type: "DAMAGE_TAKEN"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "LIFE_DAMAGED"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "LETHAL_DAMAGE_TAKEN"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    // | { type: "LIFE_REVEALED"; instanceId: CardInstanceId; controller: PlayerId; position: StackPosition; revealedTo: RevealedTo; cause: SignalCause }
    // | { type: "LIFE_FLIPPED"; instanceId: CardInstanceId; controller: PlayerId; position: StackPosition; cause: SignalCause }
    // | { type: "LIFE_REORDERED"; controller: PlayerId; cause: SignalCause }
    // | { type: "LIFE_REVEALED_AS_TRIGGER"; instanceId: CardInstanceId; controller: PlayerId; position: StackPosition }

    // Card Plays
    | { type: "CHARACTER_PLAYED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; toZone: Zone; cause: PlayCause; }
    | { type: "STAGE_PLAYED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; toZone: Zone; cause: PlayCause; }
    | { type: "EVENT_PLAYED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; toZone: Zone; cause: PlayCause; }
    // | { type: "CARD_PLAYED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; toZone: Zone; cause: PlayCause}

    | { type: "CARD_REMOVED_FROM_FIELD"; instanceId: CardInstanceId; controller: PlayerId; removalMethod: RemovalMethod; cause: SignalCause }

    // Phase Changes
    | { type: "PHASE_CHANGED"; prevPhase: Phase; nextPhase: Phase; cause: SignalCause }
    

    // Combat
    | { type: "ATTACK_DECLARED"; attackerId: CardInstanceId; defenderId: CardInstanceId; controller: PlayerId }
    | { type: "ATTACK_REDIRECTED"; attackerId: CardInstanceId; fromDefenderId: CardInstanceId; toDefenderId: CardInstanceId; cause: SignalCause }
    | { type: "BLOCKER_DECLARED"; blockerId: CardInstanceId; attackerId: CardInstanceId; prevDefenderId: CardInstanceId; controller: PlayerId; cause: SignalCause }
    | { type: "COUNTER_PLAYED"; counterId: CardInstanceId; battle: BattleRecord; controller: PlayerId }
    | { type: "BATTLE_RESOLVED"; battle: BattleRecord; attackerPower: number; defenderPower: number; outcome: "HIT" | "FAIL" }

    
    // Game Setup (review this section after finalizing game setup flow)
    | { type: "GAME_SETUP_STARTED"; turnOrder: PlayerId[] }
    | { type: "COIN_FLIP_RESOLVED"; winner: PlayerId; result: "HEADS" | "TAILS" }
    | { type: "TURN_ORDER_DECIDED"; turnOrder: PlayerId[] }
    | { type: "HAND_DEALT"; controller: PlayerId; instanceIds: CardInstanceId[] }
    | { type: "LIFE_SET_UP"; controller: PlayerId; instanceIds: CardInstanceId[] }
    | { type: "GAME_STARTED"; firstPlayerId: PlayerId }

    // Game Flow
    | { type: "GAME_OVER"; winner: PlayerId; endReason: EndReason }

    // Look Zone
    | { type: "CARD_ADDED_TO_LOOK"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: SignalCause }
    | { type: "CARD_TAKEN_FROM_LOOK"; instanceId: CardInstanceId; controller: PlayerId; toZone: Zone; cause: SignalCause }

    // Generic
    | { type: "CARD_REVEALED"; instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; revealedTo: RevealedTo; cause: SignalCause }

export type SignalType = GameSignal["type"];

export type Listener = {
    listenerId: string;
    instanceId: CardInstanceId;
    activeZones: Zone[];
    condition: CardFilter | null;
    effectDefinitionId: string;
    signalType: SignalType;          // exactly one signal type per listener
};