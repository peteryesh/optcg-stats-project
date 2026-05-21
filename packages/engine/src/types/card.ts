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
    effects: EffectDefinition[];   // added by engine, not in database
}

export type DeckList = {
    leader: CardId;
    deck: CardId[];
    sideDeck: CardId[];
    donCount: number;
}

export interface BaseInstance {
    instanceId: CardInstanceId;
    cardId: CardId;
    controller: PlayerId;
    currentZone: Zone;
    isRested: boolean;
}

// Character — can attack, have DON!! attached, use effects
export interface CharacterInstance extends BaseInstance {
    class: "CHARACTER";
    attachedDon: CardInstanceId[];
    playedOnTurns: number[];
    effectsUsedThisTurn: Record<string, boolean>;
}

// Leader — like character but tracks life and has rule modifiers
export interface LeaderInstance extends BaseInstance {
    class: "LEADER";
    attachedDon: CardInstanceId[];
    playedOnTurns: number[];
    effectsUsedThisTurn: Record<string, boolean>;
}

// Stage — enters play, can be bounced, no DON!!
export interface StageInstance extends BaseInstance {
    class: "STAGE";
    playedOnTurns: number[];
    effectsUsedThisTurn: Record<string, boolean>;
}

export interface EventInstance extends BaseInstance {
    class: "EVENT";
    playedOnTurns: number[];
}

// DON!! — attaches to characters/leader, tracks attachment
export interface DonInstance extends BaseInstance {
    class: "DON";
    attachedTo: CardInstanceId | null;
}

export type CardInstance =
    | CharacterInstance
    | LeaderInstance
    | StageInstance
    | EventInstance
    | DonInstance;

export type CardDatabase = Record<CardId, Card>;