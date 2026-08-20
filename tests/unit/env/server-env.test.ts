import { describe, expect, it } from "vitest";

import { parsePublicEnv, parseServerEnv } from "@/lib/env/schema";

const validEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-publishable-key",
  SUPABASE_SECRET_KEY: "local-secret-key",
  ADMIN_EMAIL: "admin@gmail.com",
  APP_ORIGIN: "http://localhost:3000",
};

describe("parseServerEnv", () => {
  it("provides safe non-secret defaults and normalizes values", () => {
    const result = parseServerEnv({
      ...validEnvironment,
      ADMIN_EMAIL: "  ADMIN@GMAIL.COM ",
      APP_ORIGIN: "http://localhost:3000/",
    });

    expect(result).toEqual({
      ...validEnvironment,
      NODE_ENV: "development",
      LOG_LEVEL: "info",
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("accepts supported values", () => {
    expect(
      parseServerEnv({
        ...validEnvironment,
        NODE_ENV: "production",
        LOG_LEVEL: "warn",
        APP_ORIGIN: "https://example.com",
      }),
    ).toEqual({
      ...validEnvironment,
      NODE_ENV: "production",
      LOG_LEVEL: "warn",
      APP_ORIGIN: "https://example.com",
    });
  });

  it("reports invalid keys without echoing their values", () => {
    const invalidValue = "secret-invalid-value";

    expect(() =>
      parseServerEnv({
        ...validEnvironment,
        NODE_ENV: invalidValue,
        LOG_LEVEL: invalidValue,
      }),
    ).toThrow("Invalid server environment configuration: LOG_LEVEL, NODE_ENV");

    try {
      parseServerEnv({ ...validEnvironment, SUPABASE_SECRET_KEY: "" });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(invalidValue);
    }
  });

  it("requires Gmail and HTTPS in production", () => {
    expect(() =>
      parseServerEnv({
        ...validEnvironment,
        NODE_ENV: "production",
        ADMIN_EMAIL: "admin@example.com",
        APP_ORIGIN: "http://example.com",
      }),
    ).toThrow(
      "Invalid server environment configuration: ADMIN_EMAIL, APP_ORIGIN",
    );
  });
});

describe("parsePublicEnv", () => {
  it("returns only browser-safe Supabase values", () => {
    expect(parsePublicEnv(validEnvironment)).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: validEnvironment.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        validEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  });
});
