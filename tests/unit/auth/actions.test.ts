import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminPrincipal: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  recordAuthEvent: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/env/server", () => ({
  serverEnv: {
    APP_ORIGIN: "http://localhost:3000",
    ADMIN_EMAIL: "admin@gmail.com",
    LOG_LEVEL: "error",
  },
}));
vi.mock("@/lib/logging/correlation-id", () => ({
  createCorrelationId: () => "90000000-0000-4000-8000-000000000001",
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("@/modules/auth/service", () => ({
  getAdminPrincipal: mocks.getAdminPrincipal,
}));
vi.mock("@/modules/auth/dal", () => ({
  recordAuthEvent: mocks.recordAuthEvent,
}));

import { signOut } from "@/modules/auth/actions";

describe("signOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects direct invocation without an authoritative admin", async () => {
    mocks.getAdminPrincipal.mockResolvedValue(null);

    await expect(signOut()).rejects.toThrow(
      "NEXT_REDIRECT:/auth/unauthorized?reason=not_authorized",
    );
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.recordAuthEvent).not.toHaveBeenCalled();
  });

  it("audits, clears the local session, and redirects an administrator", async () => {
    const signOutSession = vi.fn().mockResolvedValue({ error: null });
    mocks.getAdminPrincipal.mockResolvedValue({
      accountId: "account-id",
      userId: "user-id",
    });
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { signOut: signOutSession },
    });
    mocks.recordAuthEvent.mockResolvedValue(true);

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/auth/sign-in");
    expect(mocks.recordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.logout",
        actorUserId: "user-id",
        outcome: "success",
      }),
    );
    expect(signOutSession).toHaveBeenCalledWith({ scope: "local" });
  });
});
