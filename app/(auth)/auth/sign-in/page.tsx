import { startGoogleSignIn } from "@/modules/auth/server";

export default function SignInPage() {
  return (
    <section
      aria-labelledby="sign-in-heading"
      className="w-full max-w-md space-y-6 rounded-2xl border p-8"
    >
      <div className="space-y-2">
        <p className="text-sm">Ya Gameela CMS</p>
        <h1 id="sign-in-heading" className="text-2xl font-semibold">
          Administrator sign in
        </h1>
        <p className="text-sm text-neutral-600">
          Use the approved Google account to continue.
        </p>
      </div>
      <form action={startGoogleSignIn}>
        <button
          type="submit"
          className="w-full rounded-lg border px-4 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Continue with Google
        </button>
      </form>
    </section>
  );
}
