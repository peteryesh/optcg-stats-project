import type { CardKind, Phase } from './constants';

export type CardInstanceId = string & { __brand: 'CardInstanceId' };
export const CardInstanceId = (s: string): CardInstanceId => s as CardInstanceId;

export type CardId = string & { __brand: 'CardId' };
export const CardId = (s: string): CardId => s as CardId;

export type PlayerId = 'p1' | 'p2';

///----------------------------------------------------------------
/// Cards (runtime instances)
///----------------------------------------------------------------
export interface BaseCard {
    instanceId: CardInstanceId;
    cardId: CardId;
    ownerId: PlayerId;
}

export interface LeaderCard extends BaseCard {
    kind: Extract<CardKind, 'leader'>;
    rested: boolean;
    attachedDon: CardInstanceId[];
    abilityUsage: Record<number, number>;
}

export interface CharacterCard extends BaseCard {
    kind: Extract<CardKind, 'character'>;
    rested: boolean;
    attachedDon: CardInstanceId[];
    playedThisTurn: boolean;
    abilityUsage: Record<number, number>;
}

export interface StageCard extends BaseCard {
    kind: Extract<CardKind, 'stage'>;
    rested: boolean;
    abilityUsage: Record<number, number>;
}

export interface EventCard extends BaseCard {
    kind: Extract<CardKind, 'event'>;
    abilityUsage: Record<number, number>;
}

export interface DonCard extends BaseCard {
    kind: Extract<CardKind, 'don'>;
}

export type Card =
    | LeaderCard
    | CharacterCard
    | StageCard
    | EventCard
    | DonCard;

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
}

///----------------------------------------------------------------
/// Player State
///----------------------------------------------------------------

export interface PlayerState {
    id: PlayerId;
    zones: PlayerZones;
    hasMulliganed: boolean;
}

///----------------------------------------------------------------
/// Turn Structure
///----------------------------------------------------------------
export interface TurnState {
    activePlayer: PlayerId;
    phase: Phase;
    turnNumber: number;
    isFirstTurn: boolean;
}

///----------------------------------------------------------------
/// Game Status
///----------------------------------------------------------------
export type GameStatus = 
    | {type: 'not_started'}
    | {type: 'in_progress'}
    | {type: 'finished', winner: PlayerId; reason: 'knockout' | 'deck_out' | 'concede' | 'alternate_win_condition'};

///----------------------------------------------------------------
/// Game State
///----------------------------------------------------------------
export interface GameState {
    version: number;
    cards: Record<CardInstanceId, Card>;
    players: Record<PlayerId, PlayerState>;
    turn: TurnState;
    status: GameStatus;
    tick: number;  // increments with every state change, used for synchronization and replay purposes
}

///----------------------------------------------------------------
/// Replay
///----------------------------------------------------------------
// interface Replay {
//   initialState: GameState;
//   actions: Action[];
//   rngEvents: RngEvent[];  // pre-recorded results, consumed in order
// }