import { DataBrowserContext } from 'pane-registry'
import { NamedNode } from 'rdflib'

export function paneDiv (
  context: DataBrowserContext,
  subject: NamedNode,
  paneName: string
): HTMLElement {
  const view = context.session.paneRegistry.byName(paneName)
  if (!view) {
    const warning = context.dom.createElement('div')
    warning.innerText = `Unable to load view: ${paneName}`
    return warning
  }
  const viewContainer = view.render(subject, context)
  viewContainer.setAttribute(
    'style', 'border: 0.3em solid #444; border-radius: 0.5em'
  )
  return viewContainer
}
