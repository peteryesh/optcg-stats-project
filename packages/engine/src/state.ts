export type CardInstanceId = string;

export type CardId = string;

export type PlayerId = 'p1' | 'p2';

export interface CardInstance {
    instanceId: CardInstanceId;
    cardId: CardId;
    owner: PlayerId;

    rested: boolean; // NOT used for don cards, rested don have their own zone
    attachedDon: CardInstanceId[];
    playedThisTurn: boolean;
}

export interface PlayerZones {
    deck: CardInstanceId[];
    hand: CardInstanceId[];
    life: CardInstanceId[];
    characters: CardInstanceId[];
    stage: CardInstanceId | null;
    leader: CardInstanceId;
    trash: CardInstanceId[];
    donDeck: CardInstanceId[];
    donActive: CardInstanceId[];
    donRested: CardInstanceId[];
}