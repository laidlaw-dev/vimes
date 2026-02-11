import { TypeError } from "../errors/index.js";
import {
  BinaryExpression,
  BlockExpression,
  BoolLiteralExpression,
  CallExpression,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  FunctionExpression,
  FunctionParameter,
  IdentifierExpression,
  IfExpression,
  LetStatement,
  MatchArm,
  MatchExpression,
  NamedArgument,
  Pattern,
  Program,
  ReturnStatement,
  Statement,
  TypeNode,
  UIntLiteralExpression,
  UnaryExpression,
} from "../parser/ast.js";
import { SourcePosition } from "./source-position.js";

export type PrimitiveTypeName = "UInt" | "Bool";

export interface PrimitiveType {
  readonly kind: "PrimitiveType";
  readonly name: PrimitiveTypeName;
}

export interface FunctionType {
  readonly kind: "FunctionType";
  readonly parameters: ReadonlyArray<FunctionTypeParameter>;
  readonly returnType: Type;
}

export interface FunctionTypeParameter {
  readonly name: string;
  readonly type: Type;
  readonly hasDefault: boolean;
}

export type Type = PrimitiveType | FunctionType;

export interface TypedNode {
  readonly type: Type;
}

export type TypedProgram = Program & {
  readonly body: ReadonlyArray<TypedTopLevel>;
};

export type TypedTopLevel = TypedFunctionDeclaration | TypedStatement;

export type TypedFunctionDeclaration = FunctionDeclaration & {
  readonly body: TypedBlockExpression;
};

export type TypedStatement =
  | (LetStatement & { readonly initializer: TypedExpression })
  | (ReturnStatement & { readonly value: TypedExpression })
  | (ExpressionStatement & { readonly expression: TypedExpression });

export type TypedBlockExpression = BlockExpression & {
  readonly statements: ReadonlyArray<TypedStatement>;
  readonly result?: TypedExpression;
};

export type TypedExpression =
  | (IdentifierExpression & TypedNode)
  | (Expression & TypedNode)
  | (UIntLiteralExpression & TypedNode)
  | (BoolLiteralExpression & TypedNode)
  | (BinaryExpression & TypedNode & { readonly left: TypedExpression; readonly right: TypedExpression })
  | (UnaryExpression & TypedNode & { readonly operand: TypedExpression })
  | (CallExpression & TypedNode & { readonly args: ReadonlyArray<TypedNamedArgument> })
  | (FunctionExpression & TypedNode & { readonly body: TypedBlockExpression })
  | TypedIfExpression
  | (MatchExpression & TypedNode & { readonly arms: ReadonlyArray<TypedMatchArm> })
  | (BlockExpression & TypedNode & TypedBlockExpression);

export type TypedIfExpression = IfExpression & {
  readonly condition: TypedExpression;
  readonly thenBranch: TypedBlockExpression;
  readonly elseBranch: TypedBlockExpression | TypedIfExpression;
} & TypedNode;

export type TypedMatchArm = MatchArm & {
  readonly expression: TypedExpression;
};

export type TypedNamedArgument = NamedArgument & {
  readonly value: TypedExpression;
};

export const UIntType: PrimitiveType = { kind: "PrimitiveType", name: "UInt" };
export const BoolType: PrimitiveType = { kind: "PrimitiveType", name: "Bool" };

export const checkProgram = (program: Program): TypedProgram => new TypeChecker().run(program);

class TypeChecker {
  private readonly env = new Environment();
  private readonly functionSignatures = new Map<string, FunctionType>();
  private readonly functionReturnStack: Type[] = [];

  public run(program: Program): TypedProgram {
    this.predeclareFunctions(program);

    const typedBody: TypedTopLevel[] = program.body.map((node) => {
      if (node.kind === "FunctionDeclaration") {
        return this.checkFunctionDeclaration(node);
      }

      return this.checkStatement(node);
    });

    return {
      ...program,
      body: typedBody,
    };
  }

