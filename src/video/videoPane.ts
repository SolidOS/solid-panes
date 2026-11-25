/*   Single video play Pane
 **
 */
import { icons, log } from 'solid-ui'
import { Util } from 'rdflib'
import './videoPane.css'

export default {
  icon: icons.iconBase + 'noun_1619.svg',

  name: 'video',

  label: function (subject, context) {
    const kb = context.session.store
    const typeURIs = kb.findTypeURIs(subject)
    const prefix = Util.mediaTypeClass('video/*').uri.split('*')[0]
    for (const t in typeURIs) {
      if (t.startsWith(prefix)) return 'Play video'
    }

    return null
  },

  render: function (subject, context) {
    const kb = context.session.store
    const dom = context.dom
    const div = dom.createElement('div')
    div.classList.add('video-pane')
    div.dataset.layout = context.environment?.layout ?? 'desktop'
    const video = div.appendChild(dom.createElement('video'))
    video.setAttribute('controls', 'yes')
    video.setAttribute('aria-label', 'Video preview')
    video.setAttribute('playsinline', '')
    let active = true
    let objectURL: string | undefined
    const observer = new MutationObserver(() => {
      if (!div.isConnected) cleanup()
    })

    const cleanup = () => {
      active = false
      video.removeEventListener('error', handleVideoError)
      if (objectURL) {
        URL.revokeObjectURL(objectURL)
        objectURL = undefined
      }
      observer.disconnect()
    }

    const handleVideoError = () => {
      if (!active) return
      cleanup()
      log.warn('Unable to load video resource')
    }

    const observationRoot = dom.body ?? dom.documentElement
    if (observationRoot) observer.observe(observationRoot, { childList: true, subtree: true })
    video.addEventListener('error', handleVideoError)

    // get video with authenticated fetch
    kb.fetcher._fetch(subject.uri)
      .then(function (response) {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.blob()
      })
      .then(function (myBlob) {
        if (!active || !div.isConnected) {
          cleanup()
          return
        }
        const previewURL = URL.createObjectURL(myBlob)
        objectURL = previewURL
        video.setAttribute('src', previewURL) // w640 h480 //
      })
      .catch(function (error) {
        if (!active) return
        cleanup()
        log.warn('Unable to load video resource: ' + error)
      })

    return div
  }
}
