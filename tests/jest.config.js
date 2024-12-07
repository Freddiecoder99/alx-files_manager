module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'utils/**/*.js',
    'controllers/**/*.js',
    'routes/**/*.js'
  ],
  coverageReporters: ['text', 'lcov']
};
