import { GameState, PlayerId, SignalCause, DamageCause, CardInstanceId, DonInstance, StackPosition, Zone, PlayCause, Card, Phase } from "../../types";
import { moveCard, removeFromZone, getZoneArray, setActive, setRested, insertCardAtZoneIndex, setPhase, setCardPlayedThisTurn } from "../mechanics";
import { emit } from "../emitter";
import { InvalidActionError } from "../../errors";
import { donRest, donDetach } from './don';
import { CHARACTERS_MAX, STAGE_MAX } from '../rules';
import { calculateCost } from '../calculations';

/**
 * Draws one or more cards to a player's hand.
 * @param state - Game state
 * @param playerId - Player to draw cards for
 * @param count - Number of cards to draw
 * @param signalCause - Reason for drawing cards (game rule or card effect)
 * @returns Game state with cards drawn from the deck and placed into the target player's hand
 */
export function cardsDraw(state: GameState, playerId: PlayerId, count: number, signalCause: SignalCause): GameState {
    const cardsDrawn = [];
    for (let i = 0; i < count; i++) {
        const topCard = getZoneArray(state, playerId, "DECK")[0];
        if (!topCard) break;
        cardsDrawn.push(topCard);
        state = moveCard(state, topCard, "HAND", "TOP");
    }
    if (cardsDrawn.length === 0) return state;
    return emit(state, { type: "CARDS_SENT_TO_HAND", instanceIds: cardsDrawn, fromZone: "DECK", controller: playerId, cause: signalCause });
}

export function cardsAddToHand(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], fromZone: Zone, signalCause: SignalCause): GameState {
    for (const instanceId of instanceIds) {
        const cardInstance = state.instances[instanceId];
        if (!cardInstance) throw new InvalidActionError(`Card instance ${instanceId} not found on the state`);
        if (cardInstance.currentZone !== fromZone) {
            throw new InvalidActionError(`Card instance ${instanceId} is not in the expected zone ${fromZone}`);
        }
        state = moveCard(state, instanceId, "HAND", "TOP");
    }
    return emit(state, { type: "CARDS_SENT_TO_HAND", instanceIds: instanceIds, fromZone: fromZone, controller: playerId, cause: signalCause });
}

/**
 * Discards one or more cards from a player's hand and moves them to the player's trash
 * @param state - Game state
 * @param playerId - Player to discard cards from
 * @param instanceIds - Array of card ids to discard
 * @param signalCause - Cause of discard action
 * @returns Game state with the cards specified discarded from the player's hand
 */
export function cardsTrashFromHand(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    for (const instanceId of instanceIds) {
        const playerHand = getZoneArray(state, playerId, "HAND");
        if (!(playerHand.includes(instanceId))){
            throw new InvalidActionError(`${instanceId} not found in hand of player ${playerId}`);
        }
        state = moveCard(state, instanceId, "TRASH", "TOP");
    }
    return emit(state, { type: "CARDS_SENT_TO_TRASH", instanceIds: instanceIds, fromZone: "HAND", controller: playerId, cause: signalCause });
}

/**
 * Sets a list of cards as active. It is the responsibility of the caller to collect the cards to be set as active.
 * @param state - Game state
 * @param playerId - Player that owns the cards that are being set as active
 * @param instanceIds - Ids of cards to set as active
 * @param signalCause - Reason to set cards as active
 * @return Game state with the specified cards set as active
 */
export function cardsSetActive(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    for (const instanceId of instanceIds) {
        const card = state.instances[instanceId];
        if (!card) throw new InvalidActionError(`${instanceId} not found in card instances`);
        if (card.class === "DON") {
            throw new InvalidActionError(`Wrong function used to set DON!! as active`);
        } 
        if (!(card.class === "CHARACTER" || card.class === "LEADER" || card.class === "STAGE")) {
            throw new InvalidActionError(`${instanceId} is not a valid target to set active`);
        }
        state = setActive(state, instanceId);
    }
    return emit(state, { type: "CARDS_SET_ACTIVE", instanceIds: instanceIds, controller: playerId, cause: signalCause });
}

/**
 * Sets a list of cards as rested. It is the responsibility of the caller to collect the cards to be set as rested.
 * @param state - Game state
 * @param playerId - Player that owns the cards that are being set as rested
 * @param instanceIds - Ids of cards to set as rested
 * @param signalCause - Reason to set cards as rested
 * @return Game state with the specified cards set as rested
 */
export function cardsSetRested(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    for (const instanceId of instanceIds) {
        const card = state.instances[instanceId];
        if (!card) throw new InvalidActionError(`${instanceId} not found in card instances`);
        if (card.class === "DON") {
            throw new InvalidActionError(`Wrong function used to set DON!! as rested`);
        } 
        if (!(card.class === "CHARACTER" || card.class === "LEADER" || card.class === "STAGE")) {
            throw new InvalidActionError(`${instanceId} is not a valid target to set rested`);
        }
        state = setRested(state, instanceId);
    }
    return emit(state, { type: "CARDS_RESTED", instanceIds: instanceIds, controller: playerId, cause: signalCause });
}

