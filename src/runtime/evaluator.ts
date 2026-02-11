import { RuntimeError } from "../errors/index.js";
import type { FunctionExpression, Pattern } from "../parser/ast.js";
import {
  TypedBlockExpression,
  TypedExpression,
  TypedFunctionDeclaration,
  TypedIfExpression,
  TypedMatchArm,
  TypedNamedArgument,
  TypedProgram,
  TypedStatement,
} from "../types/type-checker.js";
import { Environment } from "./environment.js";
import { BoolValue, FunctionValue, Value, createBoolValue, createFunctionValue, createUIntValue } from "./values.js";
import type { SourcePosition } from "../types/source-position.js";

type TypedFunctionExpression = FunctionExpression & { readonly body: TypedBlockExpression };
type TypedMatchExpression = TypedExpression & {
  readonly kind: "MatchExpression";
  readonly subject: TypedExpression;
  readonly arms: ReadonlyArray<TypedMatchArm>;
};
type TypedCallExpression = TypedExpression & {
  readonly kind: "CallExpression";
  readonly callee: TypedExpression;
  readonly args: ReadonlyArray<TypedNamedArgument>;
};
type TypedUnaryExpression = TypedExpression & {
  readonly kind: "UnaryExpression";
  readonly operand: TypedExpression;
};
type TypedBinaryExpression = TypedExpression & {
  readonly kind: "BinaryExpression";
  readonly left: TypedExpression;
  readonly right: TypedExpression;
};

interface StatementResult {
  readonly env: Environment;
  readonly value?: Value;
}

class ReturnSignal extends Error {
  constructor(public readonly value: Value, public readonly position?: SourcePosition) {
    super("return");
  }
}

export const evaluateProgram = (program: TypedProgram): Value | undefined => {
  const evaluator = new Evaluator();
  return evaluator.run(program);
};

class Evaluator {
  public run(program: TypedProgram): Value | undefined {
    let env = Environment.empty();
    let lastValue: Value | undefined;

    try {
      for (const node of program.body) {
        if (node.kind === "FunctionDeclaration") {
          env = this.bindFunctionDeclaration(node, env);
          continue;
        }

        const result = this.evaluateStatement(node, env);
        env = result.env;

        if (result.value) {
          lastValue = result.value;
        }
      }
    } catch (signal) {
      if (signal instanceof ReturnSignal) {
        throw new RuntimeError("Return statements are only allowed inside functions", signal.position);
      }
      throw signal;
    }

    return lastValue;
  }

  private bindFunctionDeclaration(node: TypedFunctionDeclaration, env: Environment): Environment {
    const placeholder = createFunctionValue(node.parameters, node.body, env);
    let updatedEnv = env.define(node.name, placeholder, node.namePosition);
    const functionValue = createFunctionValue(node.parameters, node.body, updatedEnv);
    updatedEnv = updatedEnv.assignCurrent(node.name, functionValue, node.namePosition);
    return updatedEnv;
  }

  private evaluateStatement(node: TypedStatement, env: Environment): StatementResult {
    switch (node.kind) {
      case "LetStatement": {
        const value = this.evaluateExpression(node.initializer, env);
        return { env: env.define(node.name, value, node.namePosition) };
      }
      case "ReturnStatement": {
        const value = this.evaluateExpression(node.value, env);
        throw new ReturnSignal(value, node.position);
      }
      case "ExpressionStatement": {
        const value = this.evaluateExpression(node.expression, env);
        return { env, value };
      }
    }

    return { env };
  }

  private evaluateExpression(expression: TypedExpression, env: Environment): Value {
    switch (expression.kind) {
      case "IdentifierExpression":
        return env.lookup(expression.name, expression.position);
      case "UIntLiteralExpression":
        return createUIntValue(expression.value);
      case "BoolLiteralExpression":
        return createBoolValue(expression.value);
      case "BlockExpression":
        return this.evaluateBlockExpression(expression as TypedBlockExpression, env);
      case "IfExpression":
        return this.evaluateIfExpression(expression as TypedIfExpression, env);
      case "MatchExpression":
        return this.evaluateMatchExpression(expression as TypedMatchExpression, env);
      case "FunctionExpression":
        return this.createFunctionValue(expression as TypedFunctionExpression, env);
      case "CallExpression":
        return this.evaluateCallExpression(expression as TypedCallExpression, env);
      case "UnaryExpression":
        return this.evaluateUnaryExpression(expression as TypedUnaryExpression, env);
      case "BinaryExpression":
        return this.evaluateBinaryExpression(expression as TypedBinaryExpression, env);
    }
    return this.unreachable(expression);
  }

