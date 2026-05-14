import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        game: 'readonly',
        foundry: 'readonly',
        Actor: 'readonly',
        fromUuid: 'readonly',
        Roll: 'readonly',
        ChatMessage: 'readonly',
        Hooks: 'readonly',
        ui: 'readonly',
        CONST: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  }
];
