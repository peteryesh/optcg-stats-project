import { GameState } from "./types/state";
import { GameAction } from "./types/action";
import { calculateCost, calculateCounter } from "./game/calculations";
import { CardInstanceId, EffectId, EffectSequence } from "./types";
import { getCardDef, getCardInstance } from "./game/mechanics";

// Validator
// Phase check
// Player exists (only at setup, everything after shall be checked against active/responding player)
// Player has game control
// Player controls card

export function validate(state: GameState, action: GameAction): string | null {
    switch (action.type) {
        case 'CHOOSE_FIRST_PLAYER':
            if (state.phase !== "SETUP") return `Cannot choose first player outside of setup phase`;
            if (action.deciderId !== state.setup.coinFlipWinner) return `Only the coin flip winner can choose the first player`;
            if (!state.turnOrder.includes(action.choice)) return `Chosen first player ${action.choice} is not in the game`;
            break;

        case 'KEEP_HAND':
            if (!Object.keys(state.config.players).includes(action.playerId)) return `Player ${action.playerId} does not exist in the game`;
            if (state.phase !== "START_GAME") return `Cannot choose to keep hand outside of start game phase`;
            if (state.currentEffect !== null) return `An effect is actively resolving`;
            if (state.pendingDecision) return `A pending decision prevents game from starting`;
            if (state.setup.mulligan[action.playerId] !== "PENDING") return `Can only call keep hand when mulligan decision is pending`;
            break;

        case 'MULLIGAN':
            if (!Object.keys(state.config.players).includes(action.playerId)) return `Player ${action.playerId} does not exist in the game`;
            if (state.phase !== "START_GAME") return `Cannot choose to mulligan outside of start game phase`;
            if (state.currentEffect !== null) return `An effect is actively resolving`;
            if (state.pendingDecision) return `A pending decision prevents game from starting`;
            if (state.setup.mulligan[action.playerId] !== "PENDING") return `Can only call keep hand when mulligan decision is pending`;
            break;

        case 'NEXT_PHASE':
            if (state.activePlayerId !== action.playerId) {
                if (state.phase === "BLOCKER") break;
                if (state.phase === "ON_OPPONENT_ATTACK") {
                    // If there are pending effects, it means that there was at least one optional effect OR an auto effect that requires decision
                    // Need to consider on the frontend how to differentiate activatable optional effects from optional ones
                    // If all are auto effects, the effects will resolve automatically and player will move directly to blocker phase
                    if (state.pendingEffects[action.playerId].length >= 1) {
                        for (const effectSequence of state.pendingEffects[action.playerId]) {
                            if (!effectSequenceIsOptional(state, effectSequence)) return `There is an effect that requires player to resolve before continuing`;
                        }
                    }
                    break;
                }
                return `${action.playerId} is not given control to call next phase from phase ${state.phase}`;
            }
            if (state.phase !== "START_OF_TURN" && state.phase !== "MAIN") return `Cannot end phase from phase ${state.phase}`;
            if (state.currentEffect !== null) return `There is an active effect being processed`;
            if (state.pendingDecision !== null) return `There is an active player decision being processed`;
            break;

        case 'PLAY_CARD':
            if (state.phase !== "MAIN") return `Cannot play cards outside of main phase`;
            if (state.activePlayerId !== action.playerId) return `Player ${action.playerId} cannot play cards on opponent's turn`;
            if (state.currentEffect !== null) return `An effect is actively resolving`;
            if (state.pendingDecision) return `A pending decision prevents battle from being completed`;
            const card = getCardInstance(state, action.instanceId);
            if (card.controller !== action.playerId) return `Player ${action.playerId} cannot play card they do not own`;
            if (card.currentZone !== "HAND") return `Player ${action.playerId} cannot play card that is not in their hand`;
            if (card.class === "DON" || card.class === "LEADER") return `Player ${action.playerId} cannot play card of class ${card.class}`;
            if (state.playerZones[action.playerId].donActive.length < calculateCost(state, action.instanceId)) return `Player ${action.playerId} does not have enough DON to play this card`;
            break;

        case 'ATTACH_DON':
            // Used only for active don attachment as a result of main phase
            // Attaching don by effect will require an explicit call to donAttach as a result of "CHOOSE_TARGET" action
            if (action.donIds.length === 0) return `No DON given to attach`;
            if (state.phase !== "MAIN") return `Cannot attach DON outside of main phase`;
            if (state.currentEffect !== null) return `An effect is actively resolving`;
            if (state.pendingDecision) return `A pending decision prevents battle from being completed`;
            if (state.activePlayerId !== action.playerId) return `${action.playerId} is not the active player and cannot attach DON`;
            if (state.playerZones[action.playerId].donActive.length < action.donIds.length) return `${action.playerId} is attempting to attach more DON than they have active`;
            const target = getCardInstance(state, action.targetId);
            if (target.controller !== state.activePlayerId) return `Attempting to attach an active DON to a target that the active player does not control`;
            if (target.class !== "CHARACTER" && target.class !== "LEADER") return `${action.targetId} is of class ${target.class} and cannot have DON attached to it`; 
            for (const donId of action.donIds) {
                const don = getCardInstance(state, donId);
                if (!(don.controller === action.playerId)) return `${donId} not controlled by the active player`;
                if (!(don.currentZone === "DON_ACTIVE")) return `Attempting to actively attach a non-active DON`;
            }
            // Check here for "cannot attach don" effects (either at target or as a passive)
            break;

        case 'ACTIVATE_EFFECT':
            if (state.activePlayerId !== action.playerId) return `Cannot activate main effect while not the active player`;
            if (state.phase !== "MAIN") return `Cannot activate main effect outside of main phase`;
            if (state.currentEffect !== null) return `An effect is actively resolving`;
            if (state.pendingDecision) return `A pending decision prevents game from starting`;
            const effectCard = getCardInstance(state, action.instanceId);
            if (effectCard.class === "DON") return `DON card ${action.instanceId} cannot be used to activate effect`;
            if (effectCard.class === "EVENT") return `Events should be routed through PLAY_CARD`;
            if (effectCard.class === "CHARACTER" && effectCard.currentZone !== "CHARACTERS") return `Cannot activate main effect of character that is not on the board`;
            if (effectCard.class === "LEADER" && effectCard.currentZone !== "LEADER") return `Cannot activate main effect of leader that is not on the board`;
            if (effectCard.class === "STAGE" && effectCard.currentZone !== "STAGE") return `Cannot activate main effect of stage that is not on the board`;
            const effectCardDef = getCardDef(state, action.instanceId);
            // Check if an effect even exists on the card
            if (effectCardDef.effectDefs === null || effectCardDef.effectDefs === undefined) {
                return `No effects found on ${action.instanceId}`;
            }
            if (!Object.keys(effectCardDef.effectDefs).includes(action.effectId)) return `Effect ${action.effectId} does not exist on ${effectCard.cardId}`;
            if (action.effectId in effectCard.effectsUsedThisTurn) {
                return `Effect ${action.effectId} has already been used this turn`;
            }
            break;

        case 'DECLARE_ATTACK':
            // State conditions to declare attack
            if (state.turn <= state.turnOrder.length) return `According to the game rules, it is illegal for attacks on the player's first turn`;
            if (state.phase !== "MAIN") return `Cannot declare an attack outside of the main phase`;
            if (state.activePlayerId !== action.playerId) return `${action.playerId} is not the active player`;
            if (state.currentEffect !== null) return `An effect is actively resolving`;
            if (state.pendingDecision) return `A pending decision prevents game from starting`;
            const attacker = state.instances[action.attackerId];
            const defender = state.instances[action.defenderId];
            if (!attacker) return `${action.attackerId} not found in instances`;
            if (attacker.class !== "CHARACTER" && attacker.class !== "LEADER") return `${action.attackerId} cannot declare attack or engage in battle`;
            if (attacker.currentZone !== "CHARACTERS" && attacker.currentZone !== "LEADER") return `${action.attackerId} cannot declare attack from zone ${attacker.currentZone}`;
            
            if (!defender) return `${action.defenderId} not found in instances`;
            if (defender.class !== "CHARACTER" && defender.class !== "LEADER") return `${action.defenderId} cannot be the target of an attack`;
            if (defender.currentZone !== "CHARACTERS" && defender.currentZone !== "LEADER") return `${action.defenderId} cannot have an attack declared against it while in zone ${defender.currentZone}`;
            
            // Check the attacker for eligibility
            if (attacker.controller !== action.playerId) return `${action.attackerId} is not controlled by the active player`;
            if (attacker.isRested) return `${action.attackerId} is rested and cannot attack`;
            // STATUS EFFECT: cannot attack and cannot rest effects here
            const playedThisTurn = state.cardsPlayedThisTurn.includes(action.attackerId);
            if (playedThisTurn) {
                // if attacker does not have rush OR character rush, fail
                // if attacker has character rush AND defender is not a character, fail
                // else
                return `Rush and character rush has not been implemented yet`;
                // return `${action.attackerId} was played this turn and cannot attack`;
            }

            // Check for attack target eligibility
            // If there ever is an effect that allows a leader to attack their own characters, it would go here (but this would fundamentally change the game)
            if (defender.controller === action.playerId) return `${action.defenderId} is controlled by the active player and cannot be the target of the attack`;
            // STATUS EFFECT: cannot be attacked by certain character effects
            if (!defender.isRested && defender.class === "CHARACTER" /** and attacker does not have attack active characters */) {
                return `${action.attackerId} does not have an effect that allows it to attack active character ${action.defenderId}`;
            }
            break;

        case 'DECLARE_BLOCKER':
            // Implemented when the blocker effects are added to the state
            if (state.currentEffect !== null) return `An effect is actively resolving`;
            if (state.pendingDecision) return `A pending decision prevents game from starting`;
            if (state.phase !== "BLOCKER" && state.phase !== "ON_OPPONENT_ATTACK") return `Cannot declare blocker from phase ${state.phase}`;
            if (state.currentBattle === null) return `There is no battle to consider for blocker`;
            const currentDefender = state.instances[state.currentBattle.defenderId];
            if (!currentDefender) return `No current defender for the battle`;
            // If the player does not control the current defender, they cannot declare blocker
            if (currentDefender.controller !== action.playerId) return `${action.playerId} is not the actively defending player`;
            const blocker = state.instances[action.blockerId];
            if (!blocker) return `${action.blockerId} not found in instances`;
            if (blocker.controller === state.activePlayerId) return `The active player cannot choose ${action.blockerId} as a blocker`;
            if (blocker.class !== "CHARACTER" && blocker.class !== "LEADER") return `${action.blockerId} cannot have the blocker keyword`;
            if (blocker.class === "LEADER" && blocker.currentZone !== "LEADER") return `${action.blockerId} is a leader but is not in the leader zone`;
            if (blocker.class === "CHARACTER" && blocker.currentZone !== "CHARACTERS") return `${action.blockerId} cannot be declared a blocker from zone ${blocker.currentZone}`;
            // Check for the blocker id's status as a blocker here
            return `Blocker has not been implemented yet`;

        case 'PLAY_COUNTER':
            if (state.phase !== "COUNTER" /** && state.phase !== "BLOCKER" && state.phase !== "ON_OPPONENT_ATTACK" */) {
                // The implied behavior is that if counter is played from a previous defense phase, jump ahead to countering
                // For now, prevent counter from being played outside of counter phase
                return `Cannot play counter from phase ${state.phase}`;
            }
            if (state.activePlayerId === action.playerId) return `Active player cannot play counter`;
            if (!state.currentBattle) return `No active battle to play counter for`;
            if (state.currentEffect !== null) return `An effect is actively resolving`;
            if (state.pendingDecision) return `A pending decision prevents counter from being played`;
            const counterCard = state.instances[action.counterId];
            if (!counterCard) return `${action.counterId} not found in instances`;
            if (counterCard.controller !== action.playerId) return `${action.playerId} does not control ${action.counterId} that was played for counter`;
            // Change this and all counter calculations if there is an effect that gives cards counter value
            // Usually done by effect and is not relevant for now
            if (counterCard.class !== "CHARACTER") return `Cannot counter with non-character card ${action.counterId}`;
            if (counterCard.currentZone !== "HAND") return `Cannot counter from zone ${counterCard.currentZone}`;
            if (calculateCounter(state, action.counterId) <= 0) return `${action.counterId} has no counter value`;
            break;

        case 'COMPLETE_BATTLE':
            if (state.phase !== "COUNTER" /** && state.phase !== "BLOCKER" && state.phase !== "ON_OPPONENT_ATTACK" */) {
                return `Cannot complete battle from phase ${state.phase}`;
            }
            if (!state.currentBattle) return `No active battle to resolve`;
            if (state.currentEffect !== null) return `An effect is actively resolving`;
            if (state.pendingDecision) return `A pending decision prevents battle from being completed`;
            break;
        
        case 'CHOOSE_NEXT_EFFECT':
            if (state.pendingDecision === null) return `There is no pending decision set`;
            if (state.currentEffect !== null) return `Effect currently executing, cannot select new effect`;
            if (state.pendingEffects[action.playerId].length <= 1) return `Only one effect being considered, no choice to make`;
            let effectQueued = false;
            for (const pendingEffect of state.pendingEffects[action.playerId]) {
                if (pendingEffect.sequenceId === action.sequenceId) effectQueued = true;
            }
            if (!effectQueued) return `Chosen effect has not been added to the queue`;
            break;
        case 'CHOOSE_TARGETS':
            if (state.pendingDecision === null) return `No pending decision to choose targets for`;
            if (state.currentEffect === null) return `No effect to choose targets for`;
            break;
    }
    return null;
}

export function effectSequenceIsOptional(state: GameState, effectSequence: EffectSequence): boolean {
    const sourceCardDef = getCardDef(state, effectSequence.sourceInstanceId);
    if(sourceCardDef.effectDefs === null || sourceCardDef.effectDefs === undefined) throw new Error(`There is no effect on the source card ${sourceCardDef.id}`);
    if(!Object.keys(sourceCardDef.effectDefs).includes(effectSequence.effectId)) throw new Error(`Sequence does not exist on its source card definition`);
    return sourceCardDef.effectDefs[effectSequence.effectId].optional;
}

export function effectSequenceIsOncePerTurn(state: GameState, effectSequence: EffectSequence): boolean {
    const sourceCardDef = getCardDef(state, effectSequence.sourceInstanceId);
    if(sourceCardDef.effectDefs === null || sourceCardDef.effectDefs === undefined) throw new Error(`There is no effect on the source card ${sourceCardDef.id}`);
    if(!Object.keys(sourceCardDef.effectDefs).includes(effectSequence.effectId)) throw new Error(`Sequence does not exist on its source card definition`);
    return sourceCardDef.effectDefs[effectSequence.effectId].oncePerTurn;
}