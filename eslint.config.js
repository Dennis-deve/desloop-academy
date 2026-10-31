// Node 22 / ESLint 10 flat config. Preserve the original recommended TypeScript,
// React Hooks and JSX accessibility coverage; do not silently drop a11y checks.
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';

const typescriptRecommendedRules = Object.assign(
  {},
  ...tsPlugin.configs['flat/recommended'].map((config) => config.rules ?? {}),
);

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/playwright-report/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'jsx-a11y-x': jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescriptRecommendedRules,
      // The former react-hooks/recommended configuration enabled these two
      // rules. Version 7's larger preset needs a separate, reviewed change.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // All 34 recommended accessibility rule levels match the previous
      // eslint-plugin-jsx-a11y preset. The historical anchor exception stays.
      ...jsxA11y.configs.recommended.rules,
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'jsx-a11y-x/anchor-is-valid': 'off',
    },
  },
];
