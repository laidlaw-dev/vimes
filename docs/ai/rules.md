AI Development Rules for the Vimes Project

These rules govern how AI tools (including GitHub Copilot) may contribute to the Vimes codebase.
They ensure that all AI‑generated code remains consistent with the language design, architecture, and development philosophy of the project.

AI tools must follow these rules at all times unless explicitly instructed otherwise by a human contributor.

---

1. Purpose of This Project

Vimes is a small, strongly typed, expression‑oriented programming language implemented in TypeScript.
It has:

- named parameters
- partial application
- blocks that return values
- strict static types
- minimal primitives (UInt, Bool)
- a clean, explicit grammar


The goal is to build a principled interpreter and type checker as a learning exercise.

AI tools must preserve this purpose.

---

2. The Golden Rule

AI must never invent new language features.

AI must only use constructs defined in:

/docs/grammar.md


If a feature is not in the grammar, AI must assume it does not exist.

Forbidden inventions include (but are not limited to):

- strings
- arrays
- user‑defined types
- generics
- pattern guards
- exceptions
- modules/imports
- operator overloading
- type inference
- new keywords
- new syntax


Only humans may modify the grammar.

---

3. Grammar Is Sacred

/docs/grammar.md is the single source of truth.

AI must:

- follow the grammar exactly
- not reinterpret or extend it
- not modify it
- not generate code that contradicts it


If the grammar is ambiguous, AI must ask for clarification.

---

4. Completeness

- all tests must pass after implementation changes. To run tests `npm run test`
- code must pass linting. To run linting `npm run lint`
- code must be built by typescript. To run Typescrip compiler `npm run build`

---

5. Architecture Boundaries

AI must follow the project structure defined in:

/docs/architecture.md


AI must not:

- create new folders
- create new top‑level modules
- reorganize the project
- move files
- rename architectural components


Unless explicitly instructed by a human.

AI may create new files only when they clearly belong to an existing module (e.g., a new AST node type inside src/parser/ast.ts).

---

6. Test Driven Design

AI must follow test-driven development when tests are present.
When a test exists, AI must:
- not implement features not required by the test
- not generalize beyound the test
- not add new tests unless explicitly instructed
- write the minimal code required to satisfy the failing test

---

7. Coding Style Requirements

AI must follow the coding style defined in:

/docs/ai/coding-style.md


This includes:

- no any
- no implicit returns
- no mutation of AST nodes
- pure functions where possible
- explicit return types
- no circular imports
- no dynamic property access
- no magic strings


If unsure, AI must ask for clarification.

---

8. Testing Requirements

Every AI‑generated change must include tests following:

/docs/ai/testing-guidelines.md


Tests must:

- use Vitest
- be deterministic
- cover both success and failure cases
- not rely on console output
- be placed in the correct test file


AI must never generate code without tests unless explicitly instructed.

---

9. Error Messages Must Be Stable

AI must not:

- change existing error messages
- reword them
- add new error messages
- remove error messages


Unless explicitly instructed.

Stable error messages are essential for reliable tests.

---

10. No Feature Creep

AI must not introduce:

- new syntax
- new operators
- new types
- new keywords
- new semantics
- new runtime behaviors


Unless a human explicitly requests the feature and updates /docs/grammar.md.

---

11. Ask When Unsure

If AI is uncertain about:

- grammar
- architecture
- type rules
- evaluation rules
- naming
- file placement
- test structure


…it must ask for clarification rather than guess.

---

12. Respect Human Intent

If a human contributor provides instructions that contradict these rules, the human instructions take precedence.

AI must follow explicit human direction, even if it overrides this document.

---

End of AI Rules

This document defines the boundaries within which AI tools may operate.
It ensures that Vimes remains coherent, principled, and aligned with its design philosophy.

---
