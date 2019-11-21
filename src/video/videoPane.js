/*   Single video play Pane
 **
 */
var UI = require('solid-ui')
const $rdf = require('rdflib')

module.exports = {
  icon: UI.icons.iconBase + 'noun_1619.svg',

  name: 'video',

  // Does the subject deserve an slideshow pane?
  label: function (subject, context) {
    var kb = context.session.store
    var typeURIs = kb.findTypeURIs(subject)
    var prefix = $rdf.Util.mediaTypeClass('video/*').uri.split('*')[0]
    for (var t in typeURIs) {
      if (t.startsWith(prefix)) return 'Play video'
    }

    return null
  },

  render: function (subject, context) {
    const dom = context.dom
    var div = dom.createElement('div')
    var video = div.appendChild(dom.createElement('video'))
    video.setAttribute('controls', 'yes')
    video.setAttribute('src', subject.uri)
    video.setAttribute('width', '100%')
    return div
  }
}
// ends