// Play Operations

/**
 * Plays a card, either from hand as a player action or from a zone by some effect. It is the responsibility of the caller to specify the play cause.
 * This function primarily used to play cards directly from hand due to the generic DON resting portion, but can play characters by effect as well.
 * @param state - Game state
 * @param playerId - Player that is playing the card
 * @param instanceId - Instance id of the card
 * @param signalCause - Cause of card being played
 * @return State with the card played to the appropriate zone
 */
export function playCard(state: GameState, playerId: PlayerId, instanceId: CardInstanceId, signalCause: PlayCause, replacedId?: CardInstanceId): GameState {
    const cardInstance = state.instances[instanceId];
    if (!cardInstance) throw new InvalidActionError(`Card instance ${instanceId} not found on the state`);
    if (!(cardInstance.class === "CHARACTER" || cardInstance.class === "STAGE" || cardInstance.class === "EVENT")) {
        throw new InvalidActionError(`${instanceId} is not a playable instance`);
    }
    const cost = calculateCost(state, instanceId);

    // Card was played as a result of direct player action from hand
    // The right amount of DON must be rested by rule
    if (signalCause.kind === "PLAYER") {
        const activeDon = getZoneArray(state, playerId, "DON_ACTIVE");
        if (cardInstance.currentZone !== "HAND") throw new InvalidActionError(`${instanceId} cannot be played directly from ${cardInstance.currentZone}`);
        if (activeDon.length < cost) throw new InvalidActionError(`${instanceId} has a card cost greater than the amount of active DON`);
        state = donRest(state, playerId, cost, { kind: "RULE" });
    }

    // Set card as played this turn
    state = setCardPlayedThisTurn(state, instanceId);
    
    switch (cardInstance.class) {
        case "CHARACTER":
            return playCharacter(state, playerId, instanceId, signalCause, replacedId);
        case "STAGE":
            return playStage(state, playerId, instanceId, signalCause, replacedId);
        case "EVENT":
            return playEvent(state, playerId, instanceId, signalCause);
        default:
            throw new InvalidActionError(`${instanceId} not a playable card`)
    }
}

export function playCharacter(state: GameState, playerId: PlayerId, instanceId: CardInstanceId, signalCause: PlayCause, replacedId?: CardInstanceId): GameState {
    const characterZone = getZoneArray(state, playerId, "CHARACTERS");
    const character = state.instances[instanceId];
    const originZone = character.currentZone;
    if (character.class !== "CHARACTER") throw new InvalidActionError(`${instanceId} is not a character instance`);
    if (!originZone) throw new InvalidActionError(`${instanceId} does not have a current zone`);
    if (!replacedId && characterZone.length >= CHARACTERS_MAX) throw new InvalidActionError(`Attempting to play character to full character zone and no card id to replace`);
    if (replacedId) {
        const replacedCharacter = state.instances[replacedId];
        if (!replacedCharacter) throw new InvalidActionError(`${replacedId} is not found on the state`);
        if (replacedCharacter.currentZone !== "CHARACTERS") throw new InvalidActionError(`Attempting to replace ${replacedId} in the character zone, but its current zone is not characters`);
        if (!characterZone.includes(replacedId)) throw new InvalidActionError(`Attempting to replace ${replacedId}, but it is not part of the character zone`);
        if (characterZone.length < CHARACTERS_MAX) throw new InvalidActionError(`Attempting to replace character ${replacedId} while the character zone is not full`);
        const replacedCharacterIndex = characterZone.indexOf(replacedId);
        state = removeCardFromField(state, playerId, replacedId, "TRASH", "TOP", { kind: "RULE" });
        state = removeFromZone(state, instanceId);
        state = insertCardAtZoneIndex(state, instanceId, "CHARACTERS", replacedCharacterIndex);
    }
    else {
        state = moveCard(state, instanceId, "CHARACTERS", "BOTTOM");
    }
    return emit(state, { type: "CHARACTER_PLAYED", instanceId: instanceId, controller: playerId, fromZone: originZone, toZone: "CHARACTERS", cause: signalCause, replaced: replacedId});
}

