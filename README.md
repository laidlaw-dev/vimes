# Vimes Programming Language
A simple functional programming language.

Vimes is a small, principaled, expression-oriented programming language designed as a learning project in language design, type systems, and interpreter implementation.
It emphasizes clarity, explicitness, and strong typing, with a functional core and named parameters as a first class concept.
This repository contains the reference implementation of the Vimes interpreter.


## Author
laidlaw_dev


## Language Overview

Vimes is built around a a few core ideas:

- **Expression-orientated**: every construct returns a value
- **Named parameters**: function calls use explicit names, not positions
- **Partial application**: supplying a subset of parameters returns a new function
- **Strong static types**: no implict coercions, and no truthiness
- **Blocks return values**: last expression wins unless `return` is used
- **Braces and semicolons**: whitespace-agnostic, and explicit structure
- **Minimal primitives**: currentyly `UInt` and `Bool`

The language is intentially small but designed to grow in a disciplined way.

## Grammar

The full Vimes grammar is defined in /docs/grammar.md

This file is the _single source of truth_ for the language syntax.
All parser and interpreter work must conform to it.


## Project Structure

docs/
  grammar.md : grammar rules for Vimes
  architecture.md : overall structure of the project
  ai/
    rules.md
    coding-style.md
    testing-guidelines.md
    feature-boundaries.md

src/
  index.ts : entry point
  cli/
  errors/
  lexer/
  parser/
  runtime/
  types/

tests/


## Development

This project uses

- **Node.js**
- **Typescript**
- **ESLint**
- **vitest**

It has npm scripts set up

- `npm run build` : builds the project
- `npm run lint` : runs eslint
- `npm run test` : runs the tests

## AI-Assited Development

This project is designed to be safely used with Github Copilot.
All AI-related rules and constriants are defined in: /docs/ai/

## License

MIT License

## Status

Vimes is in early development. The initial milestones are:

- Lexer
- Parser
- Type checker
- Evaluator
- CLI

