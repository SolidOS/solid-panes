// Unused outline-manager helpers kept here for reference while the refactor
// settles. Move entries back into manager.js only if a caller still depends on
// them.

/** benchmark a function **/
export function benchmark (f, ...args) {
  const begin = new Date().getTime()
  const returnValue = f.apply(f, args)
  const end = new Date().getTime()
  return {
    returnValue,
    elapsedMs: end - begin
  }
}