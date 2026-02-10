Testing Guidelines for AI Contributions

This document defines how AI tools (including GitHub Copilot) must write tests for the Vimes project.
Tests are essential for maintaining correctness, preventing regressions, and ensuring that the interpreter evolves in a disciplined and predictable way.

AI tools must follow these rules at all times unless explicitly instructed otherwise by a human contributor.

---

1. Testing Framework

All tests must use Vitest.

AI must not:

- introduce additional testing frameworks
- mix test frameworks
- use Node’s built‑in assert
- use Jest syntax


Only Vitest is allowed.

---

2. Test File Structure

Tests live in the top‑level tests/ directory and mirror the structure of src/.

Example:

src/lexer/        → tests/lexer.test.ts
src/parser/       → tests/parser.test.ts
src/types/        → tests/typeChecker.test.ts
src/runtime/      → tests/evaluator.test.ts


AI must not create new test directories unless explicitly instructed.

---

3. Test Coverage Requirements

Every AI‑generated change must include tests that cover:

- valid cases (expected success)
- invalid cases (expected errors)

Implementation changes should not be made without generating tests first. When tests are generated AI should ask for approval before making the implementation changes.

Tests must cover:

3.1 Lexer

- tokenizing identifiers
- tokenizing literals
- tokenizing operators
- tokenizing punctuation
- handling whitespace
- handling comments
- error cases (invalid characters)


3.2 Parser

- correct AST structure
- precedence and associativity
- blocks, statements, and final expressions
- function definitions
- function calls with named parameters
- if expressions
- match expressions
- syntax errors


3.3 Type Checker

- correct type inference for expressions
- type checking of function calls
- missing or extra parameters
- incorrect parameter types
- incorrect return types
- invalid if/match conditions
- non‑exhaustive match errors
- type errors for operators


3.4 Evaluator

- evaluating literals
- evaluating arithmetic
- evaluating boolean logic
- evaluating blocks
- evaluating functions and closures
- partial application
- return bubbling
- runtime errors (e.g., division by zero)


---

4. Test Style

AI must follow these rules when writing tests:

4.1 Use `describe` and `it`

`describe`, `it` and `expect` are globally imported by the vitest setup. Do not import them into test files.

Example:

```
describe("parser", () => {
  it("parses a simple expression", () => {
    // ...
  });
});
```

4.2 Tests must be deterministic

No randomness, no time‑dependent behavior.

4.3 No console output

Tests must not use:

- console.log
- console.error
- console.warn


4.4 Clear, explicit assertions

Use:

expect(value).toBe(42);
expect(result).toEqual(expected);
expect(() => fn()).toThrowError(SomeErrorClass);


Avoid vague assertions like:

expect(value).toBeTruthy();


4.5 No mocking unless explicitly required

The interpreter should not require mocks.

---

5. Error Testing

When testing errors:

- assert on the error type
- assert on the error message
- do not catch errors silently


Example:

expect(() => parse("fn {")).toThrowError(SyntaxError);
expect(() => parse("fn {")).toThrowError("Unexpected token");


AI must not change existing error messages.

---

6. Test Data Must Match the Grammar

AI must ensure that all test programs:

- use only syntax defined in /docs/grammar.md
- do not include future or hypothetical features
- do not include strings, arrays, user‑defined types, etc.


If unsure whether a construct is allowed, AI must ask for clarification.

---

7. No Over‑Testing or Under‑Testing

AI must avoid:

- trivial tests that add no value
- overly large tests that mix multiple concerns
- tests that depend on internal implementation details


Each test should focus on a single behavior.

---

8. Ask When Unsure

If AI is uncertain about:

- what to test
- how to structure a test
- whether a case is valid
- whether a feature exists


…it must ask for clarification rather than guess.

---

End of Testing Guidelines

These rules ensure that the Vimes test suite remains reliable, readable, and aligned with the language’s design philosophy.
