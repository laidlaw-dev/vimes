Feature Boundaries for AI Contributions

This document defines the hard limits on what AI tools (including GitHub Copilot) may introduce into the Vimes codebase.
Its purpose is to prevent feature creep, maintain conceptual integrity, and ensure that the language evolves only through deliberate human decisions.

AI tools must treat these boundaries as absolute unless explicitly instructed otherwise by a human contributor.

---

1. The Language Is Defined Only by `grammar.md`

AI must not:

- add new syntax
- add new keywords
- add new operators
- add new literal types
- add new expression forms
- add new statement forms
- add new type forms


If it is not present in:

/docs/grammar.md


…it does not exist in Vimes.

Only humans may modify the grammar.

---

2. Forbidden Language Features (Until Explicitly Approved)

AI must not introduce any of the following features.
These are reserved for future design phases and require explicit human direction.

2.1 Data Types

AI must not add:

- strings
- arrays
- lists
- maps
- sets
- tuples beyond what the grammar defines
- user‑defined types
- algebraic data types
- enums
- option types
- result types
- union types
- generics
- type inference
- type aliases


2.2 Control Flow

AI must not add:

- loops (for, while, do)
- pattern guards
- try/catch
- exceptions
- throw/raise
- async/await
- yield/generator semantics


2.3 Runtime Features

AI must not add:

- garbage‑collection semantics
- concurrency or threading
- I/O primitives
- file system access
- networking
- randomness
- time/date APIs
- reflection
- macros
- metaprogramming


2.4 Syntax or Semantics

AI must not add:

- operator overloading
- implicit conversions
- truthiness rules
- optional semicolons
- indentation‑based blocks
- new literal syntaxes
- new operator precedence rules
- new evaluation strategies (e.g., laziness)


---

3. Forbidden Interpreter Features

AI must not introduce:

- JIT compilation
- bytecode generation
- multi‑pass optimization
- intermediate representations
- VM instruction sets
- module systems
- import/export
- package management
- REPL commands beyond basic evaluation


These may be added later, but only by explicit human request.

---

4. Forbidden Tooling Features

AI must not add:

- code formatting tools
- lint rules
- build steps
- bundlers
- transpilers
- plugin systems
- editor integrations


Unless explicitly requested.

---

5. No Silent Enhancements

AI must not:

- “improve” the language
- “fix” perceived inconsistencies
- “modernize” syntax
- “optimize” semantics
- “clean up” grammar
- “generalize” types
- “simplify” evaluation rules


Even if the change seems beneficial, AI must not make it without explicit human approval.

---

6. No Hidden Features

AI must not introduce features indirectly, such as:

- adding new AST node types
- adding new runtime value types
- adding new type checker rules
- adding new evaluator behaviors
- adding new built‑in functions
- adding new keywords in error messages
- adding new token types


If a feature requires a new AST node, type, or runtime behavior, it is not allowed unless the grammar has been updated by a human.

---

7. When in Doubt, Ask

If AI is unsure whether something is allowed:

- Do not guess
- Do not implement
- Ask for clarification


This prevents accidental feature creep.

---

End of Feature Boundaries

These boundaries ensure that Vimes remains coherent, principled, and intentionally minimal.
AI tools must respect these limits to preserve the integrity of the language and its implementation.
