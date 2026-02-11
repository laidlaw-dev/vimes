import { describe, expect, it } from "vitest";

import { RuntimeError } from "../errors/index.js";
import { tokenize } from "../lexer/tokenize.js";
import { parseProgram } from "../parser/parser.js";
import { evaluateProgram } from "./evaluator.js";
import { BoolValue, UIntValue, Value } from "./values.js";
import { checkProgram } from "../types/type-checker.js";

const run = (source: string): Value | undefined => {
  const program = parseProgram(tokenize(source));
  const typed = checkProgram(program);
  return evaluateProgram(typed);
};

const expectUIntValue = (value: Value | undefined, expected: number): void => {
  expect(value).toBeDefined();
  if (!value || value.kind !== "UIntValue") {
    throw new Error("Expected UIntValue");
  }
  const uintValue = value as UIntValue;
  expect(uintValue.value).toBe(expected);
};

const expectBoolValue = (value: Value | undefined, expected: boolean): void => {
  expect(value).toBeDefined();
  if (!value || value.kind !== "BoolValue") {
    throw new Error("Expected BoolValue");
  }
  const boolValue = value as BoolValue;
  expect(boolValue.value).toBe(expected);
};

describe("evaluator", () => {
  it("evaluates arithmetic expressions", () => {
    const value = run(`
      let result = 1 + 2 * 3;
      result;
    `);

    expectUIntValue(value, 7);
  });

  it("evaluates boolean logic and conditionals", () => {
    const boolValue = run(`
      let outcome = true && false;
      outcome;
    `);

    expectBoolValue(boolValue, false);

    const conditional = run(`
      let value = if (true) { 1 } else { 2 };
      value;
    `);

    expectUIntValue(conditional, 1);
  });

  it("evaluates block expressions with final results", () => {
    const value = run(`
      let stored = {
        let inner = 1;
        inner + 2
      };

      stored;
    `);

    expectUIntValue(value, 3);
  });

  it("supports functions and closures", () => {
    const value = run(`
      function makeAdder(delta: UInt) -> UInt {
        let inner = function (value: UInt) -> UInt {
          return value + delta;
        };

        return inner(value = 5);
      }

      let result = makeAdder(delta = 3);
      result;
    `);

    expectUIntValue(value, 8);
  });

  it("supports named arguments and partial application", () => {
    const value = run(`
      function add(a: UInt, b: UInt) -> UInt {
        return a + b;
      }

      let addTen = add(b = 10);
      let total = addTen(a = 5);
      total;
    `);

    expectUIntValue(value, 15);
  });

  it("evaluates match expressions using enumeration", () => {
    const value = run(`
      let flag = true;
      let mapped = match (flag) {
        true -> 1;
        false -> 0;
      };

      mapped;
    `);

    expectUIntValue(value, 1);
  });

  it("propagates return statements inside functions", () => {
    const value = run(`
      function pick(flag: Bool) -> UInt {
        return if (flag) { 1 } else { 2 };
      }

      let result = pick(flag = true);
      result;
    `);

    expectUIntValue(value, 1);
  });

  it("throws runtime errors for invalid operations", () => {
    expect(() =>
      run(`
        let crash = 1 / 0;
        crash;
      `)
    ).toThrow(RuntimeError);
  });
});
