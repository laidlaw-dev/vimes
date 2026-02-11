import { RuntimeError, SyntaxError, TypeError } from "@/errors/index.js";
import type { Value } from "@/runtime/values.js";
import type { SourcePosition } from "@/types/source-position.js";

export const formatValue = (value: Value): string => {
  switch (value.kind) {
    case "UIntValue":
      return value.value.toString(10);
    case "BoolValue":
      return value.value ? "true" : "false";
    case "FunctionValue":
      return "<function>";
  }
  return assertUnreachable(value);
};

export const formatError = (error: unknown): string => {
  if (isVimesError(error)) {
    const position = formatPosition(error.position);
    return position ? `${position} ${error.message}` : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const isVimesError = (error: unknown): error is SyntaxError | TypeError | RuntimeError => {
  return error instanceof SyntaxError || error instanceof TypeError || error instanceof RuntimeError;
};

const formatPosition = (position?: SourcePosition): string | undefined => {
  if (!position) {
    return undefined;
  }
  return `${position.line}:${position.column}`;
};

const assertUnreachable = (_value: never): never => {
  throw new RuntimeError("Encountered unsupported value", undefined);
};
