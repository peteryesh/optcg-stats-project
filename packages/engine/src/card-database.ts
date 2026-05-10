import type { CardKind, Attribute, Color } from "./constants";
import { CardId } from "./state";

export interface CardDefinition {
    id: CardId;
    set_id: string;
    name: string;
    class: CardKind;
    rarity: string;
    block: number;
    cost?: number;
    power?: number;
    counter?: number;
    life?: number;
    raw_effect?: string;
    artist?: string;
    colors?: Color[];
    types?: string[];
    attributes?: Attribute[];
    alts?: object[];
    aliases?: string[];
    restrictions?: object[];
}

export type CardDatabase = Record<CardId, CardDefinition>;