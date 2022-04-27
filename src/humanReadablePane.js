/*   Human-readable Pane
 **
 **  This outline pane contains the document contents for an HTML document
 **  This is for peeking at a page, because the user might not want to leave the data browser.
 */
import { icons, ns } from 'solid-ui'
import { Util } from 'rdflib'
import { marked } from 'marked'

const humanReadablePane = {
  icon: icons.originalIconBase + 'tango/22-text-x-generic.png',

  name: 'humanReadable',

  label: function (subject, context) {
    const kb = context.session.store

    //   See also the source pane, which has lower precedence.

    const allowed = [
      'text/plain',
      'text/html',
      'text/markdown',
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
        if (Util.mediaTypeClass(displayables[k]).uri in t) {
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

    const cts = kb.fetcher.getHeader(subject.doc(), 'content-type')
    const ct = cts ? cts[0] : null
    if (ct) {
      console.log('humanReadablePane: c-t:' + ct)
    } else {
      console.log('humanReadablePane: unknown content-type?')
    }

    //  @@ When we can, use CSP to turn off scripts within the iframe
    div.setAttribute('class', 'docView')
    const element = ct === 'text/markdown' ? 'DIV' : 'IFRAME'
    const frame = myDocument.createElement(element)

    // render markdown to html
    const markdownHtml = function () {
      kb.fetcher.webOperation('GET', subject.uri).then(response => {
        const markdownText = response.responseText
        const lines = Math.min(30, markdownText.split(/\n/).length + 5)
        const res = marked.parse(markdownText)
        frame.innerHTML = res
        frame.setAttribute('class', 'doc')
        frame.setAttribute('style', `border: 1px solid; padding: 1em; height: ${lines}em; width: 800px; resize: both; overflow: auto;`)
      })
    }

    if (ct === 'text/markdown') {
      markdownHtml()
    } else {
      // get with authenticated fetch
      console.log(`humanReadablePane: ${ct}`)
      kb.fetcher._fetch(subject.uri)
        .then(function(response) {
          return response.arrayBuffer()
        })
        .then(function(resp) {
          const myBlob = new Blob([resp], {type: ct})
          const objectURL = URL.createObjectURL(myBlob)
          frame.setAttribute('src', objectURL) // w640 h480 //
          frame.setAttribute('class', 'doc')
          frame.setAttribute('style', `border: 1px solid; padding: 1em; height:120em; width:80em; resize: both; overflow: auto;`)
        })
    }
    // @@ Note below - if we set ANY sandbox, then Chrome and Safari won't display it if it is PDF.
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
    // You can't have any sandbox and allow plugins.
    // We could sandbox only HTML files I suppose.
    // HTML5 bug: https://lists.w3.org/Archives/Public/public-html/2011Jun/0330.html

    // iframe.setAttribute('sandbox', 'allow-same-origin allow-forms'); // allow-scripts ?? no documents should be static

    //        iframe.setAttribute('height', '480')
    //        iframe.setAttribute('width', '640')
    const tr = myDocument.createElement('TR')
    tr.appendChild(frame)
    div.appendChild(tr)
    return div
  }
}

export default humanReadablePane
// ends
