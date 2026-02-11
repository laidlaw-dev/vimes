import { SourcePosition } from "@/types/source-position.js";

export interface Node {
  readonly kind: string;
  readonly position: SourcePosition;
}

export interface Program extends Node {
  readonly kind: "Program";
  readonly body: TopLevel[];
}

export type TopLevel = FunctionDeclaration | Statement;

export interface FunctionDeclaration extends Node {
  readonly kind: "FunctionDeclaration";
  readonly name: string;
  readonly namePosition: SourcePosition;
  readonly parameters: FunctionParameter[];
  readonly returnType?: TypeNode;
  readonly body: BlockExpression;
}

export interface BlockExpression extends Node {
  readonly kind: "BlockExpression";
  readonly statements: Statement[];
  readonly result?: Expression;
}

export type Statement = LetStatement | ReturnStatement | ExpressionStatement;

export interface LetStatement extends Node {
  readonly kind: "LetStatement";
  readonly name: string;
  readonly namePosition: SourcePosition;
  readonly initializer: Expression;
}

export interface ReturnStatement extends Node {
  readonly kind: "ReturnStatement";
  readonly value: Expression;
}

export interface ExpressionStatement extends Node {
  readonly kind: "ExpressionStatement";
  readonly expression: Expression;
}

export type Expression =
  | IdentifierExpression
  | UIntLiteralExpression
  | BoolLiteralExpression
  | BlockExpression
  | IfExpression
  | MatchExpression
  | FunctionExpression
  | CallExpression
  | UnaryExpression
  | BinaryExpression;

export interface IdentifierExpression extends Node {
  readonly kind: "IdentifierExpression";
  readonly name: string;
}

export interface UIntLiteralExpression extends Node {
  readonly kind: "UIntLiteralExpression";
  readonly value: number;
}

export interface BoolLiteralExpression extends Node {
  readonly kind: "BoolLiteralExpression";
  readonly value: boolean;
}

export interface IfExpression extends Node {
  readonly kind: "IfExpression";
  readonly condition: Expression;
  readonly thenBranch: BlockExpression;
  readonly elseBranch: BlockExpression | IfExpression;
}

export interface MatchExpression extends Node {
  readonly kind: "MatchExpression";
  readonly subject: Expression;
  readonly arms: MatchArm[];
}

export interface MatchArm {
  readonly pattern: Pattern;
  readonly expression: Expression;
  readonly position: SourcePosition;
}

export interface FunctionExpression extends Node {
  readonly kind: "FunctionExpression";
  readonly parameters: FunctionParameter[];
  readonly returnType?: TypeNode;
  readonly body: BlockExpression;
}

export interface CallExpression extends Node {
  readonly kind: "CallExpression";
  readonly callee: Expression;
  readonly args: NamedArgument[];
}

export interface NamedArgument {
  readonly name: string;
  readonly namePosition: SourcePosition;
  readonly value: Expression;
}

export interface UnaryExpression extends Node {
  readonly kind: "UnaryExpression";
  readonly operator: UnaryOperator;
  readonly operand: Expression;
}

export type UnaryOperator = "!" | "-";

export interface BinaryExpression extends Node {
  readonly kind: "BinaryExpression";
  readonly operator: BinaryOperator;
  readonly left: Expression;
  readonly right: Expression;
}

export type BinaryOperator =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "&&"
  | "||";

export interface FunctionParameter {
  readonly kind: "FunctionParameter";
  readonly name: string;
  readonly namePosition: SourcePosition;
  readonly type: TypeNode;
  readonly defaultValue?: Expression;
  readonly position: SourcePosition;
}

export type Pattern =
  | IdentifierPattern
  | WildcardPattern
  | UIntLiteralPattern
  | BoolLiteralPattern
  | TuplePattern
  | ConstructorPattern;

export interface IdentifierPattern extends Node {
  readonly kind: "IdentifierPattern";
  readonly name: string;
}

export interface WildcardPattern extends Node {
  readonly kind: "WildcardPattern";
}

export interface UIntLiteralPattern extends Node {
  readonly kind: "UIntLiteralPattern";
  readonly value: number;
}

export interface BoolLiteralPattern extends Node {
  readonly kind: "BoolLiteralPattern";
  readonly value: boolean;
}

export interface TuplePattern extends Node {
  readonly kind: "TuplePattern";
  readonly elements: Pattern[];
}

export interface ConstructorPattern extends Node {
  readonly kind: "ConstructorPattern";
  readonly name: string;
  readonly namePosition: SourcePosition;
  readonly arguments: Pattern[];
}

export type TypeNode = SimpleTypeNode | RecordTypeNode | FunctionTypeNode;

export interface SimpleTypeNode extends Node {
  readonly kind: "SimpleType";
  readonly name: string;
}

export interface RecordTypeNode extends Node {
  readonly kind: "RecordType";
  readonly fields: RecordTypeField[];
}

export interface RecordTypeField {
  readonly kind: "RecordTypeField";
  readonly name: string;
  readonly namePosition: SourcePosition;
  readonly type: TypeNode;
  readonly position: SourcePosition;
}

export interface FunctionTypeNode extends Node {
  readonly kind: "FunctionType";
  readonly parameter: RecordTypeNode;
  readonly returnType: TypeNode;
}
