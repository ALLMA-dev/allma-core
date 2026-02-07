/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Tell Jest how to resolve the workspace package import.
    // It maps '@optiroq-types' to the actual source code, not the 'dist' folder.
    '^@optiroq-types$': '<rootDir>/../../packages/optiroq-types/src/index.ts',
    
    // This is required for ES Modules support with ts-jest
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json'
      },
    ],
  },
  roots: ['<rootDir>/src/optiroq-lambdas'],
  testMatch: ['**/*.test.ts'],
};