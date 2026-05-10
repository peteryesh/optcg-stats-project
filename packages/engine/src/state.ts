import type { CardClass, Phase } from './constants';
import type { BaseCostOverride, BasePowerOverride, CostModifier, PowerModifier, StatusEffect } from './modifiers';

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
    playerId: PlayerId;
}

export interface LeaderCard extends BaseCard {
    class: Extract<CardClass, 'LEADER'>;
    attachedDon: CardInstanceId[];

    // Status
    rested: boolean;
    abilityUsage: Record<number, number>;

    // Power
    basePowerOverrides: BasePowerOverride[];
    basePowerModifiers: PowerModifier[];
    powerModifiers: PowerModifier[];
}

export interface CharacterCard extends BaseCard {
    class: Extract<CardClass, 'CHARACTER'>;
    attachedDon: CardInstanceId[];

    // Status
    rested: boolean;
    playedThisTurn: boolean;
    abilityUsage: Record<number, number>;
    statusEffects: StatusEffect[];
    
    // Power
    basePowerOverrides: BasePowerOverride[];
    basePowerModifiers: PowerModifier[];
    powerModifiers: PowerModifier[];

    // Cost
    baseCostOverrides: BaseCostOverride[];
    baseCostModifiers: CostModifier[];
    costModifiers: CostModifier[];
}

export interface StageCard extends BaseCard {
    class: Extract<CardClass, 'STAGE'>;
    rested: boolean;
    abilityUsage: Record<number, number>;

    // Cost
    baseCostOverrides: BaseCostOverride[];
    baseCostModifiers: CostModifier[];
    costModifiers: CostModifier[];
}

export interface EventCard extends BaseCard {
    class: Extract<CardClass, 'EVENT'>;
    abilityUsage: Record<number, number>;

    // Cost
    baseCostOverrides: BaseCostOverride[];
    baseCostModifiers: CostModifier[];
    costModifiers: CostModifier[];
}

export interface DonCard extends BaseCard {
    class: Extract<CardClass, 'DON'>;
    statusEffects: StatusEffect[]
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
}

///----------------------------------------------------------------
/// Turn Structure
///----------------------------------------------------------------
export interface TurnState {
    activePlayer: PlayerId;
    phase: Phase;
    turnNumber: number;
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