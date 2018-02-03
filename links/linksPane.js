/*   Simple pane for links to related material
**
** Uses the attachmentList widget
*/
const UI = require('solid-ui')
const ns = UI.ns
const kb = UI.store

const predicate = ns.wf('attachment')

module.exports = {
  icon: UI.icons.iconBase + 'noun_160581.svg', // right arrow noun_160581.svg

  name: 'link',

  // Does the subject deserve a link list pane?
  label: function (subject) {
    var target = kb.any(subject, ns.meeting('target')) || subject
    var count = kb.each(target, predicate).length
    if (count > 0) {
      return UI.utils.label(predicate) + ' ' + count
    }
    return null
  },

  mintNew: function (options) {
    return new Promise(function (resolve, reject) {
      resolve(options)
    })
  },

  render: function (subject, dom) {
    const div = dom.createElement('div')
    var options = {}
    UI.widgets.attachmentList(dom, subject, div, options)

    const p = div.appendChild(dom.createElement('p'))
    p.textContent = 'Drag web pages or things onto the target to add to list of links.'
    p.setAttribute('style', 'color: #888; padding: 2em;')

    return div
  }
}

// ends
