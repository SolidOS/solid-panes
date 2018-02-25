/*                            SOLID PANE REGISTRY
**
**     Panes are regions of the outline view in which a particular subject is
** displayed in a particular way.
** Different paneRegistry about the same subject are typically stacked vertically.
** Panes may be used naked or with a pane selection header.
**
** The label() method has two functions: it determines whether the pane is
** relevant to a given subhect, returning null if not.
** If it is relevant, then it returns a suitable tooltip for a control which selects the pane
*/

// create the unique UI module on which to attach paneRegistry (no, don't attach as UI dot paneRegistry any more)
// var UI = require('solid-ui') // Note we will add the paneRegistry register to this.

var paneRegistry = module.exports = {}

// paneRegistry.UI = require('solid-ui') // Pass on directly to any who needs it

paneRegistry.list = []
paneRegistry.paneForIcon = []
paneRegistry.paneForPredicate = []
paneRegistry.register = function (p, requireQueryButton) {
  p.requireQueryButton = requireQueryButton
  if (!p.name) {
    console.log('***     No name for pane!')
    return
  }
  console.log('  registering pane: ' + p.name)
  if (!p.label) {
    console.log('***     No label for pane!')
    return
  }
  paneRegistry.list.push(p)
  if (!(p.name in paneRegistry)) { // don't overwrite methods
    paneRegistry[p.name] = p
    // console.log('    Indexing '+ p.name +' pane ...')
  }
  if (p.icon) {
    paneRegistry.paneForIcon[p.icon] = p
  }
  if (p.predicates) {
    for (var x in p.predicates) {
      paneRegistry.paneForPredicate[x] = {pred: x, code: p.predicates[x]}
    }
  }
}

paneRegistry.byName = function (name) {
  for (var i = 0; i < paneRegistry.list.length; i++) {
    if (paneRegistry.list[i].name === name) return paneRegistry.list[i]
  }
  return null
}

// ENDS