  private predeclareFunctions(program: Program): void {
    for (const node of program.body) {
      if (node.kind !== "FunctionDeclaration") {
        continue;
      }

      if (this.functionSignatures.has(node.name)) {
        throw new TypeError(`Function '${node.name}' already declared`, node.namePosition);
      }

      const signature = this.buildFunctionType(node, {
        missingReturnMessage: "Function declarations must specify a return type",
      });

      this.functionSignatures.set(node.name, signature);
      this.env.define(node.name, signature, node.namePosition);
    }
  }

  private checkFunctionDeclaration(node: FunctionDeclaration): TypedFunctionDeclaration {
    const signature = this.functionSignatures.get(node.name);

    if (!signature) {
      throw new TypeError(`Missing function signature for '${node.name}'`, node.position);
    }

    const typedBody = this.withFunctionScope(signature, node.parameters, () =>
      this.checkBlockExpression(node.body, { skipScopeCreation: true })
    );

    if (typedBody.result) {
      this.assertTypesEqual(typedBody.result.type, signature.returnType, typedBody.result.position, "Function body result must match return type");
    }

    return {
      ...node,
      body: typedBody,
    };
  }

  private checkStatement(node: Statement): TypedStatement {
    const position = node.position;
    const kind = node.kind;

    switch (node.kind) {
      case "LetStatement": {
        const initializer = this.checkExpression(node.initializer);
        this.env.define(node.name, initializer.type, node.namePosition);
        return { ...node, initializer };
      }
      case "ReturnStatement": {
        const expected = this.currentFunctionReturnType();
        if (!expected) {
          throw new TypeError("Return statements are only allowed inside functions", node.position);
        }
        const value = this.checkExpression(node.value);
        this.assertTypesEqual(value.type, expected, value.position, "Return type mismatch");
        return { ...node, value };
      }
      case "ExpressionStatement": {
        const expression = this.checkExpression(node.expression);
        return { ...node, expression };
      }
    }

    const _exhaustive: never = node;
    throw new TypeError(`Unsupported statement kind '${kind}'`, position);
  }

  private checkExpression(expression: Expression): TypedExpression {
    const position = expression.position;
    const kind = expression.kind;

    switch (expression.kind) {
      case "IdentifierExpression": {
        const type = this.env.lookup(expression.name, expression.position);
        return { ...expression, type };
      }
      case "UIntLiteralExpression":
        return { ...expression, type: UIntType };
      case "BoolLiteralExpression":
        return { ...expression, type: BoolType };
      case "BlockExpression":
        return this.checkBlockAsExpression(expression);
      case "IfExpression":
        return this.checkIfExpression(expression);
      case "MatchExpression":
        return this.checkMatchExpression(expression);
      case "FunctionExpression":
        return this.checkFunctionExpression(expression);
      case "CallExpression":
        return this.checkCallExpression(expression);
      case "UnaryExpression":
        return this.checkUnaryExpression(expression);
      case "BinaryExpression":
        return this.checkBinaryExpression(expression);
    }

    const _exhaustive: never = expression;
    throw new TypeError(`Unsupported expression kind '${kind}'`, position);
  }

  private checkUnaryExpression(expression: UnaryExpression): TypedExpression {
    const operand = this.checkExpression(expression.operand);

    if (expression.operator === "!") {
      this.assertTypesEqual(operand.type, BoolType, operand.position, "Logical not expects a Bool operand");
      return { ...expression, operand, type: BoolType };
    }

    this.assertTypesEqual(operand.type, UIntType, operand.position, "Unary minus expects a UInt operand");
    return { ...expression, operand, type: UIntType };
  }

  private checkBinaryExpression(expression: BinaryExpression): TypedExpression {
    const left = this.checkExpression(expression.left);
    const right = this.checkExpression(expression.right);

    const arithmeticOperators: BinaryExpression["operator"][] = ["+", "-", "*", "/", "%"];
    const comparisonOperators: BinaryExpression["operator"][] = ["<", "<=", ">", ">="];
    const equalityOperators: BinaryExpression["operator"][] = ["==", "!="];
    const logicalOperators: BinaryExpression["operator"][] = ["&&", "||"];

    if (arithmeticOperators.includes(expression.operator)) {
      this.assertUIntOperands(left, right, expression.position, `Operator '${expression.operator}' expects UInt operands`);
      return { ...expression, left, right, type: UIntType };
    }

    if (comparisonOperators.includes(expression.operator)) {
      this.assertUIntOperands(left, right, expression.position, `Operator '${expression.operator}' expects UInt operands`);
      return { ...expression, left, right, type: BoolType };
    }

    if (equalityOperators.includes(expression.operator)) {
      this.assertTypesEqual(left.type, right.type, expression.position, "Equality operands must share a type");
      return { ...expression, left, right, type: BoolType };
    }

    if (logicalOperators.includes(expression.operator)) {
      this.assertBoolOperands(left, right, expression.position, `Operator '${expression.operator}' expects Bool operands`);
      return { ...expression, left, right, type: BoolType };
    }

    throw new TypeError(`Unknown binary operator '${expression.operator}'`, expression.position);
  }

