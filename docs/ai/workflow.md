Workflow

This document defines the workflow rules that all AI tools (including GitHub Copilot) must follow when generating code for the Vimes project.
These rules ensure that the changes to the codebase happen in small, managable steps that are verified before moving onto the next step.

AI tools must follow these rules at all times unless explicitly instructed otherwise by a human contributor.

---

1. Planning

Before implementing any feature the feature must be planned.
The plan should break down the feature into smaller steps
The plan should describe any data structures required. E.g. Typescript interfaces and types.
The plan should describe any modules, functions or classes that need to be created to implement the feature.
If anything in the prompt is unclear or ambigious, the AI should ask for clarification.
Once planning is complete, the AI should stop and ask before continuing.

---

2. Tests

This is a test driven design project. Before implemententing any code the unit tests should be written first.
After writing the tests for each function or class created by the Planning stage, the AI should stop and ask for review before writing the implementation of the code to pass the test spec.
Rules for writing tests are in docs/ai/testing-guidelines.md

---

3. Implementation

After writing a test spec, the AI should write the implementation that fufills that test spec.
Rules for implementation are in docs/coding-style.md
After writing the implementation, the AI should run:
- `npm run test` to make sure that tests pass. All tests should pass.
- `npm run lint` to make sure that the code meets linting rules. If the code fails linting, the code should be rewritten until it passes. Do not change eslint.config.js
- `npm run build` to make sure the code builds. If the code fails to build, the code should be rewritten until it passes. Do not change tsconfig.json
After the code is written and passes, the AI should stop and ask permission before moving back to stage 2 and writing the test spec for the next module to be implemented.

The AI must not check in or push any code to git.

Example work flow

Planning decides to create functions `foo` and `bar`. It stops and waits for permission to carry on.
Testing writes the test spec for `foo`. It stops and asks for permission to carry on.
Implementation writes the code for `foo`. When the code is written and passes tests, passes linting and builds, It stops and asks permission to carry on.
Testing writes the test spec for `bar`. It stops and asks for permission to carry on.
Implementation writes the code for `bar`. When the code is written and passes tests, passes linting and builds, It stops and asks permission to carry on.
Ai stops and waits for the next planning prompt.
