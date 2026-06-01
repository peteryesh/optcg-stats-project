import type { CardInstanceId, PlayerId, Phase, BattlePhase, EndReason, FrameId, CardId, GameSeeds, BattleRecord } from './primitives';
import type { GameSignal, SignalType, Listener } from './signal';
import type { CardFilter } from './filter';
import type { Card, CardDef, CardInstance } from './card';
import type { GameAction } from './action';
import { EffectSequence, SequencedEffect, StatusEffect } from './effect';
import { ActionRecord } from './record';

export type PendingDecision =
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

// RNG Cursors
type RngCursors = {
    game: bigint;
    players: Record<PlayerId, bigint>;
};

type TeamConfig =
    | { kind: "FREE_FOR_ALL" }                    // every player for themselves
    | { kind: "TEAMS"; teams: PlayerId[][] };      // e.g. [["p1","p3"], ["p2","p4"]]

type WinCondition =
    | { kind: "LAST_STANDING" }                   // last player with life wins
    | { kind: "TEAM" }                            // team-based, derived from TeamConfig

type PlayerConfig = {
    playerId: PlayerId;
    isActive: boolean;                            // false = auto-pass
};

export type GameConfig = {
    players: Record<PlayerId, PlayerConfig>;
    teamConfig: TeamConfig;
    winCondition: WinCondition;
};

export type SetupState = {
    coinFlipWinner: PlayerId; // player who gets to call CHOOSE_TURN_ORDER
    // null = not yet decided, false = kept hand, true = chose to mulligan
    mulligan: Record<PlayerId, "PENDING" | "KEEP" | "MULLIGAN">;
};

///----------------------------------------------------------------
/// Game State
///----------------------------------------------------------------
export interface GameState {
    // Game Metadata
    gameId: string;
    version: number; // not implemented

    config: GameConfig;

    // Game Settings
    setup: SetupState;
    seeds: GameSeeds;
    rngCursors: RngCursors;

    // The Game Board
    definitions: Record<CardId, CardDef>; // card definitions, loaded at game start and immutable
    instances: Record<CardInstanceId, CardInstance>; // Card instances for all players
    playerZones: Record<PlayerId, PlayerZones>; // Card zones for each player, keeps the card locations

    // Turn and Phase
    turnOrder: PlayerId[];  // player order
    turn: number;
    activePlayerId: PlayerId;
    phase: Phase;
    cardsPlayedThisTurn: CardInstanceId[]; // used for tracking same-turn played effects and eligible attackers

    // Combat State
    currentBattle: BattleRecord | null;
    battlesThisTurn: BattleRecord[]; // used for tracking multiple attacks with the same character and same-turn attack effects

    // Effects
    currentEffect: EffectSequence | null;  // the currently resolving effect, if any
    pendingEffects: Record<PlayerId, EffectSequence[]>;

    pendingDecision: PendingDecision | null;
    
    // Listener arrays that cards add their effects to in response to game signals and hooks
    listeners: SequencedEffect[];
    activatableEffects: SequencedEffect[]; // need to refactor this to accept Passive, Replacement, and Suppression effects
    statusEffects: StatusEffect[]; // temporary modifications to cards on the board, public and cleaned up on signal or phase change
    
    // History
    actionLog: ActionRecord[];

    // Game Outcome
    winner: PlayerId | null;
    endReason: EndReason | null;
}


///----------------------------------------------------------------
/// Zones
///----------------------------------------------------------------
export interface PlayerZones {
    characters: CardInstanceId[];
    deck: CardInstanceId[];
    donActive: CardInstanceId[];
    donDeck: CardInstanceId[];
    donRested: CardInstanceId[];
    hand: CardInstanceId[];
    leader: CardInstanceId[]; // Only one allowed, but creating space for alternate game modes with multiple or shared leaders
    life: CardInstanceId[];
    look: CardInstanceId[];   // system zone: temporarily holds cards being looked at or manipulated
    stage: CardInstanceId[];  // only one allowed, but using array for consistency and ease of indexing
    trash: CardInstanceId[];
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