import { produce } from 'immer';
import { BattleRecord, CardInstanceId, GameState } from "../../types";
import { getCardInstance } from './helpers';

export function updateCurrentBattle(state: GameState, battle: BattleRecord): GameState {
    if (!battle) throw new Error(`Battle is set as null`);
    if (!battle.attackerId) throw new Error(`Attacker ${battle.attackerId} not found in current battle`);
    if (!battle.defenderId) throw new Error(`Defender ${battle.defenderId} not found in current battle`);
    if (battle.counter === null || battle.counter === undefined) throw new Error(`Counter not found in current battle`);
    return produce(state, draft => {
        draft.currentBattle = {
            attackerId: battle.attackerId,
            defenderId: battle.defenderId,
            counter: battle.counter
        }
    });
}

export function removeCurrentBattle(state: GameState): GameState {
    return produce(state, draft => {
        draft.currentBattle = null;
    });
}

export function logCurrentBattleForTurn(state: GameState): GameState {
    const battle = state.currentBattle;
    if (!battle) throw new Error(`Battle is set as null`);
    if (!battle.attackerId) throw new Error(`Attacker ${battle.attackerId} not found in current battle`);
    if (!battle.defenderId) throw new Error(`Defender ${battle.defenderId} not found in current battle`);
    if (battle.counter === null || battle.counter === undefined) throw new Error(`Counter not found in current battle`);
    return produce(state, draft => {
        draft.battlesThisTurn.push(draft.currentBattle!);
    });
}