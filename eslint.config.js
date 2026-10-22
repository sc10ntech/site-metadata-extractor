const eslint = require("@eslint/js");
const eslintConfigPrettier = require("eslint-config-prettier/flat");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");

module.exports = [
  eslint.configs.recommended,
  ...typescriptEslint.configs["flat/recommended"],
  eslintConfigPrettier,
];
