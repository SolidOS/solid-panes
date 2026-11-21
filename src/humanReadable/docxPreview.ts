import { log } from 'solid-ui'
import type { DataBrowserContext } from 'pane-registry'
import type { NamedNode } from 'rdflib'
import { configurePreviewFrame } from './previewFrame'
import { renderPreviewError } from './previewError'

type Store = DataBrowserContext['session']['store']

const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function renderDocxContent (
  store: Store,
  subject: NamedNode,
  frame: HTMLDivElement,
  status: HTMLElement
): Promise<void> {
  configurePreviewFrame(frame, 'docx')

  try {
    const response = await store.fetcher._fetch(subject.uri)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const { renderAsync } = await import('docx-preview')
    await renderAsync(await response.arrayBuffer(), frame, undefined, {
      className: 'human-readable-docx',
      inWrapper: true,
      breakPages: true
    })
  } catch (error) {
    log.debug(`Error rendering DOCX content: ${String(error)}`)
    renderPreviewError(status, 'Unable to load DOCX', 'The document could not be displayed.')
    frame.replaceChildren()
  }
}

export function isDocxContentType (contentType?: string | null): boolean {
  return contentType?.split(';', 1)[0].trim().toLowerCase() === DOCX_CONTENT_TYPE
}

export function isDocxFile (uri?: string | null): boolean {
  if (!uri) return false
  const path = uri.split('?')[0].split('#')[0]
  return /\.docx$/i.test(path)
}
