/*   Image Pane
 **
 **  This outline pane contains the document contents for an Image document
 */
const UI = require('solid-ui')

module.exports = {
  icon: UI.icons.originalIconBase + 'tango/22-image-x-generic.png',

  name: 'image',

  label: function (subject, context) {
    const kb = context.session.store
    if (
      !kb.anyStatementMatching(
        subject,
        UI.ns.rdf('type'),
        kb.sym('http://purl.org/dc/terms/Image')
      )
    ) {
      // NB: Not dc: namespace!
      return null
    }

    //   See also the source pane, which has lower precedence.

    const contentTypeMatch = function (kb, x, contentTypes) {
      const cts = kb.fetcher.getHeader(x, 'content-type')
      if (cts) {
        for (let j = 0; j < cts.length; j++) {
          for (let k = 0; k < contentTypes.length; k++) {
            if (cts[j].indexOf(contentTypes[k]) >= 0) {
              return true
            }
          }
        }
      }
      return false
    }

    const suppressed = ['application/pdf']
    if (contentTypeMatch(kb, subject, suppressed)) {
      return null
    }
    return 'view'
  },

  render: function (subject, context) {
    const myDocument = context.dom
    const div = myDocument.createElement('div')
    div.setAttribute('class', 'imageView')
    const img = myDocument.createElement('IMG')
    img.setAttribute('src', subject.uri) // w640 h480
    img.setAttribute('style', 'max-width: 100%; max-height: 100%;')
    //        div.style['max-width'] = '640'
    //        div.style['max-height'] = '480'
    const tr = myDocument.createElement('TR') // why need tr?
    tr.appendChild(img)
    div.appendChild(tr)
    return div
  }
}

// ends
