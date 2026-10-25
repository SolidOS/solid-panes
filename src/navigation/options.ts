/**
 * Who asked for a view to be displayed. `GotoSubject` takes it as its seventh argument.
 *
 * - `default`: the page's own navigation (URL, navbar, links)
 * - `accountMenu`: the viewer's own content, shown while the page URL keeps pointing elsewhere
 */
export type NavigationSource = 'default' | 'accountMenu'

/**
 * How the folder pane presents a container, when the caller decides it:
 * - `explorer`: storage header, sidebar and content
 * - `storage`: sidebar and content, under the navbar of someone else's pod
 * - `container`: the container alone
 */
export type FolderView = 'explorer' | 'storage' | 'container'

export interface GotoSubjectOptions {
  source?: NavigationSource
  folderView?: FolderView
  /** Keep the caller's document URL while displaying a different subject. */
  preserveUrl?: boolean
}

/** The folder view a `GotoSubject` caller asked for, if any. */
export function resolveFolderView (argument?: boolean | GotoSubjectOptions | null): FolderView | undefined {
  return typeof argument === 'object' && argument !== null ? argument.folderView : undefined
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
