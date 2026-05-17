import { Zone, EndReason } from "./state";
import { CardInstanceId, PlayerId, PlayerZones } from "./state";

// ============================================================
// Shared Types
// ============================================================

type Position = "TOP" | "BOTTOM";
type RevealedTo = "BOTH" | "SELF" | "OPPONENT";

type PlayCause =
  | { kind: "PLAYER" }
  | { kind: "EFFECT"; sourceId: CardInstanceId }
  | { kind: "RULE" };

type RemovalCause =
  | { kind: "BATTLE"; sourceId: CardInstanceId }
  | { kind: "EFFECT"; sourceId: CardInstanceId }
  | { kind: "OVERFLOW" }
  | { kind: "RULE" };

type DamageCause =
  | { kind: "BATTLE"; sourceId: CardInstanceId }
  | { kind: "EFFECT"; sourceId: CardInstanceId };

type SignalCause =
  | { kind: "EFFECT"; sourceId: CardInstanceId }
  | { kind: "RULE" };

// ============================================================
// Signals
// ============================================================

export type GameSignal =
  // Card Plays
  | { type: "CHARACTER_PLAYED";  instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: PlayCause }
  | { type: "STAGE_PLAYED";      instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: PlayCause }
  | { type: "EVENT_PLAYED";      instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: PlayCause }

  // Card Removal from Field
  | { type: "CHARACTER_KOD";           instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
  | { type: "CHARACTER_TRASHED";       instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
  | { type: "CHARACTER_BOUNCED";       instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
  | { type: "CHARACTER_SENT_TO_DECK";  instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause; position: Position }
  | { type: "STAGE_KOD";              instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
  | { type: "STAGE_TRASHED";          instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
  | { type: "STAGE_BOUNCED";          instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause }
  | { type: "STAGE_SENT_TO_DECK";     instanceId: CardInstanceId; controller: PlayerId; cause: RemovalCause; position: Position }

  // Hand & Deck
  | { type: "CARD_DRAWN";             instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "CARD_DISCARDED";         instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "CARD_RETURNED_TO_HAND";  instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: SignalCause }
  | { type: "CARD_MILLED";            instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "CARD_SENT_TO_DECK";      instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; position: Position; cause: SignalCause }
  | { type: "DECK_SHUFFLED";          playerId: PlayerId; cause: SignalCause }

  // Rest State
  | { type: "CHARACTER_RESTED";     instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "CHARACTER_SET_ACTIVE"; instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "LEADER_RESTED";        instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "LEADER_SET_ACTIVE";    instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "STAGE_RESTED";         instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "STAGE_SET_ACTIVE";     instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "CARD_RESTED";          instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "CARD_SET_ACTIVE";      instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }

  // Combat
  | { type: "ATTACK_DECLARED";        attackerId: CardInstanceId; defenderId: CardInstanceId; controller: PlayerId }
  | { type: "BLOCKER_DECLARED";       blockerId: CardInstanceId;  attackerId: CardInstanceId; controller: PlayerId }
  | { type: "COUNTER_PLAYED";         counterId: CardInstanceId;  targetId: CardInstanceId;   controller: PlayerId }
  | { type: "ATTACK_RESOLVED";        attackerId: CardInstanceId; defenderId: CardInstanceId; controller: PlayerId; outcome: "HIT" | "BLOCKED" | "COUNTERED" }
  | { type: "ATTACK_REDIRECTED";      attackerId: CardInstanceId; fromDefenderId: CardInstanceId; toDefenderId: CardInstanceId; turnNumber: number }

  // Life & Damage
  | { type: "DAMAGE_DEALT";             instanceId: CardInstanceId; controller: PlayerId; amount: number; cause: DamageCause }
  | { type: "LIFE_REMOVED";             instanceId: CardInstanceId; playerId: PlayerId; position: Position; cause: SignalCause }
  | { type: "LIFE_TAKEN_TO_HAND";       instanceId: CardInstanceId; playerId: PlayerId; position: Position; cause: SignalCause }
  | { type: "LIFE_TRASHED";             instanceId: CardInstanceId; playerId: PlayerId; position: Position; cause: SignalCause }
  | { type: "LIFE_ADDED";               instanceId: CardInstanceId; playerId: PlayerId; position: Position; cause: SignalCause }
  | { type: "LIFE_REVEALED";            instanceId: CardInstanceId; playerId: PlayerId; position: Position; revealedTo: RevealedTo; cause: SignalCause }
  | { type: "LIFE_FLIPPED";             instanceId: CardInstanceId; playerId: PlayerId; position: Position; cause: SignalCause }
  | { type: "LIFE_REORDERED";           playerId: PlayerId; cause: SignalCause }
  | { type: "LIFE_REVEALED_AS_TRIGGER"; instanceId: CardInstanceId; playerId: PlayerId; position: Position }

  // Game Setup (review this section after finalizing game setup flow)
    | { type: "GAME_SETUP_STARTED";  turnOrder: PlayerId[] }
    | { type: "COIN_FLIP_RESOLVED";  winner: PlayerId; result: "HEADS" | "TAILS" }
    | { type: "TURN_ORDER_DECIDED";  turnOrder: PlayerId[] }
    | { type: "HAND_DEALT";          playerId: PlayerId; instanceIds: CardInstanceId[] }
    | { type: "LIFE_SET_UP";         playerId: PlayerId; instanceIds: CardInstanceId[] }
    | { type: "GAME_STARTED";        firstPlayerId: PlayerId }

  // Game Flow
  | { type: "TURN_STARTED";                   playerId: PlayerId; turnNumber: number }
  | { type: "TURN_ENDED";                     playerId: PlayerId; turnNumber: number }
  | { type: "REFRESH_PHASE_STARTED";          playerId: PlayerId; turnNumber: number }
  | { type: "REFRESH_PHASE_ENDED";            playerId: PlayerId; turnNumber: number }
  | { type: "DON_PHASE_STARTED";              playerId: PlayerId; turnNumber: number }
  | { type: "DON_PHASE_ENDED";               playerId: PlayerId; turnNumber: number }
  | { type: "DRAW_PHASE_STARTED";             playerId: PlayerId; turnNumber: number }
  | { type: "DRAW_PHASE_ENDED";              playerId: PlayerId; turnNumber: number }
  | { type: "MAIN_PHASE_STARTED";             playerId: PlayerId; turnNumber: number }
  | { type: "MAIN_PHASE_ENDED";              playerId: PlayerId; turnNumber: number }
  | { type: "BATTLE_PHASE_STARTED";           playerId: PlayerId; turnNumber: number }
  | { type: "WHEN_ATTACKING_PHASE_STARTED";   attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
  | { type: "WHEN_ATTACKING_PHASE_ENDED";     attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
  | { type: "ON_OPPONENT_ATTACK_PHASE_STARTED"; attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
  | { type: "ON_OPPONENT_ATTACK_PHASE_ENDED";   attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
  | { type: "BLOCKER_PHASE_STARTED";          attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
  | { type: "BLOCKER_PHASE_ENDED";            attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
  | { type: "COUNTER_PHASE_STARTED";          attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
  | { type: "COUNTER_PHASE_ENDED";            attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
  | { type: "RESOLUTION_PHASE_STARTED";       attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
  | { type: "RESOLUTION_PHASE_ENDED";         attackerId: CardInstanceId; defenderId: CardInstanceId; turnNumber: number }
  | { type: "BATTLE_PHASE_ENDED";             playerId: PlayerId; turnNumber: number }
  | { type: "MULLIGAN_KEPT";                  playerId: PlayerId }
  | { type: "MULLIGAN_TAKEN";                 playerId: PlayerId }
  | { type: "GAME_OVER";                      winner: PlayerId; endReason: EndReason }

  // DON!!
  | { type: "DON_DRAWN";             instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "DON_ATTACHED";          donId: CardInstanceId; targetId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "DON_DETACHED";          donId: CardInstanceId; targetId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "DON_RESTED";            instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "DON_SET_ACTIVE";        instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }
  | { type: "DON_RETURNED_TO_DECK";  instanceId: CardInstanceId; controller: PlayerId; cause: SignalCause }

  // Look Zone
  | { type: "CARD_ADDED_TO_LOOK";    instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: SignalCause }
  | { type: "CARD_TAKEN_FROM_LOOK";  instanceId: CardInstanceId; controller: PlayerId; toZone: Zone; cause: SignalCause }

  // Generic
  | { type: "CARD_TRASHED";          instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; cause: SignalCause }
  | { type: "CARD_REVEALED";         instanceId: CardInstanceId; controller: PlayerId; fromZone: Zone; revealedTo: RevealedTo; cause: SignalCause }

  // Conditional — only emitted if mechanic exists
  | { type: "POWER_THRESHOLD_CROSSED"; instanceId: CardInstanceId; controller: PlayerId; previous: number; current: number };

export type SignalType = GameSignal["type"];