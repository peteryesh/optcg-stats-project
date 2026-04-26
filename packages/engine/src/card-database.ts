import { CardKind } from "./constants";
import { CardId } from "./state";

export interface CardDefinition {
    id: CardId;
    set_id: string;
    name: string;
    kind: CardKind;
    rarity: string;
    block: number;
    cost: number;
    power: number;
    counter: number;
    raw_effect: string;
    artist: string;
    colors: string[];
    types: string[];
    attributes: string[];
    alts: object[];
    aliases: string[];
    restrictions: object[];
}

export type CardDatabase = Record<CardId, CardDefinition>;