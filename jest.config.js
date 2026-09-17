/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js$': [
      'babel-jest',
      { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] },
    ],
  },
  // AI SDK 7 and its ESM dependencies must be transformed for Jest's CommonJS runtime.
  transformIgnorePatterns: [
    '/node_modules/(?!(ai|@ai-sdk/[^/]+|@vercel/oidc|@workflow/serde|@standard-schema/spec|eventsource-parser)/)',
  ],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/tests/setupTests.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  verbose: true,
};

module.exports = config;
