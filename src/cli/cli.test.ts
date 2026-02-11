import { runCli, type CliDependencies, type CliIO, type ReadlineOptions } from "./cli.js";

const USAGE_MESSAGE = "Usage: vimes run <file> | repl";

interface TestIO {
  readonly io: CliIO;
  readonly stdout: string[];
  readonly stderr: string[];
  readonly exitCodes: number[];
}

const createTestIO = (): TestIO => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCodes: number[] = [];

  const io: CliIO = {
    stdout: (text: string) => {
      stdout.push(text);
    },
    stderr: (text: string) => {
      stderr.push(text);
    },
    exit: (code: number) => {
      exitCodes.push(code);
    },
  };

  return { io, stdout, stderr, exitCodes };
};

const createDependencies = (overrides?: Partial<CliDependencies>): CliDependencies => ({
  readFile: overrides?.readFile ?? (() => Promise.reject(new Error("readFile not implemented"))),
});

const createReplDependencies = (repl: MockReadline): CliDependencies => ({
  readFile: async () => "",
  createReadline: (_options: ReadlineOptions) => repl,
});

const flushAsync = (): Promise<void> => new Promise((resolve) => {
  setTimeout(() => resolve(), 0);
});

type LineHandler = (line: string) => void;
type VoidHandler = () => void;

class MockReadline {
  private lineHandlers: LineHandler[] = [];
  private closeHandlers: VoidHandler[] = [];
  private sigintHandlers: VoidHandler[] = [];

  public setPrompt(_prompt: string): void {}

  public prompt(): void {}

  public on(event: "line", handler: LineHandler): this;
  public on(event: "close" | "SIGINT", handler: VoidHandler): this;
  public on(event: "line" | "close" | "SIGINT", handler: LineHandler | VoidHandler): this {
    if (event === "line") {
      this.lineHandlers.push(handler as LineHandler);
    } else if (event === "close") {
      this.closeHandlers.push(handler as VoidHandler);
    } else {
      this.sigintHandlers.push(handler as VoidHandler);
    }
    return this;
  }

  public close(): void {
    this.closeHandlers.forEach((handler) => handler());
  }

  public emitLine(line: string): void {
    this.lineHandlers.forEach((handler) => handler(line));
  }

  public emitSigint(): void {
    this.sigintHandlers.forEach((handler) => handler());
  }
}

const submitLines = async (repl: MockReadline, lines: ReadonlyArray<string>): Promise<void> => {
  lines.forEach((line) => repl.emitLine(line));
  await flushAsync();
};

describe("runCli", () => {
  it("prints usage when no arguments are provided", async () => {
    const testIO = createTestIO();
    const deps = createDependencies();

    await runCli([], testIO.io, deps);

    expect(testIO.stderr.join("")).toContain(USAGE_MESSAGE);
    expect(testIO.exitCodes).toEqual([1]);
    expect(testIO.stdout).toEqual([]);
  });

  it("prints usage when the command is unknown", async () => {
    const testIO = createTestIO();
    const deps = createDependencies();

    await runCli(["unknown"], testIO.io, deps);

    expect(testIO.stderr.join("")).toContain(USAGE_MESSAGE);
    expect(testIO.exitCodes).toEqual([1]);
    expect(testIO.stdout).toEqual([]);
  });

  it("runs a program file and prints the resulting UInt value", async () => {
    const program = `function main() -> UInt { { 40 + 2 } }\nmain();`;
    const testIO = createTestIO();
    const deps = createDependencies({ readFile: () => Promise.resolve(program) });

    await runCli(["run", "sample.vm"], testIO.io, deps);

    expect(testIO.stdout.join("")).toBe("42\n");
    expect(testIO.stderr).toEqual([]);
    expect(testIO.exitCodes).toEqual([0]);
  });

  it("does not print a value when the evaluated program result is undefined", async () => {
    const program = `let x = 1;`;
    const testIO = createTestIO();
    const deps = createDependencies({ readFile: () => Promise.resolve(program) });

    await runCli(["run", "sample.vm"], testIO.io, deps);

    expect(testIO.stdout).toEqual([]);
    expect(testIO.stderr).toEqual([]);
    expect(testIO.exitCodes).toEqual([0]);
  });

  it("reports runtime errors with the associated source position", async () => {
    const program = `function main() -> UInt { { 1 / 0 } }\nmain();`;
    const testIO = createTestIO();
    const deps = createDependencies({ readFile: () => Promise.resolve(program) });

    await runCli(["run", "sample.vm"], testIO.io, deps);

    const stderr = testIO.stderr.join("");
    expect(stderr).toMatch(/\d+:\d+/);
    expect(stderr).toContain("Division by zero");
    expect(testIO.exitCodes).toEqual([1]);
  });

  it("reports when the file cannot be read", async () => {
    const readError = new Error("ENOENT: sample.vm");
    const testIO = createTestIO();
    const deps = createDependencies({ readFile: () => Promise.reject(readError) });

    await runCli(["run", "sample.vm"], testIO.io, deps);

    const stderr = testIO.stderr.join("");
    expect(stderr).toContain("ENOENT: sample.vm");
    expect(testIO.exitCodes).toEqual([1]);
  });

  describe("repl command", () => {
    it("maintains state across submitted programs and prints expression results", async () => {
      const testIO = createTestIO();
      const repl = new MockReadline();
      const deps = createReplDependencies(repl);

      const replPromise = runCli(["repl"], testIO.io, deps);

      await submitLines(repl, ["let x = 41;", ""]);
      await submitLines(repl, ["x + 1;", ""]);

      repl.emitSigint();

      await replPromise;

      expect(testIO.stdout).toEqual(["42\n"]);
      expect(testIO.stderr).toEqual([]);
      expect(testIO.exitCodes).toEqual([0]);
    });

    it("continues running after reporting errors", async () => {
      const testIO = createTestIO();
      const repl = new MockReadline();
      const deps = createReplDependencies(repl);

      const replPromise = runCli(["repl"], testIO.io, deps);

      await submitLines(repl, ["unknown;", ""]);
      expect(testIO.stderr.join("")).toContain("Undefined identifier 'unknown'");

      await submitLines(repl, ["let value = 5;", ""]);
      await submitLines(repl, ["value;", ""]);

      repl.emitSigint();
      await replPromise;

        expect(last(testIO.stdout)).toBe("5\n");
      expect(testIO.exitCodes).toEqual([0]);
    });

    it("accepts multi-line program entries", async () => {
      const testIO = createTestIO();
      const repl = new MockReadline();
      const deps = createReplDependencies(repl);

      const replPromise = runCli(["repl"], testIO.io, deps);

      await submitLines(repl, [
        "function inc(value: UInt) -> UInt {",
        "  { value + 1 }",
        "}",
        "",
      ]);

      await submitLines(repl, ["inc(value = 7);", ""]);

      repl.emitSigint();
      await replPromise;

      expect(testIO.stderr).toEqual([]);
        expect(last(testIO.stdout)).toBe("8\n");
      expect(testIO.exitCodes).toEqual([0]);
    });
  });
});

  const last = <T>(values: ReadonlyArray<T>): T | undefined => (values.length === 0 ? undefined : values[values.length - 1]);
