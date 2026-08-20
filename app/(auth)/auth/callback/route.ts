import { type NextRequest, NextResponse } from "next/server";

import { serverEnv } from "@/lib/env/server";
import { createCorrelationId } from "@/lib/logging/correlation-id";
import { completeGoogleOAuth } from "@/modules/auth/server";
import { safeAdminPath } from "@/modules/auth";

export async function GET(request: NextRequest) {
  const correlationId = createCorrelationId(
    request.headers.get("x-correlation-id"),
  );
  const code = request.nextUrl.searchParams.get("code");
  const providerError = request.nextUrl.searchParams.get("error");

  if (!code || providerError) {
    return NextResponse.redirect(
      new URL(
        "/auth/unauthorized?reason=callback_failed",
        serverEnv.APP_ORIGIN,
      ),
    );
  }

  const result = await completeGoogleOAuth(code, correlationId);

  if (!result.ok) {
    const failureUrl = new URL("/auth/unauthorized", serverEnv.APP_ORIGIN);
    failureUrl.searchParams.set("reason", result.code);
    return NextResponse.redirect(failureUrl);
  }

  const destination = safeAdminPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(destination, serverEnv.APP_ORIGIN));
}
