import { type NextRequest, NextResponse } from "next/server";

import { createProxySupabaseClient } from "@/lib/supabase/proxy";

function copyCookies(source: NextResponse, target: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  return target;
}

export async function proxy(request: NextRequest) {
  const { supabase, getResponse } = createProxySupabaseClient(request);
  const { data, error } = await supabase.auth.getClaims();
  const response = getResponse();

  response.headers.set("Cache-Control", "private, no-store");

  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    (error || !data?.claims?.sub)
  ) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirectResponse = NextResponse.redirect(signInUrl);
    redirectResponse.headers.set("Cache-Control", "private, no-store");
    return copyCookies(response, redirectResponse);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*"],
};
