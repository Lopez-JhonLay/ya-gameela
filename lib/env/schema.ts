import { z } from "zod";

const publicEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  })
  .readonly();

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
    SUPABASE_SECRET_KEY: z.string().trim().min(1),
    ADMIN_EMAIL: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email())
      .refine((email) => email.endsWith("@gmail.com"), {
        message: "Administrator must use Gmail",
      }),
    APP_ORIGIN: z.url().transform((origin) => origin.replace(/\/$/, "")),
  })
  .superRefine((environment, context) => {
    const appOrigin = new URL(environment.APP_ORIGIN);
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(
      appOrigin.hostname,
    );

    if (
      environment.NODE_ENV === "production" &&
      appOrigin.protocol !== "https:" &&
      !isLoopback
    ) {
      context.addIssue({
        code: "custom",
        path: ["APP_ORIGIN"],
        message: "Production origin must use HTTPS",
      });
    }
  })
  .readonly();

export type PublicEnv = Readonly<z.infer<typeof publicEnvSchema>>;
export type ServerEnv = Readonly<z.infer<typeof serverEnvSchema>>;

function invalidEnvironmentError(
  kind: "public" | "server",
  issues: ReadonlyArray<{ path: PropertyKey[] }>,
): Error {
  const invalidKeys = [
    ...new Set(
      issues.map((issue) => issue.path.map(String).join(".") || "environment"),
    ),
  ].sort();

  return new Error(
    `Invalid ${kind} environment configuration: ${invalidKeys.join(", ")}`,
  );
}

export function parsePublicEnv(
  input: Readonly<Record<string, string | undefined>>,
): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: input.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    throw invalidEnvironmentError("public", result.error.issues);
  }

  return Object.freeze(result.data);
}

export function parseServerEnv(
  input: Readonly<Record<string, string | undefined>>,
): ServerEnv {
  const result = serverEnvSchema.safeParse({
    NODE_ENV: input.NODE_ENV,
    LOG_LEVEL: input.LOG_LEVEL,
    NEXT_PUBLIC_SUPABASE_URL: input.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: input.SUPABASE_SECRET_KEY,
    ADMIN_EMAIL: input.ADMIN_EMAIL,
    APP_ORIGIN: input.APP_ORIGIN,
  });

  if (!result.success) {
    throw invalidEnvironmentError("server", result.error.issues);
  }

  return Object.freeze(result.data);
}
