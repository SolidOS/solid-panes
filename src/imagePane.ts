/*   Image Pane
 **
 **  This outline pane contains the document contents for an Image document
 */
import * as UI from 'solid-ui'
import type { DataBrowserContext } from 'pane-registry'
import type { NamedNode } from 'rdflib'
import './imagePane.css'

type FetcherLike = {
  getHeader: (subject: NamedNode, header: string) => string[] | undefined
  _fetch: (uri: string) => Promise<Response>
}

type ImageStore = DataBrowserContext['session']['store'] & {
  fetcher: FetcherLike
}

type ImagePane = {
  icon: string
  name: string
  label: (subject: NamedNode, context: DataBrowserContext) => string | null
  render: (subject: NamedNode, context: DataBrowserContext) => HTMLDivElement
}

function contentTypeMatch (
  store: ImageStore,
  subject: NamedNode,
  contentTypes: string[]
): boolean {
  const contentTypesForSubject = store.fetcher.getHeader(subject, 'content-type')
  if (!contentTypesForSubject) {
    return false
  }

  for (const contentType of contentTypesForSubject) {
    for (const candidate of contentTypes) {
      if (contentType.includes(candidate)) {
        return true
      }
    }
  }

  return false
}

export const imagePane: ImagePane = {
  icon: UI.icons.originalIconBase + 'tango/22-image-x-generic.png',

  name: 'image',

  label: function (subject: NamedNode, context: DataBrowserContext): string | null {
    const store = context.session.store as ImageStore
    const isImageResource = store.anyStatementMatching(
      subject,
      UI.ns.rdf('type'),
      store.sym('http://purl.org/dc/terms/Image')
    ) || contentTypeMatch(store, subject, ['image/'])
    if (!isImageResource) {
      // NB: Not dc: namespace!
      return null
    }

    //   See also the source pane, which has lower precedence.

    const suppressed = ['application/pdf']
    if (contentTypeMatch(store, subject, suppressed)) {
      return null
    }
    return 'Image'
  },

  render: function (subject: NamedNode, context: DataBrowserContext): HTMLDivElement {
    const myDocument = context.dom
    const store = context.session.store as ImageStore
    const div = myDocument.createElement('div')
    div.setAttribute('class', 'image-pane')
    const img = myDocument.createElement('img')
    let active = true
    let objectURL: string | undefined
    const observer = new MutationObserver(() => {
      if (!div.isConnected) cleanup()
    })

    const cleanup = () => {
      active = false
      img.removeEventListener('error', handleImageError)
      if (objectURL) {
        URL.revokeObjectURL(objectURL)
        objectURL = undefined
      }
      observer.disconnect()
    }

    const handleImageError = () => {
      if (!active) return
      cleanup()
      img.setAttribute('alt', 'Unable to load image')
      UI.log.warn('Unable to load image resource')
    }

    const observationRoot = myDocument.body ?? myDocument.documentElement
    if (observationRoot) observer.observe(observationRoot, { childList: true, subtree: true })
    img.addEventListener('error', handleImageError)

    // get image with authenticated fetch
    store.fetcher._fetch(subject.uri)
      .then(function (response: Response) {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.blob()
      })
      .then(function (myBlob: Blob) {
        if (!active || !div.isConnected) {
          cleanup()
          return
        }
        const previewURL = URL.createObjectURL(myBlob)
        objectURL = previewURL
        img.setAttribute('src', previewURL) // w640 h480 //
      })
      .catch(function (error: unknown) {
        if (!active) return
        cleanup()
        img.setAttribute('alt', 'Unable to load image')
        UI.log.warn('Unable to load image resource: ' + error)
      })
    img.classList.add('image-pane__image')
    div.appendChild(img)
    return div
  }
}

// ends
