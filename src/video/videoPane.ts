/*   Single video play Pane
 **
 */
import { icons } from 'solid-ui'
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
    // get video with authenticated fetch
    kb.fetcher._fetch(subject.uri)
      .then(function (response) {
        return response.blob()
      })
      .then(function (myBlob) {
        const objectURL = URL.createObjectURL(myBlob)
        video.setAttribute('src', objectURL) // w640 h480 //
      })

    return div
  }
}
