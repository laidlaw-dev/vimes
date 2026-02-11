import { describe, expect, it } from "vitest";

import { SyntaxError } from "@/errors/index.js";
import { tokenize } from "@/lexer/tokenize.js";
import { FunctionDeclaration, LetStatement, Program } from "@/parser/ast.js";
import { parseProgram } from "@/parser/parser.js";

const parseSource = (source: string): Program => parseProgram(tokenize(source));

const isFunctionDeclaration = (
  node: Program["body"][number]
): node is FunctionDeclaration => node?.kind === "FunctionDeclaration";

const isLetStatement = (node: Program["body"][number]): node is LetStatement => node?.kind === "LetStatement";

describe("parser", () => {
  it("parses function declarations with typed parameters and defaults", () => {
    const program = parseSource(`
      function add(a: UInt, b: UInt = 10) -> UInt {
        let sum = a + b;
        sum
      }
    `);

    expect(program.body).toHaveLength(1);
    const declaration = program.body[0];

    expect(isFunctionDeclaration(declaration)).toBe(true);
    if (!isFunctionDeclaration(declaration)) {
      return;
    }

    expect(declaration.parameters).toHaveLength(2);
    const [first, second] = declaration.parameters;
    expect(first.type.kind).toBe("SimpleType");
    expect(second?.defaultValue).toBeDefined();
    expect(declaration.returnType?.kind).toBe("SimpleType");
    expect(declaration.body.statements).toHaveLength(1);
    expect(declaration.body.result?.kind).toBe("IdentifierExpression");
  });

  it("parses block expressions with statements and final expressions", () => {
    const program = parseSource(`
      let value = {
        let x = 1;
        x + 2
      };
    `);

    expect(program.body).toHaveLength(1);
    const statement = program.body[0];
    expect(isLetStatement(statement)).toBe(true);
    if (!isLetStatement(statement)) {
      return;
    }

    expect(statement.initializer.kind).toBe("BlockExpression");
    const block = statement.initializer;
    if (block.kind !== "BlockExpression") {
      return;
    }

    expect(block.statements).toHaveLength(1);
    expect(block.result?.kind).toBe("BinaryExpression");
  });

  it("parses match expressions with tuple and wildcard patterns", () => {
    const program = parseSource(`
      let outcome = match (value) {
        (a, b) -> a;
        _ -> 0;
      };
    `);

    const statement = program.body[0];
    expect(isLetStatement(statement)).toBe(true);
    if (!isLetStatement(statement)) {
      return;
    }

    const initializer = statement.initializer;
    expect(initializer.kind).toBe("MatchExpression");
    if (initializer.kind !== "MatchExpression") {
      return;
    }

    expect(initializer.arms).toHaveLength(2);
    expect(initializer.arms[0]?.pattern.kind).toBe("TuplePattern");
    expect(initializer.arms[1]?.pattern.kind).toBe("WildcardPattern");
  });

  it("parses function literals and named argument calls", () => {
    const program = parseSource(`
      let inc = function (value: UInt) -> UInt {
        value + 1
      };

      let result = inc(value = 41);
    `);

    expect(program.body).toHaveLength(2);
    const [, second] = program.body;
    expect(isLetStatement(second)).toBe(true);
    if (!isLetStatement(second)) {
      return;
    }

    expect(second.initializer.kind).toBe("CallExpression");
    if (second.initializer.kind !== "CallExpression") {
      return;
    }

    expect(second.initializer.args).toHaveLength(1);
    expect(second.initializer.args[0]?.name).toBe("value");
  });

  it("parses nested if/else expressions", () => {
    const program = parseSource(`
      let outcome = if (flag) { value } else if (other) { alt } else { fallback };
    `);

    const statement = program.body[0];
    expect(isLetStatement(statement)).toBe(true);
    if (!isLetStatement(statement)) {
      return;
    }

    expect(statement.initializer.kind).toBe("IfExpression");
    if (statement.initializer.kind !== "IfExpression") {
      return;
    }

    const elseBranch = statement.initializer.elseBranch;
    expect(elseBranch.kind === "IfExpression" || elseBranch.kind === "BlockExpression").toBe(true);
  });

  it("throws syntax errors for missing semicolons", () => {
    expect(() => parseSource("let x = 1")).toThrow(SyntaxError);
  });

  it("throws syntax errors for empty match bodies", () => {
    expect(() =>
      parseSource(`
        let bad = match (value) {
        };
      `)
    ).toThrow(SyntaxError);
  });
});
