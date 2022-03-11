/*   slideshow Pane
 **
 */
const UI = require('solid-ui')
const ns = UI.ns

// tabulator.loadScript("js/panes/slideshow/better-simple-slideshow/js/better-simple-slideshow.js")

const makeBSS = require('@solid/better-simple-slideshow')
// load also js/panes/slideshow/better-simple-slideshow/css/simple-slideshow-styles.css

module.exports = {
  icon: UI.icons.iconBase + 'noun_138712.svg',

  name: 'slideshow',

  audience: [ns.solid('PowerUser')],

  // Does the subject deserve an slideshow pane?
  label: function (subject, context) {
    const kb = context.session.store
    const ns = UI.ns
    const t = kb.findTypeURIs(subject)
    if (t[ns.ldp('Container').uri] || t[ns.ldp('BasicContainer').uri]) {
      const contents = kb.each(subject, ns.ldp('contains'))
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

    const kb = context.session.store
    const ns = UI.ns
    const div = dom.createElement('div')
    div.setAttribute('class', 'bss-slides')

    const t = kb.findTypeURIs(subject)
    let predicate
    if (t[ns.ldp('BasicContainer').uri] || t[ns.ldp('Container').uri]) {
      predicate = ns.ldp('contains')
    }
    const images = kb.each(subject, predicate) // @@ random order?
    // @@ Ideally: sort by embedded time of image
    images.sort() // Sort for now by URI
    for (let i = 0; i < images.length; i++) {
      if (!UI.widgets.isImage(images[i])) continue
      const figure = div.appendChild(dom.createElement('figure'))
      const img = figure.appendChild(dom.createElement('img'))
      img.setAttribute('src', images[i].uri)
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
