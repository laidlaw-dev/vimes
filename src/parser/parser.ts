import { SyntaxError } from "@/errors/index.js";
import { Token, TokenType } from "@/lexer/tokens.js";
import {
  BinaryOperator,
  BlockExpression,
  BoolLiteralExpression,
  BoolLiteralPattern,
  CallExpression,
  ConstructorPattern,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  FunctionExpression,
  FunctionParameter,
  FunctionTypeNode,
  IdentifierExpression,
  IdentifierPattern,
  IfExpression,
  LetStatement,
  MatchArm,
  MatchExpression,
  NamedArgument,
  Pattern,
  Program,
  RecordTypeField,
  RecordTypeNode,
  ReturnStatement,
  SimpleTypeNode,
  Statement,
  TopLevel,
  TuplePattern,
  TypeNode,
  UIntLiteralExpression,
  UIntLiteralPattern,
  UnaryOperator,
  WildcardPattern,
} from "@/parser/ast.js";

export const parseProgram = (tokens: Token[]): Program => new Parser(tokens).parseProgram();

class Parser {
  private current = 0;

  constructor(private readonly tokens: Token[]) {}

  public parseProgram(): Program {
    const elements: TopLevel[] = [];

    while (!this.isAtEnd()) {
      if (this.check("function") && this.checkNext("identifier")) {
        const functionToken = this.advance();
        elements.push(this.parseFunctionDeclaration(functionToken));
        continue;
      }

      const statement = this.parseStatement();
      this.consume("semicolon", "Expected ';' after statement");
      elements.push(statement);
    }

    this.consume("eof", "Unexpected tokens after program end");

    return {
      kind: "Program",
      body: elements,
      position: elements[0]?.position ?? this.peek().position,
    };
  }

  private parseFunctionDeclaration(functionToken: Token): FunctionDeclaration {
    const nameToken = this.consume("identifier", "Expected function name after 'function'");
    const { parameters, returnType } = this.parseFunctionSignature();
    const body = this.parseBlockExpression();

    return {
      kind: "FunctionDeclaration",
      name: nameToken.lexeme,
      namePosition: nameToken.position,
      parameters,
      returnType,
      body,
      position: functionToken.position,
    };
  }

  private parseFunctionSignature(): { parameters: FunctionParameter[]; returnType?: TypeNode } {
    this.consume("left_paren", "Expected '(' after function name");
    const parameters = this.parseParameterList();
    let returnType: TypeNode | undefined;

    if (this.match("arrow")) {
      returnType = this.parseTypeNode();
    }

    return { parameters, returnType };
  }

  private parseStatement(): Statement {
    if (this.match("let")) {
      return this.parseLetStatement(this.previous());
    }

    if (this.match("return")) {
      return this.parseReturnStatement(this.previous());
    }

    const expression = this.parseExpression();
    return this.createExpressionStatement(expression);
  }

  private parseLetStatement(keyword: Token): LetStatement {
    const nameToken = this.consume("identifier", "Expected identifier after 'let'");
    this.consume("equal", "Expected '=' after identifier in let statement");
    const initializer = this.parseExpression();

    return {
      kind: "LetStatement",
      name: nameToken.lexeme,
      namePosition: nameToken.position,
      initializer,
      position: keyword.position,
    };
  }

  private parseReturnStatement(keyword: Token): ReturnStatement {
    const value = this.parseExpression();

    return {
      kind: "ReturnStatement",
      value,
      position: keyword.position,
    };
  }

  private parseExpression(): Expression {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): Expression {
    return this.parseBinaryExpression(() => this.parseLogicalAnd(), ["or_or"], (token) => token.lexeme as BinaryOperator);
  }

  private parseLogicalAnd(): Expression {
    return this.parseBinaryExpression(() => this.parseEquality(), ["and_and"], (token) => token.lexeme as BinaryOperator);
  }

