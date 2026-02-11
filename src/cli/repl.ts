import { formatError, formatValue } from "@/cli/format.js";
import { executeProgramSource } from "@/cli/run-command.js";
import type { CliIO, ReadlineFactory } from "@/cli/cli.js";

interface ReplOptions {
  readonly createReadline: ReadlineFactory;
}

export const startRepl = (io: CliIO, options: ReplOptions): Promise<void> => {
  return new Promise((resolve) => {
    const readline = options.createReadline({ input: process.stdin, output: process.stdout });
    readline.setPrompt("vimes> ");
    readline.prompt();

    let buffer: string[] = [];
    let accumulatedSource = "";

    const evaluateBuffer = (snippet: string): void => {
      const nextSource = appendSource(accumulatedSource, snippet);

      try {
        const value = executeProgramSource(nextSource);
        accumulatedSource = nextSource;

        if (typeof value !== "undefined") {
          io.stdout(`${formatValue(value)}\n`);
        }
      } catch (error) {
        io.stderr(`${formatError(error)}\n`);
      } finally {
        readline.prompt();
      }
    };

    const submitBuffer = (): void => {
      const snippet = buffer.join("\n");
      buffer = [];

      if (snippet.trim().length === 0) {
        readline.prompt();
        return;
      }

      evaluateBuffer(snippet);
    };

    readline.on("line", (line: string) => {
      if (line.trim().length === 0) {
        submitBuffer();
        return;
      }

      buffer.push(line);
    });

    readline.on("SIGINT", () => {
      readline.close();
    });

    readline.on("close", () => {
      resolve();
    });
  });
};

const appendSource = (current: string, snippet: string): string => {
  if (!current) {
    return snippet;
  }
  return `${current}\n${snippet}`;
};
