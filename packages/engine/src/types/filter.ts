import type { CardClass, Color, Attribute, Zone } from './primitives';

export type CardFilter =
    | { kind: "ANY" }
    | { kind: "THIS" }
    | { kind: "CONTROLLER"; controller: "SELF" | "OPPONENT" | "ANY" }
    | { kind: "NAME"; name: string }              // checks name and aliases
    | { kind: "CLASS"; cardClass: CardClass }
    | { kind: "COST"; op: ">=" | "<=" | "==" | ">" | "<"; value: number, base: boolean }
    | { kind: "POWER"; op: ">=" | "<=" | "==" | ">" | "<"; value: number, base: boolean }
    | { kind: "COUNTER"; op: ">=" | "<=" | "==" | ">" | "<"; value: number }
    | { kind: "COLOR"; color: Color }
    | { kind: "TYPE"; cardType: string }          // OPTCG group/affiliation
    | { kind: "ATTRIBUTE"; attribute: Attribute }
    | { kind: "RESTED"; isRested: boolean }
    | { kind: "FLIPPED"; isFlipped: boolean }
    | { kind: "AND"; filters: CardFilter[] }
    | { kind: "OR"; filters: CardFilter[] }
    | { kind: "NOT"; filter: CardFilter };

export type BoardCondition =
    | { kind: "AND"; conditions: BoardCondition[] }
    | { kind: "OR"; conditions: BoardCondition[] }
    | { kind: "NOT"; condition: BoardCondition }
    | { kind: "CARD_COUNT"; zones: Zone[]; amount: AmountExpression };

// Expressions

// Can be compositions of expressions
// MULTIPLY can be COUNT * LITERAL, LITERAL * LITERAL but what would be the point
export type AmountExpression =
    | { kind: "ALL" }
    | { kind: "LITERAL"; value: number } // literal number, hard coded
    | { kind: "COUNT"; filter: CardFilter } // count based on some game state value
    | { kind: "MULTIPLY"; left: AmountExpression; right: AmountExpression }
    | { kind: "ADD"; left: AmountExpression; right: AmountExpression }
    | { kind: "SUBTRACT"; left: AmountExpression; right: AmountExpression }
    | { kind: "RANGE"; min: AmountExpression; max: AmountExpression }

export type TargetExpression =
    | { kind: "SELF_TARGET" } // Target's only self
    | { kind: "SELECTOR_TARGET"; zones: Zone[]; filter?: CardFilter } // Affects all that meet criteria, no decision
    | { kind: "PLAYER_CHOICE_TARGET"; amount: AmountExpression; zones: Zone[]; filter?: CardFilter } // Affects selected by player decision