  private parseEquality(): Expression {
    return this.parseBinaryExpression(
      () => this.parseComparison(),
      ["equal_equal", "bang_equal"],
      (token) => token.lexeme as BinaryOperator
    );
  }

  private parseComparison(): Expression {
    return this.parseBinaryExpression(
      () => this.parseTerm(),
      ["less", "less_equal", "greater", "greater_equal"],
      (token) => token.lexeme as BinaryOperator
    );
  }

  private parseTerm(): Expression {
    return this.parseBinaryExpression(() => this.parseFactor(), ["plus", "minus"], (token) => token.lexeme as BinaryOperator);
  }

  private parseFactor(): Expression {
    return this.parseBinaryExpression(
      () => this.parseUnary(),
      ["star", "slash", "percent"],
      (token) => token.lexeme as BinaryOperator
    );
  }

  private parseBinaryExpression(
    operandParser: () => Expression,
    operatorTypes: TokenType[],
    operatorMapper: (token: Token) => BinaryOperator
  ): Expression {
    let expression = operandParser();

    while (this.match(...operatorTypes)) {
      const operatorToken = this.previous();
      const right = operandParser();
      expression = {
        kind: "BinaryExpression",
        operator: operatorMapper(operatorToken),
        left: expression,
        right,
        position: expression.position,
      };
    }

    return expression;
  }

  private parseUnary(): Expression {
    if (this.match("bang", "minus")) {
      const operatorToken = this.previous();
      const operand = this.parseUnary();
      return {
        kind: "UnaryExpression",
        operator: operatorToken.lexeme as UnaryOperator,
        operand,
        position: operatorToken.position,
      };
    }

    return this.parseCall();
  }

  private parseCall(): Expression {
    let expression = this.parsePrimary();

    while (true) {
      if (this.match("left_paren")) {
        expression = this.finishCall(expression, this.previous());
        continue;
      }

      break;
    }

    return expression;
  }

  private finishCall(callee: Expression, parenToken: Token): CallExpression {
    const args: NamedArgument[] = [];

    if (!this.check("right_paren")) {
      do {
        const nameToken = this.consume("identifier", "Expected argument name in call");
        this.consume("equal", "Expected '=' after argument name");
        const value = this.parseExpression();
        args.push({
          name: nameToken.lexeme,
          namePosition: nameToken.position,
          value,
        });
      } while (this.match("comma"));
    }

    this.consume("right_paren", "Expected ')' after arguments");

    return {
      kind: "CallExpression",
      callee,
      args,
      position: parenToken.position,
    };
  }

  private parsePrimary(): Expression {
    if (this.match("uint_literal")) {
      const token = this.previous();
      return {
        kind: "UIntLiteralExpression",
        value: token.literal as number,
        position: token.position,
      } satisfies UIntLiteralExpression;
    }

    if (this.match("bool_literal")) {
      const token = this.previous();
      return {
        kind: "BoolLiteralExpression",
        value: token.literal as boolean,
        position: token.position,
      } satisfies BoolLiteralExpression;
    }

    if (this.match("identifier")) {
      const token = this.previous();
      return {
        kind: "IdentifierExpression",
        name: token.lexeme,
        position: token.position,
      } satisfies IdentifierExpression;
    }

    if (this.match("left_paren")) {
      const expression = this.parseExpression();
      this.consume("right_paren", "Expected ')' after expression");
      return expression;
    }

    if (this.match("left_brace")) {
      return this.parseBlockFromOpeningBrace(this.previous());
    }

    if (this.match("if")) {
      return this.parseIfExpression(this.previous());
    }

    if (this.match("match")) {
      return this.parseMatchExpression(this.previous());
    }

    if (this.match("function")) {
      return this.parseFunctionExpression(this.previous());
    }

    throw this.error(this.peek(), "Expected expression");
  }

