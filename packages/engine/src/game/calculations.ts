import type { CardInstanceId, GameState } from "../types";
import { getCardInstance, getCardDef } from "./mechanics";

// need to put derived value calculation here, which will be 

export function calculatePower(state: GameState, instanceId: CardInstanceId): number {
    const card = getCardInstance(state, instanceId);
    if (card.class !== "CHARACTER" && card.class !== "LEADER") throw new Error(`${instanceId} does not have power`);
    
    const cardDef = getCardDef(state, instanceId);
    if (cardDef.power === undefined) throw new Error(`No power value found for ${card.cardId}`);

    // Derived power = card power + status effects + DON
    let derivedPower = Number(cardDef.power);

    // If the player is not active, DON does not give power boost
    if (state.activePlayerId !== card.controller) return derivedPower;

    const donAttached = card.attachedDon;
    for (const donId of donAttached) {
        const donInstance = getCardInstance(state, donId);
        if (donInstance.class !== "DON") throw new Error(`Attached DON instance ${donId} is not of class DON`);
        derivedPower += donInstance.donValue; // Should be 1000 for standard DON, 2000 for double DON
    }
    return derivedPower;
}

export function calculateCost(state: GameState, instanceId: CardInstanceId): number {
    const card = getCardInstance(state, instanceId);
    if (card.class !== "CHARACTER" && card.class !== "STAGE" && card.class !== "EVENT") throw new Error(`${instanceId} does not have cost`);
    
    const cardDef = getCardDef(state, instanceId);
    if (cardDef.cost === undefined) throw new Error(`No cost value found for ${card.cardId}`);

    // Derived cost = card power + status effects
    let derivedCost = Number(cardDef.cost);
    return derivedCost;
}

export function calculateCounter(state: GameState, instanceId: CardInstanceId): number {
    const card = getCardInstance(state, instanceId);
    if (card.class !== "CHARACTER") throw new Error(`${instanceId} does not have counter`);
    
    const cardDef = getCardDef(state, instanceId);
    
    // Derived counter = card counter + status effects
    let derivedCounter = 0;
    if (cardDef.counter !== undefined) derivedCounter = Number(cardDef.counter);
    return derivedCounter;
}