/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  clearMocks: true,
  testTimeout: 60000,
  // Database-backed tests must run serially for deterministic resets.
  maxWorkers: 1,
  setupFiles: ['<rootDir>/tests/setup/loadTestEnv.ts'],
  globalSetup: '<rootDir>/tests/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.ts',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
};
