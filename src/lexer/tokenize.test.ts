import { SyntaxError } from "../errors/index.js";
import { tokenize, Token } from "./index.js";

interface SimpleToken {
  type: Token["type"];
  lexeme: string;
  literal: Token["literal"];
  position: Token["position"];
}

const snapshot = (source: string): SimpleToken[] =>
  tokenize(source).map(({ type, lexeme, literal, position }) => ({
    type,
    lexeme,
    literal,
    position,
  }));

describe("tokenize", () => {
  it("tokenizes identifiers, keywords, and literals", () => {
    const tokens = snapshot("let flag = true;\nlet value = 42;");

    expect(tokens).toEqual([
      { type: "let", lexeme: "let", literal: null, position: { line: 1, column: 1 } },
      { type: "identifier", lexeme: "flag", literal: null, position: { line: 1, column: 5 } },
      { type: "equal", lexeme: "=", literal: null, position: { line: 1, column: 10 } },
      { type: "bool_literal", lexeme: "true", literal: true, position: { line: 1, column: 12 } },
      { type: "semicolon", lexeme: ";", literal: null, position: { line: 1, column: 16 } },
      { type: "let", lexeme: "let", literal: null, position: { line: 2, column: 1 } },
      { type: "identifier", lexeme: "value", literal: null, position: { line: 2, column: 5 } },
      { type: "equal", lexeme: "=", literal: null, position: { line: 2, column: 11 } },
      { type: "uint_literal", lexeme: "42", literal: 42, position: { line: 2, column: 13 } },
      { type: "semicolon", lexeme: ";", literal: null, position: { line: 2, column: 15 } },
      { type: "eof", lexeme: "", literal: null, position: { line: 2, column: 16 } },
    ]);
  });

  it("tokenizes operators and punctuation", () => {
    const tokens = snapshot("function add(a: UInt) -> UInt { return a + 1; }");

    expect(tokens.map((token) => token.type)).toEqual([
      "function",
      "identifier",
      "left_paren",
      "identifier",
      "colon",
      "identifier",
      "right_paren",
      "arrow",
      "identifier",
      "left_brace",
      "return",
      "identifier",
      "plus",
      "uint_literal",
      "semicolon",
      "right_brace",
      "eof",
    ]);
  });

  it("tracks line and column positions with whitespace", () => {
    const tokens = snapshot("if (value >= 10) {\n  return value - 10;\n}\n");

    expect(tokens.filter(({ type }) => type !== "eof")).toEqual([
      { type: "if", lexeme: "if", literal: null, position: { line: 1, column: 1 } },
      { type: "left_paren", lexeme: "(", literal: null, position: { line: 1, column: 4 } },
      { type: "identifier", lexeme: "value", literal: null, position: { line: 1, column: 5 } },
      { type: "greater_equal", lexeme: ">=", literal: null, position: { line: 1, column: 11 } },
      { type: "uint_literal", lexeme: "10", literal: 10, position: { line: 1, column: 14 } },
      { type: "right_paren", lexeme: ")", literal: null, position: { line: 1, column: 16 } },
      { type: "left_brace", lexeme: "{", literal: null, position: { line: 1, column: 18 } },
      { type: "return", lexeme: "return", literal: null, position: { line: 2, column: 3 } },
      { type: "identifier", lexeme: "value", literal: null, position: { line: 2, column: 10 } },
      { type: "minus", lexeme: "-", literal: null, position: { line: 2, column: 16 } },
      { type: "uint_literal", lexeme: "10", literal: 10, position: { line: 2, column: 18 } },
      { type: "semicolon", lexeme: ";", literal: null, position: { line: 2, column: 20 } },
      { type: "right_brace", lexeme: "}", literal: null, position: { line: 3, column: 1 } },
    ]);
  });

  it("ignores whitespace and single-line comments", () => {
    const source = [
      "let total = 0;",
      "// increment",
      "total = total + 1;",
    ].join("\n");

    const tokens = snapshot(source);
    expect(tokens.map((token) => token.type)).toEqual([
      "let",
      "identifier",
      "equal",
      "uint_literal",
      "semicolon",
      "identifier",
      "equal",
      "identifier",
      "plus",
      "uint_literal",
      "semicolon",
      "eof",
    ]);
  });

  it("throws a SyntaxError for unsupported characters", () => {
    expect(() => tokenize("let $value = 1;")).toThrowError(SyntaxError);
    expect(() => tokenize("let $value = 1;")).toThrowError(
      'Unexpected character "$" at 1:5'
    );
  });
});
