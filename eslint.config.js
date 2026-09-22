import js from "@eslint/js";
import globals from "globals";
export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "android/**",
      "ios/**",
      "vendor/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}", "tests/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: { "no-unused-vars": "off" },
  },
];
