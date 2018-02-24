/*                            SOLID PANES
**
**     Panes are regions of the outline view in which a particular subject is
** displayed in a particular way.
** Different panes about the same subject are typically stacked vertically.
** Panes may be used naked or with a pane selection header.
**
** The label() method has two functions: it determines whether the pane is
** relevant to a given subhect, returning null if not.
** If it is relevant, then it returns a suitable tooltip for a control which selects the pane
*/

// create the unique UI module on which to attach panes (no, don't attach as UI dot panes any more)
// var UI = require('solid-ui') // Note we will add the panes register to this.

const paneRegistry = require('./paneRegistry')

var panes = module.exports = {}

panes.UI = require('solid-ui') // Pass on directly to any who needs it

module.exports = paneRegistry // but fully loaded

/*
panes.list = []
panes.paneForIcon = []
panes.paneForPredicate = []
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
  panes.list.push(p)
  if (!(p.name in panes)) { // don't overwrite methods
    panes[p.name] = p
    // console.log('    Indexing '+ p.name +' pane ...')
  }
  if (p.icon) {
    panes.paneForIcon[p.icon] = p
  }
  if (p.predicates) {
    for (var x in p.predicates) {
      panes.paneForPredicate[x] = {pred: x, code: p.predicates[x]}
    }
  }
}

panes.byName = function (name) {
  for (var i = 0; i < panes.list.length; i++) {
    if (panes.list[i].name === name) return panes.list[i]
  }
  return undefined
}

// This has common outline mode functionality for the default and other other panes
panes.OutlineManager = require('./outline/manager.js')

panes.getOutliner = function (dom) {
  if (!dom.outliner) {
    dom.outliner = panes.OutlineManager(dom)
  }
  return dom.outliner
}
*/
/*  Note that the earliest panes have priority. So the most specific ones are first.
**
*/
// Developer designed:

paneRegistry.register(require('./issue/pane.js'))
paneRegistry.register(require('./contact/contactPane.js'))

paneRegistry.register(require('./pad/padPane.js'))
// paneRegistry.register(require('./argument/argumentPane.js')) // A posistion in an argumnent tree

paneRegistry.register(require('./transaction/pane.js'))
paneRegistry.register(require('./transaction/period.js'))
paneRegistry.register(require('./chat/chatPane.js'))
// paneRegistry.register(require('./publication/publicationPane.js'))
paneRegistry.register(require('./meeting/meetingPane.js'))
paneRegistry.register(require('./tabbed/tabbedPane.js'))
paneRegistry.register(require('./schedule/schedulePane.js'))
paneRegistry.register(require('./links/linksPane.js'))

paneRegistry.register(require('./trip/tripPane.js'))
// paneRegistry.register(require('./airPane.js'))

// Content views

paneRegistry.register(require('./imagePane.js')) // Basic image view
paneRegistry.register(require('./playlist/playlistPane.js')) // Basic playlist view

paneRegistry.register(require('./video/videoPane.js')) // Video clip player
paneRegistry.register(require('./audio/audioPane.js')) // Audio clip player

paneRegistry.register(require('./dokieli/dokieliPane.js')) // Should be above dataContentPane
paneRegistry.register(require('./folderPane.js')) // Should be above dataContentPane
paneRegistry.register(require('./classInstancePane.js')) // Should be above dataContentPane
// paneRegistry.register(require('./dynamic/dynamicPanes.js')) // warp etc  warp broken 2017/8
paneRegistry.register(require('./slideshow/slideshowPane.js'))

paneRegistry.register(require('./socialPane.js'))

paneRegistry.register(require('./humanReadablePane.js')) // A web page as a web page -- how to escape to tabr?
paneRegistry.register(require('./dataContentPane.js')) // Prefered for a data file
paneRegistry.register(require('./n3Pane.js'))
paneRegistry.register(require('./RDFXMLPane.js'))

// User configured - data driven
paneRegistry.register(require('./form/pane.js'))

// Generic:

paneRegistry.register(require('./attach/attachPane.js'))
paneRegistry.register(require('./tableViewPane.js'))

// Fallback totally generic:
paneRegistry.register(require('./defaultPane.js'))

paneRegistry.register(require('./ui/pane.js'))

// paneRegistry.register(require("categoryPane.js"))  // Not useful enough
// paneRegistry.register(require("pubsPane.js")) // not finished

// @@ jambo commented these things out to pare things down temporarily.
// Note must use // not /* to comment out to make sure expander sees it
// paneRegistry.register(require("lawPane.js"))

paneRegistry.register(require('./microblogPane/microblogPane.js'))

// paneRegistry.register(require("./social/pane.js")) // competitor to other social
// paneRegistry.register(require("./airPane.js"))
// paneRegistry.register(require("./lawPane.js"))
// paneRegistry.register(require("pushbackPane.js"))
// paneRegistry.register(require("CVPane.js"))
// paneRegistry.register(require("photoPane.js"))
// paneRegistry.register(require("tagPane.js"))
// paneRegistry.register(require("photoImportPane.js"))

// The sharing pane is fairly generic and administrative  201
paneRegistry.register(require('./sharing/sharingPane.js'))

// The internals pane is always (almost?) the last as it is the least user-friendly
paneRegistry.register(require('./internalPane.js'))
// The home pame is a 2016 experiment. Always there.
paneRegistry.register(require('./home/homePane.js'))

// ENDS
