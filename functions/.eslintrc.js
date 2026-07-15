module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": "off",
    "import/no-unresolved": 0,
    // Windows dev environments commonly use CRLF; don't fail lint on line endings.
    "linebreak-style": "off",

    // The default Google preset is very strict (JSDoc, max-len, indent).
    // Cloud Functions code here is mostly template-heavy (HTML strings), so relax.
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "max-len": "off",
    "indent": "off",
    "operator-linebreak": "off",
  },
  overrides: [
    {
      files: ["src/**/*.ts"],
      rules: {
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
  ],
};