  private evaluateBlockExpression(block: TypedBlockExpression, env: Environment): Value {
    const value = this.evaluateBlock(block, env);

    if (!value) {
      throw new RuntimeError("Block expressions must end with a value", block.position);
    }

    return value;
  }

  private evaluateBlock(block: TypedBlockExpression, env: Environment): Value | undefined {
    let currentEnv = env.extend();

    for (const statement of block.statements) {
      const result = this.evaluateStatement(statement, currentEnv);
      currentEnv = result.env;
    }

    if (block.result) {
      return this.evaluateExpression(block.result, currentEnv);
    }

    return undefined;
  }

  private evaluateIfExpression(expression: TypedIfExpression, env: Environment): Value {
    const conditionValue = this.evaluateExpression(expression.condition, env);
    const conditionBool = this.expectBoolValue(conditionValue, expression.position);

    const branch = conditionBool.value ? expression.thenBranch : expression.elseBranch;

    if (branch.kind === "BlockExpression") {
      return this.evaluateBlockExpression(branch as TypedBlockExpression, env);
    }

    return this.evaluateIfExpression(branch as TypedIfExpression, env);
  }

  private evaluateMatchExpression(expression: TypedMatchExpression, env: Environment): Value {
    const subject = this.evaluateExpression(expression.subject, env);

    for (const arm of expression.arms) {
      const matchEnv = this.matchPattern(arm.pattern, subject, env);

      if (!matchEnv) {
        continue;
      }

      return this.evaluateExpression(arm.expression, matchEnv);
    }

    throw new RuntimeError("Non-exhaustive match expression", expression.position);
  }

  private evaluateUnaryExpression(expression: TypedUnaryExpression, env: Environment): Value {
    const operandValue = this.evaluateExpression(expression.operand, env);

    if (expression.operator === "!") {
      const boolOperand = this.expectBoolValue(operandValue, expression.position);
      return createBoolValue(!boolOperand.value);
    }

    if (operandValue.kind !== "UIntValue") {
      throw new RuntimeError("Unary minus expects a UInt operand", expression.position);
    }

    return createUIntValue(-operandValue.value);
  }

  private evaluateBinaryExpression(expression: TypedBinaryExpression, env: Environment): Value {
    const left = this.evaluateExpression(expression.left, env);

    if (expression.operator === "&&") {
      const leftBool = this.expectBoolValue(left, expression.position);
      if (!leftBool.value) {
        return createBoolValue(false);
      }
      const right = this.evaluateExpression(expression.right, env);
      const rightBool = this.expectBoolValue(right, expression.position);
      return createBoolValue(rightBool.value);
    }

    if (expression.operator === "||") {
      const leftBool = this.expectBoolValue(left, expression.position);
      if (leftBool.value) {
        return createBoolValue(true);
      }
      const right = this.evaluateExpression(expression.right, env);
      const rightBool = this.expectBoolValue(right, expression.position);
      return createBoolValue(rightBool.value);
    }

    const right = this.evaluateExpression(expression.right, env);

    if (this.isArithmeticOperator(expression.operator)) {
      const leftUInt = this.expectUIntValue(left, expression.position);
      const rightUInt = this.expectUIntValue(right, expression.position);

      switch (expression.operator) {
        case "+":
          return createUIntValue(leftUInt + rightUInt);
        case "-":
          return createUIntValue(leftUInt - rightUInt);
        case "*":
          return createUIntValue(leftUInt * rightUInt);
        case "/":
          if (rightUInt === 0) {
            throw new RuntimeError("Division by zero", expression.position);
          }
          return createUIntValue(Math.floor(leftUInt / rightUInt));
        case "%":
          if (rightUInt === 0) {
            throw new RuntimeError("Modulo by zero", expression.position);
          }
          return createUIntValue(leftUInt % rightUInt);
      }
    }

    if (this.isComparisonOperator(expression.operator)) {
      const leftUInt = this.expectUIntValue(left, expression.position);
      const rightUInt = this.expectUIntValue(right, expression.position);

      switch (expression.operator) {
        case "<":
          return createBoolValue(leftUInt < rightUInt);
        case "<=":
          return createBoolValue(leftUInt <= rightUInt);
        case ">":
          return createBoolValue(leftUInt > rightUInt);
        case ">=":
          return createBoolValue(leftUInt >= rightUInt);
      }
    }

    if (expression.operator === "==" || expression.operator === "!=") {
      const equals = this.valuesEqual(left, right);
      return createBoolValue(expression.operator === "==" ? equals : !equals);
    }

    throw new RuntimeError(`Unsupported binary operator '${expression.operator}'`, expression.position);
  }

