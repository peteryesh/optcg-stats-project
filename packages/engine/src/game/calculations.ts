import { CardInstanceId, GameState } from "../types";

// need to put derived value calculation here, which will be 

export function calculatePower(state: GameState, instanceId: CardInstanceId): number {
    const card = state.instances[instanceId];
    if (!card) throw new Error(`No card instance found for ${instanceId}`);
    if (card.class !== "CHARACTER" && card.class !== "LEADER") throw new Error(`${instanceId} does not have power`);
    
    const cardDef = state.definitions[card.cardId];
    if (!cardDef) throw new Error(`No card definition found for ${card.cardId}`);
    if (cardDef.power === undefined) throw new Error(`No power value found for ${card.cardId}`);

    // Derived power = card power + status effects
    let derivedPower = cardDef.power;
    return derivedPower;
}

export function calculateCost(state: GameState, instanceId: CardInstanceId): number {
    const card = state.instances[instanceId];
    if (!card) throw new Error(`No card instance found for ${instanceId}`);
    if (card.class !== "CHARACTER" && card.class !== "STAGE" && card.class !== "EVENT") throw new Error(`${instanceId} does not have cost`);
    
    const cardDef = state.definitions[card.cardId];
    if (!cardDef) throw new Error(`No card definition found for ${card.cardId}`);
    if (cardDef.cost === undefined) throw new Error(`No cost value found for ${card.cardId}`);

    // Derived cost = card power + status effects
    let derivedCost = cardDef.cost;
    return derivedCost;
}

export function calculateCounter(state: GameState, instanceId: CardInstanceId): number {
    const card = state.instances[instanceId];
    if (!card) throw new Error(`No card instance found for ${instanceId}`);
    if (card.class !== "CHARACTER") throw new Error(`${instanceId} does not have counter`);
    
    const cardDef = state.definitions[card.cardId];
    if (!cardDef) throw new Error(`No card definition found for ${card.cardId}`);
    
    // Derived counter = card counter + status effects
    let derivedCounter = 0;
    if (cardDef.counter !== undefined) derivedCounter = cardDef.counter;
    return derivedCounter;
}