  private checkCallExpression(expression: CallExpression): TypedExpression {
    const callee = this.checkExpression(expression.callee);
    const calleeType = callee.type;

    if (calleeType.kind !== "FunctionType") {
      throw new TypeError("Only functions can be called", expression.position);
    }

    const providedArgs = new Map<string, TypedNamedArgument>();

    for (const arg of expression.args) {
      if (providedArgs.has(arg.name)) {
        throw new TypeError(`Argument '${arg.name}' provided multiple times`, arg.namePosition);
      }
      const value = this.checkExpression(arg.value);
      providedArgs.set(arg.name, { ...arg, value });
    }

    const remainingParameters: FunctionTypeParameter[] = [];
    const typedArgs: TypedNamedArgument[] = [];

    for (const parameter of calleeType.parameters) {
      const supplied = providedArgs.get(parameter.name);

      if (supplied) {
        this.assertTypesEqual(supplied.value.type, parameter.type, supplied.value.position, `Argument '${parameter.name}' has incompatible type`);
        typedArgs.push(supplied);
        continue;
      }

      if (!parameter.hasDefault) {
        remainingParameters.push(parameter);
      }
    }

    if (providedArgs.size > typedArgs.length) {
      const extra = [...providedArgs.keys()].find((name) => !calleeType.parameters.some((p) => p.name === name));
      if (extra) {
        throw new TypeError(`Unknown argument '${extra}'`, expression.position);
      }
    }

    const resultType =
      remainingParameters.length === 0
        ? calleeType.returnType
        : {
            kind: "FunctionType" as const,
            parameters: remainingParameters,
            returnType: calleeType.returnType,
          } satisfies FunctionType;

    return {
      ...expression,
      callee,
      args: typedArgs,
      type: resultType,
    };
  }

  private checkFunctionExpression(expression: FunctionExpression): TypedExpression {
    const signature = this.buildFunctionType(expression, {
      missingReturnMessage: "Function expressions must include a return type",
    });

    const typedBody = this.withFunctionScope(signature, expression.parameters, () =>
      this.checkBlockExpression(expression.body, { skipScopeCreation: true })
    );

    if (typedBody.result) {
      this.assertTypesEqual(typedBody.result.type, signature.returnType, typedBody.result.position, "Function body result must match return type");
    }

    return {
      ...expression,
      body: typedBody,
      type: signature,
    };
  }

  private checkIfExpression(expression: IfExpression): TypedIfExpression {
    const condition = this.checkExpression(expression.condition);
    this.assertTypesEqual(condition.type, BoolType, condition.position, "If condition must be Bool");

    const thenBranch = this.checkBlockExpression(expression.thenBranch);
    const thenType = this.requireBlockResultType(thenBranch, "then", expression.thenBranch.position);

    const elseCheck = this.checkElseBranch(expression.elseBranch);
    this.assertTypesEqual(elseCheck.type, thenType, expression.position, "If branches must share a type");

    return {
      ...expression,
      condition,
      thenBranch,
      elseBranch: elseCheck.branch,
      type: thenType,
    };
  }

  private checkElseBranch(node: BlockExpression | IfExpression): { branch: TypedBlockExpression | TypedIfExpression; type: Type } {
    if (node.kind === "BlockExpression") {
      const block = this.checkBlockExpression(node);
      const type = this.requireBlockResultType(block, "else", node.position);
      return { branch: block, type };
    }

    const nested = this.checkIfExpression(node);
    return { branch: nested, type: nested.type };
  }

