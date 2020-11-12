/*   Single video play Pane
 **
 */
const UI = require('solid-ui')
const $rdf = require('rdflib')

module.exports = {
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
    const dom = context.dom
    const div = dom.createElement('div')
    const video = div.appendChild(dom.createElement('video'))
    video.setAttribute('controls', 'yes')
    video.setAttribute('src', subject.uri)
    video.setAttribute('width', '100%')
    return div
  }
}
// ends
