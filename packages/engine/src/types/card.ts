import type { CardId, CardInstanceId, Attribute, CardClass, Color, PlayerId, Zone } from './primitives';
import { EffectDefinition } from './effect';

export interface Card {
    id: CardId;
    set_id: string;
    name: string;
    class: CardClass;
    rarity: string;
    block: number;
    cost?: number;
    power?: number;
    counter?: number;
    life?: number;
    raw_effect?: string;
    artist?: string;
    colors: Color[];
    types: string[];
    attributes: Attribute[];
    alts: object[];
    aliases: string[];
    restrictions: object[];
}

// Engine-specific shape — derived from Card, omits display-only fields
export interface CardDef {
    id: CardId;
    name: string;
    class: CardClass;
    cost?: number;
    power?: number;
    counter?: number;
    life?: number;
    colors: Color[];
    types: string[];
    attributes: Attribute[];
    aliases: string[];
    restrictions: object[];
    effects: EffectDefinition[];   // added later, not in database currently
}

export type DeckList = {
    leader: CardId;
    deck: CardId[];
    sideDeck: CardId[];
    donCount: number;
}

export interface BaseCardInstance {
    instanceId: CardInstanceId;
    controller: PlayerId;
    currentZone: Zone | null;
    isRested: boolean;
}

// Leader — like character but tracks life and has rule modifiers
export interface LeaderInstance extends BaseCardInstance {
    cardId: CardId;
    class: "LEADER";
    attachedDon: CardInstanceId[];
    effectsUsedThisTurn: Record<string, boolean>;
}

// Character — can attack, have DON!! attached, use effects
export interface CharacterInstance extends BaseCardInstance {
    cardId: CardId;
    class: "CHARACTER";
    attachedDon: CardInstanceId[];
    playedOnTurns: number[];
    effectsUsedThisTurn: Record<string, boolean>;
}

// Stage — enters play, can be bounced, no DON!!
export interface StageInstance extends BaseCardInstance {
    cardId: CardId;
    class: "STAGE";
    attachedDon: CardInstanceId[];
    playedOnTurns: number[];
    effectsUsedThisTurn: Record<string, boolean>;
}

export interface EventInstance extends BaseCardInstance {
    cardId: CardId;
    class: "EVENT";
    playedOnTurns: number[];
    effectsUsedThisTurn: Record<string, boolean>;
}

// DON!! — attaches to characters/leader, tracks attachment
// isRested is always false: DON!! active/rested state is tracked by zone (DON_ACTIVE / DON_RESTED)
export interface DonInstance extends BaseCardInstance {
    class: "DON";
    isRested: false;
    attachedTo: CardInstanceId | null;
}

export type CardInstance =
    | CharacterInstance
    | LeaderInstance
    | StageInstance
    | EventInstance
    | DonInstance;

export type CardDatabase = Record<CardId, Card>;