export function playStage(state: GameState, playerId: PlayerId, instanceId: CardInstanceId, signalCause: PlayCause, replacedId?: CardInstanceId): GameState {
    const stageZone = getZoneArray(state, playerId, "STAGE");
    const stage = state.instances[instanceId];
    const originZone = stage.currentZone;
    if (stage.class !== "STAGE") throw new InvalidActionError(`${instanceId} is not a stage instance`);
    if (!originZone) throw new InvalidActionError(`${instanceId} does not have a current zone`);
    if (!replacedId && stageZone.length >= STAGE_MAX) throw new InvalidActionError(`Attempting to play stage to full stage zone and no card id to replace`);
    if (replacedId) {
        const replacedStage = state.instances[replacedId];
        if (!replacedStage) throw new InvalidActionError(`${replacedId} is not found on the state`);
        if (replacedStage.currentZone !== "STAGE") throw new InvalidActionError(`Attempting to replace ${replacedId} in the stage zone, but its current zone is not stage`);
        if (!stageZone.includes(replacedId)) throw new InvalidActionError(`Attempting to replace ${replacedId}, but it is not part of the stage zone`);
        if (stageZone.length < STAGE_MAX) throw new InvalidActionError(`Attempting to replace stage ${replacedId} while the stage zone is not full`);
        const replacedStageIndex = stageZone.indexOf(replacedId);
        state = removeCardFromField(state, playerId, replacedId, "TRASH", "TOP", { kind: "RULE" });
        state = removeFromZone(state, instanceId);
        state = insertCardAtZoneIndex(state, instanceId, "STAGE", replacedStageIndex);
    }
    else {
        state = moveCard(state, instanceId, "STAGE", "TOP");
    }
    return emit(state, { type: "STAGE_PLAYED", instanceId: instanceId, controller: playerId, fromZone: originZone, toZone: "STAGE", cause: signalCause, replaced: replacedId});
}

export function playEvent(state: GameState, playerId: PlayerId, instanceId: CardInstanceId, signalCause: PlayCause) {
    const event = state.instances[instanceId];
    if (!event) throw new InvalidActionError(`${instanceId} not found in the state's instances`);
    if (event.class !== "EVENT") throw new InvalidActionError(`${instanceId} is not an event card instance`);
    
    const originZone = event.currentZone;
    if (!originZone) throw new InvalidActionError(`${instanceId} has no origin zone`);
    if (originZone === "TRASH") throw new InvalidActionError(`${instanceId} cannot be played from trash with playEvent function`);

    state = moveCard(state, instanceId, "TRASH", "TOP");
    state = emit(state, { type: "CARDS_SENT_TO_TRASH", instanceIds: [instanceId], fromZone: originZone, controller: playerId, cause: signalCause });
    return emit(state, { type: "EVENT_PLAYED", instanceId: instanceId, controller: playerId, fromZone: originZone, toZone: "TRASH", cause: signalCause });
}

// Event play from trash emits event played but with no zone movement (change later if a ruling specifies that the card should be moved back to trash after play, but I doubt it would count as a completely separate re-entrance to trash)
export function playEventFromTrash(state: GameState, playerId: PlayerId, instanceId: CardInstanceId, signalCause: PlayCause): GameState {
    const event = state.instances[instanceId];
    if (!event) throw new InvalidActionError(`${instanceId} not found in the state's instances`);
    if (event.class !== "EVENT") throw new InvalidActionError(`${instanceId} is not an event card instance`);
    
    const originZone = event.currentZone;
    if (originZone !== "TRASH") throw new InvalidActionError(`${instanceId} cannot be played from ${originZone}`);

    return emit(state, { type: "EVENT_PLAYED", instanceId: instanceId, controller: playerId, fromZone: originZone, toZone: "TRASH", cause: signalCause });
}


// Removal Operations

export function removeCardFromField(state: GameState, playerId: PlayerId, instanceId: CardInstanceId, toZone: Zone, position: StackPosition, signalCause: SignalCause): GameState {
    const card = state.instances[instanceId];
    if (!card) throw new InvalidActionError(`${instanceId} not found in card instances`);
    if (!(card.class === "CHARACTER" || card.class === "STAGE")) throw new InvalidActionError(`Only characters and stages can be removed from the field, but ${instanceId} is being removed`);
    
    const fromZone = card.currentZone;
    if (!fromZone) throw new InvalidActionError(`${instanceId} does not have a current zone`);
    if (!(fromZone === "CHARACTERS" || fromZone === "STAGE")) throw new InvalidActionError(`Cards can only be removed from the field from characters or stage, but ${instanceId} is being removed from ${fromZone}`);
    
    // Detach any attached DON before removing the card from the field
    if (card.attachedDon.length > 0) {
        state = donDetach(state, playerId, instanceId, card.attachedDon, { kind: "RULE" });
    }

    switch (toZone) {
        case "TRASH":
            state = moveCard(state, instanceId, "TRASH", position);
            return emit(state, { type: "CARDS_SENT_TO_TRASH", instanceIds: [instanceId], fromZone: fromZone, controller: playerId, cause: signalCause });
        case "HAND":
            state = moveCard(state, instanceId, "HAND", position);
            return emit(state, { type: "CARDS_SENT_TO_HAND", instanceIds: [instanceId], fromZone: fromZone, controller: playerId, cause: signalCause });
        case "DECK":
            state = moveCard(state, instanceId, "DECK", position);
            return emit(state, { type: "CARDS_SENT_TO_DECK", instanceIds: [instanceId], fromZone: fromZone, position: position, controller: playerId, cause: signalCause });
        case "LIFE":
            state = moveCard(state, instanceId, "LIFE", position);
            return emit(state, { type: "CARDS_SENT_TO_LIFE", instanceIds: [instanceId], fromZone: fromZone, position: position, controller: playerId, cause: signalCause });
        default:
            throw new InvalidActionError(`Invalid removal destination ${toZone} for ${instanceId}`);
    }
}