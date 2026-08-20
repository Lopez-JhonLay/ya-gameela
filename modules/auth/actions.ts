"use server";

import { redirect } from "next/navigation";

import { serverEnv } from "@/lib/env/server";
import { createCorrelationId } from "@/lib/logging/correlation-id";
import { writeLog } from "@/lib/logging/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { recordAuthEvent } from "./dal";
import { getAdminPrincipal } from "./service";

export async function startGoogleSignIn(): Promise<never> {
  const correlationId = createCorrelationId();
  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${serverEnv.APP_ORIGIN}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    writeLog({
      severity: "error",
      event: "auth.sign_in_start_failed",
      correlationId,
      context: { errorCode: "provider_url_unavailable" },
    });
    redirect("/auth/unauthorized?reason=sign_in_unavailable");
  }

  redirect(data.url);
}

export async function signOut(): Promise<never> {
  const correlationId = createCorrelationId();
  const principal = await getAdminPrincipal();

  if (!principal) {
    redirect("/auth/unauthorized?reason=not_authorized");
  }

  const client = await createServerSupabaseClient();
  const auditRecorded = await recordAuthEvent({
    action: "auth.logout",
    correlationId,
    outcome: "success",
    actorUserId: principal.userId,
  });

  if (!auditRecorded) {
    writeLog({
      severity: "error",
      event: "auth.logout_audit_failed",
      correlationId,
      context: { errorCode: "audit_insert_failed" },
    });
  }

  await client.auth.signOut({ scope: "local" });
  redirect("/auth/sign-in");
}
