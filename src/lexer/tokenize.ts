import { SyntaxError } from "@/errors/index.js";
import {
  KEYWORDS,
  SINGLE_CHAR_TOKENS,
  Token,
  TokenType,
  LiteralValue,
} from "@/lexer/tokens.js";
import { SourcePosition } from "@/types/source-position.js";

export const tokenize = (source: string): Token[] => {
  const tokens: Token[] = [];
  let current = 0;
  let line = 1;
  let column = 1;

  const atEnd = (): boolean => current >= source.length;

  const peek = (): string => (atEnd() ? "\0" : source[current]);

  const advance = (): string => {
    const char = source[current];
    current += 1;

    if (char === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }

    return char;
  };

  const matchChar = (expected: string): boolean => {
    if (atEnd() || source[current] !== expected) {
      return false;
    }

    advance();
    return true;
  };

  const createPosition = (startLine: number, startColumn: number): SourcePosition => ({
    line: startLine,
    column: startColumn,
  });

  const addToken = (
    type: TokenType,
    lexeme: string,
    literal: LiteralValue,
    position: SourcePosition
  ): void => {
    tokens.push({ type, lexeme, literal, position });
  };

  const isDigit = (char: string): boolean => char >= "0" && char <= "9";

  const isAlpha = (char: string): boolean =>
    (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");

  const isAlphaNumeric = (char: string): boolean => isAlpha(char) || isDigit(char) || char === "_";

  const throwUnexpected = (character: string, position: SourcePosition): never => {
    throw new SyntaxError(`Unexpected character "${character}" at ${position.line}:${position.column}`, position);
  };

  const readNumber = (startPosition: SourcePosition, firstDigit: string): void => {
    let lexeme = firstDigit;

    while (isDigit(peek())) {
      lexeme += advance();
    }

    addToken("uint_literal", lexeme, Number(lexeme), startPosition);
  };

  const readIdentifierOrKeyword = (startPosition: SourcePosition, firstChar: string): void => {
    let lexeme = firstChar;

    while (isAlphaNumeric(peek())) {
      lexeme += advance();
    }

    if (lexeme === "true" || lexeme === "false") {
      addToken("bool_literal", lexeme, lexeme === "true", startPosition);
      return;
    }

    const keywordType = KEYWORDS[lexeme];

    if (keywordType) {
      addToken(keywordType, lexeme, null, startPosition);
      return;
    }

    addToken("identifier", lexeme, null, startPosition);
  };

  while (!atEnd()) {
    const startLine = line;
    const startColumn = column;
    const startPosition = createPosition(startLine, startColumn);
    const char = advance();

    if (char === " " || char === "\r" || char === "\t") {
      continue;
    }

    if (char === "\n") {
      continue;
    }

    if (isDigit(char)) {
      readNumber(startPosition, char);
      continue;
    }

    if (isAlpha(char)) {
      readIdentifierOrKeyword(startPosition, char);
      continue;
    }

    if (char === "_") {
      addToken("underscore", char, null, startPosition);
      continue;
    }

    if (char === "/") {
      if (matchChar("/")) {
        while (peek() !== "\n" && !atEnd()) {
          advance();
        }
        continue;
      }

      addToken("slash", char, null, startPosition);
      continue;
    }

    if (char === "&") {
      if (matchChar("&")) {
        addToken("and_and", "&&", null, startPosition);
        continue;
      }

      throwUnexpected(char, startPosition);
    }

    if (char === "|") {
      if (matchChar("|")) {
        addToken("or_or", "||", null, startPosition);
        continue;
      }

      throwUnexpected(char, startPosition);
    }

    if (char === "=") {
      if (matchChar("=")) {
        addToken("equal_equal", "==", null, startPosition);
      } else {
        addToken("equal", char, null, startPosition);
      }
      continue;
    }

    if (char === "!") {
      if (matchChar("=")) {
        addToken("bang_equal", "!=", null, startPosition);
      } else {
        addToken("bang", char, null, startPosition);
      }
      continue;
    }

    if (char === "<") {
      if (matchChar("=")) {
        addToken("less_equal", "<=", null, startPosition);
      } else {
        addToken("less", char, null, startPosition);
      }
      continue;
    }

    if (char === ">") {
      if (matchChar("=")) {
        addToken("greater_equal", ">=", null, startPosition);
      } else {
        addToken("greater", char, null, startPosition);
      }
      continue;
    }

    if (char === "-") {
      if (matchChar(">")) {
        addToken("arrow", "->", null, startPosition);
      } else {
        addToken("minus", char, null, startPosition);
      }
      continue;
    }

    const singleCharToken = SINGLE_CHAR_TOKENS[char];

    if (singleCharToken) {
      addToken(singleCharToken, char, null, startPosition);
      continue;
    }

    throwUnexpected(char, startPosition);
  }

  const eofPosition = createPosition(line, column);
  addToken("eof", "", null, eofPosition);

  return tokens;
};
