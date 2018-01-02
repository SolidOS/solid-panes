/*  PANES
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

// create the unique UI module on which to attach panes
var UI = require('solid-ui') // Note we will add the panes register to this.

var paneModule = module.exports = {}

paneModule.list = []
paneModule.paneForIcon = []
paneModule.paneForPredicate = []
paneModule.register = function (p, requireQueryButton) {
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
  paneModule.list.push(p)
  if (!(p.name in paneModule)) { // don't overwrite methods
    paneModule[p.name] = p
    // console.log('    Indexing '+ p.name +' pane ...')
  }
  if (p.icon) {
    paneModule.paneForIcon[p.icon] = p
  }
  if (p.predicates) {
    for (var x in p.predicates) {
      paneModule.paneForPredicate[x] = {pred: x, code: p.predicates[x]}
    }
  }
}

paneModule.byName = function (name) {
  for (var i = 0; i < paneModule.list.length; i++) {
    if (paneModule.list[i].name === name) return paneModule.list[i]
  }
  return undefined
}

// This has common outline mode functionality for the default and other other panes
paneModule.OutlineManager = require('./outline/manager.js')

paneModule.getOutliner = function (dom) {
  if (!dom.outliner) {
    dom.outliner = UI.panes.OutlineManager(dom)
  }
  return dom.outliner
}

/*  Note that the earliest panes have priority. So the most specific ones are first.
**
*/
// Developer designed:

paneModule.register(require('./issue/pane.js'))
paneModule.register(require('./contact/contactPane.js'))

paneModule.register(require('./pad/padPane.js'))
// paneModule.register(require('./argument/argumentPane.js')) // A posistion in an argumnent tree

paneModule.register(require('./transaction/pane.js'))
paneModule.register(require('./transaction/period.js'))
paneModule.register(require('./chat/chatPane.js'))
// paneModule.register(require('./publication/publicationPane.js'))
paneModule.register(require('./meeting/meetingPane.js'))
paneModule.register(require('./tabbed/tabbedPane.js'))
paneModule.register(require('./schedule/schedulePane.js'))
paneModule.register(require('./links/linksPane.js'))

paneModule.register(require('./trip/tripPane.js'))
paneModule.register(require('./airPane.js'))

// Content views

paneModule.register(require('./imagePane.js')) // Basic image view
paneModule.register(require('./playlist/playlistPane.js')) // Basic playlist view

paneModule.register(require('./video/videoPane.js')) // Video clip player
paneModule.register(require('./audio/audioPane.js')) // Audio clip player

paneModule.register(require('./dokieli/dokieliPane.js')) // Should be above dataContentPane
paneModule.register(require('./folderPane.js')) // Should be above dataContentPane
paneModule.register(require('./classInstancePane.js')) // Should be above dataContentPane
// paneModule.register(require('./dynamic/dynamicPanes.js')) // warp etc  warp broken 2017/8
paneModule.register(require('./slideshow/slideshowPane.js'))

paneModule.register(require('./socialPane.js'))

paneModule.register(require('./humanReadablePane.js')) // A web page as a web page -- how to escape to tabr?
paneModule.register(require('./dataContentPane.js')) // Prefered for a data file
paneModule.register(require('./n3Pane.js'))
paneModule.register(require('./RDFXMLPane.js'))

// User configured - data driven
paneModule.register(require('./form/pane.js'))

// Generic:

paneModule.register(require('./attach/attachPane.js'))
paneModule.register(require('./tableViewPane.js'))

// Fallback totally generic:
paneModule.register(require('./defaultPane.js'))

paneModule.register(require('./ui/pane.js'))

// paneModule.register(require("categoryPane.js"))  // Not useful enough
// paneModule.register(require("pubsPane.js")) // not finished

// @@ jambo commented these things out to pare things down temporarily.
// Note must use // not /* to comment out to make sure expander sees it
// paneModule.register(require("lawPane.js"))

paneModule.register(require('./microblogPane/microblogPane.js'))

// paneModule.register(require("./social/pane.js")) // competitor to other social
// paneModule.register(require("./airPane.js"))
// paneModule.register(require("./lawPane.js"))
// paneModule.register(require("pushbackPane.js"))
// paneModule.register(require("CVPane.js"))
// paneModule.register(require("photoPane.js"))
// paneModule.register(require("tagPane.js"))
// paneModule.register(require("photoImportPane.js"))

// The sharing pane is fairly generic and administrative  201
paneModule.register(require('./sharing/sharingPane.js'))

// The internals pane is always (almost?) the last as it is the least user-friendly
paneModule.register(require('./internalPane.js'))
// The home pame is a 2016 experiment. Always there.
paneModule.register(require('./home/homePane.js'))

// ENDS
