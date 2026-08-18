import { describe, expect, it } from "vitest";

import { createLogRecord, selectCorrelationId } from "@/lib/logging/log-record";
import { redactLogText, sanitizeLogContext } from "@/lib/logging/redaction";

describe("structured logging", () => {
  it("accepts safe provider correlation IDs and rejects unsafe input", () => {
    expect(selectCorrelationId("bom1::request-123", "fallback-id")).toBe(
      "bom1::request-123",
    );
    expect(selectCorrelationId("unsafe\nvalue", "fallback-id")).toBe(
      "fallback-id",
    );
    expect(() => selectCorrelationId(null, "unsafe value")).toThrow(
      "Correlation ID fallback must be a safe identifier",
    );
  });

  it("redacts common PII and secret patterns", () => {
    const result = redactLogText(
      "email jane@example.com phone=+971 50 123 4567 Bearer abc.def token=secret-value",
    );

    expect(result).not.toContain("jane@example.com");
    expect(result).not.toContain("+971 50 123 4567");
    expect(result).not.toContain("abc.def");
    expect(result).not.toContain("secret-value");
    expect(result).toContain("[REDACTED_EMAIL]");
    expect(result).toContain("[REDACTED_PHONE]");
    expect(result).toContain("[REDACTED_TOKEN]");
    expect(result).toContain("[REDACTED_SECRET]");
  });

  it("keeps only allowlisted fields and removes route query data", () => {
    expect(
      sanitizeLogContext({
        route: "/contact?email=jane@example.com",
        outcome: "sent to jane@example.com",
        durationMs: 12,
        email: "jane@example.com",
        arbitrary: { nested: true },
      }),
    ).toEqual({
      route: "/contact",
      outcome: "sent to [REDACTED_EMAIL]",
      durationMs: 12,
    });
  });

  it("creates an immutable structured record", () => {
    const record = createLogRecord(
      {
        severity: "info",
        event: "inquiry.accepted",
        correlationId: "request-123",
        context: { route: "/contact", count: 1 },
      },
      new Date("2026-08-18T00:00:00.000Z"),
    );

    expect(record).toEqual({
      time: "2026-08-18T00:00:00.000Z",
      severity: "info",
      event: "inquiry.accepted",
      correlationId: "request-123",
      route: "/contact",
      count: 1,
    });
    expect(Object.isFrozen(record)).toBe(true);
  });
});
