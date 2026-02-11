Coding Style Guidelines for AI Contributions

This document defines the coding‑style rules that all AI tools (including GitHub Copilot) must follow when generating code for the Vimes project.
These rules ensure that the codebase remains clean, consistent, and easy to reason about.

AI tools must follow these rules at all times unless explicitly instructed otherwise by a human contributor.

---

1. TypeScript Strictness

AI must always write TypeScript that conforms to strict compiler settings.

Required:

- no any
- no implicit any
- no implicit returns
- no implicit undefined
- no unused variables
- no unreachable code
- no fallthrough in switch statements
- no non‑null assertions (!) unless explicitly justified
- no as any or unsafe casts


All functions must have explicit return types.

---

2. Functional, Immutable Style

The Vimes interpreter is designed around functional principles.

AI must:

- avoid mutating AST nodes
- avoid mutating runtime values
- avoid mutating environment frames
- avoid shared mutable state
- avoid global state
- prefer pure functions
- prefer returning new objects rather than modifying existing ones
- functions should be pure
- use `map`, `filter` and `reduce` in preference to loops

If mutation is required for performance or clarity, AI must ask for human approval.

---

3. AST Rules

The AST is a pure data structure.

AI must:

- define AST nodes as TypeScript interfaces
- ensure AST nodes are immutable
- never attach methods to AST nodes
- never store runtime values inside AST nodes
- never store types inside AST nodes (type checker produces separate structures)


AST nodes must be created only in the parser.

---

4. Error Handling

AI must:

- throw typed error classes (SyntaxError, TypeError, RuntimeError)
- never throw raw strings
- never swallow errors silently
- never change existing error messages
- never introduce new error messages without explicit instruction


Error messages must remain stable for testability.

---

5. Naming Conventions

AI must follow these naming conventions:

Files

- kebab-case.ts for files
- test files mirror source files (e.g., parser.test.ts)


Types & Interfaces

- PascalCase for types and interfaces
- CamelCase for fields and variables


Functions

- camelCase for functions
- names must be descriptive and explicit


Constants

- UPPER_SNAKE_CASE only for true constants
- otherwise use camelCase


---

6. Module Boundaries

AI must respect the project structure:

src/
  lexer/
  parser/
  types/
  runtime/
  errors/
  cli/


AI must not:

- create new top‑level folders
- move files between modules
- merge modules
- split modules
- introduce new architectural layers


Unless explicitly instructed by a human.

---

7. Imports and Exports

AI must:

- use named exports
- avoid default exports
- avoid circular imports
- avoid wildcard imports (import * as X)
- keep import paths absolute and minimal
- use relative paths


Example:

import { Token } from "src/lexer/tokens";

---

8. Comments and Documentation

AI must:

- write clear, concise comments where needed
- avoid redundant comments
- document non‑obvious logic
- document all exported functions and types
- avoid JSDoc unless explicitly requested


Comments must describe why, not what.

---

9. Code Structure and Formatting

AI must:

- use consistent indentation (2 spaces)
- use semicolons
- use braces for all blocks
- avoid long lines (> 100 characters)
- break complex expressions into smaller parts
- avoid deeply nested code when possible


Formatting should match typical Prettier defaults, even if Prettier is not installed.

---

10. Testing Requirements

AI must:

- write Vitest tests for all new code
- place tests next to the source files they cover
- test both valid and invalid cases
- avoid console output in tests
- assert on error types and messages
- avoid mocking unless explicitly required


Tests must be deterministic.

---

11. No Hidden Behavior

AI must not introduce:

- implicit conversions
- truthiness rules
- silent coercions
- fallback behaviors
- magic numbers
- magic strings


All behavior must be explicit and visible.

---

12. Ask When Unsure

If AI is uncertain about:

- naming
- file placement
- architectural boundaries
- type rules
- evaluation rules
- grammar interpretation


…it must ask for clarification rather than guess.

---

End of Coding Style Guidelines

These rules ensure that the Vimes codebase remains clean, predictable, and aligned with the language’s design philosophy.
