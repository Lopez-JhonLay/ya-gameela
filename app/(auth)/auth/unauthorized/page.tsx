import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <section
      aria-labelledby="unauthorized-heading"
      className="w-full max-w-md space-y-4 rounded-2xl border p-8"
    >
      <h1 id="unauthorized-heading" className="text-2xl font-semibold">
        Access unavailable
      </h1>
      <p className="text-sm text-neutral-600">
        This CMS is limited to the approved Ya Gameela administrator account.
      </p>
      <Link
        href="/auth/sign-in"
        className="inline-block rounded-lg border px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Return to sign in
      </Link>
    </section>
  );
}
