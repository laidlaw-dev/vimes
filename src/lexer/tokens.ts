import { SourcePosition } from "../types/source-position.js";

export type TokenType =
  | "identifier"
  | "uint_literal"
  | "bool_literal"
  | "function"
  | "let"
  | "return"
  | "if"
  | "else"
  | "match"
  | "left_paren"
  | "right_paren"
  | "left_brace"
  | "right_brace"
  | "comma"
  | "semicolon"
  | "colon"
  | "underscore"
  | "arrow"
  | "equal"
  | "slash"
  | "percent"
  | "star"
  | "plus"
  | "minus"
  | "bang"
  | "equal_equal"
  | "bang_equal"
  | "less"
  | "less_equal"
  | "greater"
  | "greater_equal"
  | "and_and"
  | "or_or"
  | "eof";

export type LiteralValue = number | boolean | null;

export interface Token {
  type: TokenType;
  lexeme: string;
  literal: LiteralValue;
  position: SourcePosition;
}

export const KEYWORDS: Record<string, TokenType> = {
  function: "function",
  let: "let",
  return: "return",
  if: "if",
  else: "else",
  match: "match",
};

export const SINGLE_CHAR_TOKENS: Record<string, TokenType> = {
  "(": "left_paren",
  ")": "right_paren",
  "{": "left_brace",
  "}": "right_brace",
  ",": "comma",
  ";": "semicolon",
  ":": "colon",
  "_": "underscore",
  "+": "plus",
  "-": "minus",
  "*": "star",
  "/": "slash",
  "%": "percent",
  "!": "bang",
  "<": "less",
  ">": "greater",
  "=": "equal",
};

export const MULTI_CHAR_TOKENS: Record<string, TokenType> = {
  "==": "equal_equal",
  "!=": "bang_equal",
  "<=": "less_equal",
  ">=": "greater_equal",
  "&&": "and_and",
  "||": "or_or",
  "->": "arrow",
};
