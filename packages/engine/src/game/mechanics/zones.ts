import { produce } from 'immer';
import { GameState } from '../../types/state';
import { CardInstanceId, PlayerId, Zone, StackPosition } from '../../types/primitives';
import { CHARACTERS_MAX, LEADER_MAX, STAGE_MAX } from '../rules';

/**
 * Helper function to get the zone array for the provided player
 * @param state - Current game state
 * @param playerId - Player id that we want the zone of
 * @param zone - Zone for the player that we want, nullable due to the currentZone being able to provide a null value, though no null zone value should be expected or provided
 * @returns Game state with the card instance id removed from the instance's current zone, and the instance's current zone set to null
 */
export function getZoneArray(state: GameState, playerId: PlayerId, zone: Zone | null): CardInstanceId[] {
    const playerZones = state.playerZones[playerId];
    if (!playerZones) {
        throw new Error(`Unknown playerId ${playerId}`);
    }

    switch (zone) {
        case "CHARACTERS":  return playerZones.characters;
        case "DECK":        return playerZones.deck;
        case "DON_ACTIVE":  return playerZones.donActive;
        case "DON_DECK":    return playerZones.donDeck;
        case "DON_RESTED":  return playerZones.donRested;
        case "HAND":        return playerZones.hand;
        case "LEADER":      return playerZones.leader;
        case "LIFE":        return playerZones.life;
        case "LOOK":        return playerZones.look;
        case "STAGE":       return playerZones.stage;
        case "TRASH":       return playerZones.trash;
        case null:          throw new Error(`Null zone provided, no zone to return`);
        default:            throw new Error(`Provided zone was not an accepted zone value`);
    }
}


/**
 * Removes a card from a player's zone. The controlling player and the card's current zone is derived from the instance id provided
 * The function itself will only apply game rule logic and it is the responsibility of the caller to provide the intention for the removal
 * Do not call directly during a game's runtime
 * @param state - Game state before remove card from zone is called
 * @param instanceId - Id of card instance to be removed
 * @returns Game state with the card instance id removed from the instance's current zone, and the instance's current zone set to null
 */
export function removeFromZone(state: GameState, instanceId: CardInstanceId): GameState {
    const instance = state.instances[instanceId];
    if (!instance) {
        throw new Error(`Cannot move unknown instance ${instanceId}`);
    }

    if (instance.class === "LEADER") {
        throw new Error (`Attempting to remove leader card from the leader area: ${instance.instanceId}`);
    }

    return produce(state, draft => {
        const originZoneArray = getZoneArray(draft, instance.controller, instance.currentZone);

        const index = originZoneArray.indexOf(instance.instanceId);
        if (index === -1) {
            throw new Error(`Instance ${instance.instanceId} not found in zone ${instance.currentZone}`);
        }

        originZoneArray.splice(index, 1);
        draft.instances[instance.instanceId].currentZone = null;
    });
}
 
/**
 * Adds a card to a player's zone, checks only done for game rule logic and will throw an error if the game rule limit is exceeded
 * The function calling move card or add to zone is responsible for checking the current size of the array so that it can choose to call add or replace card at target zone
 * Do not call directly during a game's runtime
 * @param state - Game state before add card to zone is called
 * @param instanceId - Id of card instance to be added to zone
 * @param targetZone - Zone to add the card instance id
 * @param position - Position to add the card stack (top or bottom)
 * @returns Game state with the card instance id added to the target zone, and the instance's current zone set to the target zone
 */
export function addToZone(state: GameState, instanceId: CardInstanceId, targetZone: Zone, position: StackPosition): GameState {
    const instance = state.instances[instanceId];
    if (!instance) {
        throw new Error(`Cannot move unknown instance ${instanceId}`);
    }
    if (instance.currentZone !== null) {
        throw new Error(`Attempting to add ${instanceId} to new zone when previous zone has not been cleared`);
    }
    return produce(state, draft => {
        const targetZoneArray = getZoneArray(draft, instance.controller, targetZone);
        if (targetZone === "CHARACTERS") {
            if (instance.class !== "CHARACTER") throw new Error (`Attempting to move non-character card to the character area: ${instance.instanceId}`);
            if (targetZoneArray.length >= CHARACTERS_MAX) throw new Error(`Moving character to character area has exceeded the maximum amount of characters allowed: ${instance.instanceId}`);
        }
        if (targetZone === "STAGE") {
            if (instance.class !== "STAGE") throw new Error (`Attempting to move non-stage card to the stage area: ${instance.instanceId}`);
            if (targetZoneArray.length >= STAGE_MAX) throw new Error(`Moving stage to stage area has exceeded the maximum amount of stages allowed: ${instance.instanceId}`);
        }
        if (targetZone === "LEADER") {
            if (instance.class !== "LEADER") throw new Error (`Attempting to move non-leader card to the leader area: ${instance.instanceId}`);
            if (targetZoneArray.length >= LEADER_MAX) throw new Error(`Moving leader to leader area has exceeded the maximum amount of leaders allowed: ${instance.instanceId}`);
        }

        if (position === "TOP") {
            targetZoneArray.unshift(instance.instanceId);
        }
        else if (position === "BOTTOM") {
            targetZoneArray.push(instance.instanceId);
        }
        else {
            throw new Error(`Position (top or bottom of stack) was not provided`);
        }

        draft.instances[instance.instanceId].currentZone = targetZone;
    });
}

/**
 * Function to move a player's card from one zone to another
 * @param state - Current game state
 * @param instanceId - Id of card to be moved from the zone in its attribute currentZone to the target zone
 * @param targetZone - Target zone for the card instance id to be moved to
 * @param position - Position to add the card stack (top or bottom) of the target zone
 * @returns Game state with the card instance id removed from old zone and added to new zone with updated location
 */
export function moveCard(state: GameState, instanceId: CardInstanceId, targetZone: Zone, position: StackPosition): GameState {
    state = removeFromZone(state, instanceId);
    state = addToZone(state, instanceId, targetZone, position);
    return state;
}