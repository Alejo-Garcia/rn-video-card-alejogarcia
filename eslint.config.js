const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  globalIgnores(['.expo/', 'dist/', 'web-build/', 'expo-env.d.ts']),
  expoConfig,
  tseslint.configs.recommended,
  {
    rules: {
      // Pinned here rather than inherited: these three are requirements of the
      // brief, so a change to either shared config must not be able to drop
      // them silently.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-console': 'error',
    },
  },
  {
    // ESLint and Jest both load their config with require(), so these two files
    // have to be CommonJS.
    files: ['*.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
