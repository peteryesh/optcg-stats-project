import { CardId } from "./state";

export type CardClass = 'LEADER' | 'CHARACTER' | 'DON' | 'EVENT' | 'STAGE';
export type Color = 'RED' | 'GREEN' | 'BLUE' | 'PURPLE' | 'BLACK' | 'YELLOW';
export type Attribute = 'SLASH' | 'STRIKE' | 'RANGED' | 'SPECIAL' | 'WISDOM' | '?';

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
    // effects: EffectDeclaration[];   // added by engine, not in database
}

export type CardDatabase = Record<CardId, Card>;