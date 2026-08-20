import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { createSystemSupabaseClient } from "@/lib/supabase/system";

import type { AdminPrincipal } from "./dto";

export async function findBoundAdmin(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<AdminPrincipal | null> {
  const { data, error } = await client
    .from("admin_accounts")
    .select("id, auth_user_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  const account = data;

  if (error || !account?.auth_user_id) {
    return null;
  }

  return { accountId: account.id, userId: account.auth_user_id };
}

export async function bindAdminAccount(
  candidateUserId: string,
  expectedEmail: string,
  correlationId: string,
): Promise<"bound" | "already_bound" | "denied"> {
  const client = createSystemSupabaseClient();
  const { data, error } = await client.rpc("bind_admin_account", {
    candidate_user_id: candidateUserId,
    expected_email: expectedEmail,
    request_correlation_id: correlationId,
  });

  if (error || (data !== "bound" && data !== "already_bound")) {
    return "denied";
  }

  return data;
}

export async function recordAuthEvent(input: {
  action: "auth.login" | "auth.logout";
  correlationId: string;
  outcome: "success" | "denied" | "failure";
  actorUserId?: string;
  reasonCode?: string;
}): Promise<boolean> {
  const client = createSystemSupabaseClient();
  const { error } = await client.from("admin_audit_events").insert({
    actor_kind: input.actorUserId ? "admin" : "system",
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    correlation_id: input.correlationId,
    outcome: input.outcome,
    reason_code: input.reasonCode ?? null,
  });

  return !error;
}
