/*   Human-readable editable "Dokieli" Pane
 **
 **  This outline pane contains the document contents for a Dokieli document
 ** The dokeili system allows the user to edit a document including anotations
 ** review.   It does not use turtle, but RDF/a
 */

import * as UI from 'solid-ui'
import * as $rdf from 'rdflib'
import * as mime from 'mime-types'

// const DOKIELI_TEMPLATE_URI = 'https://dokie.li/new' // Copy to make new dok

import DOKIELI_TEMPLATE from './new.js' // Distributed with this library

export default {
  icon: UI.icons.iconBase + 'dokieli-logo.png', // @@ improve? more like doccument?

  name: 'Dokieli',

  mintClass: UI.ns.solid('DokieliDocument'), // @@ A better class?

  // Don't provide viewing - let humanReadablePane handle that with appropriate icon
  label: function (subject, context) {
    return null // Viewing now handled by humanReadablePane
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

    // console.log('New dokieli will make: ' + newInstance)

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
    // console.log('@@ New HTML for Dok:' + htmlContents)
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
            'Error creating dokieli doc at ' +
              newPaneOptions.newInstance +
              ': ' +
              err
          )
        })
    })
  }

  // render: removed - now handled by humanReadablePane with appropriate dokieli icon
}
// ends
