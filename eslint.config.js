import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * ESLint 9 flat config.
 *
 * `react` 플러그인은 `react/jsx-uses-vars` 때문에 필수다. 이 규칙이 없으면 JSX 안에서만
 * 쓰이는 import (`<Trend />` 같은 경우) 를 `no-unused-vars` 가 미사용으로 오판한다.
 */
export default [
  {
    ignores: [
      'dist/**',
      'dist-prod/**',
      'android/**',
      'node_modules/**',
      // Python 영역 — ruff/flake8 소관
      'backend/**',
      'tools/**',
      // 디자인 핸드오프 스냅샷: 앱 소스의 사본이라 lint 대상이 아니다
      'src/handoff/**',
      'src/_backup_pre_handoff_*/**',
    ],
  },

  // 프론트엔드 (브라우저)
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // JSX 안에서만 참조되는 변수를 "사용됨" 으로 인식시킨다
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      // `_` 접두사는 "의도적으로 안 쓰는 인자" 관례 (mock 구현 등)
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' },
      ],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // 테스트 (브라우저 + node 전역, vitest 는 import 해서 쓴다)
  {
    files: ['test/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { react },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' },
      ],
    },
  },

  // Node 스크립트 (Claude Code hook, vite 설정)
  {
    files: ['.claude/hooks/**/*.mjs', 'vite.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: { ...js.configs.recommended.rules },
  },
];
