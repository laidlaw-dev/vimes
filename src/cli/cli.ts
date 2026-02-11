import { readFile as readFileFromFs } from "node:fs/promises";
import { createInterface } from "node:readline";

import { formatError, formatValue } from "@/cli/format.js";
import { runFileCommand } from "@/cli/run-command.js";
import { startRepl } from "@/cli/repl.js";
import type { Value } from "@/runtime/values.js";

export interface CliIO {
  stdout(text: string): void;
  stderr(text: string): void;
  exit(code: number): void;
}

export type ReadlineFactory = (options: ReadlineOptions) => ReadlineAdapter;

export interface ReadlineOptions {
  readonly input: NodeJS.ReadableStream;
  readonly output: NodeJS.WritableStream;
}

export interface ReadlineAdapter {
  setPrompt(prompt: string): void;
  prompt(): void;
  on(event: "line", handler: (line: string) => void): ReadlineAdapter;
  on(event: "close" | "SIGINT", handler: () => void): ReadlineAdapter;
  close(): void;
}

export interface CliDependencies {
  readFile(path: string): Promise<string>;
  createReadline?(options: ReadlineOptions): ReadlineAdapter;
}

const USAGE_MESSAGE = "Usage: vimes run <file> | repl";

const defaultIO: CliIO = {
  stdout: (text: string) => {
    process.stdout.write(text);
  },
  stderr: (text: string) => {
    process.stderr.write(text);
  },
  exit: (code: number) => {
    process.exit(code);
  },
};

interface ResolvedCliDependencies {
  readonly readFile: (path: string) => Promise<string>;
  readonly createReadline: ReadlineFactory;
}

const defaultDependencies: ResolvedCliDependencies = {
  readFile: async (path: string): Promise<string> => readFileFromFs(path, "utf8"),
  createReadline: (options: ReadlineOptions) =>
    createInterface({
      input: options.input,
      output: options.output,
    }) as unknown as ReadlineAdapter,
};

export const runCli = async (args: ReadonlyArray<string>, io?: CliIO, deps?: CliDependencies): Promise<void> => {
  const effectiveIO = io ?? defaultIO;
  const effectiveDeps = resolveDependencies(deps);
  const exit = createSafeExit(effectiveIO);

  const printUsageAndExit = (): void => {
    effectiveIO.stderr(`${USAGE_MESSAGE}\n`);
    exit(1);
  };

  if (args.length === 0) {
    printUsageAndExit();
    return;
  }

  const [command, ...rest] = args;

  if (command === "run") {
    const filePath = rest[0];

    if (!filePath) {
      printUsageAndExit();
      return;
    }

    try {
      const value = await runFileCommand(filePath, effectiveDeps);

      if (typeof value !== "undefined") {
        effectiveIO.stdout(`${formatValue(value)}\n`);
      }

      exit(0);
    } catch (error) {
      effectiveIO.stderr(`${formatError(error)}\n`);
      exit(1);
    }
    return;
  }

  if (command === "repl") {
    try {
      await startRepl(effectiveIO, { createReadline: effectiveDeps.createReadline });
      exit(0);
    } catch (error) {
      effectiveIO.stderr(`${formatError(error)}\n`);
      exit(1);
    }
    return;
  }

  printUsageAndExit();
};

const createSafeExit = (io: CliIO): ((code: number) => void) => {
  let exited = false;
  return (code: number): void => {
    if (exited) {
      return;
    }
    exited = true;
    io.exit(code);
  };
};

const resolveDependencies = (deps?: CliDependencies): ResolvedCliDependencies => ({
  readFile: deps?.readFile ?? defaultDependencies.readFile,
  createReadline: deps?.createReadline ?? defaultDependencies.createReadline,
});

export type { Value };
