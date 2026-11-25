import { icons, log } from 'solid-ui'
import type { DataBrowserContext } from 'pane-registry'
import type { NamedNode } from 'rdflib'
import DOMPurify from 'dompurify'
import './officePane.css'

type OfficeStore = DataBrowserContext['session']['store'] & {
  fetcher: {
    getHeader: (subject: NamedNode, header: string) => string[] | undefined
    _fetch: (uri: string) => Promise<Response>
  }
}

const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function isDocxContentType (contentType?: string | null): boolean {
  return contentType?.split(';', 1)[0].trim().toLowerCase() === DOCX_CONTENT_TYPE
}

function isDocxFile (uri?: string | null): boolean {
  if (!uri) return false
  const path = uri.split('?')[0].split('#')[0]
  return /\.docx$/i.test(path)
}

function isOfficeDocument (store: OfficeStore, subject: NamedNode): boolean {
  const contentTypes = store.fetcher.getHeader(subject, 'content-type') ?? []
  return contentTypes.some(isDocxContentType) || isDocxFile(subject.uri)
}

export const officePane = {
  icon: icons.originalIconBase + 'tango/22-x-office-document.png',
  name: 'office',

  label (subject: NamedNode, context: DataBrowserContext): string | null {
    return isOfficeDocument(context.session.store as OfficeStore, subject) ? 'Office document' : null
  },

  render (subject: NamedNode, context: DataBrowserContext): HTMLDivElement {
    const store = context.session.store as OfficeStore
    const dom = context.dom
    const pane = dom.createElement('div')
    pane.className = 'office-pane'
    const frame = dom.createElement('div')
    frame.className = 'office-pane__frame'
    frame.setAttribute('aria-busy', 'true')
    frame.textContent = 'Loading document…'
    pane.appendChild(frame)

    store.fetcher._fetch(subject.uri)
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const { renderAsync } = await import('docx-preview')
        const renderTarget = dom.createElement('div')
        await renderAsync(await response.arrayBuffer(), renderTarget, undefined, {
          className: 'office-pane__document',
          inWrapper: true,
          breakPages: true,
          renderAltChunks: false,
          useBase64URL: true
        })
        frame.innerHTML = DOMPurify.sanitize(renderTarget.innerHTML)
        frame.removeAttribute('aria-busy')
      })
      .catch(error => {
        log.debug(`Error rendering office document: ${String(error)}`)
        frame.removeAttribute('aria-busy')
        frame.replaceChildren()
        frame.textContent = 'Unable to display this Office document.'
      })

    return pane
  }
}
