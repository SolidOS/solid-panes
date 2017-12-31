/*      View argument Pane
**
**  This pane shows a position and optionally the positions which
** support or oppose it.
** @@ Unfinsihed.
** Should allow editing the data too

*/

const UI = require('solid-ui')

// console.log('@@@ argument pane icon at ' + (module.__dirname || __dirname) + '/icon_argument.png')
module.exports = {
  icon: (module.__dirname || __dirname) + '/icon_argument.png', // @@ fix fro mashlib version

  name: 'argument',

  label: function (subject) {
    var kb = UI.store
    var t = kb.findTypeURIs(subject)

    if (t[UI.ns.arg('Position').uri]) return 'Argument'

    return null
  },

  // View the data in a file in user-friendly way
  render: function (subject, dom) {
    var outliner = UI.panes.getOutliner(dom)
    var kb = UI.store
    var arg = UI.ns.arg

    subject = kb.canon(subject)
    var types = kb.findTypeURIs(subject)

    var div = dom.createElement('div')
    div.setAttribute('class', 'argumentPane')

    // var title = kb.any(subject, UI.ns.dc('title'))

    var comment = kb.any(subject, UI.ns.rdfs('comment'))
    if (comment) {
      var para = dom.createElement('p')
      para.setAttribute('style', 'margin-left: 2em; font-style: italic;')
      div.appendChild(para)
      para.textContent = comment.value
    }

    div.appendChild(dom.createElement('hr'))

    var plist = kb.statementsMatching(subject, arg('support'))
    outliner.appendPropertyTRs(div, plist, false)

    div.appendChild(dom.createElement('hr'))

    plist = kb.statementsMatching(subject, arg('opposition'))
    outliner.appendPropertyTRs(div, plist, false)

    div.appendChild(dom.createElement('hr'))
    return div
  }
}

// ends
