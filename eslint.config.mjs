import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Legitimate patterns: dropdown positioning, confetti init, controlled inputs synced from props.
      "react-hooks/set-state-in-effect": "off",
      // Dynamic icon components come from a stable string→component map (`getIcon`).
      "react-hooks/static-components": "off",
      // Intentional: many effects sync DOM/modals; adding deps causes loops or double-fetch.
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tmp/**",
    ".venv/**",
  ]),
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["scripts/**/*.ts", "prisma/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: [
      "src/components/investments/AssetLogo.tsx",
      "src/components/settings/PersonalInformationCard.tsx",
      "src/components/ui/TypeaheadSelect.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
