/*   Human-readable Pane
 **
 **  This outline pane contains the document contents for an HTML document
 **  This is for peeking at a page, because the user might not want to leave the data browser.
 */
const UI = require('solid-ui')
const $rdf = require('rdflib')

module.exports = {
  icon: UI.icons.originalIconBase + 'tango/22-text-x-generic.png',

  name: 'humanReadable',

  label: function (subject, context) {
    const kb = context.session.store
    const ns = UI.ns

    //   See also the source pane, which has lower precedence.

    const allowed = [
      'text/plain',
      'text/html',
      'application/xhtml+xml',
      'image/png',
      'image/jpeg',
      'application/pdf',
      'video/mp4'
    ]

    const hasContentTypeIn = function (kb, x, displayables) {
      const cts = kb.fetcher.getHeader(x, 'content-type')
      if (cts) {
        for (let j = 0; j < cts.length; j++) {
          for (let k = 0; k < displayables.length; k++) {
            if (cts[j].indexOf(displayables[k]) >= 0) {
              return true
            }
          }
        }
      }
      return false
    }

    // This data could come from a fetch OR from ldp container
    const hasContentTypeIn2 = function (kb, x, displayables) {
      const t = kb.findTypeURIs(subject)
      for (let k = 0; k < displayables.length; k++) {
        if ($rdf.Util.mediaTypeClass(displayables[k]).uri in t) {
          return true
        }
      }
      return false
    }

    if (!subject.uri) return null // no bnodes

    const t = kb.findTypeURIs(subject)
    if (t[ns.link('WebPage').uri]) return 'view'

    if (
      hasContentTypeIn(kb, subject, allowed) ||
      hasContentTypeIn2(kb, subject, allowed)
    ) {
      return 'View'
    }

    return null
  },

  render: function (subject, context) {
    const myDocument = context.dom
    const div = myDocument.createElement('div')
    const kb = context.session.store

    //  @@ When we can, use CSP to turn off scripts within the iframe
    div.setAttribute('class', 'docView')
    const iframe = myDocument.createElement('IFRAME')
    iframe.setAttribute('src', subject.uri) // allow-same-origin
    iframe.setAttribute('class', 'doc')

    const cts = kb.fetcher.getHeader(subject.doc(), 'content-type')
    const ct = cts ? cts[0] : null
    if (ct) {
      console.log('humanReadablePane: c-t:' + ct)
    } else {
      console.log('humanReadablePane: unknown content-type?')
    }

    // @@ Note below - if we set ANY sandbox, then Chrome and Safari won't display it if it is PDF.
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
    // You can;'t have any sandbox and allow plugins.
    // We could sandbox only HTML files I suppose.
    // HTML5 bug: https://lists.w3.org/Archives/Public/public-html/2011Jun/0330.html

    // iframe.setAttribute('sandbox', 'allow-same-origin allow-forms'); // allow-scripts ?? no documents should be static

    iframe.setAttribute('style', 'resize = both; height: 120em; width:80em;')
    //        iframe.setAttribute('height', '480')
    //        iframe.setAttribute('width', '640')
    const tr = myDocument.createElement('TR')
    tr.appendChild(iframe)
    div.appendChild(tr)
    return div
  }
}
// ends
