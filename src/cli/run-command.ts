import type { CliDependencies } from "@/cli/cli.js";
import { evaluateProgram } from "@/runtime/evaluator.js";
import type { Value } from "@/runtime/values.js";
import { tokenize } from "@/lexer/tokenize.js";
import { parseProgram } from "@/parser/parser.js";
import { checkProgram } from "@/types/type-checker.js";

export const runFileCommand = async (filePath: string, deps: CliDependencies): Promise<Value | undefined> => {
  const source = await deps.readFile(filePath);
  const tokens = tokenize(source);
  const ast = parseProgram(tokens);
  const typedProgram = checkProgram(ast);
  return evaluateProgram(typedProgram);
};
