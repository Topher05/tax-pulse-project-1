import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnSync = vi.fn();
const loadEnv = vi.fn();

vi.mock("node:child_process", () => ({
  spawnSync,
}));

vi.mock("dotenv", () => ({
  config: loadEnv,
}));

describe("assist evaluation launcher", () => {
  beforeEach(() => {
    vi.resetModules();
    spawnSync.mockReset();
    loadEnv.mockReset();
    process.env.OPENAI_API_KEY = "local-key";
    delete process.env.ASSIST_EVALUATION_RESULT_LIMIT;
  });

  it("loads the environment once and uses uv for scoring", async () => {
    spawnSync.mockImplementation((command: string, args: string[]) => {
      if (command === process.execPath) {
        return { status: 0, stdout: "", stderr: "" };
      }
      if (command === "uv") {
        return { status: 0, stdout: "", stderr: "" };
      }
      return { status: 1, stdout: "", stderr: "unexpected command" };
    });

    await import("../../../../src/typescript/shared/scripts/assistEvaluation.js");

    expect(loadEnv).toHaveBeenCalledTimes(1);
    expect(spawnSync).toHaveBeenCalledWith(
      "uv",
      ["run", "--locked", "--extra", "eval", "python", "src/python/retrieval/ragas_evaluation.py"],
      { stdio: "inherit" },
    );
  });

  it("reports a scoring-stage failure", async () => {
    const exits: number[] = [];
    const originalExit = process.exit;
    process.exit = ((code?: number | string | null) => {
      exits.push(Number(code ?? 0));
      throw new Error("process.exit intercepted");
    }) as typeof process.exit;

    try {
      spawnSync.mockImplementation((command: string, args: string[]) => {
        if (command === process.execPath) {
          return { status: 0, stdout: "", stderr: "" };
        }
        if (command === "uv") {
          return { status: 2, stdout: "", stderr: "scorer failed" };
        }
        return { status: 1, stdout: "", stderr: "unexpected command" };
      });

      await expect(
        import("../../../../src/typescript/shared/scripts/assistEvaluation.js"),
      ).rejects.toThrow("process.exit intercepted");

      expect(exits).toEqual([2]);
    } finally {
      process.exit = originalExit;
    }
  });
});
