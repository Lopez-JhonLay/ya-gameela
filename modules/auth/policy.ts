export interface VerifiedIdentityCandidate {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  app_metadata?: Readonly<Record<string, unknown>>;
  identities?: ReadonlyArray<{ provider?: string }> | null;
}

export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

function includesGoogleProvider(user: VerifiedIdentityCandidate): boolean {
  const primaryProvider = user.app_metadata?.provider;
  const providers = user.app_metadata?.providers;

  return (
    primaryProvider === "google" ||
    (Array.isArray(providers) && providers.includes("google")) ||
    Boolean(user.identities?.some(({ provider }) => provider === "google"))
  );
}

export function isApprovedGoogleIdentity(
  user: VerifiedIdentityCandidate,
  expectedEmail: string,
): boolean {
  return (
    user.id.length > 0 &&
    Boolean(user.email_confirmed_at) &&
    normalizeEmail(user.email) === normalizeEmail(expectedEmail) &&
    includesGoogleProvider(user)
  );
}

export function safeAdminPath(candidate: string | null | undefined): string {
  if (!candidate?.startsWith("/") || candidate.startsWith("//")) {
    return "/admin";
  }

  try {
    const parsed = new URL(candidate, "http://local.invalid");

    if (
      parsed.origin !== "http://local.invalid" ||
      (parsed.pathname !== "/admin" && !parsed.pathname.startsWith("/admin/"))
    ) {
      return "/admin";
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/admin";
  }
}
