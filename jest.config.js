export default {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  preset: 'ts-jest/presets/js-with-babel',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node']
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.[tj]sx?$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!lit-html).+\\.js'],
  setupFilesAfterEnv: ['./test/helpers/setup.ts'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  // For some reason Jest is not measuring coverage without the below option.
  // Unfortunately, despite `!(.test)`, it still measures coverage of test files as well:
  // forceCoverageMatch: ['./src/**/*!(.test).ts'],
  // Since we're only measuring coverage for TypeScript (i.e. added with test infrastructure in place),
  // we can be fairly strict. However, if you feel that something is not fit for coverage,
  // mention why in a comment and mark it as ignored:
  // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md
  /* coverageThreshold: {
    global: {
      branches: 10,
      functions: 25,
      lines: 20,
      statements: 20
    }
  } */
}
