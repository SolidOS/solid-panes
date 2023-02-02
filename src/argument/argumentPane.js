/*      View argument Pane
**
**  This pane shows a position and optionally the positions which
** support or oppose it.
** @@ Unfinsihed.
** Should allow editing the data too

*/
import { store } from 'solid-logic'
import * as UI from 'solid-ui'
import * as panes from 'pane-registry'

// console.log('@@@ argument pane icon at ' + (module.__dirname || __dirname) + '/icon_argument.png')
export default {
  icon: (module.__dirname || __dirname) + '/icon_argument.png', // @@ fix fro mashlib version

  name: 'argument',

  label: function (subject) {
    const kb = store
    const t = kb.findTypeURIs(subject)

    if (t[UI.ns.arg('Position').uri]) return 'Argument'

    return null
  },

  // View the data in a file in user-friendly way
  render: function (subject, dom) {
    const outliner = panes.getOutliner(dom)
    const kb = store
    const arg = UI.ns.arg

    subject = kb.canon(subject)
    // var types = kb.findTypeURIs(subject)

    const div = dom.createElement('div')
    div.setAttribute('class', 'argumentPane')

    // var title = kb.any(subject, UI.ns.dc('title'))

    const comment = kb.any(subject, UI.ns.rdfs('comment'))
    if (comment) {
      const para = dom.createElement('p')
      para.setAttribute('style', 'margin-left: 2em; font-style: italic;')
      div.appendChild(para)
      para.textContent = comment.value
    }

    div.appendChild(dom.createElement('hr'))

    let plist = kb.statementsMatching(subject, arg('support'))
    outliner.appendPropertyTRs(div, plist, false)

    div.appendChild(dom.createElement('hr'))

    plist = kb.statementsMatching(subject, arg('opposition'))
    outliner.appendPropertyTRs(div, plist, false)

    div.appendChild(dom.createElement('hr'))
    return div
  }
}

// ends
