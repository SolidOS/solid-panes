/**
 * Who asked for a view to be displayed. `GotoSubject` takes it as its seventh argument.
 *
 * - `default`: the page's own navigation (URL, navbar, links)
 * - `accountMenu`: the viewer's own content, shown while the page URL keeps pointing elsewhere
 */
export type NavigationSource = 'default' | 'accountMenu'

export interface GotoSubjectOptions {
  source?: NavigationSource
}

/**
 * The seventh argument used to be `showNavbar`: `false` meant "opened by the account menu"
 * and anything else meant the page's own navigation. That form is still accepted.
 */
export function resolveSource (argument?: boolean | GotoSubjectOptions | null): NavigationSource {
  if (typeof argument === 'object' && argument !== null) return argument.source ?? 'default'
  if (argument === undefined) return 'default'
  return argument ? 'default' : 'accountMenu'
}
