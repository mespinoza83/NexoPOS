import tsParser from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname, ecmaFeatures: { jsx: true } },
    },
  },
  { ignores: ['.next/**', '.next-dev/**', 'node_modules/**'] },
];
