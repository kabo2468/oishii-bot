// @ts-check

import eslint from '@eslint/js';
import eslintConfigPrettier from "eslint-config-prettier";
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/semi': ['error'],
      'prefer-exponentiation-operator': 'error',
      camelcase: 'error',
      'comma-spacing': 'error',
      'space-infix-ops': 'error',
    }
  },
  eslintConfigPrettier
);
