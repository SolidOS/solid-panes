/*   slideshow Pane
 **
 */
import * as UI from 'solid-ui'
import { solidLogicSingleton } from 'solid-logic'

import makeBSS from '@solid/better-simple-slideshow'
const ns = UI.ns
let slideshowId = 0

export const slideshowPane = {
  icon: UI.icons.iconBase + 'noun_138712.svg',

  name: 'slideshow',

  audience: [ns.solid('PowerUser')],

  // Does the subject deserve an slideshow pane?
  label: function (subject, context) {
    const store = context.session.store
    if (solidLogicSingleton.resource.isContainer(subject)) {
      const contents = store.each(subject, ns.ldp('contains'))
      let count = 0
      contents.forEach(function (file) {
        if (solidLogicSingleton.resource.isImage(file)) count++
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
    const id = `slideshow-${++slideshowId}`
    div.id = id
    div.setAttribute('class', 'bss-slides')

    let predicate
    if (solidLogicSingleton.resource.isContainer(subject)) {
      predicate = ns.ldp('contains')
    }
    const images = [...new Map(
      store.each(subject, predicate).map(image => [image.uri, image])
    ).values()]
    // @@ Ideally: sort by embedded time of image
    images.sort((left, right) => left.uri.localeCompare(right.uri))
    for (let i = 0; i < images.length; i++) {
      if (!solidLogicSingleton.resource.isImage(images[i])) continue
      const figure = div.appendChild(dom.createElement('figure'))
      const img = figure.appendChild(dom.createElement('img'))

      // get image with authenticated fetch
      store.fetcher._fetch(images[i].uri)
        .then(function (response) {
          return response.blob()
        })
        .then(function (myBlob) {
          const objectURL = URL.createObjectURL(myBlob)
          img.setAttribute('src', objectURL) // w640 h480 //
        })
      img.style.width = '100%'
      figure.appendChild(dom.createElement('figcaption'))
    }
    const options = { dom }

    dom.defaultView.requestAnimationFrame(function () {
      makeBSS(`#${id}`, options)
    })

    return div
  }
}

// ends
