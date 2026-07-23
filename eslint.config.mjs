import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "downloads/**", "assets/**", "tools/**"]
  },
  {
    files: ["js/**/*.js", "data/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "warn",
        {
          vars: "local",
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrors: "none"
        }
      ]
    }
  }
];
