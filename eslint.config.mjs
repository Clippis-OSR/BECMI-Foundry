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
        ...globals.browser,
        ...globals.node,
        CONFIG: 'readonly',
        Actors: 'readonly',
        Items: 'readonly',
        Actor: 'readonly',
        Item: 'readonly',
        ActorSheet: 'readonly',
        ItemSheet: 'readonly',
        Combat: 'readonly',
        Dialog: 'readonly',
        Roll: 'readonly',
        ChatMessage: 'readonly',
        TextEditor: 'readonly',
        renderTemplate: 'readonly',
        fromUuid: 'readonly',
        game: 'readonly',
        ui: 'readonly',
        canvas: 'readonly',
        foundry: 'readonly',
        Hooks: 'readonly',
        CONST: 'readonly',
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  }
];
