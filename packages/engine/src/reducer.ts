import { produce } from 'immer';
import type { GameState } from './types/state';
import type { GameAction } from './types/action';
import { validate } from './validator';
import { InvalidActionError } from './errors';
import { 
    applyActivateEffect,
    applyPlayCard,
    applyAttachDon,
    applyDeclareAttack,
    applyDeclareBlocker,
    applyPlayCounter,
    applyCompleteBattle,
    applyNextPhase,
    applyTriggerActivation,
    applyDisplaceCardOnField
} from './game/actions/main';
import { promoteChosenEffect } from './game/effects';
import { applyChooseFirstPlayer, applyKeepHand, applyMulligan, setPlayerLife, shuffleDeck } from './game/actions/start';
import { getCardInstance, removeDecisionPoint, setDecisionPoint, setGameEnd } from './game/mechanics';
import { enterStartGamePhase, cardsDraw, enterStartOfTurnPhase, setStartTurnState, enterRefreshPhase, enterDrawPhase, enterMainPhase, enterOnOpponentAttackPhase, enterBlockerPhase, enterCounterPhase, enterBattleResolutionPhase, enterWhenAttackingPhase } from './game/operations';
import { OPENING_HAND_SIZE } from './game/constants';
import type { Phase } from './types';

export { InvalidActionError } from './errors';

export function reducer(state: GameState, action: GameAction): GameState {
    if (state.winner !== null) {
        throw new InvalidActionError('Game is already finished');
    }

    const error = validate(state, action);
    if (error) throw new InvalidActionError(error);

    state = produce(state, draft => {
        draft.actionLog.push({ action, signals: [] });
    });

    switch (action.type) {
        case 'CHOOSE_FIRST_PLAYER':
            state = applyChooseFirstPlayer(state, action);
            break;
        case 'KEEP_HAND':
            state = applyKeepHand(state, action);
            break;
        case 'MULLIGAN':
            state = applyMulligan(state, action);
            break;
        case 'PLAY_CARD':
            state = applyPlayCard(state, action);
            break;
        case 'DISPLACE_ON_FIELD':
            state = applyDisplaceCardOnField(state, action);
            break;
        case 'ATTACH_DON':
            state = applyAttachDon(state, action);
            break;
        case 'DECLARE_ATTACK':
            state = applyDeclareAttack(state, action);
            break;
        case 'DECLARE_BLOCKER':
            state = applyDeclareBlocker(state, action);
            break;
        case 'PLAY_COUNTER':
            state = applyPlayCounter(state, action);
            break;
        case 'COMPLETE_BATTLE':
            state = applyCompleteBattle(state, action);
            break;
        case 'ACTIVATE_TRIGGER':
            state = applyTriggerActivation(state, action);
            break;
        case 'ACTIVATE_EFFECT':
            state = applyActivateEffect(state, action);
            break;
        case 'NEXT_PHASE':
            state = applyNextPhase(state, action);
            break;
        case 'CHOOSE_NEXT_EFFECT':
            throw new InvalidActionError(`${action.type} is not yet implemented`);
        case 'CHOOSE_TARGETS':
            throw new InvalidActionError(`${action.type} is not yet implemented`);
    }
    state = removeDecisionPoint(state); // Action consumes decision point
    return advance(state); // Advance state until next decision point
}

function advance(state: GameState): GameState {
    let s = state;
    while (!s.decisionPoint && !s.winner) s = step(s);
    return s;
}

function step(state: GameState): GameState {
    // check for deckout (and any alternate rulings or hooks)
    // I don't think there is any way that both players can deck out at the same time
    // Expansion for 4 player mode: remove the player from turnOrder, when turn order is length === 1 then game ends
    for (const player of Object.keys(state.playerZones)) {
        if (state.playerZones[player].deck.length <= 0) {
            const twoPlayerWinner = state.turnOrder.filter(playerId => playerId !== player);
            return setGameEnd(state, twoPlayerWinner[0], "DECKOUT");
        }
    }

    // check for currentEffect

    // if no current effect, check for trigger zone, set decision to activate trigger if there is
    // I don't think there is a situation where 2 players could have a trigger at one time
    for (const player of Object.keys(state.playerZones)) {
        if (state.playerZones[player].trigger.length > 0) {
            return setDecisionPoint(state, { type: "TRIGGER", player: player });
        }
    }
    
    // if no current effect and no trigger, check the effect queue
    // if a player has more than one effect in the effect frame, set decisionPoint to select resolution order and return
    // if there is currentEffect, execute effect steps
    // if effect step requires a decision, set decisionPoint and return
    // If there are no more effects in the effect queue, look at the phase
    // Handle phase changes (we have already processed effects)
    switch (state.phase) {
        case "SETUP":
            if (!state.setup.firstPlayer) {
                return setDecisionPoint(state, { type: "SELECT_FIRST_PLAYER", player: state.setup.coinFlipWinner });
            }
            return enterStartGamePhase(state);
        case "START_GAME":
            for (const playerId of state.turnOrder) {
                // deal starting hand, this is the only point that start game and empty hand will be true
                if (state.playerZones[playerId].hand.length <= 0) {
                    state = shuffleDeck(state, playerId);
                    state = cardsDraw(state, playerId, OPENING_HAND_SIZE, { kind: "RULE" });
                }
                // return if any player has not made mulligan decision
                if (state.setup.mulligan[playerId] === "PENDING") {
                    return setDecisionPoint(state, { type: "MULLIGAN", player: playerId });
                }
            }
            // All players have mulliganed or kept, set life and continue
            for (const playerId of state.turnOrder) {
                state = setPlayerLife(state, playerId);
            }
            return enterStartOfTurnPhase(state);
        case "START_OF_TURN":
            state = setStartTurnState(state);
            return enterRefreshPhase(state);
        case "REFRESH":
            return enterDrawPhase(state);
        case "DRAW":
            return enterMainPhase(state);
        case "MAIN":
            if (state.currentBattle !== null) {
                return enterWhenAttackingPhase(state);
            }
            return setDecisionPoint(state, { type: "MAIN_ACTION", player: state.turnPlayerId });
        case "WHEN_ATTACKING":
            return enterOnOpponentAttackPhase(state);
        case "ON_OPPONENT_ATTACK": 
            return enterBlockerPhase(state);
        case "BLOCKER": {
            const defender = getCardInstance(state, state.currentBattle!.defenderId);
            return setDecisionPoint(state, { type: "BLOCKER_SELECTION", player: defender.controller, battle: state.currentBattle! });
        }
        case "COUNTER": {
            const defender = getCardInstance(state, state.currentBattle!.defenderId);
            // COMPLETE_BATTLE given as action if phase is counter, state is advanced by player selecting this action
            return setDecisionPoint(state, { type: "COUNTER_STEP", player: defender.controller, battle: state.currentBattle! })
        }
        case "BATTLE_RESOLUTION":
            return enterMainPhase(state);
        case "END_OF_TURN":
            return enterStartOfTurnPhase(state);
        case "GAME_END":
            break;
    }
    return state;
}
