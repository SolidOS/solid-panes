/*   Single video play Pane
 **
 */
import * as UI from 'solid-ui'
import * as $rdf from 'rdflib'

export default {
  icon: UI.icons.iconBase + 'noun_1619.svg',

  name: 'video',

  // Does the subject deserve an slideshow pane?
  label: function (subject, context) {
    const kb = context.session.store
    const typeURIs = kb.findTypeURIs(subject)
    const prefix = $rdf.Util.mediaTypeClass('video/*').uri.split('*')[0]
    for (const t in typeURIs) {
      if (t.startsWith(prefix)) return 'Play video'
    }

    return null
  },

  render: function (subject, context) {
    const kb = context.session.store
    const dom = context.dom
    const div = dom.createElement('div')
    const video = div.appendChild(dom.createElement('video'))
    video.setAttribute('controls', 'yes')
    // get video with authenticated fetch
    kb.fetcher._fetch(subject.uri)
      .then(function(response) {
        return response.blob()
      })
      .then(function(myBlob) {
        const objectURL = URL.createObjectURL(myBlob)
        video.setAttribute('src', objectURL) // w640 h480 //
      })

    video.setAttribute('width', '100%')
    return div
  }
}
// ends
