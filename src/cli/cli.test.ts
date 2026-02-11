import { runCli, type CliDependencies, type CliIO } from "@/cli/cli.js";

const USAGE_MESSAGE = "Usage: vimes run <file>";

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
});
