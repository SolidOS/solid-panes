/*      View argument Pane
**
**  This pane shows a position and optionally the positions which
** support or oppose it.
*/

console.log('@@@ argument pane icon at ' + (module.__dirname || __dirname) + '/icon_argument.png')
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
  render: function (subject, myDocument) {
    var outliner = UI.panes.getOutliner(dom)
    var $r = UI.rdf
    var kb = UI.store
    var arg = UI.ns.arg

    subject = kb.canon(subject)
    var types = kb.findTypeURIs(subject)

    var div = myDocument.createElement('div')
    div.setAttribute('class', 'argumentPane')

    // var title = kb.any(subject, UI.ns.dc('title'))

    var comment = kb.any(subject, UI.ns.rdfs('comment'))
    if (comment) {
      var para = myDocument.createElement('p')
      para.setAttribute('style', 'margin-left: 2em; font-style: italic;')
      div.appendChild(para)
      para.textContent = comment.value
    }
    var plist = kb.statementsMatching(subject, arg('support'))
    outliner.appendPropertyTRs(div, plist, false)

    var plist = kb.statementsMatching(subject, arg('opposition'))
    outliner.appendPropertyTRs(div, plist, false)

    return div
  }
}

// ends
