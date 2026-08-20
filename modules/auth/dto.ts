export interface AdminPrincipal {
  accountId: string;
  userId: string;
}

export type OAuthCallbackResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "callback_failed"
        | "identity_denied"
        | "binding_denied"
        | "audit_failed";
    };
