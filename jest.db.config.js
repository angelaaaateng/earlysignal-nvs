// Database rule tests run in plain Node against a Postgres (not jest-expo).
const path = require('node:path');
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/supabase/tests/**/*.test.ts'],
  transform: { '^.+\\.ts$': ['babel-jest', { presets: [require.resolve('babel-preset-expo', { paths: [require.resolve('expo/package.json')] })], babelrc: false, configFile: false }] },
  testTimeout: 60_000,
};