  private checkMatchExpression(expression: MatchExpression): TypedExpression {
    const subject = this.checkExpression(expression.subject);

    if (expression.arms.length === 0) {
      throw new TypeError("Match expressions require at least one arm", expression.position);
    }

    const coverage: MatchCoverage = { coversTrue: false, coversFalse: false, hasWildcard: false };
    const typedArms: TypedMatchArm[] = [];
    let armType: Type | undefined;

    for (const arm of expression.arms) {
      this.env.pushScope();
      let typedExpression: TypedExpression;
      try {
        this.applyPattern(arm.pattern, subject.type, coverage);
        typedExpression = this.checkExpression(arm.expression);
      } finally {
        this.env.popScope();
      }

      if (!armType) {
        armType = typedExpression.type;
      } else {
        this.assertTypesEqual(typedExpression.type, armType, arm.expression.position, "All match arms must share a type");
      }

      typedArms.push({ ...arm, expression: typedExpression });
    }

    this.ensureMatchExhaustiveness(subject.type, coverage, expression.position);

    return {
      ...expression,
      subject,
      arms: typedArms,
      type: armType ?? subject.type,
    };
  }

  private checkBlockAsExpression(block: BlockExpression): TypedExpression {
    const typedBlock = this.checkBlockExpression(block);
    const result = typedBlock.result;

    if (!result) {
      throw new TypeError("Block expressions must end with a value", block.position);
    }

    return {
      ...typedBlock,
      type: result.type,
    };
  }

  private checkBlockExpression(block: BlockExpression, options?: { skipScopeCreation?: boolean }): TypedBlockExpression {
    if (options?.skipScopeCreation) {
      return {
        ...block,
        statements: block.statements.map((statement) => this.checkStatement(statement)),
        result: block.result ? this.checkExpression(block.result) : undefined,
      };
    }

    this.env.pushScope();
    try {
      const statements: TypedStatement[] = block.statements.map((statement) => this.checkStatement(statement));
      const result = block.result ? this.checkExpression(block.result) : undefined;

      return {
        ...block,
        statements,
        result,
      };
    } finally {
      this.env.popScope();
    }
  }

  private withFunctionScope(signature: FunctionType, params: FunctionParameter[], callback: () => TypedBlockExpression): TypedBlockExpression {
    this.env.pushScope();
    for (let index = 0; index < params.length; index += 1) {
      const parameter = params[index];
      const parameterType = signature.parameters[index];
      this.env.define(parameter.name, parameterType.type, parameter.namePosition);
    }

    this.functionReturnStack.push(signature.returnType);
    try {
      return callback();
    } finally {
      this.functionReturnStack.pop();
      this.env.popScope();
    }
  }

  private buildFunctionType(
    node: { parameters: FunctionParameter[]; returnType?: TypeNode; position: SourcePosition },
    options: { missingReturnMessage: string }
  ): FunctionType {
    const parameters = node.parameters.map<FunctionTypeParameter>((parameter) => ({
      name: parameter.name,
      type: this.resolveTypeNode(parameter.type),
      hasDefault: Boolean(parameter.defaultValue),
    }));

    if (!node.returnType) {
      throw new TypeError(options.missingReturnMessage, node.position);
    }

    const returnType = this.resolveTypeNode(node.returnType);
    return { kind: "FunctionType", parameters, returnType };
  }

  private resolveTypeNode(typeNode: TypeNode): Type {
    if (typeNode.kind === "SimpleType") {
      if (typeNode.name === "UInt") {
        return UIntType;
      }
      if (typeNode.name === "Bool") {
        return BoolType;
      }
      throw new TypeError(`Unknown type '${typeNode.name}'`, typeNode.position);
    }

    throw new TypeError(`Unsupported type annotation '${typeNode.kind}'`, typeNode.position);
  }

  private requireBlockResultType(block: TypedBlockExpression, context: string, position: SourcePosition): Type {
    if (!block.result) {
      throw new TypeError(`The ${context} block must end with an expression`, position);
    }

    return block.result.type;
  }

