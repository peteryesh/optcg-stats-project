import { DeckList } from "./card";
import { EffectId, SequenceId } from "./effect";
import { CardId, CardInstanceId, PlayerId, FrameId } from "./primitives";

export type GameAction =
    // Setup
    | { type: "CHOOSE_FIRST_PLAYER"; playerId: PlayerId; choice: PlayerId}
    | { type: "KEEP_HAND"; playerId: PlayerId }
    | { type: "MULLIGAN"; playerId: PlayerId }

    // Game Flow
    | { type: "NEXT_PHASE"; playerId: PlayerId }

    // Main Phase
    | { type: "PLAY_CARD"; playerId: PlayerId; instanceId: CardInstanceId; }
    | { type: "ATTACH_DON"; playerId: PlayerId; targetId: CardInstanceId; count: number }
    | { type: "ACTIVATE_EFFECT"; playerId: PlayerId; instanceId: CardInstanceId; effectId: EffectId }
    
    // Combat
    | { type: "DECLARE_ATTACK"; playerId: PlayerId; attackerId: CardInstanceId; defenderId: CardInstanceId }
    | { type: "DECLARE_BLOCKER"; playerId: PlayerId; blockerId: CardInstanceId }
    | { type: "PLAY_COUNTER"; playerId: PlayerId; counterId: CardInstanceId }
    | { type: "COMPLETE_BATTLE"; playerId: PlayerId }

    // Decision Resolutions
    | { type: "CHOOSE_NEXT_EFFECT"; playerId: PlayerId; sequenceId: SequenceId }
    | { type: "CHOOSE_TARGETS"; playerId: PlayerId; instanceIds: CardInstanceId[] }