import { readFile as readFileFromFs } from "node:fs/promises";

import { formatError, formatValue } from "@/cli/format.js";
import { runFileCommand } from "@/cli/run-command.js";
import type { Value } from "@/runtime/values.js";

export interface CliIO {
  stdout(text: string): void;
  stderr(text: string): void;
  exit(code: number): void;
}

export interface CliDependencies {
  readFile(path: string): Promise<string>;
}

const USAGE_MESSAGE = "Usage: vimes run <file>";

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

const defaultDependencies: CliDependencies = {
  readFile: async (path: string): Promise<string> => readFileFromFs(path, "utf8"),
};

export const runCli = async (args: ReadonlyArray<string>, io?: CliIO, deps?: CliDependencies): Promise<void> => {
  const effectiveIO = io ?? defaultIO;
  const effectiveDeps = deps ?? defaultDependencies;
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

  if (command !== "run") {
    printUsageAndExit();
    return;
  }

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

export type { Value };
