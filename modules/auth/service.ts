import "server-only";

import { createCorrelationId } from "@/lib/logging/correlation-id";
import { writeLog } from "@/lib/logging/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";

import { bindAdminAccount, findBoundAdmin, recordAuthEvent } from "./dal";
import type { AdminPrincipal, OAuthCallbackResult } from "./dto";
import { isApprovedGoogleIdentity } from "./policy";

export async function getAdminPrincipal(): Promise<AdminPrincipal | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return findBoundAdmin(client, data.user.id);
}

export async function completeGoogleOAuth(
  code: string,
  correlationId = createCorrelationId(),
): Promise<OAuthCallbackResult> {
  const client = await createServerSupabaseClient();
  const exchange = await client.auth.exchangeCodeForSession(code);

  if (exchange.error) {
    writeLog({
      severity: "warn",
      event: "auth.callback_failed",
      correlationId,
      context: { errorCode: "code_exchange_failed" },
    });
    return { ok: false, code: "callback_failed" };
  }

  const verified = await client.auth.getUser();

  if (
    verified.error ||
    !verified.data.user ||
    !isApprovedGoogleIdentity(verified.data.user, serverEnv.ADMIN_EMAIL)
  ) {
    await recordAuthEvent({
      action: "auth.login",
      correlationId,
      outcome: "denied",
      reasonCode: "auth.identity_denied",
    });
    await client.auth.signOut({ scope: "local" });
    return { ok: false, code: "identity_denied" };
  }

  const userId = verified.data.user.id;
  const binding = await bindAdminAccount(
    userId,
    serverEnv.ADMIN_EMAIL,
    correlationId,
  );

  if (binding === "denied") {
    await recordAuthEvent({
      action: "auth.login",
      correlationId,
      outcome: "denied",
      reasonCode: "auth.binding_denied",
    });
    await client.auth.signOut({ scope: "local" });
    return { ok: false, code: "binding_denied" };
  }

  const auditRecorded = await recordAuthEvent({
    action: "auth.login",
    correlationId,
    outcome: "success",
    actorUserId: userId,
  });

  if (!auditRecorded) {
    await client.auth.signOut({ scope: "local" });
    return { ok: false, code: "audit_failed" };
  }

  writeLog({
    severity: "info",
    event: "auth.login_succeeded",
    correlationId,
    context: { outcome: binding },
  });

  return { ok: true };
}
