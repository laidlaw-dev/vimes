import type { Environment } from "./environment.js";
import type { FunctionParameter } from "../parser/ast.js";
import type { TypedBlockExpression } from "../types/type-checker.js";

export interface UIntValue {
  readonly kind: "UIntValue";
  readonly value: number;
}

export interface BoolValue {
  readonly kind: "BoolValue";
  readonly value: boolean;
}

export interface FunctionValue {
  readonly kind: "FunctionValue";
  readonly parameters: ReadonlyArray<FunctionParameter>;
  readonly body: TypedBlockExpression;
  readonly closure: Environment;
  readonly boundArgs: ReadonlyMap<string, Value>;
}

export type Value = UIntValue | BoolValue | FunctionValue;

export const createUIntValue = (value: number): UIntValue => ({
  kind: "UIntValue",
  value,
});

export const createBoolValue = (value: boolean): BoolValue => ({
  kind: "BoolValue",
  value,
});

export const createFunctionValue = (
  parameters: ReadonlyArray<FunctionParameter>,
  body: TypedBlockExpression,
  closure: Environment,
  boundArgs?: ReadonlyMap<string, Value>
): FunctionValue => ({
  kind: "FunctionValue",
  parameters,
  body,
  closure,
  boundArgs: boundArgs ?? new Map(),
});
