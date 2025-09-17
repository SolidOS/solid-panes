/*   Image Pane
 **
 **  This outline pane contains the document contents for an Image document
 */
import * as UI from 'solid-ui'

export const imagePane = {
  icon: UI.icons.originalIconBase + 'tango/22-image-x-generic.png',

  name: 'image',

  label: function (subject, context) {
    const store = context.session.store
    if (
      !store.anyStatementMatching(
        subject,
        UI.ns.rdf('type'),
        store.sym('http://purl.org/dc/terms/Image')
      )
    ) {
      // NB: Not dc: namespace!
      return null
    }

    //   See also the source pane, which has lower precedence.

    const contentTypeMatch = function (store, x, contentTypes) {
      const cts = store.fetcher.getHeader(x, 'content-type')
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
    if (contentTypeMatch(store, subject, suppressed)) {
      return null
    }
    return 'view'
  },

  render: function (subject, context) {
    const myDocument = context.dom
    const store = context.session.store
    const div = myDocument.createElement('div')
    div.setAttribute('class', 'imageView')
    const img = myDocument.createElement('IMG')

    // get image with authenticated fetch
    store.fetcher._fetch(subject.uri)
      .then(function (response) {
        return response.blob()
      })
      .then(function (myBlob) {
        const objectURL = URL.createObjectURL(myBlob)
        img.setAttribute('src', objectURL) // w640 h480 //
      })

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
