import { produce } from 'immer';
import { GameState } from '../../types/state';
import { CardInstanceId, PlayerId, Zone, StackPosition, Phase } from '../../types/primitives';
import { CHARACTERS_MAX, LEADER_MAX, STAGE_MAX } from '../rules';
import { DonInstance } from '../../types/card';
import { getCardInstance, getZoneArray } from './helpers';

/**
 * Set card as active
 * @param state - Game state
 * @param playerId - Player controlling the card to set as active
 * @param instanceId - Instance id to set as active
 * @param signalCause - Cause of setting card as active
 * @returns Game state with the card specified set as active
 */
export function setActive(state: GameState, instanceId: CardInstanceId): GameState {
    return produce(state, draft => {
        const card = getCardInstance(draft, instanceId);
        card.isRested = false;
    });
}

/**
 * Set card as rested
 * @param state - Game state
 * @param playerId - Player controlling the card to set as rested
 * @param instanceId - Instance id to set as rested
 * @param signalCause - Cause of setting card as rested
 * @returns Game state with the card specified set as rested
 */
export function setRested(state: GameState, instanceId: CardInstanceId): GameState {
    return produce(state, draft => {
        const card = getCardInstance(draft, instanceId);
        if (!card) throw new Error(`Cannot find card instance ${instanceId}`);
        card.isRested = true;
    });
}

export function setCardPlayedThisTurn(state: GameState, instanceId: CardInstanceId): GameState {
    return produce(state, draft => {
        draft.cardsPlayedThisTurn.push(instanceId);
    });
}