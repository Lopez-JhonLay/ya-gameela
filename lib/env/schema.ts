import { z } from "zod";

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .readonly();

export type ServerEnv = Readonly<z.infer<typeof serverEnvSchema>>;

export function parseServerEnv(
  input: Readonly<Record<string, string | undefined>>,
): ServerEnv {
  const result = serverEnvSchema.safeParse({
    NODE_ENV: input.NODE_ENV,
    LOG_LEVEL: input.LOG_LEVEL,
  });

  if (!result.success) {
    const invalidKeys = [
      ...new Set(
        result.error.issues.map(
          (issue) => issue.path.join(".") || "environment",
        ),
      ),
    ].sort();

    throw new Error(
      `Invalid server environment configuration: ${invalidKeys.join(", ")}`,
    );
  }

  return Object.freeze(result.data);
}
