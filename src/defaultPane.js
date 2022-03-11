/*   Default Pane
 **
 **  This outline pane contains the properties which are
 **  normally displayed to the user. See also: internalPane
 ** This pane hides the ones considered too low-level for the normal user.
 */

const UI = require('solid-ui')
const $rdf = require('rdflib')
const ns = UI.ns

module.exports = {
  icon: UI.icons.originalIconBase + 'about.png',

  name: 'default',

  audience: [ns.solid('Developer')],

  label: function (_subject) {
    return 'about '
  },

  render: function (subject, context) {
    const dom = context.dom

    const filter = function (pred, inverse) {
      if (
        typeof context.session.paneRegistry.byName('internal').predicates[
          pred.uri
        ] !== 'undefined'
      ) {
        return false
      }
      if (
        inverse &&
        pred.uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
      ) {
        return false
      }
      return true
    }

    const outliner = context.getOutliner(dom)
    const kb = context.session.store
    // var outline = outliner; // @@
    UI.log.info('@defaultPane.render, dom is now ' + dom.location)
    subject = kb.canon(subject)
    const div = dom.createElement('div')
    div.setAttribute('class', 'defaultPane')
    //        appendRemoveIcon(div, subject, div)

    let plist = kb.statementsMatching(subject)
    outliner.appendPropertyTRs(div, plist, false, filter)
    plist = kb.statementsMatching(undefined, undefined, subject)
    outliner.appendPropertyTRs(div, plist, true, filter)
    if (
      subject.termType === 'Literal' &&
      subject.value.slice(0, 7) === 'http://'
    ) {
      outliner.appendPropertyTRs(
        div,
        [$rdf.st(kb.sym(subject.value), UI.ns.link('uri'), subject)],
        true,
        filter
      )
    }
    if (
      (subject.termType === 'NamedNode' &&
        kb.updater.editable(UI.rdf.Util.uri.docpart(subject.uri), kb)) ||
      (subject.termType === 'BlankNode' &&
        kb.anyStatementMatching(subject) &&
        kb.anyStatementMatching(subject).why &&
        kb.anyStatementMatching(subject).why.uri &&
        kb.updater.editable(kb.anyStatementMatching(subject).why.uri))
      // check the document containing something about of the bnode @@ what about as object?
      /*  ! && HCIoptions["bottom insert highlights"].enabled  */
    ) {
      const holdingTr = dom.createElement('tr') // these are to minimize required changes
      const holdingTd = dom.createElement('td') // in userinput.js
      holdingTd.setAttribute('colspan', '2')
      holdingTd.setAttribute('notSelectable', 'true')
      const img = dom.createElement('img')
      img.src = UI.icons.originalIconBase + 'tango/22-list-add-new.png'
      img.addEventListener('click', function addNewTripleIconMouseDownListener (
        e
      ) {
        outliner.UserInput.addNewPredicateObject(e)
        e.stopPropagation()
        e.preventDefault()
      })
      img.className = 'bottom-border-active'
      // img.addEventListener('click', thisOutline.UserInput.addNewPredicateObject,false)
      div
        .appendChild(holdingTr)
        .appendChild(holdingTd)
        .appendChild(img)
    }
    return div
  }
}

// ends
