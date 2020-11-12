/*   Class member Pane
 **
 **  This outline pane lists the members of a class
 */

const UI = require('solid-ui')
const $rdf = require('rdflib')

const ns = UI.ns

module.exports = {
  icon: UI.icons.originalIconBase + 'tango/22-folder-open.png',

  name: 'classInstance',

  // Create a new folder in a Solid system,

  audience: [ns.solid('PowerUser')],

  label: function (subject, context) {
    const kb = context.session.store
    const n = kb.each(undefined, ns.rdf('type'), subject).length
    if (n > 0) return 'List (' + n + ')' // Show how many in hover text
    return null // Suppress pane otherwise
  },

  render: function (subject, context) {
    const dom = context.dom
    const outliner = context.getOutliner(dom)
    const kb = context.session.store
    const complain = function complain (message, color) {
      const pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: ' + color || '#eed' + ';')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }
    var div = dom.createElement('div')
    div.setAttribute('class', 'instancePane')
    div.setAttribute(
      'style',
      '  border-top: solid 1px #777; border-bottom: solid 1px #777; margin-top: 0.5em; margin-bottom: 0.5em '
    )

    // If this is a class, look for all both explicit and implicit
    const sts = kb.statementsMatching(undefined, ns.rdf('type'), subject)
    if (sts.length > 0) {
      const already = {}
      const more = []
      sts.forEach(st => {
        already[st.subject.toNT()] = st
      })
      for (const nt in kb.findMembersNT(subject)) {
        if (!already[nt]) {
          more.push($rdf.st(kb.fromNT(nt), ns.rdf('type'), subject)) // @@ no provenance
        }
      }
      if (more.length) {
        complain(
          'There are ' +
            sts.length +
            ' explicit and ' +
            more.length +
            ' implicit members of ' +
            UI.utils.label(subject)
        )
      }
      if (subject.sameTerm(ns.rdf('Property'))) {
        // / Do not find all properties used as properties .. unless look at kb index
      } else if (subject.sameTerm(ns.rdfs('Class'))) {
        const uses = kb.statementsMatching(undefined, ns.rdf('type'), undefined)
        const usedTypes = {}
        uses.forEach(function (st) {
          usedTypes[st.object] = st
        }) // Get unique
        const used = []
        for (const i in usedTypes) {
          used.push($rdf.st($rdf.sym(i), ns.rdf('type'), ns.rdfs('Class')))
        }
        complain(
          'Total of ' +
            uses.length +
            ' type statements and ' +
            used.length +
            ' unique types.'
        )
      }

      if (sts.length > 10) {
        const tr = dom.createElement('TR')
        tr.appendChild(dom.createTextNode('' + sts.length))
        // tr.AJAR_statement=sts[i]
        div.appendChild(tr)
      }

      outliner.appendPropertyTRs(div, sts, true, function (_pred) {
        return true
      })

      if (more.length) {
        complain('Implicit:')
        outliner.appendPropertyTRs(div, more, true, function (_pred) {
          return true
        })
      }
    }

    return div
  }
}
// ends
