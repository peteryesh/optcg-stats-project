// game/instances.ts

import { produce } from "immer";
import type {
    PlayerId,
    CardId,
    CardInstanceId,
    CardClass,
} from "../types/primitives";
import { GameState } from "../types/state";
import {
    DeckList,
    CardInstance,
    LeaderInstance,
    CharacterInstance,
    StageInstance,
    DonInstance,
    CardDef,
    EventInstance
} from "../types/card";

export function instantiatePlayerBoard(state: GameState, deckList: DeckList, defs: Record<CardId, CardDef>, controller: PlayerId): GameState {
    const { leader, deck, sideDeck, donCount } = deckList;

    const instances: Record<CardInstanceId, CardInstance> = {};

    // Instantiate leader
    state = instantiateLeader(state, leader, defs, controller);

    // Instantiate deck cards
    state = instantiateDeckCards(state, deck, defs, controller);

    // Instantiate DON!! cards
    state = instantiateDonDeck(state, donCount, controller);

    return state;
}

function instantiateLeader(state: GameState, cardId: CardId, defs: Record<CardId, CardDef>, controller: PlayerId): GameState {
    const instanceId = `${controller}-LEADER` as CardInstanceId;
    const leaderInstance = createInstance(instanceId, "LEADER", controller, defs[cardId]) as LeaderInstance;

    return produce(state, draft => {
        draft.instances[instanceId] = leaderInstance;
        draft.playerZones[controller].leader = instanceId;
    });
}

function instantiateDeckCards(state: GameState, cardIds: CardId[], defs: Record<CardId, CardDef>, controller: PlayerId): GameState {
    const newInstances: Record<CardInstanceId, CardInstance> = {};
    cardIds.forEach((cardId, index) => {
        const instanceId = `${controller}-CARD-${Date.now()}-${index}` as CardInstanceId; // unique instance ID
        newInstances[instanceId] = createInstance(instanceId, defs[cardId].class, controller, defs[cardId]);
    });

    return produce(state, draft => {
        Object.assign(draft.instances, newInstances);
        draft.playerZones[controller].deck.push(...Object.keys(newInstances) as CardInstanceId[]);
    });
}

function instantiateDonDeck(state: GameState, donCount: number, controller: PlayerId): GameState {
    const newInstances: Record<CardInstanceId, CardInstance> = {};
    for (let i = 0; i < donCount; i++) {
        const instanceId = `${controller}-DON-${Date.now()}-${i}` as CardInstanceId; // unique instance ID
        newInstances[instanceId] = createInstance(instanceId, "DON", controller);
    }

    return produce(state, draft => {
        Object.assign(draft.instances, newInstances);
        draft.playerZones[controller].donDeck.push(...Object.keys(newInstances) as CardInstanceId[]);
    });
}

function createInstance(instanceId: CardInstanceId, cardClass: CardClass, controller: PlayerId, cardDef?: CardDef): CardInstance {
    const baseInstance = {
        instanceId,
        controller,
        currentZone: "DECK",
        isRested: false
    };
    switch (cardClass) {
        case "LEADER":
            return {
                ...baseInstance,
                cardId: cardDef?.id,
                class: "LEADER",
                attachedDon: [],
                effectsUsedThisTurn: {}
            } as LeaderInstance;
        case "CHARACTER":
            return {
                ...baseInstance,
                cardId: cardDef?.id,
                class: "CHARACTER",
                attachedDon: [],
                playedOnTurns: [],
                effectsUsedThisTurn: {}
            } as CharacterInstance;
        case "STAGE":
            return {
                ...baseInstance,
                cardId: cardDef?.id,
                class: "STAGE",
                playedOnTurns: [],
                effectsUsedThisTurn: {}
            } as StageInstance;
        case "EVENT":
            return {
                ...baseInstance,
                cardId: cardDef?.id,
                class: "EVENT",
                playedOnTurns: []
            } as EventInstance;
        case "DON":
            return {
                ...baseInstance,
                class: "DON",
                attachedTo: null
            } as DonInstance;
    }
}