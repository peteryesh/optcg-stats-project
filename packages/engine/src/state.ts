import { Action } from './actions';
import type { Attribute, CardClass, Color } from './card-database';
import type { BaseCostOverride, BasePowerOverride, CostModifier, PowerModifier, StatusEffect } from './modifiers';
import type { GameSignal } from './signals';

// CardInstanceId
export type CardInstanceId = string & { __brand: 'CardInstanceId' };
export const CardInstanceId = (s: string): CardInstanceId => s as CardInstanceId;

// CardId
export type CardId = string & { __brand: 'CardId' };
export const CardId = (s: string): CardId => s as CardId;

export type PlayerId = 'p1' | 'p2'; // add player 3 and 4 support later

export type ListenerId = string;
export type FrameId = string;

export type Zone =
    | 'DECK'
    | 'HAND'
    | 'LIFE'
    | 'TRASH'
    | 'CHARACTERS'
    | 'STAGE'
    | 'LEADER'
    | 'DON_DECK'
    | 'DON_ACTIVE'
    | 'DON_RESTED'
    | 'LOOK';

// Game Phases
export type Phase = 'SETUP' | 'START_OF_TURN' | 'REFRESH' | 'DRAW' | 'MAIN' | 'END_OF_TURN' | 'GAME_END';
export type BattlePhase = 'WHEN_ATTACKING' | 'ON_OPPONENT_ATTACK' | 'BLOCKER' | 'COUNTER' | 'RESOLUTION' | 'DAMAGE';
export type TriggerPhase = 'ACTIVATE_TRIGGER' | 'TO_HAND' | 'TO_TRASH' | 'EFFECT';

export type EndReason = 'KNOCKOUT' | 'DECKOUT' | 'CONCEDE' | 'TIMEOUT' | 'DISCONNECT';

type BattleRecord = { attackerId: CardInstanceId; defenderId: CardInstanceId; };

type CardFilter =
  | { kind: "ANY" }
  | { kind: "SPECIFIC";    instanceId: CardInstanceId }
  | { kind: "CONTROLLER";  controller: "SELF" | "OPPONENT" | "ANY" }
  | { kind: "NAME";        name: string }              // checks name and aliases
  | { kind: "CLASS";       cardClass: CardClass }
  | { kind: "COST";        op: ">=" | "<=" | "==" | ">" | "<"; value: number, base: boolean }
  | { kind: "POWER";       op: ">=" | "<=" | "==" | ">" | "<"; value: number, base: boolean }
  | { kind: "COUNTER";     op: ">=" | "<=" | "==" | ">" | "<"; value: number }
  | { kind: "COLOR";       color: Color }
  | { kind: "TYPE";        cardType: string }          // OPTCG group/affiliation
  | { kind: "ATTRIBUTE";   attribute: Attribute }
  | { kind: "AND";         filters: CardFilter[] }
  | { kind: "OR";          filters: CardFilter[] }
  | { kind: "NOT";         filter: CardFilter };

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
interface BaseInstance {
  instanceId: CardInstanceId;
  cardId: CardId;
  controller: PlayerId;
  currentZone: Zone;
  isRested: boolean;
}

// Character — can attack, have DON!! attached, use effects
interface CharacterInstance extends BaseInstance {
  class: "CHARACTER";
  attachedDon: CardInstanceId[];
  playedOnTurns: number[];
  effectsUsedThisTurn: Record<string, boolean>;
}

// Leader — like character but tracks life and has rule modifiers
interface LeaderInstance extends BaseInstance {
  class: "LEADER";
  attachedDon: CardInstanceId[];
  playedOnTurns: number[];
  effectsUsedThisTurn: Record<string, boolean>;
}

// Stage — enters play, can be bounced, no DON!!
interface StageInstance extends BaseInstance {
  class: "STAGE";
  playedOnTurns: number[];
  effectsUsedThisTurn: Record<string, boolean>;
}

interface EventInstance extends BaseInstance {
  class: "EVENT";
  playedOnTurns: number[];
}

// DON!! — attaches to characters/leader, tracks attachment
interface DonInstance extends BaseInstance {
  class: "DON";
  attachedTo: CardInstanceId | null;
}

type CardInstance =
  | CharacterInstance
  | LeaderInstance
  | StageInstance
  | EventInstance
  | DonInstance;


///----------------------------------------------------------------
/// Replay
///----------------------------------------------------------------
// interface Replay {
//   initialState: GameState;
//   actions: Action[];
//   rngEvents: RngEvent[];  // pre-recorded results, consumed in order
// }