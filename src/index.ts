/*                            SOLID PANES
 **
 **     Panes are regions of the outline view in which a particular subject is
 ** displayed in a particular way.
 ** Different panes about the same subject are typically stacked vertically.
 ** Panes may be used naked or with a pane selection header.
 **
 ** The label() method has two functions: it determines whether the pane is
 ** relevant to a given subject, returning null if not.
 ** If it is relevant, then it returns a suitable tooltip for a control which selects the pane
 */

// create the unique UI module on which to attach panes (no, don't attach as UI dot panes any more)
// var UI = require('solid-ui') // Note we will add the panes register to this.
import versionInfo from './versionInfo'
import * as UI from 'solid-ui'
import OutlineManager from './outline/manager.js'
import registerPanes from './registerPanes.js'
import {
  list,
  paneForIcon,
  paneForPredicate,
  register,
  byName,
  LiveStore
} from 'pane-registry'
import { createContext } from './outline/context'

export function getOutliner (dom) {
  if (!dom.outlineManager) {
    const context = createContext(
      dom,
      { list, paneForIcon, paneForPredicate, register, byName },
            UI.store as LiveStore,
            UI.solidLogicSingleton
    )
    dom.outlineManager = new OutlineManager(context)
  }
  return dom.outlineManager
}
if (typeof window !== 'undefined') {
  getOutliner(window.document)
}

registerPanes((cjsOrEsModule: any) => register(cjsOrEsModule.default || cjsOrEsModule))

export {
  list,
  paneForIcon,
  paneForPredicate,
  register,
  byName
} from 'pane-registry'

// We attach the solid-UI lower-level system for convenience
// Currently most panes are built using it anyway.
// It also gives access to rdflib as panes.UI.rdf

// This has common outline mode functionality for the default and other other panes
// A separate outline manager is required per DOM in cases like a browser extension
// where there are many occurrences of window and of window.document
// But each DOM should have just one outline manager.

export { OutlineManager, UI, versionInfo }
