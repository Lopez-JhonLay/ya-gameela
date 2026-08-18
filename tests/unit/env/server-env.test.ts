import { describe, expect, it } from "vitest";

import { parseServerEnv } from "@/lib/env/schema";

describe("parseServerEnv", () => {
  it("provides safe defaults", () => {
    const result = parseServerEnv({});

    expect(result).toEqual({ NODE_ENV: "development", LOG_LEVEL: "info" });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("accepts supported values", () => {
    expect(
      parseServerEnv({ NODE_ENV: "production", LOG_LEVEL: "warn" }),
    ).toEqual({ NODE_ENV: "production", LOG_LEVEL: "warn" });
  });

  it("reports invalid keys without echoing their values", () => {
    const invalidValue = "secret-invalid-value";

    expect(() =>
      parseServerEnv({ NODE_ENV: invalidValue, LOG_LEVEL: invalidValue }),
    ).toThrow("Invalid server environment configuration: LOG_LEVEL, NODE_ENV");

    try {
      parseServerEnv({ NODE_ENV: invalidValue });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(invalidValue);
    }
  });
});
