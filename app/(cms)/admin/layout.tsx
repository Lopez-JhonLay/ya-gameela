import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { getAdminPrincipal, signOut } from "@/modules/auth/server";

export const metadata: Metadata = {
  title: "CMS | Ya Gameela",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminLoadingShell />}>
      <AuthenticatedAdminShell>{children}</AuthenticatedAdminShell>
    </Suspense>
  );
}

async function AuthenticatedAdminShell({ children }: { children: ReactNode }) {
  const principal = await getAdminPrincipal();

  if (!principal) {
    redirect("/auth/unauthorized?reason=not_authorized");
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Ya Gameela CMS
            </Link>
            <nav aria-label="Administration">
              <Link
                href="/admin/categories"
                className="text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Categories
              </Link>
            </nav>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}

function AdminLoadingShell() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p role="status" className="text-sm text-neutral-600">
        Checking administrator access…
      </p>
    </main>
  );
}
