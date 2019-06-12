/* eslint-env jest */

/* istanbul ignore next [This is a test helper, so it doesn't need to be tested itself] */
/**
 * This is a workaround for a bug that will be fixed in react-dom@16.9
 *
 * The bug results in a warning being thrown about calls not being wrapped in `act()`
 * when a component calls `setState` twice.
 * More info about the issue: https://github.com/testing-library/react-testing-library/issues/281#issuecomment-480349256
 * The PR that will fix it: https://github.com/facebook/react/pull/14853
 */
export function workaroundActError () {
  const originalError = console.error
  beforeAll(() => {
    console.error = (...args) => {
      if (/Warning.*not wrapped in act/.test(args[0])) {
        return
      }
      originalError.call(console, ...args)
    }
  })

  afterAll(() => {
    console.error = originalError
  })
}
