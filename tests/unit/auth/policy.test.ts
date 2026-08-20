import { describe, expect, it } from "vitest";

import {
  isApprovedGoogleIdentity,
  normalizeEmail,
  safeAdminPath,
} from "@/modules/auth";
import type { VerifiedIdentityCandidate } from "@/modules/auth";

const approvedUser = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "Admin@Gmail.com",
  email_confirmed_at: "2026-08-20T00:00:00.000Z",
  app_metadata: { provider: "google", providers: ["google"] },
  identities: [{ provider: "google" }],
};

const rejectedCandidates: Array<[VerifiedIdentityCandidate, string]> = [
  [{ ...approvedUser, email: "other@gmail.com" }, "different email"],
  [{ ...approvedUser, email_confirmed_at: null }, "unconfirmed email"],
  [
    {
      ...approvedUser,
      app_metadata: { provider: "email", providers: ["email"] },
      identities: [{ provider: "email" }],
    },
    "non-Google provider",
  ],
  [{ ...approvedUser, id: "" }, "missing stable ID"],
];

describe("administrator identity policy", () => {
  it("normalizes email without exposing alternate matching rules", () => {
    expect(normalizeEmail("  Admin@Gmail.com ")).toBe("admin@gmail.com");
  });

  it("accepts the exact confirmed Google identity", () => {
    expect(isApprovedGoogleIdentity(approvedUser, "admin@gmail.com")).toBe(
      true,
    );
  });

  it.each(rejectedCandidates)("rejects a %s", (candidate) => {
    expect(isApprovedGoogleIdentity(candidate, "admin@gmail.com")).toBe(false);
  });
});

describe("safeAdminPath", () => {
  it.each([
    [null, "/admin"],
    ["/", "/admin"],
    ["//evil.example/admin", "/admin"],
    ["https://evil.example/admin", "/admin"],
    ["/shop", "/admin"],
    ["/admin", "/admin"],
    ["/admin/products?page=2", "/admin/products?page=2"],
  ])("maps %s to %s", (candidate, expected) => {
    expect(safeAdminPath(candidate)).toBe(expected);
  });
});
