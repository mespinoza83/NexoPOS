import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname, ecmaFeatures: { jsx: true } },
    },
    rules: {},
  },
  { ignores: ['.next/**', '.next-dev/**', 'node_modules/**'] },
];