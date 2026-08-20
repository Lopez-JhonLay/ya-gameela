import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: [
      "app/**/*.{js,jsx,ts,tsx}",
      "components/**/*.{js,jsx,ts,tsx}",
      "lib/**/*.{js,jsx,ts,tsx}",
      "modules/**/*.{js,jsx,ts,tsx}",
    ],
    rules: {
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/*", "!@/modules/*/server"],
              message:
                "Import another module through index.ts or its designated server.ts entry point.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message: "Read environment variables through lib/env instead.",
        },
        {
          selector:
            "MemberExpression[object.name='process'][computed=true][property.value='env']",
          message: "Read environment variables through lib/env instead.",
        },
      ],
    },
  },
  {
    files: ["lib/env/client.ts", "lib/env/server.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["lib/logging/server.ts"],
    rules: {
      "no-console": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "supabase/.branches/**",
    "supabase/.temp/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
