import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bindAdminAccount: vi.fn(),
  findBoundAdmin: vi.fn(),
  recordAuthEvent: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  writeLog: vi.fn(),
}));

vi.mock("@/lib/env/server", () => ({
  serverEnv: {
    ADMIN_EMAIL: "admin@gmail.com",
    LOG_LEVEL: "error",
  },
}));
vi.mock("@/lib/logging/correlation-id", () => ({
  createCorrelationId: () => "90000000-0000-4000-8000-000000000001",
}));
vi.mock("@/lib/logging/server", () => ({ writeLog: mocks.writeLog }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("@/modules/auth/dal", () => ({
  bindAdminAccount: mocks.bindAdminAccount,
  findBoundAdmin: mocks.findBoundAdmin,
  recordAuthEvent: mocks.recordAuthEvent,
}));

import { completeGoogleOAuth, getAdminPrincipal } from "@/modules/auth/service";

const approvedUser = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "admin@gmail.com",
  email_confirmed_at: "2026-08-20T00:00:00.000Z",
  app_metadata: { provider: "google", providers: ["google"] },
  identities: [{ provider: "google" }],
};

function createAuthClient(options?: {
  exchangeError?: boolean;
  user?: typeof approvedUser | null;
  userError?: boolean;
}) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        error: options?.exchangeError ? new Error("invalid code") : null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: options?.user === undefined ? approvedUser : options.user,
        },
        error: options?.userError ? new Error("invalid session") : null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

describe("completeGoogleOAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bindAdminAccount.mockResolvedValue("already_bound");
    mocks.recordAuthEvent.mockResolvedValue(true);
  });

  it("rejects an invalid PKCE/code exchange before reading identity", async () => {
    const client = createAuthClient({ exchangeError: true });
    mocks.createServerSupabaseClient.mockResolvedValue(client);

    await expect(
      completeGoogleOAuth(
        "invalid-code",
        "90000000-0000-4000-8000-000000000002",
      ),
    ).resolves.toEqual({ ok: false, code: "callback_failed" });
    expect(client.auth.getUser).not.toHaveBeenCalled();
    expect(mocks.bindAdminAccount).not.toHaveBeenCalled();
  });

  it("clears a valid session belonging to a different account", async () => {
    const client = createAuthClient({
      user: { ...approvedUser, email: "other@gmail.com" },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(client);

    await expect(
      completeGoogleOAuth("valid-code", "90000000-0000-4000-8000-000000000003"),
    ).resolves.toEqual({ ok: false, code: "identity_denied" });
    expect(mocks.bindAdminAccount).not.toHaveBeenCalled();
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.recordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "denied",
        reasonCode: "auth.identity_denied",
      }),
    );
  });

  it("clears the session when the immutable binding conflicts", async () => {
    const client = createAuthClient();
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    mocks.bindAdminAccount.mockResolvedValue("denied");

    await expect(
      completeGoogleOAuth("valid-code", "90000000-0000-4000-8000-000000000004"),
    ).resolves.toEqual({ ok: false, code: "binding_denied" });
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("fails closed when the required success audit cannot be stored", async () => {
    const client = createAuthClient();
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    mocks.recordAuthEvent.mockResolvedValue(false);

    await expect(
      completeGoogleOAuth("valid-code", "90000000-0000-4000-8000-000000000005"),
    ).resolves.toEqual({ ok: false, code: "audit_failed" });
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("authorizes and audits the approved bound Google identity", async () => {
    const client = createAuthClient();
    mocks.createServerSupabaseClient.mockResolvedValue(client);

    await expect(
      completeGoogleOAuth("valid-code", "90000000-0000-4000-8000-000000000006"),
    ).resolves.toEqual({ ok: true });
    expect(mocks.bindAdminAccount).toHaveBeenCalledWith(
      approvedUser.id,
      "admin@gmail.com",
      "90000000-0000-4000-8000-000000000006",
    );
    expect(mocks.recordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.login",
        actorUserId: approvedUser.id,
        outcome: "success",
      }),
    );
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });
});

describe("getAdminPrincipal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a stale or forged session before querying protected rows", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      createAuthClient({ user: null, userError: true }),
    );

    await expect(getAdminPrincipal()).resolves.toBeNull();
    expect(mocks.findBoundAdmin).not.toHaveBeenCalled();
  });

  it("returns only the DAL-authorized stable binding", async () => {
    const client = createAuthClient();
    const principal = { accountId: "account-id", userId: approvedUser.id };
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    mocks.findBoundAdmin.mockResolvedValue(principal);

    await expect(getAdminPrincipal()).resolves.toEqual(principal);
    expect(mocks.findBoundAdmin).toHaveBeenCalledWith(client, approvedUser.id);
  });
});