  private evaluateCallExpression(expression: TypedCallExpression, env: Environment): Value {
    const callee = this.evaluateExpression(expression.callee, env);

    if (callee.kind !== "FunctionValue") {
      throw new RuntimeError("Only functions can be called", expression.position);
    }

    const evaluatedArgs = new Map(callee.boundArgs);

    for (const arg of expression.args) {
      if (evaluatedArgs.has(arg.name)) {
        throw new RuntimeError(`Argument '${arg.name}' provided multiple times`, arg.namePosition);
      }
      const value = this.evaluateExpression(arg.value, env);
      evaluatedArgs.set(arg.name, value);
    }

    const missingParameters = callee.parameters.filter((parameter) => !evaluatedArgs.has(parameter.name));

    if (missingParameters.length > 0) {
      return createFunctionValue(callee.parameters, callee.body, callee.closure, new Map(evaluatedArgs));
    }

    let invocationEnv = callee.closure.extend();

    for (const parameter of callee.parameters) {
      const argumentValue = evaluatedArgs.get(parameter.name);
      if (!argumentValue) {
        throw new RuntimeError(`Missing argument '${parameter.name}'`, expression.position);
      }
      invocationEnv = invocationEnv.define(parameter.name, argumentValue, parameter.position);
    }

    try {
      const value = this.evaluateBlock(callee.body, invocationEnv);
      if (!value) {
        throw new RuntimeError("Function body did not produce a value", callee.body.position);
      }
      return value;
    } catch (signal) {
      if (signal instanceof ReturnSignal) {
        return signal.value;
      }
      throw signal;
    }
  }

  private createFunctionValue(expression: TypedFunctionExpression, env: Environment): FunctionValue {
    return createFunctionValue(expression.parameters, expression.body, env);
  }

  private matchPattern(pattern: Pattern, value: Value, env: Environment): Environment | undefined {
    switch (pattern.kind) {
      case "WildcardPattern":
        return env.extend();
      case "IdentifierPattern": {
        const scoped = env.extend();
        return scoped.define(pattern.name, value, pattern.position);
      }
      case "BoolLiteralPattern": {
        if (value.kind !== "BoolValue") {
          return undefined;
        }
        return value.value === pattern.value ? env.extend() : undefined;
      }
      case "UIntLiteralPattern": {
        if (value.kind !== "UIntValue") {
          return undefined;
        }
        return value.value === pattern.value ? env.extend() : undefined;
      }
      default:
        throw new RuntimeError(`Unsupported pattern '${pattern.kind}' in match expression`, pattern.position);
    }
  }

  private expectUIntValue(value: Value, position: SourcePosition): number {
    if (value.kind !== "UIntValue") {
      throw new RuntimeError("Expected a UInt value", position);
    }
    return value.value;
  }

  private expectBoolValue(value: Value, position: SourcePosition): BoolValue {
    if (value.kind !== "BoolValue") {
      throw new RuntimeError("Expected a Bool value", position);
    }
    return value;
  }

  private isArithmeticOperator(operator: string): boolean {
    return operator === "+" || operator === "-" || operator === "*" || operator === "/" || operator === "%";
  }

  private isComparisonOperator(operator: string): boolean {
    return operator === "<" || operator === "<=" || operator === ">" || operator === ">=";
  }

  private valuesEqual(left: Value, right: Value): boolean {
    if (left.kind !== right.kind) {
      return false;
    }

    if (left.kind === "UIntValue" && right.kind === "UIntValue") {
      return left.value === right.value;
    }

    if (left.kind === "BoolValue" && right.kind === "BoolValue") {
      return left.value === right.value;
    }

    return left === right;
  }

  private unreachable(_node: never): never {
    throw new RuntimeError("Reached unreachable evaluator state", undefined);
  }
}
