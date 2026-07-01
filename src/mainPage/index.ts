/*   Main Page
 **
 **  This code is called in mashlib and renders the header and footer of the Databrowser.
 */

import { LiveStore, NamedNode } from 'rdflib'
import type { RenderEnvironment } from 'pane-registry'
import { getOutliner, OutlineManager } from '../index'
import { createHeader } from './header'
import { createFooter } from './footer'
import { createLeftSideMenu, refreshMenu } from './menu'

// Symbol used to stash the last render-relevant env snapshot on the outliner
// so refreshUI can skip a full GotoSubject re-render when nothing changed.
const LAST_RENDER_ENV_KEY = '__lastRenderEnvSignature'

function renderEnvSignature (env?: RenderEnvironment): string {
  if (!env) return ''
  return [env.layout, env.theme, env.inputMode].join('|')
}

export { refreshMenu as updateMenuLayout } from './menu'

function ensureMainContent () {
  let main = document.getElementById('MainContent') as HTMLElement | null
  if (!main) {
    main = document.createElement('main')
    main.id = 'MainContent'
    main.setAttribute('role', 'main')
    main.setAttribute('tabindex', '-1')
    main.setAttribute('aria-live', 'polite')
    document.body.appendChild(main)
  }
  return main
}

export async function initMainPage (
  store: LiveStore,
  uri?: string | NamedNode | null,
  environment?: RenderEnvironment
) {
  ensureMainContent()
  const outliner = getOutliner(document, environment)
  ;(outliner as any)[LAST_RENDER_ENV_KEY] = renderEnvSignature(environment)
  uri = uri || window.location.href
  const subject: NamedNode = typeof uri === 'string' ? store.sym(uri) : uri
  outliner.GotoSubject(subject, true, undefined, true, undefined)

  const header = await createHeader(outliner)
  const menu = createLeftSideMenu(subject, outliner)
  const footer = menu.then(() => createFooter(store))
  return Promise.all([header, menu, footer])
}

export async function refreshUI (outliner: OutlineManager) {
  const store = outliner?.context?.session?.store
  const paneRegistry = outliner?.context?.session?.paneRegistry
  const subjectUri = window.document.location.href
  const paneName = window.history.state?.paneName
  const pane = paneName ? paneRegistry?.byName?.(paneName) : undefined

  // Only re-run GotoSubject (full pane re-render) when render-relevant
  // environment fields actually changed since the last render.
  const currentSignature = renderEnvSignature(outliner?.context?.environment)
  const previousSignature = (outliner as any)?.[LAST_RENDER_ENV_KEY] ?? ''
  const envChanged = currentSignature !== previousSignature

  if (envChanged && store && typeof outliner?.GotoSubject === 'function') {
    outliner.GotoSubject(store.sym(subjectUri), true, pane, true, undefined)
    ;(outliner as any)[LAST_RENDER_ENV_KEY] = currentSignature
  }

  refreshMenu(outliner.context.environment?.layout === 'mobile' ? 'mobile' : 'desktop')
}
