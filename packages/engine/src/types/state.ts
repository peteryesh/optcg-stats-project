import type { CardInstanceId, PlayerId, Phase, BattlePhase, EndReason, FrameId } from './primitives';
import type { GameSignal } from './signal';
import type { CardFilter } from './filter';
import type { CardInstance } from './card';
import type { Action } from './action';


type BattleRecord = { attackerId: CardInstanceId; defenderId: CardInstanceId; };



type EffectFrame = {
    frameId: string;
    sourceInstanceId: CardInstanceId;
    effectId: string;
    gameSignal: GameSignal;
    resolvedValues: Record<string, any>;
    controllerAtQueueTime: PlayerId;
}

type PendingDecision =
  | {
      type: "NEXT_EFFECT";
      playerId: PlayerId;
    }
  | {
      type: "CHOOSE_TARGET";
      playerId: PlayerId;
      sourceFrameId: FrameId;
      validTargets: CardInstanceId[];
      min: number;
      max: number;
    }
  | {
      type: "CHOOSE_FROM_HAND";
      playerId: PlayerId;
      sourceFrameId: FrameId;
      count: number;
      filter: CardFilter;
      optional: boolean;
    }
  | {
      type: "CHOOSE_FROM_LOOK";
      playerId: PlayerId;
      sourceFrameId: FrameId;
      count: number;
      filter: CardFilter;
      optional: boolean;
    }
  | {
      type: "BLOCKER_RESPONSE";
      playerId: PlayerId;
      attackerId: CardInstanceId;
      eligibleBlockers: CardInstanceId[];
    }
  | {
      type: "COUNTER_RESPONSE";
      playerId: PlayerId;
      attackerId: CardInstanceId;
      defenderId: CardInstanceId;
    };

///----------------------------------------------------------------
/// Game State
///----------------------------------------------------------------
export interface GameState {
    // Game Metadata
    gameId: string;
    version: number;

    // The Game Board
    instances: Record<CardInstanceId, CardInstance>; // Card instances for all players
    players: Record<PlayerId, PlayerZones>; // Card zones for each player, keeps the card locations

    // Turn and Phase
    turnOrder: PlayerId[];  // player order
    turnNumber: number;
    activePlayerId: PlayerId;
    phase: Phase;
    cardsPlayedThisTurn: CardInstanceId[]; // used for tracking same-turn played effects and eligible attackers

    // Combat State
    battlePhase: BattlePhase | null;
    battlesThisTurn: BattleRecord[]; // used for tracking multiple attacks with the same character and same-turn attack effects

    // Effect Resolution
    currentEffect: EffectFrame | null;  // the currently resolving effect, if any
    pendingEffects: Record<PlayerId, EffectFrame[]>;
    pendingDecision: PendingDecision | null;

    // Modifier Layers
    // listeners: Record<SignalType, Listener[]>;
    // continuousEffects: ContinuousEffect[];
    // replacementEffects: ReplacementEffect[];
    // effectSuppressions: AbilitySuppression[];

    // History
    signalLog: GameSignal[];
    actionLog: Action[];

    // Game Outcome
    winner: PlayerId | null;
    endReason: EndReason | null;

    tick: number;  // increments with every state change, used for synchronization and replay purposes
}


///----------------------------------------------------------------
/// Zones
///----------------------------------------------------------------
export interface PlayerZones {
    // Hidden Card Zones
    deck: CardInstanceId[];
    life: CardInstanceId[];

    // Visible Card Zones
    characters: CardInstanceId[];
    stage: CardInstanceId | null;
    leader: CardInstanceId;
    trash: CardInstanceId[];

    // Only visible to the owning player
    hand: CardInstanceId[];

    // Don Card Zones
    donDeck: CardInstanceId[];
    donActive: CardInstanceId[];
    donRested: CardInstanceId[];

    // System Card Zones (not visible to players, used for game state management)
    look: CardInstanceId[];  // used for temporarily holding cards that are being looked at or manipulated
}


///----------------------------------------------------------------
/// Cards (runtime instances)
///----------------------------------------------------------------
// Base — fields every instance has





///----------------------------------------------------------------
/// Replay
///----------------------------------------------------------------
// interface Replay {
//   initialState: GameState;
//   actions: Action[];
//   rngEvents: RngEvent[];  // pre-recorded results, consumed in order
// }