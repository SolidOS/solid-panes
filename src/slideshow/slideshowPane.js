/*   slideshow Pane
 **
 */
import * as UI from 'solid-ui'
const ns = UI.ns

import makeBSS from '@solid/better-simple-slideshow'

export const slideshowPane = {
  icon: UI.icons.iconBase + 'noun_138712.svg',

  name: 'slideshow',

  audience: [ns.solid('PowerUser')],

  // Does the subject deserve an slideshow pane?
  label: function (subject, context) {
    const store = context.session.store
    const ns = UI.ns
    const t = store.findTypeURIs(subject)
    if (t[ns.ldp('Container').uri] || t[ns.ldp('BasicContainer').uri]) {
      const contents = store.each(subject, ns.ldp('contains'))
      let count = 0
      contents.forEach(function (file) {
        if (UI.widgets.isImage(file)) count++
      })
      return count > 0 ? 'Slideshow' : null
    }
    return null
  },

  // See https://github.com/leemark/better-simple-slideshow
  // and follow instructions there
  render: function (subject, context) {
    const dom = context.dom
    const styleSheet =
      'https://leemark.github.io/better-simple-slideshow/css/simple-slideshow-styles.css'
    UI.widgets.addStyleSheet(dom, styleSheet)

    const store = context.session.store
    const ns = UI.ns
    const div = dom.createElement('div')
    div.setAttribute('class', 'bss-slides')

    const t = store.findTypeURIs(subject)
    let predicate
    if (t[ns.ldp('BasicContainer').uri] || t[ns.ldp('Container').uri]) {
      predicate = ns.ldp('contains')
    }
    const images = store.each(subject, predicate) // @@ random order?
    // @@ Ideally: sort by embedded time of image
    images.sort() // Sort for now by URI
    for (let i = 0; i < images.length; i++) {
      if (!UI.widgets.isImage(images[i])) continue
      const figure = div.appendChild(dom.createElement('figure'))
      const img = figure.appendChild(dom.createElement('img'))

      // get image with authenticated fetch
      store.fetcher._fetch(images[i].uri)
        .then(function(response) {
          return response.blob()
        })
        .then(function(myBlob) {
          const objectURL = URL.createObjectURL(myBlob)
          img.setAttribute('src', objectURL) // w640 h480 //
        })
      img.setAttribute('width', '100%')
      figure.appendChild(dom.createElement('figcaption'))
    }
    const options = { dom: dom }

    setTimeout(function () {
      makeBSS('.bss-slides', options)
    }, 1000) // Must run after the code which called this

    return div
  }
}

// ends
