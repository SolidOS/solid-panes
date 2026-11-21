import { log } from 'solid-ui'
import type { DataBrowserContext } from 'pane-registry'
import type { NamedNode } from 'rdflib'
import { configurePreviewFrame } from './previewFrame'
import { renderPreviewError } from './previewError'

type Store = DataBrowserContext['session']['store']

export function isImageContentType (contentType?: string | null): boolean {
  return contentType?.split(';', 1)[0].trim().toLowerCase().startsWith('image/') ?? false
}

export function isVideoContentType (contentType?: string | null): boolean {
  return contentType?.split(';', 1)[0].trim().toLowerCase().startsWith('video/') ?? false
}

async function fetchMedia (
  store: Store,
  subject: NamedNode,
  frame: HTMLDivElement,
  status: HTMLElement,
  type: 'image' | 'video'
): Promise<void> {
  configurePreviewFrame(frame, type)
  let active = true
  let objectUrl: string | undefined
  let media: HTMLImageElement | HTMLVideoElement | undefined
  const cleanup = () => {
    active = false
    media?.removeEventListener('error', handleMediaError)
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = undefined
    }
    observer.disconnect()
  }
  const handleMediaError = () => {
    if (!active) return
    cleanup()
    renderPreviewError(status, `Unable to load ${type}`, `The ${type} could not be displayed.`)
    frame.replaceChildren()
  }
  const observer = new MutationObserver(() => {
    if (!frame.isConnected) cleanup()
  })
  const observationRoot = frame.ownerDocument.body ?? frame.ownerDocument.documentElement
  if (observationRoot) observer.observe(observationRoot, { childList: true, subtree: true })

  try {
    const response = await store.fetcher._fetch(subject.uri)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    if (!active || !frame.isConnected) {
      cleanup()
      return
    }
    objectUrl = URL.createObjectURL(blob)
    media = frame.ownerDocument.createElement(type === 'image' ? 'img' : 'video')
    media.addEventListener('error', handleMediaError)
    media.setAttribute('aria-label', `${type === 'image' ? 'Image' : 'Video'} preview`)
    if (type === 'image') {
      media.setAttribute('alt', 'Image preview')
    } else {
      media.setAttribute('controls', '')
      media.setAttribute('playsinline', '')
    }
    media.setAttribute('src', objectUrl)
    frame.replaceChildren(media)
  } catch (error) {
    if (!active) return
    cleanup()
    log.debug(`Error loading ${type} content: ${String(error)}`)
    renderPreviewError(status, `Unable to load ${type}`, `The ${type} could not be displayed.`)
    frame.replaceChildren()
  }
}

export function renderImageContent (
  store: Store,
  subject: NamedNode,
  frame: HTMLDivElement,
  status: HTMLElement
): void {
  fetchMedia(store, subject, frame, status, 'image')
}

export function renderVideoContent (
  store: Store,
  subject: NamedNode,
  frame: HTMLDivElement,
  status: HTMLElement
): void {
  fetchMedia(store, subject, frame, status, 'video')
}