  private parseIfExpression(keyword: Token): IfExpression {
    this.consume("left_paren", "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.consume("right_paren", "Expected ')' after if condition");

    this.consume("left_brace", "Expected '{' to start if block");
    const thenBranch = this.parseBlockFromOpeningBrace(this.previous());

    this.consume("else", "Expected 'else' after if block");

    let elseBranch: BlockExpression | IfExpression;

    if (this.match("if")) {
      elseBranch = this.parseIfExpression(this.previous());
    } else {
      this.consume("left_brace", "Expected '{' to start else block");
      elseBranch = this.parseBlockFromOpeningBrace(this.previous());
    }

    return {
      kind: "IfExpression",
      condition,
      thenBranch,
      elseBranch,
      position: keyword.position,
    };
  }

  private parseMatchExpression(keyword: Token): MatchExpression {
    this.consume("left_paren", "Expected '(' after 'match'");
    const subject = this.parseExpression();
    this.consume("right_paren", "Expected ')' after match subject");
    this.consume("left_brace", "Expected '{' to start match arms");

    const arms: MatchArm[] = [];

    while (!this.check("right_brace") && !this.isAtEnd()) {
      const pattern = this.parsePattern();
      this.consume("arrow", "Expected '->' after match pattern");
      const expression = this.parseExpression();
      this.consume("semicolon", "Expected ';' after match arm expression");
      arms.push({ pattern, expression, position: pattern.position });
    }

    this.consume("right_brace", "Expected '}' after match arms");

    if (arms.length === 0) {
      throw this.error(keyword, "Match expression requires at least one arm");
    }

    return {
      kind: "MatchExpression",
      subject,
      arms,
      position: keyword.position,
    };
  }

  private parseFunctionExpression(functionToken: Token): FunctionExpression {
    this.consume("left_paren", "Expected '(' after 'function'");
    const parameters = this.parseParameterList();
    let returnType: TypeNode | undefined;

    if (this.match("arrow")) {
      returnType = this.parseTypeNode();
    }

    const body = this.parseBlockExpression();

    return {
      kind: "FunctionExpression",
      parameters,
      returnType,
      body,
      position: functionToken.position,
    };
  }

  private parseParameterList(): FunctionParameter[] {
    const parameters: FunctionParameter[] = [];

    if (this.check("right_paren")) {
      this.advance();
      return parameters;
    }

    do {
      const parameter = this.parseFunctionParameter();
      parameters.push(parameter);
    } while (this.match("comma"));

    this.consume("right_paren", "Expected ')' after parameter list");

    return parameters;
  }

  private parseFunctionParameter(): FunctionParameter {
    const nameToken = this.consume("identifier", "Expected parameter name");
    this.consume("colon", "Expected ':' after parameter name");
    const type = this.parseTypeNode();
    let defaultValue: Expression | undefined;

    if (this.match("equal")) {
      defaultValue = this.parseExpression();
    }

    return {
      kind: "FunctionParameter",
      name: nameToken.lexeme,
      namePosition: nameToken.position,
      type,
      defaultValue,
      position: nameToken.position,
    };
  }

  private parseTypeNode(): TypeNode {
    if (this.match("identifier")) {
      const token = this.previous();
      const baseType: SimpleTypeNode = {
        kind: "SimpleType",
        name: token.lexeme,
        position: token.position,
      };

      if (this.match("arrow")) {
        throw this.error(token, "Function types must start with a record type");
      }

      return baseType;
    }

    if (this.match("left_brace")) {
      const recordType = this.parseRecordType(this.previous());

      if (this.match("arrow")) {
        const returnType = this.parseTypeNode();
        return {
          kind: "FunctionType",
          parameter: recordType,
          returnType,
          position: recordType.position,
        } satisfies FunctionTypeNode;
      }

      return recordType;
    }

    throw this.error(this.peek(), "Expected type annotation");
  }

  private parseRecordType(openToken: Token): RecordTypeNode {
    const fields: RecordTypeField[] = [];

    if (!this.check("right_brace")) {
      do {
        const nameToken = this.consume("identifier", "Expected field name in record type");
        this.consume("colon", "Expected ':' after field name");
        const type = this.parseTypeNode();
        fields.push({
          kind: "RecordTypeField",
          name: nameToken.lexeme,
          namePosition: nameToken.position,
          type,
          position: nameToken.position,
        });
      } while (this.match("comma"));
    }

    this.consume("right_brace", "Expected '}' after record type");

    return {
      kind: "RecordType",
      fields,
      position: openToken.position,
    } satisfies RecordTypeNode;
  }

  private parsePattern(): Pattern {
    if (this.match("underscore")) {
      const token = this.previous();
      return {
        kind: "WildcardPattern",
        position: token.position,
      } satisfies WildcardPattern;
    }

    if (this.match("identifier")) {
      const identifierToken = this.previous();

      if (this.match("left_paren")) {
        const args: Pattern[] = [];
        if (!this.check("right_paren")) {
          do {
            args.push(this.parsePattern());
          } while (this.match("comma"));
        }
        this.consume("right_paren", "Expected ')' after constructor pattern arguments");
        return {
          kind: "ConstructorPattern",
          name: identifierToken.lexeme,
          namePosition: identifierToken.position,
          arguments: args,
          position: identifierToken.position,
        } satisfies ConstructorPattern;
      }

      return {
        kind: "IdentifierPattern",
        name: identifierToken.lexeme,
        position: identifierToken.position,
      } satisfies IdentifierPattern;
    }

    if (this.match("uint_literal")) {
      const token = this.previous();
      return {
        kind: "UIntLiteralPattern",
        value: token.literal as number,
        position: token.position,
      } satisfies UIntLiteralPattern;
    }

    if (this.match("bool_literal")) {
      const token = this.previous();
      return {
        kind: "BoolLiteralPattern",
        value: token.literal as boolean,
        position: token.position,
      } satisfies BoolLiteralPattern;
    }

    if (this.match("left_paren")) {
      const first = this.parsePattern();

      if (!this.match("comma")) {
        this.consume("right_paren", "Expected ')' after pattern");
        return first;
      }

      const elements: Pattern[] = [first, this.parsePattern()];

      while (this.match("comma")) {
        elements.push(this.parsePattern());
      }

      this.consume("right_paren", "Expected ')' after tuple pattern");

      return {
        kind: "TuplePattern",
        elements,
        position: first.position,
      } satisfies TuplePattern;
    }

    throw this.error(this.peek(), "Expected pattern");
  }

  private parseBlockExpression(): BlockExpression {
    this.consume("left_brace", "Expected '{' to start block");
    return this.parseBlockFromOpeningBrace(this.previous());
  }

  private parseBlockFromOpeningBrace(openBrace: Token): BlockExpression {
    const statements: Statement[] = [];
    let result: Expression | undefined;

    while (!this.check("right_brace") && !this.isAtEnd()) {
      if (this.check("let") || this.check("return")) {
        const statement = this.parseStatement();
        this.consume("semicolon", "Expected ';' after statement in block");
        statements.push(statement);
        continue;
      }

      const expression = this.parseExpression();

      if (this.match("semicolon")) {
        statements.push(this.createExpressionStatement(expression));
        continue;
      }

      result = expression;
      break;
    }

    this.consume("right_brace", "Expected '}' after block");

    return {
      kind: "BlockExpression",
      statements,
      result,
      position: openBrace.position,
    };
  }

  private createExpressionStatement(expression: Expression): ExpressionStatement {
    return {
      kind: "ExpressionStatement",
      expression,
      position: expression.position,
    };
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    throw this.error(this.peek(), message);
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private checkNext(type: TokenType): boolean {
    if (this.current + 1 >= this.tokens.length) {
      return false;
    }

    return this.tokens[this.current + 1]?.type === type;
  }

  private advance(): Token {
    if (this.current < this.tokens.length) {
      this.current += 1;
    }

    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === "eof";
  }

  private peek(): Token {
    if (this.current >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }

    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private error(token: Token, message: string): never {
    throw new SyntaxError(message, token.position);
  }
}
