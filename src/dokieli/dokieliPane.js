/*   Human-readable editable "Dokieli" Pane
 **
 **  This outline pane contains the document contents for a Dokieli document
 ** The dokeili system allows the user to edit a document including anotations
 ** review.   It does not use turtle, but RDF/a
 */

const UI = require('solid-ui')
const $rdf = require('rdflib')
const mime = require('mime-types')

// const DOKIELI_TEMPLATE_URI = 'https://dokie.li/new' // Copy to make new dok

const DOKIELI_TEMPLATE = require('./new.js') // Distributed with this library

module.exports = {
  icon: UI.icons.iconBase + 'dokieli-logo.png', // @@ improve? more like doccument?

  name: 'Dokieli',

  mintClass: UI.ns.solid('DokieliDocument'), // @@ A better class?

  label: function (subject, context) {
    const kb = context.session.store
    const ns = UI.ns
    const allowed = [
      // 'text/plain',
      'text/html',
      'application/xhtml+xml'
      // 'image/png', 'image/jpeg', 'application/pdf',
      // 'video/mp4'
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

    // This data coul d come from a fetch OR from ldp comtaimner
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
      return 'Dok'
    }

    return null
  },

  // Create a new folder in a Solid system, with a dokieli editable document in it
  mintNew: function (context, newPaneOptions) {
    const kb = context.session.store
    let newInstance = newPaneOptions.newInstance
    if (!newInstance) {
      let uri = newPaneOptions.newBase
      if (uri.endsWith('/')) {
        uri = uri.slice(0, -1)
        newPaneOptions.newBase = uri
      }
      newInstance = kb.sym(uri)
    }

    const contentType = mime.lookup(newInstance.uri)
    if (!contentType || !contentType.includes('html')) {
      newInstance = $rdf.sym(newInstance.uri + '.html')
    }
    newPaneOptions.newInstance = newInstance // Save for creation system

    console.log('New dokieli will make: ' + newInstance)

    let htmlContents = DOKIELI_TEMPLATE
    let filename = newInstance.uri.split('/').slice(-1)[0]
    filename = decodeURIComponent(filename.split('.')[0])
    const encodedTitle = filename
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    htmlContents = htmlContents.replace('<title>', '<title>' + encodedTitle)
    htmlContents = htmlContents.replace(
      '</article>',
      '<h1>' + encodedTitle + '</h1></article>'
    )
    console.log('@@ New HTML for Dok:' + htmlContents)
    return new Promise(function (resolve) {
      kb.fetcher
        .webOperation('PUT', newInstance.uri, {
          data: htmlContents,
          contentType: 'text/html'
        })
        .then(function () {
          console.log(
            'new Dokieli document created at ' + newPaneOptions.newInstance
          )
          resolve(newPaneOptions)
        })
        .catch(function (err) {
          console.log(
            'Error creating dokelili dok at ' +
              newPaneOptions.newInstance +
              ': ' +
              err
          )
        })
    })
  },

  // Derived from: humanReadablePane .. share code?
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
      console.log('dokieliPane: c-t:' + ct)
    } else {
      console.log('dokieliPane: unknown content-type?')
    }

    // @@ NOte beflow - if we set ANY sandbox, then Chrome and Safari won't display it if it is PDF.
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
    // You can;'t have any sandbox and allow plugins.
    // We could sandbox only HTML files I suppose.
    // HTML5 bug: https://lists.w3.org/Archives/Public/public-html/2011Jun/0330.html

    // iframe.setAttribute('sandbox', 'allow-same-origin allow-forms'); // allow-scripts ?? no documents should be static

    iframe.setAttribute('style', 'resize = both; height: 40em; width:40em;') // @@ improve guess
    //        iframe.setAttribute('height', '480')
    //        iframe.setAttribute('width', '640')
    const tr = myDocument.createElement('tr')
    tr.appendChild(iframe)
    div.appendChild(tr)
    return div
  }
}
// ends
