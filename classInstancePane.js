/*   Class member Pane
**
**  This outline pane lists the members of a class
*/

var UI = require('solid-ui')
var panes = require('./paneRegistry')

var ns = UI.ns

module.exports = {
  icon: UI.icons.originalIconBase + 'tango/22-folder-open.png',

  name: 'classInstance',

  // Create a new folder in a Solid system,

  label: function (subject) {
    var kb = UI.store
    var n = kb.each(
      undefined, ns.rdf('type'), subject).length
    if (n > 0) return 'List (' + n + ')' // Show how many in hover text
    return null // Suppress pane otherwise
  },

  render: function (subject, dom) {
    var outliner = panes.getOutliner(dom)
    var kb = UI.store
    var complain = function complain (message, color) {
      var pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: ' + color || '#eed' + ';')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }
    var div = dom.createElement('div')
    div.setAttribute('class', 'instancePane')
    div.setAttribute('style', '  border-top: solid 1px #777; border-bottom: solid 1px #777; margin-top: 0.5em; margin-bottom: 0.5em ')

    // If this is a class, look for all both explicit and implicit
    var sts = kb.statementsMatching(undefined, ns.rdf('type'), subject)
    if (sts.length > 0) {
      var already = {}
      var more = []
      sts.map(st => {
        already[st.subject.toNT()] = st
      })
      for (var nt in kb.findMembersNT(subject)) {
        if (!already[nt]) {
          more.push($rdf.st(kb.fromNT(nt), ns.rdf('type'), subject)) // @@ no provenence
        }
      }
      if (more.length) {
        complain('There are ' + sts.length + ' explicit and ' +
          more.length + ' implicit members of ' + UI.utils.label(subject))
      }
      if (subject.sameTerm(ns.rdf('Property'))) {
        // / Do not find all properties used as properties .. unlesss look at kb index
      } else if (subject.sameTerm(ns.rdfs('Class'))) {
        var uses = kb.statementsMatching(undefined, ns.rdf('type'), undefined)
        var usedTypes = {}
        uses.map(function (st) { usedTypes[st.object] = st }) // Get unique
        var used = []
        for (var i in usedTypes) {
          used.push($rdf.st(
            $rdf.sym(i), ns.rdf('type'), ns.rdfs('Class')))
        }
        complain('Total of ' + uses.length + ' type statments and ' + used.length + ' unique types.')
      }

      if (sts.length > 10) {
        var tr = dom.createElement('TR')
        tr.appendChild(dom.createTextNode('' + sts.length))
        // tr.AJAR_statement=sts[i]
        div.appendChild(tr)
      }

      outliner.appendPropertyTRs(div, sts, true, function (pred) { return true })

      if (more.length) {
        complain('Implcit:')
        outliner.appendPropertyTRs(div, more, true, function (pred) { return true })
      }
    }

    return div
  }
}
// ends
