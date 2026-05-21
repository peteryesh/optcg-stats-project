import { DeckList } from "./card";
import { CardId, CardInstanceId, PlayerId, FrameId } from "./primitives";

export type Action =
  // Setup
  | { type: "SUBMIT_DECK"; playerId: PlayerId; decklist: DeckList }
  | { type: "CHOOSE_TURN_ORDER"; playerId: PlayerId; choice: "FIRST" | "SECOND" }
  | { type: "KEEP_HAND";         playerId: PlayerId }
  | { type: "MULLIGAN";          playerId: PlayerId }

  // Game Flow
  | { type: "END_PHASE";         playerId: PlayerId }

  // Main Phase
  | { type: "PLAY_CARD";         playerId: PlayerId; instanceId: CardInstanceId; targetSlot?: number }
  | { type: "ACTIVATE_EFFECT";  playerId: PlayerId; instanceId: CardInstanceId; abilityId: string }
  | { type: "ATTACH_DON";        playerId: PlayerId; donId: CardInstanceId; targetId: CardInstanceId }

  // Combat
  | { type: "DECLARE_ATTACK";    playerId: PlayerId; attackerId: CardInstanceId; defenderId: CardInstanceId }
  | { type: "DECLARE_BLOCKER";   playerId: PlayerId; blockerId: CardInstanceId }
  | { type: "PLAY_COUNTER";      playerId: PlayerId; counterId: CardInstanceId }
  | { type: "PASS_COUNTER";      playerId: PlayerId }

  // Decision Resolutions
  | { type: "CHOOSE_NEXT_EFFECT"; playerId: PlayerId; frameId: FrameId }
  | { type: "CHOOSE_TARGETS";     playerId: PlayerId; instanceIds: CardInstanceId[] }
  | { type: "CHOOSE_FROM_HAND";   playerId: PlayerId; instanceIds: CardInstanceId[] }
  | { type: "CHOOSE_FROM_LOOK";   playerId: PlayerId; instanceIds: CardInstanceId[] }
  | { type: "CONFIRM";            playerId: PlayerId }
  | { type: "DECLINE";            playerId: PlayerId };