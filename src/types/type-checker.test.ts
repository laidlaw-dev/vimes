import { describe, expect, it } from "vitest";

import { TypeError } from "../errors/index.js";
import { tokenize } from "../lexer/tokenize.js";
import { parseProgram } from "../parser/parser.js";
import {
  PrimitiveType,
  Type,
  TypedFunctionDeclaration,
  TypedProgram,
  UIntType,
  checkProgram,
} from "./type-checker.js";

const parseAndCheck = (source: string): TypedProgram => {
  const program = parseProgram(tokenize(source));
  return checkProgram(program);
};

const expectType = (type: Type, expected: PrimitiveType): void => {
  expect(type.kind).toBe("PrimitiveType");
  if (type.kind !== "PrimitiveType") {
    return;
  }
  expect(type.name).toBe(expected.name);
};

describe("type checker", () => {
  it("annotates let bindings and binary expressions", () => {
    const typed = parseAndCheck(`
      let a = 1;
      let b = a + 2;
    `);

    const [, second] = typed.body;
    if (!second || second.kind !== "LetStatement") {
      throw new Error("Expected let statement");
    }

    expectType(second.initializer.type, UIntType);
  });

  it("validates function declarations and return types", () => {
    const typed = parseAndCheck(`
      function inc(value: UInt) -> UInt {
        return value + 1;
      }
    `);

    const first = typed.body[0];
    expect(first?.kind).toBe("FunctionDeclaration");
    const fn = first as TypedFunctionDeclaration;
    expectType(fn.body.result?.type ?? UIntType, UIntType);
  });

  it("supports named arguments and partial application", () => {
    const typed = parseAndCheck(`
      function add(a: UInt, b: UInt) -> UInt {
        return a + b;
      }

      let addTen = add(b = 10);
      let total = addTen(a = 5);
    `);

    const total = typed.body[2];
    if (!total || total.kind !== "LetStatement") {
      throw new Error("Expected let statement for total");
    }

    expectType(total.initializer.type, UIntType);
  });

  it("accepts exhaustive match expressions via enumeration", () => {
    const typed = parseAndCheck(`
      let flag = true;
      let output = match (flag) {
        true -> 1;
        false -> 0;
      };
    `);

    const statement = typed.body[1];
    if (!statement || statement.kind !== "LetStatement") {
      throw new Error("Expected let statement");
    }

    expectType(statement.initializer.type, UIntType);
  });

  it("rejects non-exhaustive boolean matches without placeholder", () => {
    expect(() =>
      parseAndCheck(`
        let flag = false;
        let output = match (flag) {
          true -> 1;
        };
      `)
    ).toThrow(TypeError);
  });

  it("rejects using partial results where values are required", () => {
    expect(() =>
      parseAndCheck(`
        function add(a: UInt, b: UInt) -> UInt {
          return a + b;
        }

        let fail = add(a = 1) + 1;
      `)
    ).toThrow(TypeError);
  });

  it("rejects functions with mismatched return types", () => {
    expect(() =>
      parseAndCheck(`
        function bad(a: UInt) -> Bool {
          return a + 1;
        }
      `)
    ).toThrow(TypeError);
  });
});
