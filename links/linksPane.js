/*   Single audio play Pane
**
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
    var target = kb.any(subject, ns.meeting('target')) || subject
    function createNewRow (object) {
      var opts = {} // @@ Add delete function
      return UI.widgets.personTR(dom, predicate, object, opts)
    }
    var div = dom.createElement('div')
    var table = div.appendChild(dom.createElement('table'))
    var refresh = function () {
      var things = kb.each(target, predicate)
      UI.utils.syncTableToArray(table, things, createNewRow)
    }
    div.refresh = refresh
    refresh()
    return div
  }
}

// ends