  private applyPattern(pattern: Pattern, subjectType: Type, coverage: MatchCoverage): void {
    switch (pattern.kind) {
      case "WildcardPattern":
        coverage.hasWildcard = true;
        return;
      case "IdentifierPattern":
        this.env.define(pattern.name, subjectType, pattern.position);
        return;
      case "BoolLiteralPattern":
        this.assertTypesEqual(BoolType, subjectType, pattern.position, "Boolean pattern can only match Bool subjects");
        if (pattern.value) {
          coverage.coversTrue = true;
        } else {
          coverage.coversFalse = true;
        }
        return;
      case "UIntLiteralPattern":
        this.assertTypesEqual(UIntType, subjectType, pattern.position, "UInt pattern can only match UInt subjects");
        return;
      default:
        throw new TypeError(`Unsupported pattern kind '${pattern.kind}'`, pattern.position);
    }
  }

  private ensureMatchExhaustiveness(subjectType: Type, coverage: MatchCoverage, position: SourcePosition): void {
    if (subjectType === BoolType) {
      if (!coverage.hasWildcard && (!coverage.coversTrue || !coverage.coversFalse)) {
        throw new TypeError("Non-exhaustive match for Bool", position);
      }
      return;
    }

    if (!coverage.hasWildcard) {
      throw new TypeError("Match expressions require '_' arm unless all cases are covered", position);
    }
  }

  private assertUIntOperands(left: TypedExpression, right: TypedExpression, position: SourcePosition, message: string): void {
    this.assertTypesEqual(left.type, UIntType, position, message);
    this.assertTypesEqual(right.type, UIntType, position, message);
  }

  private assertBoolOperands(left: TypedExpression, right: TypedExpression, position: SourcePosition, message: string): void {
    this.assertTypesEqual(left.type, BoolType, position, message);
    this.assertTypesEqual(right.type, BoolType, position, message);
  }

  private assertTypesEqual(actual: Type, expected: Type, position: SourcePosition, message: string): void {
    if (typesEqual(actual, expected)) {
      return;
    }

    throw new TypeError(`${message}. Expected ${typeToString(expected)}, received ${typeToString(actual)}`, position);
  }

  private currentFunctionReturnType(): Type | undefined {
    if (this.functionReturnStack.length === 0) {
      return undefined;
    }

    return this.functionReturnStack[this.functionReturnStack.length - 1];
  }
}

class Environment {
  private readonly scopes: Map<string, Type>[] = [new Map()];

  public pushScope(): void {
    this.scopes.push(new Map());
  }

  public popScope(): void {
    if (this.scopes.length === 1) {
      throw new TypeError("Cannot pop the global scope");
    }

    this.scopes.pop();
  }

  public define(name: string, type: Type, position: SourcePosition): void {
    const scope = this.scopes[this.scopes.length - 1];

    if (scope.has(name)) {
      throw new TypeError(`Identifier '${name}' already defined in this scope`, position);
    }

    scope.set(name, type);
  }

  public lookup(name: string, position: SourcePosition): Type {
    for (let index = this.scopes.length - 1; index >= 0; index -= 1) {
      const scope = this.scopes[index];
      const existing = scope.get(name);
      if (existing) {
        return existing;
      }
    }

    throw new TypeError(`Undefined identifier '${name}'`, position);
  }
}

interface MatchCoverage {
  coversTrue: boolean;
  coversFalse: boolean;
  hasWildcard: boolean;
}

const typesEqual = (left: Type, right: Type): boolean => {
  if (left === right) {
    return true;
  }

  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "PrimitiveType" && right.kind === "PrimitiveType") {
    return left.name === right.name;
  }

  if (left.kind === "FunctionType" && right.kind === "FunctionType") {
    if (left.parameters.length !== right.parameters.length) {
      return false;
    }

    const paramsMatch = left.parameters.every((parameter, index) =>
      parameter.hasDefault === right.parameters[index]?.hasDefault && typesEqual(parameter.type, right.parameters[index]!.type)
    );

    return paramsMatch && typesEqual(left.returnType, right.returnType);
  }

  return false;
};

const typeToString = (type: Type): string => {
  if (type.kind === "PrimitiveType") {
    return type.name;
  }

  const params = type.parameters.map((parameter) => `${parameter.name}: ${typeToString(parameter.type)}`).join(", ");
  return `{ ${params} } -> ${typeToString(type.returnType)}`;
};
