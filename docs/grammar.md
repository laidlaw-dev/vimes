# Vimes Grammar (EBNF)

This document defines the complete grammar for the Vimes programming language.
It is the authoritative reference for all parser and interpreter behavior.

Whitespace is insignificant except where required to separate tokens.
Braces and semicolons define structure; indentation has no meaning.

---

## 1. Lexical Structure

### 1.1 Identifiers
Identifiers begin with a letter and may contain letters, digits, and underscores.

Identifier ::= letter (letter|digit|"_")*
letter ::= [a-zA-Z]
digit ::= [0-9]

### 1.2 Literals

UIntLiteral ::= digit+
BoolLiteral ::= "true"|"false"

### 1.3 Keywords

function let return if else match true false

### 1.4 Operators

/ % * +
== != < <= > >=
&& || ! -

### 1.5 Punctuation

( ) { } , ; ->

---

## 2. Types

Type ::= "UInt"
| "Bool"
| "RecordType"
| "FunctionType"

### 2.1 Record Types

RecordType ::= "{" ParamTypeList? "}"
ParamTypeList ::= ParamType ("," ParamType)*
ParamType ::= Identifier ":" Type

### 2.2 Function Types

FunctionType ::= RecordType "->" Type

All functions take a single record argument.

---

## 3. Expressions

Expression ::=
UIntLiteral
| BoolLiteral
| Identifier
| Block
| IfExpr
| MatchExpr
| FnLiteral
| CallExpr
| UnaryExpr
| BinaryExpr

---

## 4. Blocks

A block contains zero or more statements followed by an optional final expression.

Block ::= "{" Statement* FinalExpr? "}"

### 4.1 Statements

Statement ::= LetStmt ";"
| ExprStmt ";"
| ReturnStmt ";"

### 4.2 Let Binding

LetStmt ::= "let" Identifier "=" Expression

### 4.3 Expression Statements

ExprStmt ::= Expression

### 4.4 Return Statement

ReturnStmt ::= "return" Expression

### 4.5 Final Expression

FinalExpr ::= Expression

A block evaluates to the value of its final expression unless a `return` is encountered.

## 5. If Expression

IfExpr ::= "if" "(" Expression ")" Block ElsePart
ElsePart ::= "else" IfExpr
| "else" Block

The condition must have type `Bool`
Both branches must produce the same type.

---

## 6. Match Expressions

MatchExpr ::= "match" "(" Expression ")" "{" MatchArm" "}"
MatchArm ::= Pattern "->" Expression ";"

Match expressions must be exhaustive.

---

## 7. Patterns

Pattern ::= Identifier
| "_"
| UIntLiteral
| BoolLiteral
| "(" Pattern "," Pattern ")"
| ConstructorPattern

ConstructorPattern ::= Identifier "(" PatternList? ")"
PatternList ::= Pattern ("," Pattern)*

Patterns bind variables and destructure values.

---

## 8. Function Literals

FnLiteral ::= "function" "(" ParamList? ")" ReturnType? Block

### 8.1 Parameters

ParamList ::= Param ("," Param)*
Param ::= Identifier ":" Type DefaultValue?
DefaultValue ::= "=" Expression

### 8.2 Return Type

ReturnType ::= "->" Type

---

## 9. Function Definitions

Top-level function definitions follow the same structure as function literials, with a name.

FnDef ::= "function" Identifier "(" ParamList? ")" ReturnType? Block

---

## 10. Function Calls

Function calls use named arguments.

CallExpr ::= Expression "(" ArgList? ")"
ArgList ::= Arg("," Arg)*
Arg ::= Identifier "=" Expression

Partial application is allowed when not all parameters are supplied.

---

## 11. Unary and Binary Operators

### 11.1 Unary

UnaryExpr ::= ("!" | "-") Expression

### 11.2 Binary

BinaryExpr ::= Expression Operator Expression
Operator ::= "+" | "-" | "*" | "/" | "%"
| "==" | "!=" | "<" | "<=" | ">" | ">="
| "&&" | "||"

Operator precedence and associativity are defined in the implementation.

---

## 12. Program Structure

Program ::= (FnDef | Statement)*

A program consists of zero or more top-level function definitions or statements.

---

### 13. Error Model (Non-Grammar)

Errors are not part of the grammar.

They arise from:
- lexical errors
- syntax errors
- type errors
- runtime errors (e.g. division by zero)

Vimes has no error expressions or error values.

---

# End of Grammar
