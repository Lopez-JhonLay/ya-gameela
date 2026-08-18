import { describe, expect, it } from "vitest";

describe("tooling baseline", () => {
  it("runs on Node.js 24", () => {
    expect(process.versions.node).toMatch(/^24\./);
  });
});
