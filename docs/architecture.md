Vimes Architecture Overview

This document describes the architecture of the Vimes interpreter.
It defines the major subsystems, their responsibilities, and how they interact.
All implementation work — human or AI — must follow this structure unless explicitly instructed otherwise.

The architecture is intentionally simple, modular, and functional.
Each subsystem has a single responsibility and communicates through well‑defined data structures.

---

1. High‑Level Structure

The interpreter is composed of five major subsystems:

1. Lexer — converts source text into tokens
2. Parser — converts tokens into an AST
3. Type Checker — validates AST types and produces typed AST
4. Evaluator — executes the typed AST
5. CLI — runs files or provides a REPL


These subsystems live under src/:

src/
  lexer/
  parser/
  types/
  runtime/
  errors/
  cli/


Tests for each subsystem live in tests/.

---

2. Lexer

Location: src/lexer/

The lexer is responsible for:

• reading raw source text
• producing a stream of tokens
• handling keywords, identifiers, literals, operators, punctuation
• tracking source positions for error reporting


The lexer must be:

• pure
• deterministic
• free of side effects


Output: Token[]

---

3. Parser

Location: src/parser/

The parser is a recursive‑descent parser that consumes tokens and produces an AST.

Responsibilities:

• implement the grammar defined in /docs/grammar.md
• produce immutable AST nodes
• detect and report syntax errors
• enforce structural rules (e.g., semicolons, braces)


The parser must not:

• perform type checking
• evaluate expressions
• infer types
• modify tokens


Output: AST.Program

---

4. Abstract Syntax Tree (AST)

Location: src/parser/ast.ts

The AST defines TypeScript interfaces for:

• expressions
• statements
• blocks
• patterns
• match arms
• function definitions


The AST must be:

• immutable
• explicit
• minimal
• free of runtime logic


The AST is the shared data structure between parser, type checker, and evaluator.

---

5. Type System

Location: src/types/

The type system defines:

• primitive types (UInt, Bool)
• record types
• function types
• type equality rules
• type checking rules for each AST node


The type checker:

• validates all expressions
• ensures if and match branches agree
• ensures function calls supply valid named parameters
• ensures partial application is type‑correct
• ensures return statements match declared return types


The type checker must not:

• evaluate expressions
• mutate AST nodes
• introduce new types not defined in the grammar


Output: a typed AST or a type error.

---

6. Runtime / Evaluator

Location: src/runtime/

The evaluator executes the typed AST.

Responsibilities:

• implement lexical scoping
• evaluate expressions
• apply functions
• handle partial application
• propagate return via control‑flow signals
• produce runtime values


Runtime values include:

• UIntValue
• BoolValue
• FunctionValue (closure)


The evaluator must not:

• perform type checking
• modify AST nodes
• infer types
• introduce new runtime types


Output: a Value or a runtime error.

---

7. Environment Model

Location: src/runtime/environment.ts

The environment is a persistent mapping:

Identifier → Value


Each block and function call creates a new environment frame.

Environments must:

• be immutable or persistent
• support lexical scoping
• support closures


---

8. Error Model

Location: src/errors/

There are three categories of errors:

• SyntaxError — produced by the parser
• TypeError — produced by the type checker
• RuntimeError — produced by the evaluator


Errors must:

• include source position information when available
• use stable, predictable messages
• never be used as values inside the language


---

9. CLI

Location: src/cli/

The CLI provides:

• vimes run file.vms — run a file
• vimes repl — interactive REPL (optional, later)


The CLI must:

• not contain interpreter logic
• not modify ASTs
• not perform type checking
• simply orchestrate the pipeline:


source → lexer → parser → type checker → evaluator → output


---

10. Testing Strategy

Tests live in tests/ and mirror the folder structure of src/.

Each subsystem has its own test suite:

tests/
  lexer.test.ts
  parser.test.ts
  typeChecker.test.ts
  evaluator.test.ts


Tests must:

• be deterministic
• cover both valid and invalid cases
• not rely on console output
• assert on error types and messages


---

11. Extensibility Philosophy

Vimes is designed to grow, but only deliberately.

Future features (strings, arrays, user‑defined types, generics, modules) must:

• be added only after grammar updates
• follow the existing architecture
• not break existing invariants
• be introduced with full test coverage


The architecture is intentionally simple so that new features can be added cleanly.

---

End of Architecture Document

This file defines the structure and responsibilities of the Vimes interpreter.
All implementation work must follow this architecture unless explicitly instructed otherwise.

---
