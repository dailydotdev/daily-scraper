process.env.TZ = 'UTC';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '<rootDir>/__tests__/fixture/',
    '<rootDir>/__tests__/helpers.ts',
  ],
  testTimeout: 20000,
};
