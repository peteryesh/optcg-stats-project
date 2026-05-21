import type { CardInstanceId, CardClass, Color, Attribute } from './primitives';

export type CardFilter =
  | { kind: "ANY" }
  | { kind: "SPECIFIC";    instanceId: CardInstanceId }
  | { kind: "CONTROLLER";  controller: "SELF" | "OPPONENT" | "ANY" | "TEAMMATE" }
  | { kind: "NAME";        name: string }              // checks name and aliases
  | { kind: "CLASS";       cardClass: CardClass }
  | { kind: "COST";        op: ">=" | "<=" | "==" | ">" | "<"; value: number, base: boolean }
  | { kind: "POWER";       op: ">=" | "<=" | "==" | ">" | "<"; value: number, base: boolean }
  | { kind: "COUNTER";     op: ">=" | "<=" | "==" | ">" | "<"; value: number }
  | { kind: "COLOR";       color: Color }
  | { kind: "TYPE";        cardType: string }          // OPTCG group/affiliation
  | { kind: "ATTRIBUTE";   attribute: Attribute }
  | { kind: "AND";         filters: CardFilter[] }
  | { kind: "OR";          filters: CardFilter[] }
  | { kind: "NOT";         filter: CardFilter };